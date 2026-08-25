import { Sidebar } from "../../components/Sidebar";
import { requireRole } from "../../lib/auth";

export default async function StudentLayout({ children }: { children: React.ReactNode }) {
  await requireRole("COUNSELOR");

  return (
    <div className="flex">
      {/* Pass the specific role property here */}
      <Sidebar role="counselor" /> 
      
      <main className="flex-1 pl-64">
        {children}
      </main>
    </div>
  );
}