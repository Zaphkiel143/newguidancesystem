import { CONCERN_TYPES, OTHER } from "../app/config/studentLevels";
import { notifyCounselors } from "./notify";

// Server-side checks shared by the student, faculty and parent referral actions,
// so a referral can't be saved with made-up categories or huge text.

const PRIORITIES = ["Low", "Medium", "High"];
const MAX_DESCRIPTION = 6000;

export function checkReferral(input: { studentName: string; concernType: string; priority: string; description: string }) {
  const studentName = input.studentName.trim().replace(/\s+/g, " ");
  const concernType = input.concernType.trim();
  const description = input.description.trim();

  if (studentName.length < 2 || studentName.length > 120) return { error: "Enter the student's full name." } as const;
  const knownConcern = (CONCERN_TYPES as readonly string[]).includes(concernType) && concernType !== OTHER;
  const otherConcern = /^Other: .{2,60}$/.test(concernType);
  if (!knownConcern && !otherConcern) return { error: "Choose a type of concern." } as const;
  if (!PRIORITIES.includes(input.priority)) return { error: "Choose how urgent it is." } as const;
  if (description.length < 5) return { error: "Describe the concern." } as const;
  if (description.length > MAX_DESCRIPTION) return { error: "The description is too long." } as const;

  return { value: { studentName, concernType, priority: input.priority, description } } as const;
}

export async function announceNewReferral(r: { studentName: string; referrerName: string; referrerRole: string; priority: string }) {
  await notifyCounselors({
    title: `New ${r.priority === "High" ? "high-priority " : ""}referral`,
    body: `${r.referrerRole === "Student" && r.studentName === r.referrerName ? `${r.studentName} asked for help` : `${r.referrerName} (${r.referrerRole}) referred ${r.studentName}`}`,
    href: "/referral",
  });
}
