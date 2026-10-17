"use server";

import db from "../../lib/db";
import { revalidatePath } from "next/cache";
import { STANDARD_DAY_HOURS, isBookableTime, isClosedDay, parseTimeToMinutes } from "../config/timeSlots";
import { randomUUID } from "crypto";
import { CAREER_STEPS } from "../config/careerSteps";
import { Prisma } from "../../lib/generated";
import { requireActionUser } from "../../lib/session";
import { formatAppointmentWhen, sendEmail } from "../../lib/email";
import { normalizeFacebookPostUrl } from "../../lib/facebook";
import { checkImage } from "../../lib/image";
import { notifyByName } from "../../lib/notify";
import { DEPARTMENTS, gradeSectionLabel, isShs, normalizeDepartment, programsFor, yearLevelsFor } from "../config/studentLevels";

// Every action here requires a signed-in Guidance Associate (COUNSELOR role).
const counselorOnly = () => requireActionUser("COUNSELOR");

// ==== Consultation Service: appointments ====

export async function getAppointmentsByDate(dateString: string) {
  try {
    await counselorOnly();
    const rows = await db.appointment.findMany({
      where: { date: new Date(dateString), status: { not: "CANCELLED" } },
    });
    // Times are text ("8:00 AM"), so sort by clock time, not alphabetically.
    return rows.sort((x, y) => parseTimeToMinutes(x.time) - parseTimeToMinutes(y.time));
  } catch (error) {
    console.error("Failed to fetch appointments:", error);
    return [];
  }
}

// Tells whoever booked the appointment (student, faculty or parent) what changed:
// a notification in E-Gabay, and an email when we have their address.
const APPOINTMENTS_PAGE: Record<string, string> = { Student: "/my_appointments", Faculty: "/faculty_appointment", Parent: "/parent_dashboard" };

async function notifyBooker(
  appointment: { bookedByEmail: string | null; bookedByName: string | null; bookedByRole: string | null; studentName: string | null; date: Date; time: string; appointmentType: string | null },
  subject: string,
  message: string
) {
  await notifyByName(appointment.bookedByName ?? appointment.studentName, appointment.bookedByRole ?? "Student", {
    title: subject,
    body: `${appointment.appointmentType || "Appointment"} · ${formatAppointmentWhen(appointment.date, appointment.time)}`,
    href: APPOINTMENTS_PAGE[appointment.bookedByRole ?? "Student"],
  });
  if (!appointment.bookedByEmail) return;
  const forWhom =
    appointment.studentName && appointment.studentName !== appointment.bookedByName ? ` for ${appointment.studentName}` : "";
  await sendEmail(
    appointment.bookedByEmail,
    subject,
    `Hello ${appointment.bookedByName ?? ""},\n\n${message}\n\nAppointment${forWhom}: ${appointment.appointmentType || "General consultation"}\nWhen: ${formatAppointmentWhen(appointment.date, appointment.time)}\n\n— Guidance and Counseling Office, STI College Sta. Maria`
  );
}

export async function updateAppointmentStatus(id: string, status: "PENDING" | "CONFIRMED" | "CANCELLED") {
  try {
    await counselorOnly();
    // Cancelled appointments are kept (not deleted) so the history and the
    // cancellation email both still have the details.
    const appointment = await db.appointment.update({ where: { id }, data: { status } });

    if (status === "CONFIRMED") {
      await notifyBooker(appointment, "Your guidance appointment is confirmed", "Your appointment with the Guidance Associate has been confirmed.");
    } else if (status === "CANCELLED") {
      await notifyBooker(
        appointment,
        "Your guidance appointment was cancelled",
        "Your appointment with the Guidance Associate has been cancelled. You can book a new time in E-Gabay."
      );
    }

    revalidatePath("/appointment");
    revalidatePath("/dashboard");
    revalidatePath("/daily_log");
    return { success: true };
  } catch (error) {
    console.error("Status update error:", error);
    return { success: false };
  }
}

// ---- Day schedule with contact details, and blocking time for meetings ----

// Everything the Appointments page shows for one day: bookings with a way to
// reach whoever made them, and blocked time.
export async function getDaySchedule(dateString: string) {
  try {
    await counselorOnly();
    const date = new Date(`${dateString}T00:00:00Z`);
    const [appointments, blocks] = await Promise.all([
      db.appointment.findMany({ where: { date, status: { not: "CANCELLED" } } }),
      db.blockedSlot.findMany({ where: { date } }),
    ]);

    // Fill in contact details the booking didn't carry (older bookings), from the accounts.
    const names = [...new Set(appointments.map((a) => a.bookedByName ?? a.studentName).filter(Boolean))] as string[];
    const users = await db.user.findMany({ where: { name: { in: names } }, select: { name: true, role: true, email: true, phone: true } });
    const contactFor = (name: string | null, role: string | null) => {
      const u = users.find((x) => x.name === name && (!role || x.role === role.toUpperCase())) ?? users.find((x) => x.name === name);
      return { email: u?.email ?? null, phone: u?.phone ?? null };
    };

    const byTime = (t: string) => parseTimeToMinutes(t);
    return {
      appointments: appointments
        .map((a) => {
          const fallback = contactFor(a.bookedByName ?? a.studentName, a.bookedByRole);
          return {
            ...a,
            contactName: a.bookedByName ?? a.studentName,
            contactRole: a.bookedByRole ?? "Student",
            contactEmail: a.bookedByEmail ?? fallback.email,
            contactPhone: a.bookedByPhone ?? fallback.phone,
          };
        })
        .sort((x, y) => byTime(x.time) - byTime(y.time)),
      blocks: blocks.sort((x, y) => byTime(x.time) - byTime(y.time)),
    };
  } catch (error) {
    console.error("Failed to load day schedule:", error);
    return { appointments: [], blocks: [] };
  }
}

