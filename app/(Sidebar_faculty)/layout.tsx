import { AppShell } from "../../components/AppShell";
import { requireRole } from "../../lib/auth";
import { shownName } from "../../lib/demo";

export default async function Layout({ children }: { children: React.ReactNode }) {
  const user = await requireRole("FACULTY");
  const avatarUrl = user.avatarType ? "/api/me/avatar" : null;

  return (
    <AppShell role="faculty" userName={user.name} displayName={shownName(user)} avatarUrl={avatarUrl} needsPrivacyConsent={!user.privacyAcceptedAt}>
      {children}
    </AppShell>
  );
}
