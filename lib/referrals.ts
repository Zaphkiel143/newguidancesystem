import { notifyCounselors } from "./notify";
import { getOptionList } from "../app/action/optionLists";
import { optionValue } from "./optionListDefaults";

// Server-side checks shared by the student, faculty and parent referral actions,
// so a referral can't be saved with made-up categories or huge text.

// Students and parents pick Low/Medium/High (the "priorities" option list);
// faculty pick from a deadline-oriented scale instead, the "facultyPriorities"
// list (see components/ReferralForm.tsx). A referral can carry either scale's
// value regardless of who submitted it (e.g. a parent submitting on a
// student's behalf), so both lists are accepted here.
const MAX_DESCRIPTION = 6000;

export async function checkReferral(input: { studentName: string; concernType: string; priority: string; description: string }) {
  const studentName = input.studentName.trim().replace(/\s+/g, " ");
  const concernType = input.concernType.trim();
  const description = input.description.trim();

  if (studentName.length < 2 || studentName.length > 120) return { error: "Enter the student's full name." } as const;
  const [concernTypes, priorities, facultyPriorities] = await Promise.all([
    getOptionList("concernTypes"),
    getOptionList("priorities"),
    getOptionList("facultyPriorities"),
  ]);
  const knownConcern = concernTypes.some((c) => optionValue(c) === concernType);
  const otherConcern = /^Other: .{2,60}$/.test(concernType);
  if (!knownConcern && !otherConcern) return { error: "Choose a type of concern." } as const;
  const knownPriority = [...priorities, ...facultyPriorities].some((p) => optionValue(p) === input.priority);
  if (!knownPriority) return { error: "Choose how urgent it is." } as const;
  if (description.length < 5) return { error: "Describe the concern." } as const;
  if (description.length > MAX_DESCRIPTION) return { error: "The description is too long." } as const;

  return { value: { studentName, concernType, priority: input.priority, description } } as const;
}

export async function announceNewReferral(r: { studentName: string; referrerName: string; referrerRole: string; priority: string }) {
  await notifyCounselors({
    title: `New ${r.priority === "High" || r.priority === "Emergency" ? "high-priority " : ""}referral`,
    body: `${r.referrerRole === "Student" && r.studentName === r.referrerName ? `${r.studentName} asked for help` : `${r.referrerName} (${r.referrerRole}) referred ${r.studentName}`}`,
    href: "/referral",
  });
}