// Blocks every hourly slot from startTime up to (not including) endTime, or the
// whole day, so nobody can book it. Slots that already have an appointment are
// left alone and reported back.
export async function blockTime(formData: { dateString: string; startTime: string; endTime: string; wholeDay: boolean; reason: string }) {
  try {
    const me = await counselorOnly();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(formData.dateString)) return { success: false, error: "Choose a date." };
    const reason = formData.reason.trim().slice(0, 80);
    if (!reason) return { success: false, error: "Say why (for example, Meeting)." };
    const date = new Date(`${formData.dateString}T00:00:00Z`);

    let slots: string[];
    if (formData.wholeDay) {
      slots = [...STANDARD_DAY_HOURS];
    } else {
      const start = parseTimeToMinutes(formData.startTime);
      const end = parseTimeToMinutes(formData.endTime);
      if (!(end > start)) return { success: false, error: "The end time must be after the start time." };
      slots = STANDARD_DAY_HOURS.filter((t) => parseTimeToMinutes(t) >= start && parseTimeToMinutes(t) < end);
    }
    if (slots.length === 0) return { success: false, error: "That range has no bookable hours (lunch is already closed)." };

    const [booked, alreadyBlocked] = await Promise.all([
      db.appointment.findMany({ where: { date, time: { in: slots }, status: { not: "CANCELLED" } }, select: { time: true, studentName: true } }),
      db.blockedSlot.findMany({ where: { date, time: { in: slots } }, select: { time: true } }),
    ]);
    const skip = new Set([...booked.map((b) => b.time), ...alreadyBlocked.map((b) => b.time)]);
    const toBlock = slots.filter((t) => !skip.has(t));

    const groupId = randomUUID();
    if (toBlock.length > 0) {
      await db.blockedSlot.createMany({ data: toBlock.map((time) => ({ counselorId: me.id, date, time, reason, groupId })) });
    }
    revalidatePath("/appointment");
    return { success: true, blocked: toBlock, skippedBooked: booked.map((b) => `${b.time} (${b.studentName ?? "booked"})`) };
  } catch (error) {
    console.error("Failed to block time:", error);
    return { success: false, error: "Couldn't block that time. Try again." };
  }
}

// Removes one blocked slot, or every slot blocked together with it.
export async function unblockTime(blockId: string, wholeGroup: boolean) {
  try {
    await counselorOnly();
    const block = await db.blockedSlot.findUnique({ where: { id: blockId } });
    if (!block) return { success: true };
    if (wholeGroup && block.groupId) await db.blockedSlot.deleteMany({ where: { groupId: block.groupId } });
    else await db.blockedSlot.delete({ where: { id: blockId } });
    revalidatePath("/appointment");
    return { success: true };
  } catch (error) {
    console.error("Failed to unblock:", error);
    return { success: false, error: "Couldn't remove the block. Try again." };
  }
}

export async function saveAppointmentDetails(formData: {
  appointmentId?: string;
  dateString: string;
  timeSlot: string;
  appointmentType: string;
  notes: string;
  requirements: string[];
  studentName?: string;
}) {
  try {
    await counselorOnly();
    const targetDate = new Date(formData.dateString);

    const createData = {
      date: targetDate,
      time: formData.timeSlot,
      appointmentType: formData.appointmentType || null,
      notes: formData.notes || null,
      requirements: formData.requirements,
      studentName: formData.studentName || null,
      status: "PENDING",
    };

    if (!isBookableTime(formData.timeSlot)) return { success: false, error: "Pick a time between 8:00 AM and 3:00 PM (not during lunch)." };
    if (isClosedDay(formData.dateString)) return { success: false, error: "Consultations are Monday to Friday only. Pick a weekday." };
    const [clash, blocked] = await Promise.all([
      db.appointment.findFirst({
        where: { date: targetDate, time: formData.timeSlot, status: { not: "CANCELLED" }, ...(formData.appointmentId ? { id: { not: formData.appointmentId } } : {}) },
      }),
      db.blockedSlot.findFirst({ where: { date: targetDate, time: formData.timeSlot } }),
    ]);
    if (clash) return { success: false, error: `${formData.timeSlot} is already booked by ${clash.studentName ?? "someone"}.` };
    if (blocked) return { success: false, error: `${formData.timeSlot} is blocked${blocked.reason ? ` (${blocked.reason})` : ""}. Unblock it first or pick another time.` };

    if (formData.appointmentId) {
      const before = await db.appointment.findUnique({ where: { id: formData.appointmentId } });
      try {
        const after = await db.appointment.update({
          where: { id: formData.appointmentId },
          data: {
            date: targetDate,
            time: formData.timeSlot,
            appointmentType: formData.appointmentType || null,
            notes: formData.notes || null,
            requirements: formData.requirements,
          },
        });

        const moved = before && (before.date.getTime() !== after.date.getTime() || before.time !== after.time);
        if (moved) {
          await notifyBooker(
            after,
            "Your guidance appointment was rescheduled",
            `Your appointment was moved from ${formatAppointmentWhen(before.date, before.time)} to the time below.`
          );
        }
      } catch (err) {
        // The id the client sent doesn't exist (e.g. a stale/local-only id) —
        // treat this the same as a brand new appointment instead of failing.
        if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2025") {
          await db.appointment.create({ data: createData });
        } else {
          throw err;
        }
      }
    } else {
      await db.appointment.create({ data: createData });
    }

    revalidatePath("/appointment");
    revalidatePath("/dashboard");
    revalidatePath("/daily_log");
    revalidatePath("/my_appointments");
    revalidatePath("/faculty_appointment");
    revalidatePath("/parent_dashboard");
    return { success: true };
  } catch (error) {
    console.error("Failed to save appointment:", error);
    return { success: false, error: String(error) };
  }
}

