import { redirect } from "next/navigation";
import { requireRole } from "../../../lib/auth";
import db from "../../../lib/db";
import { isTertiaryLike } from "../../config/studentLevels";

// The Career Planning Form is for tertiary-like (incl. irregular/off term) students
export default async function CareerFormLayout({ children }: { children: React.ReactNode }) {
  const user = await requireRole("STUDENT");
  const profile = await db.studentProfile.findUnique({ where: { name: user.name }, select: { department: true } });
  if (!isTertiaryLike(profile?.department)) redirect("/student_dashboard");
  return children;
}
