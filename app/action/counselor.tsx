"use server";

import  db  from "../../lib/db"; // Adjust your database import
import { revalidatePath } from "next/cache";
import { TOTAL_SLOTS } from "../config/timeSlots";
import { CAREER_STEPS } from "../config/careerSteps";
import { Prisma } from "../../lib/generated";

// 1. Get overview stats for a specific date card
export async function getDateStats(dateString: string) {
  try {
    // Inside getDateStats and getAppointmentsByDate:
    const targetDate = new Date(dateString);

    const [confirmedCount, pendingCount, blockedSlots] = await Promise.all([
      db.appointment.count({
        where: { date: targetDate, status: "CONFIRMED" },
      }),
      db.appointment.count({
        where: { date: targetDate, status: "PENDING" },
      }),
      db.blockedSlot.count({
        where: { date: targetDate },
      }),
    ]);

    // Available slots drop based on confirmed appointments and blocked time slots
    const availableCount = TOTAL_SLOTS - confirmedCount - blockedSlots;

    return {
      available: Math.max(0, availableCount),
      confirmed: confirmedCount,
      pending: pendingCount,
    };
  } catch (error) {
    console.error("Failed to fetch date stats:", error);
    return { available: 0, confirmed: 0, pending: 0 };
  }
}

// 2. Fetch appointments details for the list view
export async function getAppointmentsByDate(dateString: string) {
  try {
    // Convert the string date (e.g., "2026-04-28") to a JavaScript Date object for Prisma
    const targetDate = new Date(dateString);

    return await db.appointment.findMany({
      where: { 
        date: targetDate 
      },
      orderBy: { 
        time: "asc" 
      },
    });
  } catch (error) {
    console.error("Failed to fetch appointments:", error);
    return [];
  }
}

// 3. Update appointment status (Pending, Confirmed, Cancelled/Removed)
export async function updateAppointmentStatus(id: string, status: "PENDING" | "CONFIRMED" | "CANCELLED") {
  try {
    if (status === "CANCELLED") {
      // If removed/undone, you can either delete or flag as cancelled
      await db.appointment.delete({ where: { id } });
    } else {
      await db.appointment.upsert({
  where: { id },
  update: {
    status, // fields to update if the record already exists
  },
  create: {
    id,     // include id and any other required fields for creation
    status, // fields to set if a new record is created
    date: new Date(), // You might want to adjust this based on your needs
    time: "09:00" // Placeholder time; adjust as necessary
  },
});
    }
    revalidatePath("/appointment");
    revalidatePath("/dashboard");
    return { success: true };
  } catch (error) {
    console.error("Status update error:", error);
    return { success: false };
  }
}

// 4. Block a specific time slot administratively
export async function toggleBlockTimeSlot(dateString: string, timeSlot: string) {
  try {
    const targetDate = new Date(dateString);

    const existingBlock = await db.blockedSlot.findFirst({
      where: { 
        date: targetDate, 
        time: timeSlot 
      },
    });

    if (existingBlock) {
      await db.blockedSlot.delete({ 
        where: { id: existingBlock.id } 
      });
    } else {
      await db.blockedSlot.create({
        
        data: { 
          counselorId: "default-counselor", // Add a placeholder string or actual ID if required by your schema
          date: targetDate, 
          time: timeSlot 
        },
      });
    } 
    revalidatePath("/appointment");

    // 2. Respond to the frontend so the modal can turn off the "Saving..." state
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
      try {
        // Update an existing appointment slot
        await db.appointment.update({
          where: { id: formData.appointmentId },
          data: {
            date: targetDate,
            time: formData.timeSlot,
            appointmentType: formData.appointmentType || null,
            notes: formData.notes || null,
            requirements: formData.requirements,
          },
        });
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
      // Create a new customized appointment record from scratch
      await db.appointment.create({ data: createData });
    }

    revalidatePath("/appointment");
    revalidatePath("/dashboard");
    revalidatePath("/my_appointments");
    revalidatePath("/faculty_appointment");
    revalidatePath("/parent_dashboard");
    return { success: true };

  } catch (error) {
    console.error("❌ CRITICAL DATABASE ERROR:", error);

    // Returning this forces the frontend out of the "Saving..." loop
    return { success: false, error: String(error) };
  }
}

// 6. Fetch all career guidance plans for the tracker
export async function getCareerPlans() {
  try {
    return await db.careerPlan.findMany({ orderBy: { createdAt: "desc" } });
  } catch (error) {
    console.error("Failed to fetch career plans:", error);
    return [];
  }
}

// 7. Add a new student to the career guidance tracker
export async function addCareerPlanStudent(formData: {
  studentName: string;
  studentId: string;
  grade: string;
}) {
  try {
    await db.careerPlan.create({
      data: {
        studentName: formData.studentName,
        studentId: formData.studentId,
        grade: formData.grade,
        stepDates: Array(CAREER_STEPS.length).fill(""),
      },
    });

    revalidatePath("/careerguidance");
    return { success: true };
  } catch (error) {
    console.error("Failed to add career plan student:", error);
    return { success: false, error: String(error) };
  }
}

