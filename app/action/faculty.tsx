"use server";

import db from "../../lib/db";
import { revalidatePath } from "next/cache";
import { requireActionUser } from "../../lib/session";
import { allow, DAY, HOUR, MINUTE, SLOW_DOWN } from "../../lib/rateLimit";
import { counselorEmails, formatAppointmentWhen, sendEmail } from "../../lib/email";
import { announceNewBooking, checkBooking } from "../../lib/booking";
import { parseTimeToMinutes } from "../config/timeSlots";
import { announceNewReferral, checkReferral } from "../../lib/referrals";
import { checkDocument } from "../../lib/documents";
import { notifyCounselors } from "../../lib/notify";
import { logActivity } from "../../lib/activityLog";

// Every action here acts as the signed-in faculty member; names never come from the client

// Appointments

export async function getMyAppointments() {
  try {
    const me = await requireActionUser("FACULTY");
    const rows = await db.appointment.findMany({ where: { studentName: me.name } });
    // Newest first, by date then clock time (times are text like "8:00 AM")
    return rows.sort((x, y) => y.date.getTime() - x.date.getTime() || parseTimeToMinutes(y.time) - parseTimeToMinutes(x.time));
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
  phone?: string;
}) {
  try {
    const me = await requireActionUser("FACULTY");
    const checked = await checkBooking(formData);
    if ("error" in checked) return { success: false, error: checked.error };
    const pending = await db.appointment.count({
      where: { bookedByName: me.name, bookedByRole: me.roleLabel, status: "PENDING", date: { gte: checked.date } },
    });
    if (pending >= 3) return { success: false, error: "You already have 3 requests waiting for confirmation. Wait for the guidance office to confirm them first." };
    if (!(await allow(`booking:${me.id}`, 5, HOUR))) return { success: false, error: SLOW_DOWN };
    const { date } = checked;

    const appt = await db.appointment.create({
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
    await logActivity(me, "Booked an appointment", "Appointment", appt.id, checked.appointmentType);

    const when = formatAppointmentWhen(date, formData.timeSlot);
    for (const to of await counselorEmails()) {
      await sendEmail(
        to,
        `New appointment request: ${me.name}`,
        `${me.name} (Faculty) requested an appointment.\n\nWhen: ${when}\nPurpose: ${checked.appointmentType}\nNotes: ${checked.notes || "-"}\n\nOpen E-Gabay to confirm or reschedule it.`
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

// Messages

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
    const content = formData.content.trim().slice(0, 2000);
    if (!content) return { success: false, error: "Write a message first." };
    if (!(await allow(`message:${me.id}`, 20, 10 * MINUTE))) return { success: false, error: SLOW_DOWN };
    formData = { ...formData, content };
    const message = await db.message.create({
      data: {
        conversationId: formData.conversationId,
        senderRole: "Faculty",
        senderName: me.name,
        content: formData.content,
      },
    });

    await db.conversation.update({ where: { id: formData.conversationId }, data: { updatedAt: new Date() } });
    await logActivity(me, "Sent a message to the guidance office", "Message", message.id);

    revalidatePath("/faculty_message");
    revalidatePath("/message");
    return { success: true, message };
  } catch (error) {
    console.error("[faculty] Failed to send message:", error);
    return { success: false, error: String(error) };
  }
}

export async function deleteConversation(conversationId: string) {
  try {
    const me = await ownConversation(conversationId);
    await db.message.deleteMany({ where: { conversationId } });
    await db.conversation.delete({ where: { id: conversationId } });
    await logActivity(me, "Deleted a conversation", "Conversation", conversationId);

    revalidatePath("/faculty_message");
    revalidatePath("/message");
    return { success: true };
  } catch (error) {
    console.error("[faculty] Failed to delete conversation:", error);
    return { success: false, error: String(error) };
  }
}

// Referrals

export async function submitReferral(formData: {
  studentName: string;
  concernType: string;
  priority: string;
  description: string;
}) {
  try {
    const me = await requireActionUser("FACULTY");
    const checked = checkReferral(formData);
    if ("error" in checked) return { success: false, error: checked.error };
    if (!(await allow(`referral:${me.id}`, 5, HOUR)) || !(await allow(`referral-day:${me.id}`, 15, DAY))) {
      return { success: false, error: SLOW_DOWN };
    }

    const referral = await db.referral.create({
      data: { ...checked.value, referrerName: me.name, referrerRole: "Faculty", status: "OPEN" },
    });
    await announceNewReferral({ ...checked.value, referrerName: me.name, referrerRole: "Faculty" });
    await logActivity(me, "Submitted a referral", "Referral", referral.id, checked.value.studentName);

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

// Documents

export async function uploadDocument(formData: {
  fileName: string;
  fileType: string;
  fileSize: number;
  dataBase64: string;
}) {
  try {
    const me = await requireActionUser("FACULTY");
    const file = checkDocument(formData.dataBase64, formData.fileName);
    if (!file.ok) return { success: false, error: file.error };
    const waiting = await db.document.count({ where: { uploaderName: me.name, uploaderRole: "Faculty", reviewStatus: "PENDING" } });
    if (waiting >= 20) return { success: false, error: "You have 20 documents waiting for review. Wait for the guidance office to check them first." };

    const doc = await db.document.create({
      data: {
        uploaderName: me.name,
        uploaderRole: "Faculty",
        fileName: file.fileName,
        fileType: file.type,
        fileSize: file.bytes.length,
        data: new Uint8Array(file.bytes),
      },
    });
    await notifyCounselors({ title: "New document to review", body: `${me.name} (faculty): ${file.fileName}`, href: "/documents" });
    await logActivity(me, "Uploaded a document", "Document", doc.id, file.fileName);

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
      select: { id: true, fileName: true, fileType: true, fileSize: true, createdAt: true, reviewStatus: true, reviewNote: true },
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
    // Only your own uploads
    const { count } = await db.document.deleteMany({ where: { id, uploaderName: me.name, uploaderRole: "Faculty" } });
    if (count === 0) return { success: false, error: "Document not found" };
    await logActivity(me, "Deleted a document", "Document", id);
    revalidatePath("/upload_documents");
    return { success: true };
  } catch (error) {
    console.error("[faculty] Failed to delete document:", error);
    return { success: false, error: String(error) };
  }
}
