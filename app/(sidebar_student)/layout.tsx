import { AppShell } from "../../components/AppShell";
import { requireRole } from "../../lib/auth";
import db from "../../lib/db";
import { IRREGULAR, normalizeDepartment, SHS, TERTIARY } from "../config/studentLevels";

export default async function StudentLayout({ children }: { children: React.ReactNode }) {
  const user = await requireRole("STUDENT");
  // Senior high students follow the Career Planning Program (My Career Plan);
  // tertiary (incl. irregular) students fill in the Career Planning Form instead.
  const profile = await db.studentProfile.findUnique({ where: { name: user.name }, select: { department: true } });
  const level = normalizeDepartment(profile?.department);
  const hiddenPaths = [level !== SHS && "/my_career", level !== TERTIARY && level !== IRREGULAR && "/career_form"].filter(Boolean) as string[];

  return (
    <AppShell role="student" userName={user.name} hiddenPaths={hiddenPaths} avatarUrl={user.avatarType ? "/api/me/avatar" : null} needsPrivacyConsent={!user.privacyAcceptedAt}>
      {children}
    </AppShell>
  );
}

