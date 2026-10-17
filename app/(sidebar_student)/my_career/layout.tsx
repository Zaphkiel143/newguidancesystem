import { redirect } from "next/navigation";
import { requireRole } from "../../../lib/auth";
import db from "../../../lib/db";
import { isShs } from "../../config/studentLevels";

// The Career Planning Program is for senior high students only; tertiary
// students (or students without a school record yet) are sent back.
export default async function MyCareerLayout({ children }: { children: React.ReactNode }) {
  const user = await requireRole("STUDENT");
  const profile = await db.studentProfile.findUnique({ where: { name: user.name }, select: { department: true } });
  if (!isShs(profile?.department)) redirect("/student_dashboard");
  return children;
}
