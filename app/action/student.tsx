"use server";

import db from "../../lib/db";
import { revalidatePath } from "next/cache";
import { getNlpReply } from "../../lib/nlp";
import { requireActionUser } from "../../lib/session";
import { counselorEmails, formatAppointmentWhen, sendEmail } from "../../lib/email";

// Every action here acts as the signed-in student; names never come from the client.

// ---- Appointments ----

export async function getMyAppointments() {
  try {
    const me = await requireActionUser("STUDENT");
    return await db.appointment.findMany({
      where: { studentName: me.name },
      orderBy: [{ date: "desc" }, { time: "desc" }],
    });
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
}) {
  try {
    const me = await requireActionUser("STUDENT");
    const date = new Date(formData.dateString);

    const taken = await db.appointment.findFirst({
      where: { date, time: formData.timeSlot, status: { not: "CANCELLED" } },
    });
    if (taken) return { success: false, error: "That slot was just taken. Please pick another time." };

    await db.appointment.create({
      data: {
        date,
        time: formData.timeSlot,
        studentName: me.name,
        appointmentType: formData.appointmentType || null,
        notes: formData.notes || null,
        requirements: [],
        status: "PENDING",
        bookedByName: me.name,
        bookedByRole: me.roleLabel,
        bookedByEmail: me.email,
      },
    });

    const when = formatAppointmentWhen(date, formData.timeSlot);
    for (const to of await counselorEmails()) {
      await sendEmail(
        to,
        `New appointment request: ${me.name}`,
        `${me.name} (Student) requested an appointment.\n\nWhen: ${when}\nPurpose: ${formData.appointmentType || "General"}\nNotes: ${formData.notes || "-"}\n\nOpen E-Gabay to confirm or reschedule it.`
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
    const studentName = formData.aboutMyself ? me.name : formData.studentName.trim();
    if (!studentName) return { success: false, error: "Please enter the student's name." };

    await db.referral.create({
      data: {
        studentName,
        referrerName: me.name,
        referrerRole: "Student",
        concernType: formData.concernType,
        priority: formData.priority,
        description: formData.description,
        status: "OPEN",
      },
    });

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

export async function getMyCareerPlan() {
  try {
    const me = await requireActionUser("STUDENT");
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
        select: { id: true, fileName: true, fileType: true, fileSize: true, category: true, createdAt: true },
        orderBy: { createdAt: "desc" },
      }),
    ]);
    return { name: me.name, email: me.email, profile, appointments, documents };
  } catch (error) {
    console.error("[student] Failed to fetch profile:", error);
    return null;
  }
}

const MAX_DOCUMENT_BYTES = 5 * 1024 * 1024;

export async function submitStudentDocument(formData: {
  category: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  dataBase64: string;
}) {
  try {
    const me = await requireActionUser("STUDENT");
    if (formData.fileSize > MAX_DOCUMENT_BYTES) return { success: false, error: "Files must be 5 MB or smaller." };

    await db.document.create({
      data: {
        uploaderName: me.name,
        uploaderRole: "Student",
        studentName: me.name,
        category: formData.category,
        fileName: formData.fileName,
        fileType: formData.fileType,
        fileSize: formData.fileSize,
        data: Buffer.from(formData.dataBase64, "base64"),
      },
    });

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

export async function getMyAiConversation() {
  try {
    const me = await requireActionUser("STUDENT");
    const existing = await db.aiConversation.findUnique({
      where: { studentName: me.name },
      include: { messages: { orderBy: { createdAt: "asc" } } },
    });
    if (existing) return existing;

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
    const conversation = await db.aiConversation.findFirst({ where: { id: formData.conversationId, studentName: me.name } });
    if (!conversation) throw new Error("Conversation not found");

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
