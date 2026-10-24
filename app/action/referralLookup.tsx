"use server";

import db from "../../lib/db";
import { requireActionUser } from "../../lib/session";
import { allow, HOUR } from "../../lib/rateLimit";
import { isStudentId, normalizeDepartment } from "../config/studentLevels";

// Fills in the referral form from the school records when a student or
// faculty member types an exact student ID. Only what the form asks for comes
// back (name, level, year, course, section), never anything from the
// student's guidance record, and lookups are rate-limited so the ID box can't
// be used to page through the student list.
export async function lookupStudentForReferral(studentId: string) {
  try {
    const me = await requireActionUser("STUDENT", "FACULTY");
    const id = studentId.trim();
    if (!isStudentId(id)) return null;
    if (!(await allow(`referral-lookup:${me.id}`, 40, HOUR))) return null;
    const p = await db.studentProfile.findUnique({
      where: { studentId: id },
      select: { name: true, department: true, yearLevel: true, section: true, strandOrProgram: true },
    });
    if (!p || p.name === me.name) return null;
    return {
      name: p.name,
      department: normalizeDepartment(p.department),
      yearLevel: p.yearLevel ?? "",
      program: p.strandOrProgram ?? "",
      section: p.section ?? "",
    };
  } catch (error) {
    console.error("[referral] Student lookup failed:", error);
    return null;
  }
}
