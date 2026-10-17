"use server";

import db from "../../lib/db";
import { revalidatePath } from "next/cache";
import { requireActionUser } from "../../lib/session";
import { hashPassword, verifyPassword } from "../../lib/auth";
import { notifyCounselors } from "../../lib/notify";
import { normalizePhone } from "../../lib/phone";
import { announceNewReferral, checkReferral } from "../../lib/referrals";
import { counselorEmails, formatAppointmentWhen, sendEmail } from "../../lib/email";
import { announceNewBooking, checkBooking } from "../../lib/booking";

// Every action here acts as the signed-in parent. A parent's children are the
// student records the guidance office approved for them (ParentChildLink),
// never matched by name.

async function myChildProfileIds(parentId: string) {
  const links = await db.parentChildLink.findMany({
    where: { parentId, status: "APPROVED", studentProfileId: { not: null } },
    select: { studentProfileId: true },
  });
  return links.map((l) => l.studentProfileId!);
}

async function requireOwnChild(childName: string) {
  const me = await requireActionUser("PARENT");
  const ids = await myChildProfileIds(me.id);
  const child = await db.studentProfile.findFirst({ where: { id: { in: ids }, name: childName } });
  if (!child) throw new Error("This student isn't linked to your account.");
  return { me, child };
}

export async function getMyChildren() {
  try {
    const me = await requireActionUser("PARENT");
    return await db.studentProfile.findMany({
      where: { id: { in: await myChildProfileIds(me.id) } },
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
  phone?: string;
}) {
  try {
    const { me, child } = await requireOwnChild(formData.childName);
    const checked = await checkBooking(formData);
    if ("error" in checked) return { success: false, error: checked.error };
    const { date } = checked;

    await db.appointment.create({
      data: {
        date,
        time: formData.timeSlot,
        studentName: child.name,
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
    await announceNewBooking({ who: me.name, role: "Parent", forWhom: child.name, date, time: formData.timeSlot, purpose: checked.appointmentType });

    const when = formatAppointmentWhen(date, formData.timeSlot);
    for (const to of await counselorEmails()) {
      await sendEmail(
        to,
        `New appointment request for ${child.name}`,
        `${me.name} (Parent) requested an appointment for ${child.name}.\n\nWhen: ${when}\nPurpose: ${checked.appointmentType}\nNotes: ${checked.notes || "-"}\n\nOpen E-Gabay to confirm or reschedule it.`
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
    const { me, child } = await requireOwnChild(formData.studentName);
    const checked = checkReferral({ ...formData, studentName: child.name });
    if ("error" in checked) return { success: false, error: checked.error };

    await db.referral.create({
      data: { ...checked.value, referrerName: me.name, referrerRole: "Parent", status: "OPEN" },
    });
    await announceNewReferral({ ...checked.value, referrerName: me.name, referrerRole: "Parent" });

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

// ---- My profile ----

export async function getMyParentProfile() {
  try {
    const me = await requireActionUser("PARENT");
    const links = await db.parentChildLink.findMany({
      where: { parentId: me.id },
      select: { id: true, childName: true, studentIdNumber: true, relationship: true, status: true, note: true, createdAt: true },
      orderBy: { createdAt: "asc" },
    });
    return { name: me.name, phone: me.phone, email: me.email, hasPhoto: Boolean(me.avatarType), links };
  } catch (error) {
    console.error("[parent] Failed to load profile:", error);
    return null;
  }
}

export async function updateMyParentProfile(formData: { lastName: string; firstName: string; nameExtension: string; phone: string; email: string }) {
  try {
    const me = await requireActionUser("PARENT");
    const first = formData.firstName.trim().replace(/\s+/g, " ");
    const last = formData.lastName.trim().replace(/\s+/g, " ");
    if (!first || !last) return { success: false, error: "Enter your first and last name." };
    const name = [first, last, formData.nameExtension.trim()].filter(Boolean).join(" ").slice(0, 120);
    const phone = normalizePhone(formData.phone);
    if (!phone) return { success: false, error: "Enter a valid mobile number, like 0917 123 4567." };
    const email = formData.email.trim().toLowerCase();
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { success: false, error: "That email doesn't look right." };

    const [phoneTaken, emailTaken] = await Promise.all([
      db.user.findFirst({ where: { phone, id: { not: me.id } } }),
      email ? db.user.findFirst({ where: { email, id: { not: me.id } } }) : null,
    ]);
    if (phoneTaken) return { success: false, error: "That mobile number is already used by another account." };
    if (emailTaken) return { success: false, error: "That email is already used by another account." };

    // Records are linked by name, so a name change also carries over to this
    // parent's message thread, referrals and bookings.
    await db.$transaction([
      db.user.update({ where: { id: me.id }, data: { name, phone, email: email || null } }),
      db.conversation.updateMany({ where: { participantName: me.name, participantRole: "Parent" }, data: { participantName: name } }),
      db.message.updateMany({ where: { senderName: me.name, senderRole: "Parent" }, data: { senderName: name } }),
      db.referral.updateMany({ where: { referrerName: me.name, referrerRole: "Parent" }, data: { referrerName: name } }),
      db.appointment.updateMany({ where: { bookedByName: me.name, bookedByRole: "Parent" }, data: { bookedByName: name, bookedByPhone: phone } }),
    ]);
    revalidatePath("/parent_profile");
    return { success: true };
  } catch (error) {
    console.error("[parent] Failed to update profile:", error);
    return { success: false, error: "Couldn't save your profile. Try again." };
  }
}

export async function changeMyPassword(formData: { current: string; next: string }) {
  try {
    const me = await requireActionUser("PARENT");
    const row = await db.user.findUnique({ where: { id: me.id }, select: { passwordHash: true } });
    if (!row || !verifyPassword(formData.current, row.passwordHash)) return { success: false, error: "Your current password isn't right." };
    if (formData.next.length < 8) return { success: false, error: "Use a new password with at least 8 characters." };
    await db.user.update({ where: { id: me.id }, data: { passwordHash: hashPassword(formData.next) } });
    return { success: true };
  } catch (error) {
    console.error("[parent] Failed to change password:", error);
    return { success: false, error: "Couldn't change your password. Try again." };
  }
}

export async function requestChildLink(formData: { childStudentId: string; childName: string; relationship: string }) {
  try {
    const me = await requireActionUser("PARENT");
    const studentIdNumber = formData.childStudentId.trim();
    const childName = formData.childName.trim().replace(/\s+/g, " ");
    if (!/^[A-Za-z0-9-]{4,20}$/.test(studentIdNumber)) return { success: false, error: "Enter your child's student ID number." };
    if (childName.length < 3) return { success: false, error: "Enter your child's full name." };
    if (!formData.relationship.trim()) return { success: false, error: "Choose your relationship to the student." };

    const existing = await db.parentChildLink.findUnique({ where: { parentId_studentIdNumber: { parentId: me.id, studentIdNumber } } });
    if (existing && existing.status !== "REJECTED") return { success: false, error: "You already asked to link this student." };

    await db.parentChildLink.upsert({
      where: { parentId_studentIdNumber: { parentId: me.id, studentIdNumber } },
      update: { childName, relationship: formData.relationship.trim().slice(0, 40), status: "PENDING", note: null, reviewedAt: null, studentProfileId: null },
      create: { parentId: me.id, studentIdNumber, childName, relationship: formData.relationship.trim().slice(0, 40) },
    });
    await notifyCounselors({ title: "Parent asked to link another student", body: `${me.name} → ${childName} (ID ${studentIdNumber})`, href: "/accounts" });
    revalidatePath("/parent_profile");
    return { success: true };
  } catch (error) {
    console.error("[parent] Failed to request link:", error);
    return { success: false, error: "Couldn't send the request. Try again." };
  }
}
