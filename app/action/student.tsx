"use server";

import db from "../../lib/db";
import { revalidatePath } from "next/cache";
import { getNlpReply } from "../../lib/nlp";
import { requireActionUser } from "../../lib/session";
import { counselorEmails, formatAppointmentWhen, sendEmail } from "../../lib/email";
import { announceNewBooking, checkBooking } from "../../lib/booking";
import { parseTimeToMinutes } from "../config/timeSlots";
import { DEPARTMENTS, gradeSectionLabel, isShs, normalizeDepartment, programsFor, yearLevelsFor } from "../config/studentLevels";
import { checkDocument, STUDENT_DOCUMENT_CATEGORIES } from "../../lib/documents";
import { notifyCounselors } from "../../lib/notify";
import { announceNewReferral, checkReferral } from "../../lib/referrals";

// Every action here acts as the signed-in student; names never come from the client.

// ---- Appointments ----

export async function getMyAppointments() {
  try {
    const me = await requireActionUser("STUDENT");
    const rows = await db.appointment.findMany({ where: { studentName: me.name } });
    // Newest first, by date then clock time (times are text like "8:00 AM").
    return rows.sort((x, y) => y.date.getTime() - x.date.getTime() || parseTimeToMinutes(y.time) - parseTimeToMinutes(x.time));
  } catch (error) {
    console.error("[student] Failed to fetch appointments:", error);
    return [];
  }
}

export async function getBookedTimesForDate(dateString: string) {
  try {
    await requireActionUser("STUDENT");
    const targetDate = new Date(dateString);

    const [appointments, blockedSlots] = await Promise.all([
      db.appointment.findMany({ where: { date: targetDate, status: { not: "CANCELLED" } }, select: { time: true } }),
      db.blockedSlot.findMany({ where: { date: targetDate }, select: { time: true } }),
    ]);

    return Array.from(new Set([...appointments.map((a) => a.time), ...blockedSlots.map((b) => b.time)]));
  } catch (error) {
    console.error("[student] Failed to fetch booked times:", error);
    return [];
  }
}

export async function bookAppointment(formData: {
  dateString: string;
  timeSlot: string;
  appointmentType: string;
  notes: string;
  phone?: string;
}) {
  try {
    const me = await requireActionUser("STUDENT");
    const checked = await checkBooking(formData);
    if ("error" in checked) return { success: false, error: checked.error };
    const { date } = checked;

    await db.appointment.create({
      data: {
        date,
        time: formData.timeSlot,
        studentName: me.name,
        appointmentType: checked.appointmentType,
        notes: checked.notes,
        requirements: [],
        status: "PENDING",
        bookedByName: me.name,
        bookedByRole: me.roleLabel,
        bookedByEmail: me.email,
        bookedByPhone: checked.phone ?? me.phone,
      },
    });
    await announceNewBooking({ who: me.name, role: me.roleLabel, date, time: formData.timeSlot, purpose: checked.appointmentType });

    const when = formatAppointmentWhen(date, formData.timeSlot);
    for (const to of await counselorEmails()) {
      await sendEmail(
        to,
        `New appointment request: ${me.name}`,
        `${me.name} (Student) requested an appointment.\n\nWhen: ${when}\nPurpose: ${checked.appointmentType}\nNotes: ${checked.notes || "-"}\n\nOpen E-Gabay to confirm or reschedule it.`
      );
    }

    revalidatePath("/my_appointments");
    revalidatePath("/appointment");
    revalidatePath("/dashboard");
    return { success: true };
  } catch (error) {
    console.error("[student] Failed to book appointment:", error);
    return { success: false, error: String(error) };
  }
}

// ---- Messages ----

async function ownConversation(conversationId: string) {
  const me = await requireActionUser("STUDENT");
  const conversation = await db.conversation.findFirst({
    where: { id: conversationId, participantName: me.name, participantRole: "Student" },
  });
  if (!conversation) throw new Error("Conversation not found");
  return me;
}

export async function getMyConversation() {
  try {
    const me = await requireActionUser("STUDENT");
    const existing = await db.conversation.findFirst({
      where: { participantName: me.name, participantRole: "Student" },
    });
    if (existing) return existing;

    return await db.conversation.create({
      data: { participantName: me.name, participantRole: "Student" },
    });
  } catch (error) {
    console.error("[student] Failed to get or create conversation:", error);
    return null;
  }
}

export async function getMessages(conversationId: string) {
  try {
    await ownConversation(conversationId);
    return await db.message.findMany({ where: { conversationId }, orderBy: { createdAt: "asc" } });
  } catch (error) {
    console.error("[student] Failed to fetch messages:", error);
    return [];
  }
}

