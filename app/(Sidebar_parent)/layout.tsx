import { AppShell } from "../../components/AppShell";
import { requireRole } from "../../lib/auth";

export default async function ParentLayout({ children }: { children: React.ReactNode }) {
  const user = await requireRole("PARENT");

  return (
    <AppShell role="parent" userName={user.name}>
      {children}
    </AppShell>
  );
}