// GCO Daily Log: every logged session (appointments with session notes),
// newest first. Each session is written once, in the appointment form, and
// shows up here and on the student's Individual Inventory profile.
export async function getDailyLog(fromDate: string, toDate: string) {
  try {
    await counselorOnly();
    const rows = await db.appointment.findMany({
      where: {
        date: { gte: new Date(fromDate), lte: new Date(toDate) },
        status: { not: "CANCELLED" },
        studentName: { not: null },
      },
    });
    // Newest day first; within a day, by clock time (times are text like "8:00 AM").
    return rows.sort((x, y) => y.date.getTime() - x.date.getTime() || parseTimeToMinutes(x.time) - parseTimeToMinutes(y.time));
  } catch (error) {
    console.error("Failed to fetch daily log:", error);
    return [];
  }
}

// ==== Career Guidance Service ====

export async function getCareerPlans() {
  try {
    await counselorOnly();
    return await db.careerPlan.findMany({ orderBy: { createdAt: "desc" } });
  } catch (error) {
    console.error("Failed to fetch career plans:", error);
    return [];
  }
}

export async function addCareerPlanStudent(formData: { studentName: string; studentId: string; grade: string; facilitator?: string }) {
  try {
    await counselorOnly();
    // The Career Planning Program is for senior high students on record.
    const profile = await db.studentProfile.findUnique({ where: { name: formData.studentName } });
    if (!profile) return { success: false, error: "Add this student to the Individual Inventory first." };
    if (!isShs(profile.department)) return { success: false, error: "The Career Planning Program is for senior high students only." };
    const existing = await db.careerPlan.findFirst({ where: { studentName: formData.studentName } });
    if (existing) return { success: false, error: `${formData.studentName} is already in the tracker.` };

    await db.careerPlan.create({
      data: {
        studentName: formData.studentName,
        studentId: formData.studentId,
        grade: formData.grade,
        facilitator: formData.facilitator || null,
        stepDates: Array(CAREER_STEPS.length).fill(""),
        stepNotes: Array(CAREER_STEPS.length).fill(""),
      },
    });

    revalidatePath("/careerguidance");
    return { success: true };
  } catch (error) {
    console.error("Failed to add career plan student:", error);
    return { success: false, error: String(error) };
  }
}

// Marks the next incomplete stage done, with an optional note on what was completed.
export async function advanceCareerPlanProgress(id: string, activityNote = "") {
  try {
    await counselorOnly();
    const plan = await db.careerPlan.findUnique({ where: { id } });
    if (!plan) return { success: false, error: "Career plan not found" };

    const nextIncompleteIndex = plan.stepDates.findIndex((date) => date === "");
    if (nextIncompleteIndex === -1) return { success: true };

    const stepDates = [...plan.stepDates];
    stepDates[nextIncompleteIndex] = new Date().toISOString().split("T")[0];

    const stepNotes = CAREER_STEPS.map((_, i) => plan.stepNotes[i] ?? "");
    if (activityNote.trim()) stepNotes[nextIncompleteIndex] = activityNote.trim();

    await db.careerPlan.update({ where: { id }, data: { stepDates, stepNotes } });

    revalidatePath("/careerguidance");
    revalidatePath("/my_career");
    return { success: true };
  } catch (error) {
    console.error("Failed to update career plan progress:", error);
    return { success: false, error: String(error) };
  }
}

export async function updateCareerPlanDetails(id: string, formData: { facilitator: string; stepNotes: string[] }) {
  try {
    await counselorOnly();
    await db.careerPlan.update({
      where: { id },
      data: {
        facilitator: formData.facilitator.trim() || null,
        stepNotes: CAREER_STEPS.map((_, i) => (formData.stepNotes[i] ?? "").trim()),
      },
    });
    revalidatePath("/careerguidance");
    revalidatePath("/my_career");
    return { success: true };
  } catch (error) {
    console.error("Failed to update career plan details:", error);
    return { success: false, error: String(error) };
  }
}

