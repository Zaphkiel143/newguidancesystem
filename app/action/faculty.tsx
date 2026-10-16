"use server";

import db from "../../lib/db";
import { revalidatePath } from "next/cache";
import { requireActionUser } from "../../lib/session";
import { counselorEmails, formatAppointmentWhen, sendEmail } from "../../lib/email";
import { isBookableTime } from "../config/timeSlots";

// Every action here acts as the signed-in faculty member; names never come from the client.

// ---- Appointments ----

export async function getMyAppointments() {
  try {
    const me = await requireActionUser("FACULTY");
    return await db.appointment.findMany({
      where: { studentName: me.name },
      orderBy: [{ date: "desc" }, { time: "desc" }],
    });
  } catch (error) {
    console.error("[faculty] Failed to fetch appointments:", error);
    return [];
  }
}

export async function getBookedTimesForDate(dateString: string) {
  try {
    await requireActionUser("FACULTY");
    const targetDate = new Date(dateString);

    const [appointments, blockedSlots] = await Promise.all([
      db.appointment.findMany({ where: { date: targetDate, status: { not: "CANCELLED" } }, select: { time: true } }),
      db.blockedSlot.findMany({ where: { date: targetDate }, select: { time: true } }),
    ]);

    return Array.from(new Set([...appointments.map((a) => a.time), ...blockedSlots.map((b) => b.time)]));
  } catch (error) {
    console.error("[faculty] Failed to fetch booked times:", error);
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
    const me = await requireActionUser("FACULTY");
    const date = new Date(formData.dateString);
    if (!isBookableTime(formData.timeSlot)) {
      return { success: false, error: "Pick one of the available times (8:00 AM to 3:00 PM, no sessions 12:00–1:00 PM)." };
    }

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
        `${me.name} (Faculty) requested an appointment.\n\nWhen: ${when}\nPurpose: ${formData.appointmentType || "General"}\nNotes: ${formData.notes || "-"}\n\nOpen E-Gabay to confirm or reschedule it.`
      );
    }

    revalidatePath("/faculty_appointment");
    revalidatePath("/appointment");
    revalidatePath("/dashboard");
    return { success: true };
  } catch (error) {
    console.error("[faculty] Failed to book appointment:", error);
    return { success: false, error: String(error) };
  }
}

// ---- Messages ----

async function ownConversation(conversationId: string) {
  const me = await requireActionUser("FACULTY");
  const conversation = await db.conversation.findFirst({
    where: { id: conversationId, participantName: me.name, participantRole: "Faculty" },
  });
  if (!conversation) throw new Error("Conversation not found");
  return me;
}

export async function getMyConversation() {
  try {
    const me = await requireActionUser("FACULTY");
    const existing = await db.conversation.findFirst({
      where: { participantName: me.name, participantRole: "Faculty" },
    });
    if (existing) return existing;

    return await db.conversation.create({
      data: { participantName: me.name, participantRole: "Faculty" },
    });
  } catch (error) {
    console.error("[faculty] Failed to get or create conversation:", error);
    return null;
  }
}

export async function getMessages(conversationId: string) {
  try {
    await ownConversation(conversationId);
    return await db.message.findMany({ where: { conversationId }, orderBy: { createdAt: "asc" } });
  } catch (error) {
    console.error("[faculty] Failed to fetch messages:", error);
    return [];
  }
}

export async function markConversationRead(conversationId: string) {
  try {
    await ownConversation(conversationId);
    await db.message.updateMany({
      where: { conversationId, senderRole: { not: "Faculty" }, readAt: null },
      data: { readAt: new Date() },
    });
    return { success: true };
  } catch (error) {
    console.error("[faculty] Failed to mark conversation read:", error);
    return { success: false };
  }
}

export async function sendMessage(formData: { conversationId: string; content: string }) {
  try {
    const me = await ownConversation(formData.conversationId);
    const message = await db.message.create({
      data: {
        conversationId: formData.conversationId,
        senderRole: "Faculty",
        senderName: me.name,
        content: formData.content,
      },
    });

    await db.conversation.update({ where: { id: formData.conversationId }, data: { updatedAt: new Date() } });

    revalidatePath("/faculty_message");
    revalidatePath("/message");
    return { success: true, message };
  } catch (error) {
    console.error("[faculty] Failed to send message:", error);
    return { success: false, error: String(error) };
  }
}

// ---- Referrals ----

export async function submitReferral(formData: {
  studentName: string;
  concernType: string;
  priority: string;
  description: string;
}) {
  try {
    const me = await requireActionUser("FACULTY");
    await db.referral.create({
      data: {
        studentName: formData.studentName,
        referrerName: me.name,
        referrerRole: "Faculty",
        concernType: formData.concernType,
        priority: formData.priority,
        description: formData.description,
        status: "OPEN",
      },
    });

    revalidatePath("/referral");
    revalidatePath("/faculty_myreferral");
    revalidatePath("/dashboard");
    revalidatePath("/faculty_dashboard");
    return { success: true };
  } catch (error) {
    console.error("[faculty] Failed to submit referral:", error);
    return { success: false, error: String(error) };
  }
}

export async function getMyReferrals() {
  try {
    const me = await requireActionUser("FACULTY");
    return await db.referral.findMany({
      where: { referrerName: me.name, referrerRole: "Faculty" },
      orderBy: { createdAt: "desc" },
    });
  } catch (error) {
    console.error("[faculty] Failed to fetch referrals:", error);
    return [];
  }
}

// ---- Documents ----

export async function uploadDocument(formData: {
  fileName: string;
  fileType: string;
  fileSize: number;
  dataBase64: string;
}) {
  try {
    const me = await requireActionUser("FACULTY");
    await db.document.create({
      data: {
        uploaderName: me.name,
        uploaderRole: "Faculty",
        fileName: formData.fileName,
        fileType: formData.fileType,
        fileSize: formData.fileSize,
        data: Buffer.from(formData.dataBase64, "base64"),
      },
    });

    revalidatePath("/upload_documents");
    return { success: true };
  } catch (error) {
    console.error("[faculty] Failed to upload document:", error);
    return { success: false, error: String(error) };
  }
}

export async function getMyDocuments() {
  try {
    const me = await requireActionUser("FACULTY");
    return await db.document.findMany({
      where: { uploaderName: me.name, uploaderRole: "Faculty" },
      select: { id: true, fileName: true, fileType: true, fileSize: true, createdAt: true },
      orderBy: { createdAt: "desc" },
    });
  } catch (error) {
    console.error("[faculty] Failed to fetch documents:", error);
    return [];
  }
}

export async function deleteDocument(id: string) {
  try {
    const me = await requireActionUser("FACULTY");
    // Only your own uploads.
    const { count } = await db.document.deleteMany({ where: { id, uploaderName: me.name, uploaderRole: "Faculty" } });
    if (count === 0) return { success: false, error: "Document not found" };
    revalidatePath("/upload_documents");
    return { success: true };
  } catch (error) {
    console.error("[faculty] Failed to delete document:", error);
    return { success: false, error: String(error) };
  }
}
