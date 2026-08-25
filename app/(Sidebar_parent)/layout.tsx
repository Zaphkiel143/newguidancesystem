import { Sidebar } from "../../components/Sidebar";
import { requireRole } from "../../lib/auth";

export default async function ParentLayout({ children }: { children: React.ReactNode }) {
  await requireRole("PARENT");

  return (
    <div className="flex">
      {/* Pass the specific role property here */}
      <Sidebar role="parent" /> 
      
      <main className="flex-1 pt-14 md:pt-0 md:pl-64">
        {children}
      </main>
    </div>
  );
}