export async function markConversationRead(conversationId: string) {
  try {
    await ownConversation(conversationId);
    await db.message.updateMany({
      where: { conversationId, senderRole: { not: "Student" }, readAt: null },
      data: { readAt: new Date() },
    });
    return { success: true };
  } catch (error) {
    console.error("[student] Failed to mark conversation read:", error);
    return { success: false };
  }
}

export async function sendMessage(formData: { conversationId: string; content: string }) {
  try {
    const me = await ownConversation(formData.conversationId);
    const message = await db.message.create({
      data: {
        conversationId: formData.conversationId,
        senderRole: "Student",
        senderName: me.name,
        content: formData.content,
      },
    });

    await db.conversation.update({ where: { id: formData.conversationId }, data: { updatedAt: new Date() } });

    revalidatePath("/my_messages");
    revalidatePath("/message");
    return { success: true, message };
  } catch (error) {
    console.error("[student] Failed to send message:", error);
    return { success: false, error: String(error) };
  }
}

// ---- Referrals ----

// aboutMyself: a student asking for help for themselves; otherwise a peer referral.
export async function submitReferral(formData: {
  aboutMyself: boolean;
  studentName: string;
  concernType: string;
  priority: string;
  description: string;
}) {
  try {
    const me = await requireActionUser("STUDENT");
    const checked = checkReferral({ ...formData, studentName: formData.aboutMyself ? me.name : formData.studentName });
    if ("error" in checked) return { success: false, error: checked.error };

    await db.referral.create({
      data: { ...checked.value, referrerName: me.name, referrerRole: "Student", status: "OPEN" },
    });
    await announceNewReferral({ ...checked.value, referrerName: me.name, referrerRole: "Student" });

    revalidatePath("/referral");
    revalidatePath("/my_referrals");
    revalidatePath("/dashboard");
    return { success: true };
  } catch (error) {
    console.error("[student] Failed to submit referral:", error);
    return { success: false, error: String(error) };
  }
}

export async function getMyReferrals() {
  try {
    const me = await requireActionUser("STUDENT");
    return await db.referral.findMany({
      where: { referrerName: me.name, referrerRole: "Student" },
      orderBy: { createdAt: "desc" },
    });
  } catch (error) {
    console.error("[student] Failed to fetch referrals:", error);
    return [];
  }
}

// ---- Career Planning Program ----

// Senior high or tertiary, from the student's Individual Inventory record.
// Features like the Career Planning Program are for senior high only.
export async function getMyStudentLevel() {
  try {
    const me = await requireActionUser("STUDENT");
    const profile = await db.studentProfile.findUnique({ where: { name: me.name }, select: { department: true } });
    return { hasProfile: Boolean(profile), department: normalizeDepartment(profile?.department), isShs: isShs(profile?.department) };
  } catch (error) {
    console.error("[student] Failed to fetch level:", error);
    return { hasProfile: false, department: null, isShs: false };
  }
}

export async function getMyCareerPlan() {
  try {
    const me = await requireActionUser("STUDENT");
    // The Career Planning Program is for senior high students only.
    const profile = await db.studentProfile.findUnique({ where: { name: me.name }, select: { department: true } });
    if (!isShs(profile?.department)) return null;
    return await db.careerPlan.findFirst({ where: { studentName: me.name } });
  } catch (error) {
    console.error("[student] Failed to fetch career plan:", error);
    return null;
  }
}

// ---- Individual Inventory: own profile + document submission ----

export async function getMyProfile() {
  try {
    const me = await requireActionUser("STUDENT");
    const [profile, appointments, documents] = await Promise.all([
      db.studentProfile.findUnique({ where: { name: me.name } }),
      db.appointment.findMany({
        where: { studentName: me.name, status: { not: "CANCELLED" } },
        orderBy: { date: "desc" },
        take: 10,
      }),
      db.document.findMany({
        where: { studentName: me.name, uploaderRole: "Student" },
        select: { id: true, fileName: true, fileType: true, fileSize: true, category: true, createdAt: true, reviewStatus: true, reviewNote: true },
        orderBy: { createdAt: "desc" },
      }),
    ]);
    return { name: me.name, email: me.email, hasPhoto: Boolean(me.avatarType), profile, appointments, documents };
  } catch (error) {
    console.error("[student] Failed to fetch profile:", error);
    return null;
  }
}

