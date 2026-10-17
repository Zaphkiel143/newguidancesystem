import { AppShell } from "../../components/AppShell";
import { requireRole } from "../../lib/auth";

export default async function FacultyLayout({ children }: { children: React.ReactNode }) {
  const user = await requireRole("FACULTY");

  return (
    <AppShell role="faculty" userName={user.name}>
      {children}
    </AppShell>
  );
}
