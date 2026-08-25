"use server";

import db from "../../lib/db";
import { revalidatePath } from "next/cache";

// ---- Appointments ----

export async function getMyAppointments(studentName: string) {
  try {
    return await db.appointment.findMany({
      where: { studentName },
      orderBy: [{ date: "desc" }, { time: "desc" }],
    });
  } catch (error) {
    console.error("[student] Failed to fetch appointments:", error);
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
    console.error("[student] Failed to fetch booked times:", error);
    return [];
  }
}

export async function bookAppointment(formData: {
  studentName: string;
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
        studentName: formData.studentName,
        appointmentType: formData.appointmentType || null,
        notes: formData.notes || null,
        requirements: [],
        status: "PENDING",
      },
    });

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

export async function getMyConversation(studentName: string) {
  try {
    const existing = await db.conversation.findFirst({
      where: { participantName: studentName, participantRole: "Student" },
    });
    if (existing) return existing;

    return await db.conversation.create({
      data: { participantName: studentName, participantRole: "Student" },
    });
  } catch (error) {
    console.error("[student] Failed to get or create conversation:", error);
    return null;
  }
}

export async function getMessages(conversationId: string) {
  try {
    return await db.message.findMany({ where: { conversationId }, orderBy: { createdAt: "asc" } });
  } catch (error) {
    console.error("[student] Failed to fetch messages:", error);
    return [];
  }
}

export async function markConversationRead(conversationId: string) {
  try {
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

export async function sendMessage(formData: { conversationId: string; senderName: string; content: string }) {
  try {
    const message = await db.message.create({
      data: {
        conversationId: formData.conversationId,
        senderRole: "Student",
        senderName: formData.senderName,
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
        referrerRole: "Student",
        concernType: formData.concernType,
        priority: formData.priority,
        description: formData.description,
        status: "OPEN",
      },
    });

    revalidatePath("/referral");
    revalidatePath("/dashboard");
    return { success: true };
  } catch (error) {
    console.error("[student] Failed to submit referral:", error);
    return { success: false, error: String(error) };
  }
}