export async function submitStudentDocument(formData: {
  category: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  dataBase64: string;
}) {
  try {
    const me = await requireActionUser("STUDENT");
    if (!(STUDENT_DOCUMENT_CATEGORIES as readonly string[]).includes(formData.category)) return { success: false, error: "Choose the type of document." };
    const file = checkDocument(formData.dataBase64, formData.fileName);
    if (!file.ok) return { success: false, error: file.error };
    // Stops someone filling the review queue: at most 10 waiting at a time.
    const waiting = await db.document.count({ where: { uploaderName: me.name, uploaderRole: "Student", reviewStatus: "PENDING" } });
    if (waiting >= 10) return { success: false, error: "You have 10 documents waiting for review. Wait for the guidance office to check them first." };

    await db.document.create({
      data: {
        uploaderName: me.name,
        uploaderRole: "Student",
        studentName: me.name,
        category: formData.category,
        fileName: file.fileName,
        fileType: file.type,
        fileSize: file.bytes.length,
        data: new Uint8Array(file.bytes),
      },
    });
    await notifyCounselors({ title: "New document to review", body: `${me.name}: ${formData.category}`, href: "/documents" });

    revalidatePath("/profile");
    revalidatePath("/inventory");
    return { success: true };
  } catch (error) {
    console.error("[student] Failed to submit document:", error);
    return { success: false, error: String(error) };
  }
}

// ---- Group Guidance: needs assessment ----

export async function getMyAssessments() {
  try {
    const me = await requireActionUser("STUDENT");
    const profile = await db.studentProfile.findUnique({ where: { name: me.name } });
    const myGrade = profile?.gradeSection.split(" - ")[0];

    const assessments = await db.needsAssessment.findMany({
      where: { isOpen: true, OR: [{ gradeLevel: "All" }, ...(myGrade ? [{ gradeLevel: myGrade }] : [])] },
      include: { responses: { where: { studentName: me.name } } },
      orderBy: { createdAt: "desc" },
    });

    return assessments.map(({ responses, ...a }) => ({ ...a, myResponse: responses[0] ?? null }));
  } catch (error) {
    console.error("[student] Failed to fetch assessments:", error);
    return [];
  }
}

export async function submitAssessmentResponse(formData: { assessmentId: string; selectedTopics: string[]; comment: string }) {
  try {
    const me = await requireActionUser("STUDENT");
    const assessment = await db.needsAssessment.findFirst({ where: { id: formData.assessmentId, isOpen: true } });
    if (!assessment) return { success: false, error: "This form is closed." };

    const selectedTopics = formData.selectedTopics.filter((t) => assessment.topics.includes(t));
    if (selectedTopics.length === 0) return { success: false, error: "Pick at least one topic." };

    await db.needsAssessmentResponse.upsert({
      where: { assessmentId_studentName: { assessmentId: assessment.id, studentName: me.name } },
      update: { selectedTopics, comment: formData.comment || null },
      create: { assessmentId: assessment.id, studentName: me.name, selectedTopics, comment: formData.comment || null },
    });

    revalidatePath("/assessments");
    revalidatePath("/groupguidance");
    return { success: true };
  } catch (error) {
    console.error("[student] Failed to submit assessment:", error);
    return { success: false, error: String(error) };
  }
}

// ---- AI Assistant (E-Gabay) ----

// The student's open chat (the newest one not yet ended), or a new empty one.
export async function getMyAiConversation() {
  try {
    const me = await requireActionUser("STUDENT");
    const existing = await db.aiConversation.findFirst({
      where: { studentName: me.name, endedAt: null },
      include: { messages: { orderBy: { createdAt: "asc" } } },
      orderBy: { createdAt: "desc" },
    });
    // A chat left idle (e.g. the tab was closed) is saved to history and a
    // fresh one starts, the same as closing the chat panel.
    const IDLE_MS = 30 * 60 * 1000;
    const idle = existing && existing.messages.length > 0 && Date.now() - existing.updatedAt.getTime() > IDLE_MS;
    if (existing && !idle) return existing;
    if (existing && idle) await db.aiConversation.update({ where: { id: existing.id }, data: { endedAt: new Date() } });

    return await db.aiConversation.create({
      data: { studentName: me.name },
      include: { messages: { orderBy: { createdAt: "asc" } } },
    });
  } catch (error) {
    console.error("[student] Failed to get or create AI conversation:", error);
    return null;
  }
}

