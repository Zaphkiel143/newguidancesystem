import React from "react";
import Sidebar from "./sidebar";
import Header from "./header";

interface FacultyLayoutProps {
  children: React.ReactNode;
}

export default function FacultyLayout({ children }: FacultyLayoutProps) {
  return (
    <div className="min-h-screen flex flex-col">
      {/* 1. Header sits at the very top */}
      <Header />

      <div className="flex flex-1">
        {/* 2. Sidebar starts below the header (top-16) */}
        <Sidebar />

        {/* 3. Content area clears both header (pt-16) and sidebar (pl-64) */}
        <main className="flex-1 bg-slate-50 min-h-screen pl-64 pt-16">
          <div className="p-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}