// ==== Individual Inventory ====

export async function listStudentProfiles() {
  try {
    await counselorOnly();
    const [profiles, lastSessions] = await Promise.all([
      db.studentProfile.findMany({ orderBy: { name: "asc" } }),
      db.appointment.groupBy({
        by: ["studentName"],
        where: { status: { not: "CANCELLED" }, studentName: { not: null } },
        _max: { date: true },
      }),
    ]);
    const last = new Map(lastSessions.map((s) => [s.studentName, s._max.date]));
    return profiles.map((p) => ({ ...p, lastSession: last.get(p.name) ?? null }));
  } catch (error) {
    console.error("Failed to list student profiles:", error);
    return [];
  }
}

// One place for everything about a student: profile, sessions, career plan,
// referrals and submitted documents.
export async function getStudentProfile(studentName: string) {
  try {
    await counselorOnly();
    const [profile, appointments, careerPlan, referrals, documents, parents] = await Promise.all([
      db.studentProfile.findUnique({ where: { name: studentName } }),
      db.appointment.findMany({ where: { studentName, status: { not: "CANCELLED" } }, orderBy: { date: "desc" } }),
      db.careerPlan.findFirst({ where: { studentName } }),
      db.referral.findMany({ where: { studentName }, orderBy: { createdAt: "desc" } }),
      db.document.findMany({
        where: { studentName },
        select: { id: true, fileName: true, fileType: true, fileSize: true, category: true, uploaderName: true, createdAt: true, reviewStatus: true },
        orderBy: { createdAt: "desc" },
      }),
      db.parentChildLink.findMany({
        where: { status: "APPROVED", childName: studentName },
        select: { relationship: true, parent: { select: { name: true, phone: true, email: true } } },
      }),
    ]);
    return { profile, appointments, careerPlan, referrals, documents, parents };
  } catch (error) {
    console.error("Failed to fetch student profile:", error);
    return { profile: null, appointments: [], careerPlan: null, referrals: [], documents: [], parents: [] };
  }
}

export type StudentProfileInput = {
  id?: string;
  studentId: string;
  name: string;
  department: string;
  yearLevel: string;
  section: string;
  strandOrProgram: string;
  email: string;
  phone: string;
  birthDate: string;
  address: string;
  guardianName: string;
  guardianContact: string;
  familyBackground: string;
  educationalHistory: string;
  counselorNotes: string;
};

export async function saveStudentProfile(input: StudentProfileInput) {
  try {
    await counselorOnly();
    const t = (v: string | undefined, max = 200) => (v ?? "").trim().slice(0, max);
    const name = t(input.name, 120).replace(/\s+/g, " ");
    const studentId = t(input.studentId, 20);
    const department = normalizeDepartment(input.department);
    if (!studentId || !name) return { success: false, error: "Student ID and full name are required." };
    if (!/^[A-Za-z0-9-]{4,20}$/.test(studentId)) return { success: false, error: "Student IDs use letters, numbers and dashes only." };
    if (!department || !(DEPARTMENTS as readonly string[]).includes(department)) return { success: false, error: "Choose Senior High School or Tertiary." };
    if (!yearLevelsFor(department).includes(input.yearLevel)) return { success: false, error: `Choose the ${isShs(department) ? "grade" : "year level"}.` };
    const program = t(input.strandOrProgram, 80);
    // Older records may hold a strand/course that isn't in today's list; keeping it unchanged is fine.
    const existing = input.id ? await db.studentProfile.findUnique({ where: { id: input.id }, select: { strandOrProgram: true } }) : null;
    if (program && !programsFor(department).includes(program) && program !== existing?.strandOrProgram) {
      return { success: false, error: `Choose a ${isShs(department) ? "strand" : "course"} from the list.` };
    }
    const section = t(input.section, 30);

    const data = {
      studentId,
      name,
      department,
      yearLevel: input.yearLevel,
      section: section || null,
      strandOrProgram: program || null,
      gradeSection: gradeSectionLabel(input.yearLevel, section),
      email: t(input.email, 120).toLowerCase() || null,
      phone: t(input.phone, 40) || null,
      birthDate: t(input.birthDate, 20) || null,
      address: t(input.address, 300) || null,
      guardianName: t(input.guardianName, 120) || null,
      guardianContact: t(input.guardianContact, 40) || null,
      familyBackground: t(input.familyBackground, 5000) || null,
      educationalHistory: t(input.educationalHistory, 5000) || null,
      counselorNotes: t(input.counselorNotes, 10000) || null,
    };

    if (input.id) {
      const before = await db.studentProfile.findUnique({ where: { id: input.id } });
      if (!before) return { success: false, error: "This record no longer exists." };
      // Records across the system are linked by the student's name, so a
      // rename carries over to everything that belongs to them.
      const renamed = before.name !== name;
      await db.$transaction([
        db.studentProfile.update({ where: { id: input.id }, data }),
        ...(renamed
          ? [
              db.appointment.updateMany({ where: { studentName: before.name }, data: { studentName: name } }),
              db.appointment.updateMany({ where: { bookedByName: before.name, bookedByRole: "Student" }, data: { bookedByName: name } }),
              db.referral.updateMany({ where: { studentName: before.name }, data: { studentName: name } }),
              db.referral.updateMany({ where: { referrerName: before.name, referrerRole: "Student" }, data: { referrerName: name } }),
              db.careerPlan.updateMany({ where: { studentName: before.name }, data: { studentName: name } }),
              db.document.updateMany({ where: { studentName: before.name }, data: { studentName: name } }),
              db.document.updateMany({ where: { uploaderName: before.name, uploaderRole: "Student" }, data: { uploaderName: name } }),
              db.needsAssessmentResponse.updateMany({ where: { studentName: before.name }, data: { studentName: name } }),
              db.conversation.updateMany({ where: { participantName: before.name, participantRole: "Student" }, data: { participantName: name } }),
              db.message.updateMany({ where: { senderName: before.name, senderRole: "Student" }, data: { senderName: name } }),
              db.aiConversation.updateMany({ where: { studentName: before.name }, data: { studentName: name } }),
              db.parentChildLink.updateMany({ where: { studentProfileId: input.id }, data: { childName: name } }),
              db.user.updateMany({ where: { name: before.name, role: "STUDENT" }, data: { name } }),
            ]
          : []),
      ]);
    } else {
      await db.studentProfile.create({ data });
    }

    revalidatePath("/inventory");
    revalidatePath("/profile");
    revalidatePath("/child_profile");
    return { success: true };
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return { success: false, error: "Another student already has that student ID or name." };
    }
    console.error("Failed to save student profile:", error);
    return { success: false, error: String(error) };
  }
}

