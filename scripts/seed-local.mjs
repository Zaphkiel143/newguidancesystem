// Fills the LOCAL review database with sample records so every feature has
// something to show. Refuses to run against anything but localhost unless
// told it's a separate demo database.
//
//   node scripts/seed-local.mjs
//   node --env-file=.env.deploy scripts/seed-local.mjs --demo-database   (separate demo DB)
//
// Demo logins are created by the "Continue as …" buttons on the login page;
// this script only adds the records those accounts will see.
import "dotenv/config";
import pg from "pg";

const url = process.env.DATABASE_URL ?? "";
// A hosted database is only seeded with an explicit --demo-database flag, meant
// for a separate demo/preview database. Never point this at the live database.
const isLocal = /@(localhost|127\.0\.0\.1)(:\d+)?\//.test(url);
if (!isLocal && !process.argv.includes("--demo-database")) {
  console.error("Refusing to seed: DATABASE_URL is not a localhost database (add --demo-database for a separate demo database).");
  process.exit(1);
}

const db = new pg.Client({ connectionString: url });
await db.connect();

const { rows } = await db.query(`SELECT count(*)::int AS n FROM "StudentProfile"`);
if (rows[0].n > 0) {
  console.log("Local database already has student records; nothing to do.");
  await db.end();
  process.exit(0);
}

const day = (offset) => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + offset);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

await db.query("BEGIN");

const students = [
  ["2024-12345", "Nhel Belarmino", "Senior High School", "Grade 12 - STEM-A", "STEM", "nhel.belarmino@sti.edu", "0912-345-6789", "2008-03-15", "Sta. Maria, Bulacan", "Rosa Belarmino", "0917-555-0143", "Mrs. Belarmino", "Lives with mother and younger sister. Father works abroad.", "Completed JHS at Sta. Maria National High School."],
  ["2024-12346", "Dexter Glorioso", "Senior High School", "Grade 11 - HUMSS-B", "HUMSS", "dexter.glorioso@sti.edu", "0918-221-4470", "2009-07-02", "Pulong Buhangin, Sta. Maria", "Arnel Glorioso", "0919-302-8815", null, null, null],
  ["2024-12347", "Justine Casano", "Senior High School", "Grade 12 - ABM-A", "ABM", "justine.casano@sti.edu", "0927-640-1192", "2008-11-21", "Guyong, Sta. Maria", "Lorna Casano", "0928-114-7706", null, null, null],
  ["2024-12348", "Kurt Aquino", "Senior High School", "Grade 11 - ICT-A", "ICT", "kurt.aquino@sti.edu", "0935-778-2014", "2009-01-09", "Bagbaguin, Sta. Maria", "Celia Aquino", "0936-450-3398", null, null, null],
  ["2023-20411", "Clarenz Contreras", "College", "2nd Year - BSIT", "BS Information Technology", "clarenz.contreras@sti.edu", "0945-310-8827", "2005-05-30", "Norzagaray, Bulacan", "Helen Contreras", "0946-219-5530", null, null, null],
];
for (const s of students) {
  await db.query(
    `INSERT INTO "StudentProfile" (id, "studentId", name, department, "gradeSection", "strandOrProgram", email, phone, "birthDate", address,
      "guardianName", "guardianContact", "parentName", "familyBackground", "educationalHistory", "createdAt", "updatedAt")
     VALUES (gen_random_uuid(), $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14, now(), now())`,
    s
  );
}

const appt = (date, time, student, type, status, notes, bookedBy) =>
  db.query(
    `INSERT INTO "Appointment" (id, date, time, "studentName", status, "appointmentType", notes, requirements, "bookedByName", "bookedByRole", "bookedByEmail", "createdAt", "updatedAt")
     VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, '{}', $7, $8, $9, now(), now())`,
    [date, time, student, status, type, notes, bookedBy?.[0] ?? null, bookedBy?.[1] ?? null, bookedBy?.[2] ?? null]
  );
await appt(day(-6), "9:00 AM", "Nhel Belarmino", "Individual Counseling", "CONFIRMED", "Discussed exam stress and a study schedule. Follow up in two weeks.", ["Nhel Belarmino", "Student", "student@sti.edu"]);
await appt(day(-3), "1:00 PM", "Dexter Glorioso", "Academic Concern", "CONFIRMED", "Missing requirements in two subjects; agreed on a catch-up plan with adviser.", null);
await appt(day(-1), "10:00 AM", "Kurt Aquino", "Career Guidance", "CONFIRMED", "Exploring IT vs. engineering courses. Gave skills worksheet.", null);
await appt(day(0), "2:00 PM", "Justine Casano", "Individual Counseling", "PENDING", null, null);
await appt(day(2), "11:00 AM", "Nhel Belarmino", "Career Guidance", "PENDING", "Wants to talk about college options.", ["Nhel Belarmino", "Student", "student@sti.edu"]);