// 8. Mark the next incomplete career guidance step as done
export async function advanceCareerPlanProgress(id: string) {
  try {
    const plan = await db.careerPlan.findUnique({ where: { id } });
    if (!plan) {
      return { success: false, error: "Career plan not found" };
    }

    const nextIncompleteIndex = plan.stepDates.findIndex((date) => date === "");
    if (nextIncompleteIndex === -1) {
      // All steps are already complete — nothing to advance
      return { success: true };
    }

    const updatedStepDates = [...plan.stepDates];
    updatedStepDates[nextIncompleteIndex] = new Date().toISOString().split("T")[0];

    await db.careerPlan.update({
      where: { id },
      data: { stepDates: updatedStepDates },
    });

    revalidatePath("/careerguidance");
    return { success: true };
  } catch (error) {
    console.error("Failed to update career plan progress:", error);
    return { success: false, error: String(error) };
  }
}

// 11. Fetch a single student's guidance history for the inventory detail view
export async function getStudentProfile(studentId: string, studentName: string) {
  try {
    const [appointments, careerPlan] = await Promise.all([
      db.appointment.findMany({
        where: { studentName },
        orderBy: { date: "desc" },
      }),
      db.careerPlan.findFirst({
        where: { studentId },
      }),
    ]);

    return { appointments, careerPlan };
  } catch (error) {
    console.error("Failed to fetch student profile:", error);
    return { appointments: [], careerPlan: null };
  }
}

// 9. Fetch all group guidance programs
export async function getGroupGuidancePrograms() {
  try {
    return await db.groupGuidanceProgram.findMany({ orderBy: { date: "asc" } });
  } catch (error) {
    console.error("Failed to fetch group guidance programs:", error);
    return [];
  }
}

// 10. Schedule a new group guidance program
export async function addGroupGuidanceProgram(formData: {
  title: string;
  gradeLevel: string;
  dateString: string;
  time: string;
}) {
  try {
    await db.groupGuidanceProgram.create({
      data: {
        title: formData.title,
        gradeLevel: formData.gradeLevel,
        date: new Date(formData.dateString),
        time: formData.time,
      },
    });

    revalidatePath("/groupguidance");
    return { success: true };
  } catch (error) {
    console.error("Failed to add group guidance program:", error);
    return { success: false, error: String(error) };
  }
}

// ---- Messages: the counselor sees and replies to every conversation ----

export async function listConversations() {
  try {
    const conversations = await db.conversation.findMany({ orderBy: { updatedAt: "desc" } });

    return await Promise.all(
      conversations.map(async (c) => {
        const [lastMessage, unreadCount] = await Promise.all([
          db.message.findFirst({ where: { conversationId: c.id }, orderBy: { createdAt: "desc" } }),
          db.message.count({
            where: { conversationId: c.id, senderRole: { not: "Counselor" }, readAt: null },
          }),
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

export async function startConversation(formData: {
  participantName: string;
  participantRole: string;
  senderName: string;
  content: string;
}) {
  try {
    const conversation = await db.conversation.create({
      data: { participantName: formData.participantName, participantRole: formData.participantRole },
    });

    await db.message.create({
      data: {
        conversationId: conversation.id,
        senderRole: "Counselor",
        senderName: formData.senderName,
        content: formData.content,
      },
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
    return await db.message.findMany({ where: { conversationId }, orderBy: { createdAt: "asc" } });
  } catch (error) {
    console.error("Failed to fetch messages:", error);
    return [];
  }
}

export async function markConversationRead(conversationId: string) {
  try {
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

export async function sendMessage(formData: { conversationId: string; senderName: string; content: string }) {
  try {
    const message = await db.message.create({
      data: {
        conversationId: formData.conversationId,
        senderRole: "Counselor",
        senderName: formData.senderName,
        content: formData.content,
      },
    });

    await db.conversation.update({ where: { id: formData.conversationId }, data: { updatedAt: new Date() } });

    revalidatePath("/message");
    return { success: true, message };
  } catch (error) {
    console.error("Failed to send message:", error);
    return { success: false, error: String(error) };
  }
}

// ---- Referrals ----

export async function listReferrals() {
  try {
    return await db.referral.findMany({ orderBy: { createdAt: "desc" } });
  } catch (error) {
    console.error("Failed to list referrals:", error);
    return [];
  }
}

export async function updateReferralStatus(id: string, status: "OPEN" | "IN_PROGRESS" | "CLOSED") {
  try {
    await db.referral.update({ where: { id }, data: { status } });
    revalidatePath("/referral");
    revalidatePath("/dashboard");
    return { success: true };
  } catch (error) {
    console.error("Failed to update referral status:", error);
    return { success: false, error: String(error) };
  }
}

export async function addReferralNotes(id: string, notes: string) {
  try {
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
      data: {
        conversationId: conversation.id,
        senderRole: "Counselor",
        senderName: "Ralph Michael",
        content,
      },
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

// ---- Dashboard overview stats ----

export async function getDashboardStats() {
  try {
    const [totalStudents, pendingReferrals, activeCareerPlans] = await Promise.all([
      db.user.count({ where: { role: "STUDENT" } }),
      db.referral.count({ where: { status: { not: "CLOSED" } } }),
      db.careerPlan.count(),
    ]);

    return { totalStudents, pendingReferrals, activeCareerPlans };
  } catch (error) {
    console.error("Failed to fetch dashboard stats:", error);
    return { totalStudents: 0, pendingReferrals: 0, activeCareerPlans: 0 };
  }
}
