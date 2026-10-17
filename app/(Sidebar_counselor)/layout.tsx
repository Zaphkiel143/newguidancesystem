import { AppShell } from "../../components/AppShell";
import { requireRole } from "../../lib/auth";

export default async function Layout({ children }: { children: React.ReactNode }) {
  const user = await requireRole("COUNSELOR");
  const avatarUrl = user.avatarType ? "/api/me/avatar" : null;

  return (
    <AppShell role="counselor" userName={user.name} avatarUrl={avatarUrl} needsPrivacyConsent={!user.privacyAcceptedAt}>
      {children}
    </AppShell>
  );
}
