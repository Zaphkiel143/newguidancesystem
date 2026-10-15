import { AppShell } from "../../components/AppShell";
import { requireRole } from "../../lib/auth";

export default async function StudentLayout({ children }: { children: React.ReactNode }) {
  const user = await requireRole("STUDENT");

  return (
    <AppShell role="student" userName={user.name}>
      {children}
    </AppShell>
  );
}
