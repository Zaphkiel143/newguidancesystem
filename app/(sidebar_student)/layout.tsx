import { AppShell } from "../../components/AppShell";
import { requireRole } from "../../lib/auth";
import db from "../../lib/db";
import { isShs } from "../config/studentLevels";

export default async function StudentLayout({ children }: { children: React.ReactNode }) {
  const user = await requireRole("STUDENT");
  // The Career Planning Program is for senior high students only.
  const profile = await db.studentProfile.findUnique({ where: { name: user.name }, select: { department: true } });
  const hiddenPaths = isShs(profile?.department) ? [] : ["/my_career"];

  return (
    <AppShell role="student" userName={user.name} hiddenPaths={hiddenPaths} avatarUrl={user.avatarType ? "/api/me/avatar" : null}>
      {children}
    </AppShell>
  );
}

