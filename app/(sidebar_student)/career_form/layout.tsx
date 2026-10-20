import { redirect } from "next/navigation";
import { requireRole } from "../../../lib/auth";
import db from "../../../lib/db";
import { IRREGULAR, normalizeDepartment, OFF_TERM, TERTIARY } from "../../config/studentLevels";

// The Career Planning Form is for tertiary (incl. irregular/off term)
// students; senior high students follow the Career Planning Program (My
// Career Plan) instead.
export default async function CareerFormLayout({ children }: { children: React.ReactNode }) {
  const user = await requireRole("STUDENT");
  const profile = await db.studentProfile.findUnique({ where: { name: user.name }, select: { department: true } });
  const level = normalizeDepartment(profile?.department);
  if (level !== TERTIARY && level !== IRREGULAR && level !== OFF_TERM) redirect("/student_dashboard");
  return children;
}
