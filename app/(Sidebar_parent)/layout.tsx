import { AppShell } from "../../components/AppShell";
import { requireRole } from "../../lib/auth";

export default async function Layout({ children }: { children: React.ReactNode }) {
  const user = await requireRole("PARENT");
  const avatarUrl = user.avatarType ? "/api/me/avatar" : null;

  return (
    <AppShell role="parent" userName={user.name} avatarUrl={avatarUrl}>
      {children}
    </AppShell>
  );
}
