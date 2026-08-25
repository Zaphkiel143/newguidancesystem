"use server";

import db from "../../lib/db";
import { revalidatePath } from "next/cache";

// ---- Appointments ----

export async function getMyAppointments(facultyName: string) {
  try {
    return await db.appointment.findMany({
      where: { studentName: facultyName },
      orderBy: [{ date: "desc" }, { time: "desc" }],
    });
  } catch (error) {
    console.error("[faculty] Failed to fetch appointments:", error);
    return [];
  }
}

export async function getBookedTimesForDate(dateString: string) {
  try {
    const targetDate = new Date(dateString);

    const [appointments, blockedSlots] = await Promise.all([
      db.appointment.findMany({ where: { date: targetDate }, select: { time: true } }),
      db.blockedSlot.findMany({ where: { date: targetDate }, select: { time: true } }),
    ]);

    return Array.from(new Set([...appointments.map((a) => a.time), ...blockedSlots.map((b) => b.time)]));
  } catch (error) {
    console.error("[faculty] Failed to fetch booked times:", error);
    return [];
  }
}

export async function bookAppointment(formData: {
  facultyName: string;
  dateString: string;
  timeSlot: string;
  appointmentType: string;
  notes: string;
}) {
  try {
    await db.appointment.create({
      data: {
        date: new Date(formData.dateString),
        time: formData.timeSlot,
        studentName: formData.facultyName,
        appointmentType: formData.appointmentType || null,
        notes: formData.notes || null,
        requirements: [],
        status: "PENDING",
      },
    });

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

export async function getMyConversation(facultyName: string) {
  try {
    const existing = await db.conversation.findFirst({
      where: { participantName: facultyName, participantRole: "Faculty" },
    });
    if (existing) return existing;

    return await db.conversation.create({
      data: { participantName: facultyName, participantRole: "Faculty" },
    });
  } catch (error) {
    console.error("[faculty] Failed to get or create conversation:", error);
    return null;
  }
}

export async function getMessages(conversationId: string) {
  try {
    return await db.message.findMany({ where: { conversationId }, orderBy: { createdAt: "asc" } });
  } catch (error) {
    console.error("[faculty] Failed to fetch messages:", error);
    return [];
  }
}

export async function markConversationRead(conversationId: string) {
  try {
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

export async function sendMessage(formData: { conversationId: string; senderName: string; content: string }) {
  try {
    const message = await db.message.create({
      data: {
        conversationId: formData.conversationId,
        senderRole: "Faculty",
        senderName: formData.senderName,
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
  referrerName: string;
  concernType: string;
  priority: string;
  description: string;
}) {
  try {
    await db.referral.create({
      data: {
        studentName: formData.studentName,
        referrerName: formData.referrerName,
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

export async function getMyReferrals(referrerName: string) {
  try {
    return await db.referral.findMany({
      where: { referrerName, referrerRole: "Faculty" },
      orderBy: { createdAt: "desc" },
    });
  } catch (error) {
    console.error("[faculty] Failed to fetch referrals:", error);
    return [];
  }
}

// ---- Documents ----

export async function uploadDocument(formData: {
  uploaderName: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  dataBase64: string;
}) {
  try {
    await db.document.create({
      data: {
        uploaderName: formData.uploaderName,
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

export async function getMyDocuments(uploaderName: string) {
  try {
    return await db.document.findMany({
      where: { uploaderName, uploaderRole: "Faculty" },
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
    await db.document.delete({ where: { id } });
    revalidatePath("/upload_documents");
    return { success: true };
  } catch (error) {
    console.error("[faculty] Failed to delete document:", error);
    return { success: false, error: String(error) };
  }
}
