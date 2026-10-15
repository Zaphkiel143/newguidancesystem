"use server";

import db from "../../lib/db";
import { revalidatePath } from "next/cache";
import { TOTAL_SLOTS } from "../config/timeSlots";
import { CAREER_STEPS } from "../config/careerSteps";
import { Prisma } from "../../lib/generated";
import { requireActionUser } from "../../lib/session";
import { formatAppointmentWhen, sendEmail } from "../../lib/email";

// Every action here requires a signed-in Guidance Associate (COUNSELOR role).
const counselorOnly = () => requireActionUser("COUNSELOR");

// ==== Consultation Service: appointments ====

export async function getDateStats(dateString: string) {
  try {
    await counselorOnly();
    const targetDate = new Date(dateString);

    const [confirmedCount, pendingCount, blockedSlots] = await Promise.all([
      db.appointment.count({ where: { date: targetDate, status: "CONFIRMED" } }),
      db.appointment.count({ where: { date: targetDate, status: "PENDING" } }),
      db.blockedSlot.count({ where: { date: targetDate } }),
    ]);

    // Available slots drop based on confirmed appointments and blocked time slots
    const availableCount = TOTAL_SLOTS - confirmedCount - blockedSlots;

    return { available: Math.max(0, availableCount), confirmed: confirmedCount, pending: pendingCount };
  } catch (error) {
    console.error("Failed to fetch date stats:", error);
    return { available: 0, confirmed: 0, pending: 0 };
  }
}

export async function getAppointmentsByDate(dateString: string) {
  try {
    await counselorOnly();
    return await db.appointment.findMany({
      where: { date: new Date(dateString), status: { not: "CANCELLED" } },
      orderBy: { time: "asc" },
    });
  } catch (error) {
    console.error("Failed to fetch appointments:", error);
    return [];
  }
}

