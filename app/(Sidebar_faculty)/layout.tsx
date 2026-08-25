import { Sidebar } from "../../components/Sidebar";
import { requireRole } from "../../lib/auth";

export default async function FacultyLayout({ children }: { children: React.ReactNode }) {
  await requireRole("FACULTY");

  return (
    <div className="flex">
      {/* Pass the specific role property here */}
      <Sidebar role="faculty" /> 
      
      <main className="flex-1 pl-64">
        {children}
      </main>
    </div>
  );
}