// ==== Document review ====

// Everything students and faculty upload waits here until a Guidance Associate
// checks it. Newest waiting first; reviewed ones after.
export async function listDocumentsForReview(status: "PENDING" | "APPROVED" | "REJECTED") {
  try {
    await counselorOnly();
    return await db.document.findMany({
      where: { reviewStatus: status },
      select: {
        id: true, fileName: true, fileType: true, fileSize: true, category: true, studentName: true,
        uploaderName: true, uploaderRole: true, reviewStatus: true, reviewNote: true, reviewedAt: true, createdAt: true,
      },
      orderBy: { createdAt: status === "PENDING" ? "asc" : "desc" },
      take: 200,
    });
  } catch (error) {
    console.error("Failed to list documents:", error);
    return [];
  }
}

export async function reviewDocument(id: string, approve: boolean, note: string) {
  try {
    await counselorOnly();
    const reviewNote = note.trim().slice(0, 300) || null;
    if (!approve && !reviewNote) return { success: false, error: "Tell the uploader why it wasn't accepted." };
    const doc = await db.document.update({
      where: { id },
      data: { reviewStatus: approve ? "APPROVED" : "REJECTED", reviewNote, reviewedAt: new Date() },
      select: { fileName: true, uploaderName: true, uploaderRole: true },
    });
    await notifyByName(doc.uploaderName, doc.uploaderRole, {
      title: approve ? "Your document was accepted" : "Your document wasn't accepted",
      body: `${doc.fileName}${reviewNote ? ` · ${reviewNote}` : ""}`,
      href: doc.uploaderRole === "Faculty" ? "/upload_documents" : "/profile",
    });
    revalidatePath("/documents");
    return { success: true };
  } catch (error) {
    console.error("Failed to review document:", error);
    return { success: false, error: "Couldn't save the review. Try again." };
  }
}

// ==== Group Guidance Service ====

export async function getGroupGuidancePrograms() {
  try {
    await counselorOnly();
    return await db.groupGuidanceProgram.findMany({ orderBy: { date: "asc" } });
  } catch (error) {
    console.error("Failed to fetch group guidance programs:", error);
    return [];
  }
}

export async function addGroupGuidanceProgram(formData: { title: string; gradeLevel: string; dateString: string; time: string }) {
  try {
    await counselorOnly();
    await db.groupGuidanceProgram.create({
      data: { title: formData.title, gradeLevel: formData.gradeLevel, date: new Date(formData.dateString), time: formData.time },
    });

    revalidatePath("/groupguidance");
    return { success: true };
  } catch (error) {
    console.error("Failed to add group guidance program:", error);
    return { success: false, error: String(error) };
  }
}

// Attendance can be typed (one name per line), or just counted when a photo of
// the signed attendance sheet is attached instead.
export async function recordGroupSession(id: string, formData: { attendees: string[]; outcomes: string; headcount?: number }) {
  try {
    await counselorOnly();
    const attendees = Array.from(new Set(formData.attendees.map((a) => a.trim().slice(0, 120)).filter(Boolean))).slice(0, 500);
    const headcount = Math.max(0, Math.min(2000, Math.floor(Number(formData.headcount) || 0)));
    await db.groupGuidanceProgram.update({
      where: { id },
      data: { attendees, participants: attendees.length || headcount, outcomes: formData.outcomes.trim().slice(0, 5000) || null },
    });
    revalidatePath("/groupguidance");
    return { success: true };
  } catch (error) {
    console.error("Failed to record group session:", error);
    return { success: false, error: String(error) };
  }
}