await db.query(
  `INSERT INTO "CareerPlan" (id, "studentName", "studentId", grade, "stepDates", "stepNotes", facilitator, "createdAt", "updatedAt") VALUES
   (gen_random_uuid(), 'Nhel Belarmino', '2024-12345', 'Grade 12', $1, $2, 'Ms. Ana Reyes (Grade 12 adviser)', now(), now()),
   (gen_random_uuid(), 'Kurt Aquino', '2024-12348', 'Grade 11', $3, $4, NULL, now(), now())`,
  [
    [day(-90), day(-60), day(-30), "", "", ""],
    ["Career interest survey done", "Attended career talk; one-on-one consultation", "Set three course options", "", "", ""],
    [day(-20), "", "", "", "", ""],
    ["Career interest survey done", "", "", "", "", ""],
  ]
);

await db.query(
  `INSERT INTO "Referral" (id, "studentName", "referrerName", "referrerRole", "concernType", priority, description, status, "createdAt", "updatedAt") VALUES
   (gen_random_uuid(), 'Dexter Glorioso', 'Cho Sto Domingo', 'Faculty', 'Academic', 'High', 'Has missed several classes and seems withdrawn.', 'OPEN', now(), now()),
   (gen_random_uuid(), 'Nhel Belarmino', 'Mrs. Belarmino', 'Parent', 'Emotional', 'Medium', 'Seems more stressed than usual about exams.', 'IN_PROGRESS', now(), now())`
);

await db.query(
  `INSERT INTO "Announcement" (id, title, body, category, audience, "isPublished", "createdAt", "updatedAt") VALUES
   (gen_random_uuid(), 'Guidance office hours this week', 'The Guidance and Counseling Office is open Monday to Friday. Book a session in E-Gabay or drop by during your free period.', 'Reminder', 'All', true, now() - interval '2 days', now()),
   (gen_random_uuid(), 'Mental Health Awareness Month', 'Join our activities this month: daily wellness tips, a stress-management seminar, and open consultation hours.', 'Mental Health', 'Students', true, now(), now())`
);

await db.query(
  `INSERT INTO "Event" (id, title, description, date, time, location, "createdAt", "updatedAt") VALUES
   (gen_random_uuid(), 'Stress Management Seminar', 'Practical ways to handle exam season. Open to all SHS students.', $1, '1:00 PM – 3:00 PM', 'AVR', now(), now()),
   (gen_random_uuid(), 'Career Talk: Choosing Your College Course', 'Alumni share how they chose their programs.', $2, '9:00 AM – 11:00 AM', 'Gym', now(), now())`,
  [day(5), day(12)]
);

const { rows: na } = await db.query(
  `INSERT INTO "NeedsAssessment" (id, title, "gradeLevel", topics, "isOpen", "createdAt")
   VALUES (gen_random_uuid(), '2nd Semester Needs Assessment', 'All', $1, true, now()) RETURNING id`,
  [["Study habits and time management", "Stress and anxiety", "Friendships and peer pressure", "Family concerns", "Bullying", "Choosing a course or career"]]
);
await db.query(
  `INSERT INTO "NeedsAssessmentResponse" (id, "assessmentId", "studentName", "selectedTopics", comment, "createdAt") VALUES
   (gen_random_uuid(), $1, 'Dexter Glorioso', $2, NULL, now()),
   (gen_random_uuid(), $1, 'Kurt Aquino', $3, 'Hope there is a session about choosing between IT and engineering.', now()),
   (gen_random_uuid(), $1, 'Justine Casano', $4, NULL, now())`,
  [na[0].id, ["Stress and anxiety", "Study habits and time management"], ["Choosing a course or career", "Stress and anxiety"], ["Stress and anxiety", "Family concerns"]]
);

await db.query(
  `INSERT INTO "GroupGuidanceProgram" (id, title, "gradeLevel", date, time, participants, attendees, outcomes, "createdAt") VALUES
   (gen_random_uuid(), 'Managing Exam Stress', 'Grade 12', $1, '10:00 AM', 3, $2, 'Covered breathing techniques and study planning. Students asked for a follow-up on sleep habits.', now()),
   (gen_random_uuid(), 'Healthy Friendships', 'Grade 11', $3, '2:00 PM', 0, '{}', NULL, now())`,
  [day(-10), ["Nhel Belarmino", "Justine Casano", "Kurt Aquino"], day(8)]
);

await db.query("COMMIT");
await db.end();
console.log("Seeded the local review database.");