// Tells whoever booked the appointment (student, faculty or parent) what changed.
async function notifyBooker(
  appointment: { bookedByEmail: string | null; bookedByName: string | null; studentName: string | null; date: Date; time: string; appointmentType: string | null },
  subject: string,
  message: string
) {
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

export async function toggleBlockTimeSlot(dateString: string, timeSlot: string) {
  try {
    const me = await counselorOnly();
    const targetDate = new Date(dateString);

    const existingBlock = await db.blockedSlot.findFirst({ where: { date: targetDate, time: timeSlot } });

    if (existingBlock) {
      await db.blockedSlot.delete({ where: { id: existingBlock.id } });
    } else {
      await db.blockedSlot.create({ data: { counselorId: me.id, date: targetDate, time: timeSlot } });
    }
    revalidatePath("/appointment");
    return { success: true };
  } catch (error) {
    console.error("Error toggling block slot:", error);
    return { success: false, error: "Something went wrong" };
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
    return await db.appointment.findMany({
      where: {
        date: { gte: new Date(fromDate), lte: new Date(toDate) },
        status: { not: "CANCELLED" },
        studentName: { not: null },
      },
      orderBy: [{ date: "desc" }, { time: "asc" }],
    });
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
    const [profile, appointments, careerPlan, referrals, documents] = await Promise.all([
      db.studentProfile.findUnique({ where: { name: studentName } }),
      db.appointment.findMany({ where: { studentName, status: { not: "CANCELLED" } }, orderBy: { date: "desc" } }),
      db.careerPlan.findFirst({ where: { studentName } }),
      db.referral.findMany({ where: { studentName }, orderBy: { createdAt: "desc" } }),
      db.document.findMany({
        where: { studentName },
        select: { id: true, fileName: true, fileType: true, fileSize: true, category: true, uploaderName: true, createdAt: true },
        orderBy: { createdAt: "desc" },
      }),
    ]);
    return { profile, appointments, careerPlan, referrals, documents };
  } catch (error) {
    console.error("Failed to fetch student profile:", error);
    return { profile: null, appointments: [], careerPlan: null, referrals: [], documents: [] };
  }
}

export type StudentProfileInput = {
  id?: string;
  studentId: string;
  name: string;
  department: string;
  gradeSection: string;
  strandOrProgram: string;
  email: string;
  phone: string;
  birthDate: string;
  address: string;
  guardianName: string;
  guardianContact: string;
  parentName: string;
  familyBackground: string;
  educationalHistory: string;
  counselorNotes: string;
};

export async function saveStudentProfile(input: StudentProfileInput) {
  try {
    await counselorOnly();
    if (!input.studentId.trim() || !input.name.trim() || !input.gradeSection.trim()) {
      return { success: false, error: "Student ID, name, and grade/section are required." };
    }

    const { id, ...fields } = input;
    const data = Object.fromEntries(
      Object.entries(fields).map(([k, v]) => [k, typeof v === "string" ? v.trim() || null : v])
    ) as Record<string, string | null>;
    const required = {
      studentId: input.studentId.trim(),
      name: input.name.trim(),
      department: input.department.trim() || "Senior High School",
      gradeSection: input.gradeSection.trim(),
    };

    if (id) {
      await db.studentProfile.update({ where: { id }, data: { ...data, ...required } });
    } else {
      await db.studentProfile.create({ data: { ...data, ...required } });
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

// Returns the file as base64 so the browser can download it.
export async function getDocumentFile(id: string) {
  try {
    await counselorOnly();
    const doc = await db.document.findUnique({ where: { id } });
    if (!doc) return null;
    return { fileName: doc.fileName, fileType: doc.fileType, dataBase64: Buffer.from(doc.data).toString("base64") };
  } catch (error) {
    console.error("Failed to fetch document:", error);
    return null;
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

export async function recordGroupSession(id: string, formData: { attendees: string[]; outcomes: string }) {
  try {
    await counselorOnly();
    const attendees = Array.from(new Set(formData.attendees.map((a) => a.trim()).filter(Boolean)));
    await db.groupGuidanceProgram.update({
      where: { id },
      data: { attendees, participants: attendees.length, outcomes: formData.outcomes.trim() || null },
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
    return await db.announcement.findMany({
      include: { views: { orderBy: { viewedAt: "desc" } } },
      orderBy: { createdAt: "desc" },
    });
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
}) {
  try {
    await counselorOnly();
    if (!formData.title.trim() || !formData.body.trim()) return { success: false, error: "Add a title and a message." };

    const data = {
      title: formData.title.trim(),
      body: formData.body.trim(),
      category: formData.category,
      audience: formData.audience,
      isPublished: formData.isPublished,
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

export async function listReferrals() {
  try {
    await counselorOnly();
    return await db.referral.findMany({ orderBy: { createdAt: "desc" } });
  } catch (error) {
    console.error("Failed to list referrals:", error);
    return [];
  }
}

export async function updateReferralStatus(id: string, status: "OPEN" | "IN_PROGRESS" | "CLOSED") {
  try {
    await counselorOnly();
    await db.referral.update({ where: { id }, data: { status } });
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

    revalidatePath("/message");
    revalidatePath("/referral");
    return { success: true };
  } catch (error) {
    console.error("Failed to send referral feedback:", error);
    return { success: false, error: String(error) };
  }
}

// ==== Accounts ====
// Everyone who signs in with a school email starts as a student; the Guidance
// Associate promotes faculty and other counselors here.

export async function listAccounts() {
  try {
    const me = await counselorOnly();
    const users = await db.user.findMany({
      select: { id: true, name: true, email: true, role: true, createdAt: true },
      orderBy: [{ role: "asc" }, { name: "asc" }],
    });
    return users.map((u) => ({ ...u, isMe: u.id === me.id }));
  } catch (error) {
    console.error("Failed to list accounts:", error);
    return [];
  }
}

export async function setAccountRole(userId: string, role: "STUDENT" | "FACULTY" | "PARENT" | "COUNSELOR") {
  try {
    const me = await counselorOnly();
    if (userId === me.id) return { success: false, error: "You can't change your own role." };
    await db.user.update({ where: { id: userId }, data: { role } });
    // Their open sessions keep working; the new role applies on the next page load.
    revalidatePath("/accounts");
    return { success: true };
  } catch (error) {
    console.error("Failed to change role:", error);
    return { success: false, error: String(error) };
  }
}

// ==== Dashboard overview stats ====

export async function getDashboardStats() {
  try {
    await counselorOnly();
    const [totalStudents, pendingReferrals, activeCareerPlans] = await Promise.all([
      db.studentProfile.count(),
      db.referral.count({ where: { status: { not: "CLOSED" } } }),
      db.careerPlan.count(),
    ]);

    return { totalStudents, pendingReferrals, activeCareerPlans };
  } catch (error) {
    console.error("Failed to fetch dashboard stats:", error);
    return { totalStudents: 0, pendingReferrals: 0, activeCareerPlans: 0 };
  }
}
