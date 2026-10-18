import { redirect } from "next/navigation";
import { requireRole } from "../../../lib/auth";
import db from "../../../lib/db";
import { normalizeDepartment, TERTIARY } from "../../config/studentLevels";

// The Career Planning Form is for tertiary students; senior high students
// follow the Career Planning Program (My Career Plan) instead.
export default async function CareerFormLayout({ children }: { children: React.ReactNode }) {
  const user = await requireRole("STUDENT");
  const profile = await db.studentProfile.findUnique({ where: { name: user.name }, select: { department: true } });
  if (normalizeDepartment(profile?.department) !== TERTIARY) redirect("/student_dashboard");
  return children;
}