export async function sendAiMessage(formData: { conversationId: string; content: string }) {
  try {
    const me = await requireActionUser("STUDENT");
    const conversation = await db.aiConversation.findFirst({ where: { id: formData.conversationId, studentName: me.name, endedAt: null } });
    if (!conversation) throw new Error("This chat was closed. Start a new one.");
    const content = formData.content.trim().slice(0, 1000);
    if (!content) throw new Error("Write a message first.");
    formData = { ...formData, content };

    await db.aiMessage.create({
      data: { conversationId: formData.conversationId, role: "user", content: formData.content },
    });

    // The intent classifier is single-turn (no conversation memory needed) -
    // it just classifies this message and returns a curated response.
    const reply = await getNlpReply(formData.content);

    const assistantMessage = await db.aiMessage.create({
      data: { conversationId: formData.conversationId, role: "assistant", content: reply },
    });

    await db.aiConversation.update({ where: { id: formData.conversationId }, data: { updatedAt: new Date() } });

    return { success: true, message: assistantMessage };
  } catch (error) {
    console.error("[student] Failed to send AI message:", error);
    return { success: false, error: String(error) };
  }
}

// First sign-in before this feature, or a record the office hasn't made yet:
// the student fills in their own school details once. After that only the
// guidance office can change them.
export async function completeMyStudentInfo(formData: { studentId: string; department: string; yearLevel: string; program: string; section: string }) {
  try {
    const me = await requireActionUser("STUDENT");
    if (await db.studentProfile.findUnique({ where: { name: me.name } })) {
      return { success: false, error: "Your record is already on file. Message the guidance office to change it." };
    }
    const studentId = formData.studentId.trim();
    if (!/^[A-Za-z0-9-]{4,20}$/.test(studentId)) return { success: false, error: "Enter your student ID number." };
    if (!(DEPARTMENTS as readonly string[]).includes(formData.department)) return { success: false, error: "Choose Senior High School or Tertiary." };
    if (!yearLevelsFor(formData.department).includes(formData.yearLevel)) return { success: false, error: "Choose your grade or year level." };
    if (!programsFor(formData.department).includes(formData.program)) return { success: false, error: "Choose your strand or course." };
    const section = formData.section.trim();
    if (!section || section.length > 30) return { success: false, error: "Enter your section." };

    const sameId = await db.studentProfile.findUnique({ where: { studentId } });
    if (sameId) return { success: false, error: "That student ID is already on file under another name. Please see the guidance office." };

    await db.studentProfile.create({
      data: {
        studentId,
        name: me.name,
        email: me.email,
        department: formData.department,
        yearLevel: formData.yearLevel,
        section,
        strandOrProgram: formData.program,
        gradeSection: gradeSectionLabel(formData.yearLevel, section),
      },
    });
    revalidatePath("/", "layout");
    return { success: true };
  } catch (error) {
    console.error("[student] Failed to save school info:", error);
    return { success: false, error: "Couldn't save your details. Try again." };
  }
}

// Ends the open chat and saves it to history. Empty chats are simply reused,
// so opening and closing the panel doesn't fill the history with blanks.
export async function endMyAiConversation(conversationId: string) {
  try {
    const me = await requireActionUser("STUDENT");
    const conversation = await db.aiConversation.findFirst({
      where: { id: conversationId, studentName: me.name, endedAt: null },
      select: { id: true, _count: { select: { messages: true } } },
    });
    if (!conversation || conversation._count.messages === 0) return { success: true, ended: false };
    await db.aiConversation.update({ where: { id: conversation.id }, data: { endedAt: new Date() } });
    return { success: true, ended: true };
  } catch (error) {
    console.error("[student] Failed to end AI conversation:", error);
    return { success: false, ended: false };
  }
}

// Past chats, newest first, each titled by its first question.
export async function getMyAiHistory() {
  try {
    const me = await requireActionUser("STUDENT");
    const chats = await db.aiConversation.findMany({
      where: { studentName: me.name, endedAt: { not: null } },
      select: {
        id: true,
        createdAt: true,
        endedAt: true,
        _count: { select: { messages: true } },
        messages: { where: { role: "user" }, orderBy: { createdAt: "asc" }, take: 1, select: { content: true } },
      },
      orderBy: { endedAt: "desc" },
      take: 100,
    });
    return chats.map((c) => ({
      id: c.id,
      title: c.messages[0]?.content.slice(0, 80) ?? "Chat",
      startedAt: c.createdAt,
      endedAt: c.endedAt,
      messageCount: c._count.messages,
    }));
  } catch (error) {
    console.error("[student] Failed to load AI history:", error);
    return [];
  }
}

export async function getMyAiHistoryChat(conversationId: string) {
  try {
    const me = await requireActionUser("STUDENT");
    return await db.aiConversation.findFirst({
      where: { id: conversationId, studentName: me.name },
      include: { messages: { orderBy: { createdAt: "asc" } } },
    });
  } catch (error) {
    console.error("[student] Failed to load AI chat:", error);
    return null;
  }
}
