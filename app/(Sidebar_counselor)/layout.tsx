import { AppShell } from "../../components/AppShell";
import { getViewAs, requireRole } from "../../lib/auth";
import ViewAsBanner from "../../components/ViewAsBanner";
import { shownName } from "../../lib/demo";

export default async function Layout({ children }: { children: React.ReactNode }) {
  const user = await requireRole("COUNSELOR");
  const viewAs = await getViewAs();
  const avatarUrl = user.avatarType ? "/api/me/avatar" : null;

  return (
    <AppShell role="counselor" userName={user.name} displayName={shownName(user)} avatarUrl={avatarUrl} needsPrivacyConsent={!viewAs && !user.privacyAcceptedAt}>
      <ViewAsBanner viewAs={viewAs} />
      {children}
    </AppShell>
  );
}