// Needs assessments, with responses tallied per topic (most-selected first).
export async function listNeedsAssessments() {
  try {
    await counselorOnly();
    const assessments = await db.needsAssessment.findMany({
      include: { responses: { orderBy: { createdAt: "desc" } } },
      orderBy: { createdAt: "desc" },
    });

    return assessments.map((a) => {
      const counts = new Map(a.topics.map((t) => [t, 0]));
      for (const r of a.responses) for (const t of r.selectedTopics) counts.set(t, (counts.get(t) ?? 0) + 1);
      const tally = [...counts.entries()].map(([topic, count]) => ({ topic, count })).sort((x, y) => y.count - x.count);
      return {
        id: a.id,
        title: a.title,
        gradeLevel: a.gradeLevel,
        isOpen: a.isOpen,
        createdAt: a.createdAt,
        responseCount: a.responses.length,
        tally,
        comments: a.responses
          .filter((r) => r.comment)
          .map((r) => ({ studentName: r.studentName, comment: r.comment!, createdAt: r.createdAt })),
      };
    });
  } catch (error) {
    console.error("Failed to list needs assessments:", error);
    return [];
  }
}

export async function createNeedsAssessment(formData: { title: string; gradeLevel: string; topics: string[] }) {
  try {
    await counselorOnly();
    const topics = Array.from(new Set(formData.topics.map((t) => t.trim()).filter(Boolean)));
    if (!formData.title.trim()) return { success: false, error: "Give the form a title." };
    if (topics.length < 2) return { success: false, error: "List at least two topics for students to choose from." };

    await db.needsAssessment.create({ data: { title: formData.title.trim(), gradeLevel: formData.gradeLevel, topics } });
    revalidatePath("/groupguidance");
    revalidatePath("/assessments");
    return { success: true };
  } catch (error) {
    console.error("Failed to create needs assessment:", error);
    return { success: false, error: String(error) };
  }
}

export async function setNeedsAssessmentOpen(id: string, isOpen: boolean) {
  try {
    await counselorOnly();
    await db.needsAssessment.update({ where: { id }, data: { isOpen } });
    revalidatePath("/groupguidance");
    revalidatePath("/assessments");
    return { success: true };
  } catch (error) {
    console.error("Failed to update needs assessment:", error);
    return { success: false, error: String(error) };
  }
}

// ==== Information Service: announcements ====

export async function listAnnouncements() {
  try {
    await counselorOnly();
    // Photos are fetched separately from /api/announcements/[id]/image.
    const rows = await db.announcement.findMany({
      omit: { imageData: true },
      include: { views: { orderBy: { viewedAt: "desc" } } },
      orderBy: { createdAt: "desc" },
    });
    return rows.map(({ imageType, ...a }) => ({ ...a, hasImage: Boolean(imageType) }));
  } catch (error) {
    console.error("Failed to list announcements:", error);
    return [];
  }
}

export async function saveAnnouncement(formData: {
  id?: string;
  title: string;
  body: string;
  category: string;
  audience: string;
  isPublished: boolean;
  facebookUrl?: string;
  // undefined: keep the current photo; null: remove it; object: replace it.
  image?: { dataBase64: string } | null;
}) {
  try {
    await counselorOnly();
    if (!formData.title.trim() || !formData.body.trim()) return { success: false, error: "Add a title and a message." };

    // Optional Facebook post: a permalink or the post's embed code (see lib/facebook.ts).
    let fb: string | null = null;
    if (formData.facebookUrl?.trim()) {
      const parsed = normalizeFacebookPostUrl(formData.facebookUrl);
      if (!parsed.ok) return { success: false, error: parsed.error };
      fb = parsed.url;
    }

    let imageFields: { imageData: Uint8Array<ArrayBuffer> | null; imageType: string | null } | Record<string, never> = {};
    if (formData.image === null) {
      imageFields = { imageData: null, imageType: null };
    } else if (formData.image) {
      const img = checkImage(formData.image.dataBase64);
      if (!img.ok) return { success: false, error: img.error };
      imageFields = { imageData: new Uint8Array(img.bytes), imageType: img.type };
    }

    const data = {
      title: formData.title.trim(),
      body: formData.body.trim(),
      category: formData.category,
      audience: formData.audience,
      isPublished: formData.isPublished,
      facebookUrl: fb,
      ...imageFields,
    };
    if (formData.id) await db.announcement.update({ where: { id: formData.id }, data });
    else await db.announcement.create({ data });

    revalidatePath("/information");
    for (const p of ["/bulletin", "/faculty_bulletin", "/parent_bulletin", "/student_dashboard"]) revalidatePath(p);
    return { success: true };
  } catch (error) {
    console.error("Failed to save announcement:", error);
    return { success: false, error: String(error) };
  }
}

export async function deleteAnnouncement(id: string) {
  try {
    await counselorOnly();
    await db.announcement.delete({ where: { id } });
    revalidatePath("/information");
    return { success: true };
  } catch (error) {
    console.error("Failed to delete announcement:", error);
    return { success: false, error: String(error) };
  }
}

