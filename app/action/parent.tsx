"use server";

import db from "../../lib/db";
import { revalidatePath } from "next/cache";
import { requireActionUser } from "../../lib/session";
import { counselorEmails, formatAppointmentWhen, sendEmail } from "../../lib/email";

// Every action here acts as the signed-in parent. A parent's children are the
// student profiles whose parentName matches the parent's account name.

async function requireOwnChild(childName: string) {
  const me = await requireActionUser("PARENT");
  const child = await db.studentProfile.findFirst({ where: { name: childName, parentName: me.name } });
  if (!child) throw new Error("This student isn't linked to your account.");
  return { me, child };
}

export async function getMyChildren() {
  try {
    const me = await requireActionUser("PARENT");
    return await db.studentProfile.findMany({
      where: { parentName: me.name },
      select: { name: true, studentId: true, gradeSection: true },
      orderBy: { name: "asc" },
    });
  } catch (error) {
    console.error("[parent] Failed to fetch children:", error);
    return [];
  }
}

// ---- Appointments (booked on behalf of a child) ----

export async function getBookedTimesForDate(dateString: string) {
  try {
    await requireActionUser("PARENT");
    const targetDate = new Date(dateString);

    const [appointments, blockedSlots] = await Promise.all([
      db.appointment.findMany({ where: { date: targetDate, status: { not: "CANCELLED" } }, select: { time: true } }),
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
    const { me, child } = await requireOwnChild(formData.childName);
    const date = new Date(formData.dateString);

    const taken = await db.appointment.findFirst({
      where: { date, time: formData.timeSlot, status: { not: "CANCELLED" } },
    });
    if (taken) return { success: false, error: "That slot was just taken. Please pick another time." };

    await db.appointment.create({
      data: {
        date,
        time: formData.timeSlot,
        studentName: child.name,
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
        `New appointment request for ${child.name}`,
        `${me.name} (Parent) requested an appointment for ${child.name}.\n\nWhen: ${when}\nPurpose: ${formData.appointmentType || "General"}\nNotes: ${formData.notes || "-"}\n\nOpen E-Gabay to confirm or reschedule it.`
      );
    }

    revalidatePath("/parent_dashboard");
    revalidatePath("/child_profile");
    revalidatePath("/appointment");
    revalidatePath("/dashboard");
    return { success: true };
  } catch (error) {
    console.error("[parent] Failed to book appointment:", error);
    return { success: false, error: String(error) };
  }
}

// ---- Messages ----

async function ownConversation(conversationId: string) {
  const me = await requireActionUser("PARENT");
  const conversation = await db.conversation.findFirst({
    where: { id: conversationId, participantName: me.name, participantRole: "Parent" },
  });
  if (!conversation) throw new Error("Conversation not found");
  return me;
}

export async function getMyConversation() {
  try {
    const me = await requireActionUser("PARENT");
    const existing = await db.conversation.findFirst({
      where: { participantName: me.name, participantRole: "Parent" },
    });
    if (existing) return existing;

    return await db.conversation.create({
      data: { participantName: me.name, participantRole: "Parent" },
    });
  } catch (error) {
    console.error("[parent] Failed to get or create conversation:", error);
    return null;
  }
}

export async function getMessages(conversationId: string) {
  try {
    await ownConversation(conversationId);
    return await db.message.findMany({ where: { conversationId }, orderBy: { createdAt: "asc" } });
  } catch (error) {
    console.error("[parent] Failed to fetch messages:", error);
    return [];
  }
}

export async function markConversationRead(conversationId: string) {
  try {
    await ownConversation(conversationId);
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

export async function sendMessage(formData: { conversationId: string; content: string }) {
  try {
    const me = await ownConversation(formData.conversationId);
    const message = await db.message.create({
      data: {
        conversationId: formData.conversationId,
        senderRole: "Parent",
        senderName: me.name,
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

// ---- Referrals ----

export async function submitReferral(formData: {
  studentName: string;
  concernType: string;
  priority: string;
  description: string;
}) {
  try {
    const me = await requireActionUser("PARENT");
    await db.referral.create({
      data: {
        studentName: formData.studentName,
        referrerName: me.name,
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

export async function getMyReferrals() {
  try {
    const me = await requireActionUser("PARENT");
    return await db.referral.findMany({
      where: { referrerName: me.name, referrerRole: "Parent" },
      orderBy: { createdAt: "desc" },
    });
  } catch (error) {
    console.error("[parent] Failed to fetch referrals:", error);
    return [];
  }
}

// ---- Child profile ----

// Parents see their child's profile, appointments and career plan progress,
// never counselor notes or other students' records.
export async function getChildProfile(childName: string) {
  try {
    const { child } = await requireOwnChild(childName);
    const [appointments, careerPlan] = await Promise.all([
      db.appointment.findMany({
        where: { studentName: child.name, status: { not: "CANCELLED" } },
        select: { id: true, date: true, time: true, appointmentType: true, status: true },
        orderBy: { date: "desc" },
      }),
      db.careerPlan.findFirst({ where: { studentName: child.name } }),
    ]);

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { counselorNotes, familyBackground, ...shareable } = child;
    return {
      profile: shareable,
      appointments,
      careerPlan: careerPlan && { grade: careerPlan.grade, stepDates: careerPlan.stepDates },
    };
  } catch (error) {
    console.error("[parent] Failed to fetch child profile:", error);
    return null;
  }
}
