"use server";

import db from "../../lib/db";
import { requireActionUser } from "../../lib/session";

// Monthly report for the Guidance and Counseling Office (Guidance Associates only).
// "month" is YYYY-MM in Philippine time.

type Count = { label: string; count: number };

function tally(values: (string | null | undefined)[]): Count[] {
  const map = new Map<string, number>();
  for (const v of values) {
    const key = !v ? "Not specified" : v.startsWith("Other: ") ? "Other/s" : v;
    map.set(key, (map.get(key) ?? 0) + 1);
  }
  return [...map.entries()].map(([label, count]) => ({ label, count })).sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
}

const INTENT_LABEL: Record<string, string> = {
  greeting: "Greetings",
  thanks: "Thanks",
  goodbye: "Goodbyes",
  exam_stress: "Exam stress",
  time_management: "Time management",
  career_question: "Career / course questions",
  bullying: "Bullying",
  family_problems: "Family problems",
  friendship_issues: "Friendship issues",
  self_esteem: "Self-esteem",
  crisis: "Crisis (urgent)",
  book_appointment: "How to book",
  walk_in: "Walk-in questions",
  office_hours: "Office hours",
  no_record: "\"Will I get a record?\"",
  worried_about_someone: "Worried about a classmate",
  services_offered: "GCO services",
  seek_help: "Asking for help",
  fallback: "Not understood",
};

export async function getMonthlyReport(month: string) {
  await requireActionUser("COUNSELOR");
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) throw new Error("Choose a month.");
  const [y, m] = month.split("-").map(Number);
  const nextMonth = m === 12 ? `${y + 1}-01` : `${y}-${String(m + 1).padStart(2, "0")}`;
  // Calendar-day fields (appointment and session dates) are stored as UTC midnight;
  // moments (createdAt) use Philippine time boundaries.
  const dayStart = new Date(`${month}-01T00:00:00Z`);
  const dayEnd = new Date(`${nextMonth}-01T00:00:00Z`);
  const start = new Date(`${month}-01T00:00:00+08:00`);
  const end = new Date(`${nextMonth}-01T00:00:00+08:00`);
  const inMonth = { gte: start, lt: end };

  const [appointments, referrals, responses, groupSessions, documents, newStudents, assistantMessages, forwarded] = await Promise.all([
    db.appointment.findMany({
      where: { date: { gte: dayStart, lt: dayEnd } },
      select: { status: true, appointmentType: true, bookedByRole: true, studentName: true },
    }),
    db.referral.findMany({ where: { createdAt: inMonth }, select: { concernType: true, status: true, referrerRole: true, priority: true } }),
    db.needsAssessmentResponse.findMany({ where: { createdAt: inMonth }, select: { selectedTopics: true } }),
    db.groupGuidanceProgram.findMany({ where: { date: { gte: dayStart, lt: dayEnd } }, select: { title: true, participants: true, gradeLevel: true } }),
    db.document.findMany({ where: { createdAt: inMonth }, select: { reviewStatus: true, uploaderRole: true } }),
    db.studentProfile.count({ where: { createdAt: inMonth } }),
    db.aiMessage.findMany({ where: { createdAt: inMonth, role: "assistant" }, select: { intent: true, forwardedAt: true } }),
    db.aiMessage.count({ where: { forwardedAt: inMonth } }),
  ]);

  const held = appointments.filter((a) => a.status !== "CANCELLED");

  // One row per Daily Log entry for the dashboard, with the student's program and
  // level looked up from their record (sessions are linked to students by name).
  const names = [...new Set(held.map((a) => a.studentName).filter((n): n is string => !!n))];
  const profiles = names.length
    ? await db.studentProfile.findMany({ where: { name: { in: names } }, select: { name: true, strandOrProgram: true, yearLevel: true } })
    : [];
  const profileByName = new Map(profiles.map((p) => [p.name, p]));
  const logs = held.map((a) => {
    const profile = a.studentName ? profileByName.get(a.studentName) : undefined;
    const staff = !profile && a.bookedByRole === "Faculty";
    return {
      nature: !a.appointmentType ? "Not specified" : a.appointmentType.startsWith("Other: ") ? "Other/s" : a.appointmentType,
      program: profile?.strandOrProgram || (staff ? "Faculty/Staff" : "Not specified"),
      level: profile?.yearLevel || (staff ? "Faculty/Staff" : "Not specified"),
      contact: a.bookedByRole ?? "Guidance office",
      status: a.status,
    };
  });

  const topics = tally(responses.flatMap((r) => r.selectedTopics));
  const intents = tally(assistantMessages.map((a) => a.intent ?? "fallback")).map((c) => ({ ...c, label: INTENT_LABEL[c.label] ?? c.label }));

  return {
    month,
    logs,
    sessions: {
      total: held.length,
      confirmed: held.filter((a) => a.status === "CONFIRMED").length,
      completed: held.filter((a) => a.status === "COMPLETED").length,
      pending: held.filter((a) => a.status === "PENDING").length,
      cancelled: appointments.length - held.length,
      uniqueStudents: new Set(held.map((a) => a.studentName).filter(Boolean)).size,
      byPurpose: tally(held.map((a) => a.appointmentType)),
      byBooker: tally(held.map((a) => a.bookedByRole ?? "Guidance office")),
    },
    referrals: {
      total: referrals.length,
      byConcern: tally(referrals.map((r) => r.concernType)),
      byStatus: tally(referrals.map((r) => (r.status === "IN_PROGRESS" ? "In progress" : r.status === "CLOSED" ? "Terminated" : "Open"))),
      bySource: tally(referrals.map((r) => r.referrerRole)),
      highPriority: referrals.filter((r) => r.priority === "High" || r.priority === "Emergency").length,
    },
    needsAssessment: { responses: responses.length, topTopics: topics.slice(0, 8) },
    groupGuidance: {
      sessions: groupSessions.length,
      participants: groupSessions.reduce((n, g) => n + g.participants, 0),
      list: groupSessions.map((g) => ({ label: `${g.title} (${g.gradeLevel})`, count: g.participants })),
    },
    documents: {
      submitted: documents.length,
      accepted: documents.filter((d) => d.reviewStatus === "APPROVED").length,
      notAccepted: documents.filter((d) => d.reviewStatus === "REJECTED").length,
      waiting: documents.filter((d) => d.reviewStatus === "PENDING").length,
    },
    newStudents,
    chatbot: {
      replies: assistantMessages.length,
      understoodRate: assistantMessages.length
        ? Math.round((assistantMessages.filter((a) => a.intent && a.intent !== "fallback").length / assistantMessages.length) * 100)
        : null,
      forwarded,
      crisis: assistantMessages.filter((a) => a.intent === "crisis").length,
      topTopics: intents.slice(0, 8),
    },
  };
}