// ==== Events ====

export async function listEvents() {
  try {
    await counselorOnly();
    return await db.event.findMany({ orderBy: [{ date: "asc" }, { time: "asc" }] });
  } catch (error) {
    console.error("Failed to list events:", error);
    return [];
  }
}

export async function saveEvent(formData: {
  id?: string;
  title: string;
  description: string;
  dateString: string;
  time: string;
  location: string;
}) {
  try {
    await counselorOnly();
    if (!formData.title.trim() || !formData.dateString || !formData.time.trim()) {
      return { success: false, error: "Title, date, and time are required." };
    }
    const data = {
      title: formData.title.trim(),
      description: formData.description.trim(),
      date: new Date(formData.dateString),
      time: formData.time.trim(),
      location: formData.location.trim() || null,
    };
    if (formData.id) await db.event.update({ where: { id: formData.id }, data });
    else await db.event.create({ data });

    revalidatePath("/events");
    for (const p of ["/bulletin", "/faculty_bulletin", "/parent_bulletin", "/student_dashboard"]) revalidatePath(p);
    return { success: true };
  } catch (error) {
    console.error("Failed to save event:", error);
    return { success: false, error: String(error) };
  }
}

export async function deleteEvent(id: string) {
  try {
    await counselorOnly();
    await db.event.delete({ where: { id } });
    revalidatePath("/events");
    return { success: true };
  } catch (error) {
    console.error("Failed to delete event:", error);
    return { success: false, error: String(error) };
  }
}

// ==== Messages: the counselor sees and replies to every conversation ====

export async function listConversations() {
  try {
    await counselorOnly();
    const conversations = await db.conversation.findMany({ orderBy: { updatedAt: "desc" } });

    return await Promise.all(
      conversations.map(async (c) => {
        const [lastMessage, unreadCount] = await Promise.all([
          db.message.findFirst({ where: { conversationId: c.id }, orderBy: { createdAt: "desc" } }),
          db.message.count({ where: { conversationId: c.id, senderRole: { not: "Counselor" }, readAt: null } }),
        ]);

        return {
          id: c.id,
          participantName: c.participantName,
          participantRole: c.participantRole,
          lastMessage: lastMessage?.content ?? "",
          lastMessageAt: lastMessage?.createdAt ?? c.createdAt,
          unreadCount,
        };
      })
    );
  } catch (error) {
    console.error("Failed to list conversations:", error);
    return [];
  }
}

export async function startConversation(formData: { participantName: string; participantRole: string; content: string }) {
  try {
    const me = await counselorOnly();
    const conversation = await db.conversation.create({
      data: { participantName: formData.participantName, participantRole: formData.participantRole },
    });

    await db.message.create({
      data: { conversationId: conversation.id, senderRole: "Counselor", senderName: me.name, content: formData.content },
    });

    revalidatePath("/message");
    return { success: true, conversation };
  } catch (error) {
    console.error("Failed to start conversation:", error);
    return { success: false, error: String(error) };
  }
}

export async function getMessages(conversationId: string) {
  try {
    await counselorOnly();
    return await db.message.findMany({ where: { conversationId }, orderBy: { createdAt: "asc" } });
  } catch (error) {
    console.error("Failed to fetch messages:", error);
    return [];
  }
}

export async function markConversationRead(conversationId: string) {
  try {
    await counselorOnly();
    await db.message.updateMany({
      where: { conversationId, senderRole: { not: "Counselor" }, readAt: null },
      data: { readAt: new Date() },
    });
    return { success: true };
  } catch (error) {
    console.error("Failed to mark conversation read:", error);
    return { success: false };
  }
}

export async function sendMessage(formData: { conversationId: string; content: string }) {
  try {
    const me = await counselorOnly();
    const message = await db.message.create({
      data: { conversationId: formData.conversationId, senderRole: "Counselor", senderName: me.name, content: formData.content },
    });

    await db.conversation.update({ where: { id: formData.conversationId }, data: { updatedAt: new Date() } });

    revalidatePath("/message");
    return { success: true, message };
  } catch (error) {
    console.error("Failed to send message:", error);
    return { success: false, error: String(error) };
  }
}

// ==== Referral Service ====

// Each referral comes with a way to reach the person who sent it and the
// student it's about (school email for Outlook/Teams, mobile number if known).
export async function listReferrals() {
  try {
    await counselorOnly();
    const referrals = await db.referral.findMany({ orderBy: { createdAt: "desc" } });
    const names = [...new Set(referrals.flatMap((r) => [r.referrerName, r.studentName]))];
    const [users, profiles] = await Promise.all([
      db.user.findMany({ where: { name: { in: names }, status: "ACTIVE" }, select: { name: true, role: true, email: true, phone: true } }),
      db.studentProfile.findMany({ where: { name: { in: names } }, select: { name: true, email: true, phone: true } }),
    ]);
    const roleOf: Record<string, string> = { Student: "STUDENT", Faculty: "FACULTY", Parent: "PARENT", Counselor: "COUNSELOR" };
    return referrals.map((r) => {
      const referrer = users.find((u) => u.name === r.referrerName && u.role === roleOf[r.referrerRole]);
      const studentUser = users.find((u) => u.name === r.studentName && u.role === "STUDENT");
      const profile = profiles.find((p) => p.name === r.studentName);
      return {
        ...r,
        referrerEmail: referrer?.email ?? null,
        referrerPhone: referrer?.phone ?? null,
        studentEmail: studentUser?.email ?? profile?.email ?? null,
        studentPhone: studentUser?.phone ?? profile?.phone ?? null,
      };
    });
  } catch (error) {
    console.error("Failed to list referrals:", error);
    return [];
  }
}

