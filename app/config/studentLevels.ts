// School levels the guidance office serves, and the lists used by every form
// that asks where a student belongs (referrals, inventory, first sign-in).

export const SHS = "Senior High School";
export const TERTIARY = "Tertiary";
// College students off the regular year-level track, or enrolled in a
// non-regular term. Both treated the same as Tertiary everywhere except the
// label itself - same courses, same years, same Career Planning Form
// eligibility.
export const IRREGULAR = "Irregular";
export const OFF_TERM = "Off Term";
export const DEPARTMENTS = [SHS, TERTIARY, IRREGULAR, OFF_TERM] as const;
export type Department = (typeof DEPARTMENTS)[number];

export const SHS_GRADES = ["Grade 11", "Grade 12"] as const;
export const SHS_STRANDS = [
  "STEM",
  "ABM",
  "HUMSS",
  "GAS",
  "TVL – ICT",
  "TVL – Home Economics",
  "Arts and Design",
] as const;

export const TERTIARY_YEARS = ["1st Year", "2nd Year", "3rd Year", "4th Year"] as const;
export const TERTIARY_COURSES = [
  "BS Information Technology",
  "BS Computer Science",
  "BS Computer Engineering",
  "BS Information Systems",
  "BS Business Administration",
  "BS Accounting Information Systems",
  "BS Hospitality Management",
  "BS Tourism Management",
  "Bachelor of Multimedia Arts",
] as const;

// Older records were saved with department "College"; treat it as Tertiary.
export function normalizeDepartment(department: string | null | undefined): Department | null {
  if (department === SHS) return SHS;
  if (department === TERTIARY || department === "College") return TERTIARY;
  if (department === IRREGULAR) return IRREGULAR;
  if (department === OFF_TERM) return OFF_TERM;
  return null;
}

export function isShs(department: string | null | undefined) {
  return department === SHS;
}

// Irregular, Off Term, and any new department a counselor adds via Manage
// Options all pick from the same year/course lists as Tertiary, and are all
// eligible for the Career Planning Form - anything that isn't exactly
// Senior High School is treated as tertiary-like, so a newly-added
// department behaves sensibly without needing its own case here.
export function isTertiaryLike(department: string | null | undefined) {
  return Boolean(department) && department !== SHS;
}

export function yearLevelsFor(department: string | null | undefined): readonly string[] {
  return isTertiaryLike(department) ? TERTIARY_YEARS : SHS_GRADES;
}

export function programsFor(department: string | null | undefined): readonly string[] {
  return isTertiaryLike(department) ? TERTIARY_COURSES : SHS_STRANDS;
}

// "Grade 12 - STEM-A" style label kept in StudentProfile.gradeSection.
export function gradeSectionLabel(yearLevel: string, section: string) {
  return [yearLevel.trim(), section.trim()].filter(Boolean).join(" - ");
}

// Student IDs are 11 digits, e.g. 02000123456.
export const STUDENT_ID_DIGITS = 11;
export const isStudentId = (s: string) => new RegExp(`^\\d{${STUDENT_ID_DIGITS}}$`).test(s);

// College sections are a program code plus year-section, e.g. "BSIT 1-101".
export const SECTION_PROGRAMS = ["BSIT", "BSTM", "BSAIS", "BSCS", "BSCPE"] as const;
// Sections per year level: year 1 has 1-101 to 1-105, year 2 has 2-201 to 2-205, and so on.
const SECTIONS_PER_YEAR = 5;

// The program code for a course, when it has one.
const COURSE_SECTION_CODE: Record<string, (typeof SECTION_PROGRAMS)[number]> = {
  "BS Information Technology": "BSIT",
  "BS Tourism Management": "BSTM",
  "BS Accounting Information Systems": "BSAIS",
  "BS Computer Science": "BSCS",
  "BS Computer Engineering": "BSCPE",
};
export const sectionCodeForCourse = (course: string) => COURSE_SECTION_CODE[course] ?? "";

// "2nd Year" -> ["2-201", ..., "2-205"]; nothing until a year level is picked.
export function yearSectionsFor(yearLevel: string): string[] {
  const year = Number(/^(\d)/.exec(yearLevel)?.[1]);
  if (!year) return [];
  return Array.from({ length: SECTIONS_PER_YEAR }, (_, i) => `${year}-${year}${String(i + 1).padStart(2, "0")}`);
}

