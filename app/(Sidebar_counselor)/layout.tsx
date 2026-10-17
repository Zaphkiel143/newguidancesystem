import { AppShell } from "../../components/AppShell";
import { requireRole } from "../../lib/auth";

export default async function CounselorLayout({ children }: { children: React.ReactNode }) {
  const user = await requireRole("COUNSELOR");

  return (
    <AppShell role="counselor" userName={user.name}>
      {children}
    </AppShell>
  );
}