export async function updateReferralStatus(id: string, status: "OPEN" | "IN_PROGRESS" | "CLOSED") {
  try {
    await counselorOnly();
    const referral = await db.referral.update({ where: { id }, data: { status } });
    const myReferrals: Record<string, string> = { Student: "/my_referrals", Faculty: "/faculty_myreferral", Parent: "/parent_myreferral" };
    await notifyByName(referral.referrerName, referral.referrerRole, {
      title: status === "CLOSED" ? "Your referral was closed" : status === "IN_PROGRESS" ? "The guidance office is working on your referral" : "Your referral was reopened",
      body: referral.studentName === referral.referrerName ? "Your request for help" : `Referral about ${referral.studentName}`,
      href: myReferrals[referral.referrerRole],
    });
    for (const p of ["/referral", "/dashboard", "/my_referrals", "/faculty_myreferral", "/parent_myreferral"]) revalidatePath(p);
    return { success: true };
  } catch (error) {
    console.error("Failed to update referral status:", error);
    return { success: false, error: String(error) };
  }
}

export async function addReferralNotes(id: string, notes: string) {
  try {
    await counselorOnly();
    await db.referral.update({ where: { id }, data: { notes } });
    revalidatePath("/referral");
    return { success: true };
  } catch (error) {
    console.error("Failed to add referral notes:", error);
    return { success: false, error: String(error) };
  }
}

// Sends feedback on a referral straight to the person who submitted it,
// reusing the same conversation/messaging system as the Messages page.
export async function sendReferralFeedback(referralId: string, content: string) {
  try {
    const me = await counselorOnly();
    const referral = await db.referral.findUnique({ where: { id: referralId } });
    if (!referral) return { success: false, error: "Referral not found" };

    let conversation = await db.conversation.findFirst({
      where: { participantName: referral.referrerName, participantRole: referral.referrerRole },
    });
    if (!conversation) {
      conversation = await db.conversation.create({
        data: { participantName: referral.referrerName, participantRole: referral.referrerRole },
      });
    }

    await db.message.create({
      data: { conversationId: conversation.id, senderRole: "Counselor", senderName: me.name, content },
    });
    await db.conversation.update({ where: { id: conversation.id }, data: { updatedAt: new Date() } });
    await notifyByName(referral.referrerName, referral.referrerRole, {
      title: "The guidance office replied about your referral",
      body: content.length > 120 ? `${content.slice(0, 117)}…` : content,
    });

    revalidatePath("/message");
    revalidatePath("/referral");
    return { success: true };
  } catch (error) {
    console.error("Failed to send referral feedback:", error);
    return { success: false, error: String(error) };
  }
}

// ==== Dashboard overview stats ====

export async function getDashboardStats() {
  try {
    await counselorOnly();
    const [totalStudents, pendingReferrals, activeCareerPlans, documentsToReview, pendingAccounts, pendingParentLinks, pendingAppointments] = await Promise.all([
      db.studentProfile.count(),
      db.referral.count({ where: { status: { not: "CLOSED" } } }),
      db.careerPlan.count(),
      db.document.count({ where: { reviewStatus: "PENDING" } }),
      db.user.count({ where: { status: "PENDING", role: { not: "PARENT" } } }),
      db.parentChildLink.count({ where: { status: "PENDING", parent: { status: { not: "REJECTED" } } } }),
      db.appointment.count({ where: { status: "PENDING" } }),
    ]);

    return {
      totalStudents,
      pendingReferrals,
      activeCareerPlans,
      documentsToReview,
      approvalsWaiting: pendingAccounts + pendingParentLinks,
      pendingAppointments,
    };
  } catch (error) {
    console.error("Failed to fetch dashboard stats:", error);
    return { totalStudents: 0, pendingReferrals: 0, activeCareerPlans: 0, documentsToReview: 0, approvalsWaiting: 0, pendingAppointments: 0 };
  }
}

// Quick search from the dashboard: students on record by name or student ID.
export async function searchStudents(query: string) {
  try {
    await counselorOnly();
    const q = query.trim().slice(0, 60);
    if (q.length < 2) return [];
    return await db.studentProfile.findMany({
      where: { OR: [{ name: { contains: q, mode: "insensitive" } }, { studentId: { contains: q, mode: "insensitive" } }] },
      select: { id: true, name: true, studentId: true, gradeSection: true, department: true, strandOrProgram: true },
      orderBy: { name: "asc" },
      take: 8,
    });
  } catch (error) {
    console.error("Failed to search students:", error);
    return [];
  }
}
