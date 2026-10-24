import { AppShell } from "../../components/AppShell";
import { requireRole } from "../../lib/auth";
import db from "../../lib/db";
import { isShs, isTertiaryLike } from "../config/studentLevels";

export default async function StudentLayout({ children }: { children: React.ReactNode }) {
  const user = await requireRole("STUDENT");
  // Senior high students follow the Career Planning Program (My Career Plan)
  const profile = await db.studentProfile.findUnique({ where: { name: user.name }, select: { department: true } });
  const hiddenPaths = [!isShs(profile?.department) && "/my_career", !isTertiaryLike(profile?.department) && "/career_form"].filter(Boolean) as string[];

  return (
    <AppShell role="student" userName={user.name} hiddenPaths={hiddenPaths} avatarUrl={user.avatarType ? "/api/me/avatar" : null} needsPrivacyConsent={!user.privacyAcceptedAt}>
      {children}
    </AppShell>
  );
}

