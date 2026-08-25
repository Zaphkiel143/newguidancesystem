import { Sidebar } from "../../components/Sidebar";
import { requireRole } from "../../lib/auth";

export default async function StudentLayout({ children }: { children: React.ReactNode }) {
  await requireRole("STUDENT");

  return (
    <div className="flex">
      {/* Pass the specific role property here */}
      <Sidebar role="student" /> 
      
      <main className="flex-1 pl-64">
        {children}
      </main>
    </div>
  );
}