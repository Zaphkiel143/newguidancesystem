"use client";

import React, { useState } from 'react';
import { Search, ListFilter, Eye } from 'lucide-react';

// Define the shape of our student data
interface Student {
  id: string;
  name: string;
  gradeSection: string;
  lastSession: string;
}

const StudentInventory = () => {
  // Sample data based on the provided image
  const [students] = useState<Student[]>([
    { id: "2024-12345", name: "Nhel Belarmino", gradeSection: "Grade 12 - STEM-A", lastSession: "2026-04-20" },
    { id: "2024-12346", name: "Dexter Glorioso", gradeSection: "Grade 11 - HUMSS-B", lastSession: "2026-04-25" },
    { id: "2024-12347", name: "Justine Casano", gradeSection: "Grade 12 - ABM-A", lastSession: "2026-04-18" },
    { id: "2024-12348", name: "Kurt Aquino", gradeSection: "Grade 11 - ICT-A", lastSession: "2026-04-22" },
  ]);

  return (
    <main>
    <div className="p-8 bg-slate-50 min-h-screen font-sans">
      {/* Header Section */}
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Individual Inventory</h1>
        <p className="text-slate-500 text-sm">Centralized student profiles and guidance history</p>
      </header>

      {/* Main Table Container */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        
        {/* Search and Filter Bar */}
        <div className="p-6 flex items-center gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              type="text"
              placeholder="Search by name or student ID..."
              className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-sm"
            />
          </div>
          <button className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors text-sm font-medium border border-slate-200">
            <ListFilter size={18} />
            Filters
          </button>
        </div>

        {/* Inventory Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-100">
                <th className="px-6 py-4 text-xs font-bold text-slate-800 uppercase tracking-wider">Student ID</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-800 uppercase tracking-wider">Name</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-800 uppercase tracking-wider">Grade & Section</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-800 uppercase tracking-wider">Last Session</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-800 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody>
              {students.map((student, index) => (
                <tr 
                  key={student.id} 
                  className={`hover:bg-slate-50/80 transition-colors ${index % 2 === 0 ? 'bg-white' : 'bg-white'}`}
                >
                  <td className="px-6 py-4 text-sm text-slate-600">{student.id}</td>
                  <td className="px-6 py-4 text-sm font-medium text-slate-900">{student.name}</td>
                  <td className="px-6 py-4 text-sm text-slate-600">{student.gradeSection}</td>
                  <td className="px-6 py-4 text-sm text-slate-600">{student.lastSession}</td>
                  <td className="px-6 py-4">
                    <button className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-md transition-all text-sm font-semibold border border-blue-100">
                      <Eye size={16} />
                      View
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
    </main>
  );
};

export default StudentInventory;