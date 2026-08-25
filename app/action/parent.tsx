"use server";

import db from "../../lib/db";
import { revalidatePath } from "next/cache";

// ---- Appointments (booked on behalf of a child) ----

export async function getBookedTimesForDate(dateString: string) {
  try {
    const targetDate = new Date(dateString);

    const [appointments, blockedSlots] = await Promise.all([
      db.appointment.findMany({ where: { date: targetDate }, select: { time: true } }),
      db.blockedSlot.findMany({ where: { date: targetDate }, select: { time: true } }),
    ]);

    return Array.from(new Set([...appointments.map((a) => a.time), ...blockedSlots.map((b) => b.time)]));
  } catch (error) {
    console.error("[parent] Failed to fetch booked times:", error);
    return [];
  }
}

export async function bookAppointment(formData: {
  childName: string;
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
        studentName: formData.childName,
        appointmentType: formData.appointmentType || null,
        notes: formData.notes || null,
        requirements: [],
        status: "PENDING",
      },
    });

    revalidatePath("/parent_dashboard");
    revalidatePath("/appointment");
    revalidatePath("/dashboard");
    return { success: true };
  } catch (error) {
    console.error("[parent] Failed to book appointment:", error);
    return { success: false, error: String(error) };
  }
}

export async function getChildAppointments(childName: string) {
  try {
    return await db.appointment.findMany({
      where: { studentName: childName },
      orderBy: [{ date: "desc" }, { time: "desc" }],
    });
  } catch (error) {
    console.error("[parent] Failed to fetch child appointments:", error);
    return [];
  }
}

// ---- Messages ----

export async function getMyConversation(parentName: string) {
  try {
    const existing = await db.conversation.findFirst({
      where: { participantName: parentName, participantRole: "Parent" },
    });
    if (existing) return existing;

    return await db.conversation.create({
      data: { participantName: parentName, participantRole: "Parent" },
    });
  } catch (error) {
    console.error("[parent] Failed to get or create conversation:", error);
    return null;
  }
}

export async function getMessages(conversationId: string) {
  try {
    return await db.message.findMany({ where: { conversationId }, orderBy: { createdAt: "asc" } });
  } catch (error) {
    console.error("[parent] Failed to fetch messages:", error);
    return [];
  }
}

export async function markConversationRead(conversationId: string) {
  try {
    await db.message.updateMany({
      where: { conversationId, senderRole: { not: "Parent" }, readAt: null },
      data: { readAt: new Date() },
    });
    return { success: true };
  } catch (error) {
    console.error("[parent] Failed to mark conversation read:", error);
    return { success: false };
  }
}

export async function sendMessage(formData: { conversationId: string; senderName: string; content: string }) {
  try {
    const message = await db.message.create({
      data: {
        conversationId: formData.conversationId,
        senderRole: "Parent",
        senderName: formData.senderName,
        content: formData.content,
      },
    });

    await db.conversation.update({ where: { id: formData.conversationId }, data: { updatedAt: new Date() } });

    revalidatePath("/parent_message");
    revalidatePath("/message");
    return { success: true, message };
  } catch (error) {
    console.error("[parent] Failed to send message:", error);
    return { success: false, error: String(error) };
  }
}

// ---- Referrals (submitted on behalf of a child) ----

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
        referrerRole: "Parent",
        concernType: formData.concernType,
        priority: formData.priority,
        description: formData.description,
        status: "OPEN",
      },
    });

    revalidatePath("/referral");
    revalidatePath("/parent_myreferral");
    revalidatePath("/dashboard");
    return { success: true };
  } catch (error) {
    console.error("[parent] Failed to submit referral:", error);
    return { success: false, error: String(error) };
  }
}

export async function getMyReferrals(referrerName: string) {
  try {
    return await db.referral.findMany({
      where: { referrerName, referrerRole: "Parent" },
      orderBy: { createdAt: "desc" },
    });
  } catch (error) {
    console.error("[parent] Failed to fetch referrals:", error);
    return [];
  }
}

// ---- Child profile ----

export async function getChildProfile(childName: string) {
  try {
    const [appointments, careerPlan] = await Promise.all([
      db.appointment.findMany({ where: { studentName: childName }, orderBy: { date: "desc" } }),
      db.careerPlan.findFirst({ where: { studentName: childName } }),
    ]);

    return { appointments, careerPlan };
  } catch (error) {
    console.error("[parent] Failed to fetch child profile:", error);
    return { appointments: [], careerPlan: null };
  }
}