// Short codes for every course, for labels like "BSBA 2-201". The five
// section-picker codes above, plus the remaining courses.
const COURSE_CODE: Record<string, string> = {
  ...COURSE_SECTION_CODE,
  "BS Information Systems": "BSIS",
  "BS Business Administration": "BSBA",
  "BS Hospitality Management": "BSHM",
  "Bachelor of Multimedia Arts": "BMMA",
};
// A course's code; for a course added later, built from its words: an
// abbreviation stays whole ("BS"), other capitalised words give their
// initial ("BS Psychology" -> "BSP").
export function courseCode(course: string) {
  if (COURSE_CODE[course]) return COURSE_CODE[course];
  const code = course
    .split(/\s+/)
    .map((w) => (/^[A-Z]{2,}$/.test(w) ? w : /^[A-Z]/.test(w) ? w[0] : ""))
    .join("");
  return code || course;
}

// A college student's section as "BSIT 1-101": the course code plus the
// year-section. Older records only have a combined label such as
// "1st Year - 101" or "4th Year - BSIT 4-102", so the year-section is read from
// whichever field has it. Null when there isn't enough to build it.
export function collegeSectionLabel(p: { program?: string | null; section?: string | null; gradeSection?: string | null; yearLevel?: string | null }) {
  const section = (p.section ?? "").trim();
  const stored = /^([A-Z]{2,6}) (\d-\d{3})$/.exec(section);
  if (stored) return `${stored[1]} ${stored[2]}`;
  if (!p.program) return null;
  const text = `${section} ${p.gradeSection ?? ""}`;
  const pair = /(\d)-(\d{3})/.exec(text);
  const year = /^(\d)/.exec(p.yearLevel ?? "")?.[1] ?? /(\d)(?:st|nd|rd|th) Year/.exec(p.gradeSection ?? "")?.[1];
  const number = /^\d{3}$/.test(section) ? section : /- (\d{3})$/.exec(p.gradeSection ?? "")?.[1];
  const yearSection = pair ? `${pair[1]}-${pair[2]}` : year && number ? `${year}-${number}` : null;
  return yearSection ? `${courseCode(p.program)} ${yearSection}` : null;
}

// "BSIT 1-101" -> { code: "BSIT", yearSection: "1-101" }; anything else -> null.
export function splitCollegeSection(section: string | null | undefined) {
  const m = /^([A-Z]+) (\d-\d{3})$/.exec((section ?? "").trim());
  return m && (SECTION_PROGRAMS as readonly string[]).includes(m[1]) ? { code: m[1], yearSection: m[2] } : null;
}

// Shared "pick one, or type your own" options. OTHER reveals a text box and is
// saved as "Other: <what they typed>".
export const OTHER = "Other/s";

export const CONCERN_TYPES = [
  "Academic",
  "Attendance",
  "Behavioral",
  "Emotional / Mental Health",
  "Family",
  "Peer / Relationships",
  "Bullying",
  "Career / Course Choice",
  "Financial",
  "Health",
  OTHER,
] as const;

// Booking is a two-step pick: a category, then a reason specific to it.
export const APPOINTMENT_CATEGORIES = ["Individual Counseling", "Group Guidance"] as const;

export const APPOINTMENT_REASONS: Record<(typeof APPOINTMENT_CATEGORIES)[number], readonly string[]> = {
  "Individual Counseling": ["Academic Concern", "Career Guidance", "Personal / Family Concern", "Peer / Relationship Concern", "Requirements"],
  "Group Guidance": ["Clearance"],
};

// Every bookable reason, flattened - what actually gets saved as
// appointmentType, and the full option list for the counselor's edit view
// (which shows one flat list rather than the two-step category/reason pick).
export const APPOINTMENT_PURPOSES = [
  ...APPOINTMENT_REASONS["Individual Counseling"],
  ...APPOINTMENT_REASONS["Group Guidance"],
] as const;

// Combines a picked option with the "Other/s" text into the value we store.
export function withOther(choice: string, otherText: string) {
  return choice === OTHER ? `Other: ${otherText.trim()}` : choice;
}
