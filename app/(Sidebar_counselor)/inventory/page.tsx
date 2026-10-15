"use client";

import React, { useState } from 'react';
import { Search, ListFilter, Eye, X, Loader2 } from 'lucide-react';
import { getStudentProfile } from '../../action/counselor';
import { CAREER_STEPS } from '../../config/careerSteps';
import type { Appointment as DbAppointment, CareerPlan as DbCareerPlan } from '../../../lib/generated';

// Define the shape of our student data
interface Student {
  id: string;
  name: string;
  gradeSection: string;
  lastSession: string;
}

interface StudentProfile {
  appointments: DbAppointment[];
  careerPlan: DbCareerPlan | null;
}

const StudentInventory = () => {
  // Sample data based on the provided image
  const [students] = useState<Student[]>([
    { id: "2024-12345", name: "Nhel Belarmino", gradeSection: "Grade 12 - STEM-A", lastSession: "2026-04-20" },
    { id: "2024-12346", name: "Dexter Glorioso", gradeSection: "Grade 11 - HUMSS-B", lastSession: "2026-04-25" },
    { id: "2024-12347", name: "Justine Casano", gradeSection: "Grade 12 - ABM-A", lastSession: "2026-04-18" },
    { id: "2024-12348", name: "Kurt Aquino", gradeSection: "Grade 11 - ICT-A", lastSession: "2026-04-22" },
  ]);

  const [searchQuery, setSearchQuery] = useState("");
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);
  const [gradeFilter, setGradeFilter] = useState("All");

  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isLoadingProfile, setIsLoadingProfile] = useState(false);
  const [profile, setProfile] = useState<StudentProfile | null>(null);

  const gradeOptions = ["All", ...Array.from(new Set(students.map((s) => s.gradeSection.split(" - ")[0])))];

  const filteredStudents = students.filter((student) => {
    if (gradeFilter !== "All" && !student.gradeSection.startsWith(gradeFilter)) return false;

    const query = searchQuery.trim().toLowerCase();
    if (!query) return true;
    return (
      student.name.toLowerCase().includes(query) ||
      student.id.toLowerCase().includes(query)
    );
  });

  const handleViewStudent = async (student: Student) => {
    setSelectedStudent(student);
    setIsProfileOpen(true);
    setIsLoadingProfile(true);
    const data = await getStudentProfile(student.id, student.name);
    setProfile(data);
    setIsLoadingProfile(false);
  };

  const closeProfile = () => {
    setIsProfileOpen(false);
    setSelectedStudent(null);
    setProfile(null);
  };

  return (
    <main>
    <div className="px-5 sm:px-8 lg:px-12 pt-8 lg:pt-12 pb-16 min-h-[calc(100dvh-var(--topbar-h))] font-sans">
      {/* Header Section */}
      <header className="mb-6">
        <h1 className="page-title">Individual Inventory</h1>
        <p className="text-slate-500 text-sm">Centralized student profiles and guidance history</p>
      </header>

      {/* Main Table Container */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">

        {/* Search and Filter Bar */}
        <div className="p-6 space-y-3">
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by name or student ID..."
                className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-sm"
              />
            </div>
            <button
              onClick={() => setIsFiltersOpen((prev) => !prev)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors text-sm font-medium border ${
                isFiltersOpen ? "bg-blue-50 text-blue-600 border-blue-200" : "bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200"
              }`}
            >
              <ListFilter size={18} />
              Filters
            </button>
          </div>

          {isFiltersOpen && (
            <div className="flex items-center gap-2 flex-wrap pt-1">
              <span className="text-xs font-semibold text-slate-500">Grade Level:</span>
              {gradeOptions.map((grade) => (
                <button
                  key={grade}
                  onClick={() => setGradeFilter(grade)}
                  className={`px-3 py-1 rounded text-xs font-semibold border transition-colors ${
                    gradeFilter === grade
                      ? "bg-blue-600 text-white border-blue-600"
                      : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                  }`}
                >
                  {grade}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Inventory Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-100">
                <th className="px-6 py-4 text-xs font-semibold text-slate-800">Student ID</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-800">Name</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-800">Grade & Section</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-800">Last Session</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-800">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-10 text-center text-sm text-slate-400">
                    No students match &quot;{searchQuery}&quot;
                  </td>
                </tr>
              ) : (
                filteredStudents.map((student) => (
                  <tr
                    key={student.id}
                    className="hover:bg-slate-50/80 transition-colors bg-white"
                  >
                    <td className="px-6 py-4 text-sm text-slate-600">{student.id}</td>
                    <td className="px-6 py-4 text-sm font-medium text-slate-900">{student.name}</td>
                    <td className="px-6 py-4 text-sm text-slate-600">{student.gradeSection}</td>
                    <td className="px-6 py-4 text-sm text-slate-600">{student.lastSession}</td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => handleViewStudent(student)}
                        className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-md transition-all text-sm font-semibold border border-blue-100"
                      >
                        <Eye size={16} />
                        View
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>

    {/* STUDENT PROFILE MODAL */}
    {isProfileOpen && selectedStudent && (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
        <div className="bg-white w-full max-w-2xl max-h-[85vh] overflow-y-auto rounded-2xl shadow-xl border border-slate-100">
          {/* Header */}
          <div className="flex justify-between items-start p-6 border-b border-slate-100 sticky top-0 bg-white rounded-t-2xl">
            <div>
              <h3 className="text-lg font-semibold text-slate-900">{selectedStudent.name}</h3>
              <p className="text-xs font-semibold text-slate-500">{selectedStudent.id} • {selectedStudent.gradeSection}</p>
            </div>
            <button
              onClick={closeProfile}
              className="text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg p-1.5 transition"
            >
              <X size={20} />
            </button>
          </div>

          <div className="p-6 space-y-8">
            {isLoadingProfile ? (
              <div className="flex flex-col items-center justify-center py-16 text-slate-400">
                <Loader2 className="animate-spin mb-2" size={28} />
                <p className="text-sm font-medium">Loading student record...</p>
              </div>
            ) : (
              <>
                {/* Career Planning Progress */}
                <section>
                  <h4 className="text-sm font-semibold text-slate-800 mb-4">Career Planning Progress</h4>
                  {profile?.careerPlan ? (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {CAREER_STEPS.map((step, i) => {
                        const completedOn = profile.careerPlan!.stepDates[i];
                        return (
                          <div
                            key={step}
                            className={`rounded-xl border p-3 text-center ${
                              completedOn ? "bg-green-50 border-green-100" : "bg-slate-50 border-slate-100"
                            }`}
                          >
                            <p className="text-[11px] font-semibold tracking-tight text-slate-500 leading-tight">
                              {step}
                            </p>
                            <p className={`text-[11px] mt-1 font-semibold ${completedOn ? "text-green-600" : "text-slate-400"}`}>
                              {completedOn || "Pending"}
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-sm text-slate-400 italic">No career plan on record for this student.</p>
                  )}
                </section>

                {/* Guidance Session History */}
                <section>
                  <h4 className="text-sm font-semibold text-slate-800 mb-4">
                    Guidance Session History
                    {profile && profile.appointments.length > 0 && (
                      <span className="ml-2 text-xs font-semibold text-slate-400">
                        {profile.appointments.length} record{profile.appointments.length === 1 ? "" : "s"}
                      </span>
                    )}
                  </h4>
                  {profile && profile.appointments.length > 0 ? (
                    <div className="space-y-3">
                      {profile.appointments.map((appt) => (
                        <div key={appt.id} className="border border-slate-100 rounded-xl p-4">
                          <div className="flex justify-between items-start mb-1">
                            <p className="text-sm font-semibold text-slate-800">
                              {appt.appointmentType || "General Session"}
                            </p>
                            <span
                              className={`text-[11px] font-semibold px-2 py-0.5 rounded ${
                                appt.status === "CONFIRMED"
                                  ? "bg-emerald-50 text-emerald-600"
                                  : appt.status === "PENDING"
                                  ? "bg-amber-50 text-amber-600"
                                  : "bg-slate-100 text-slate-500"
                              }`}
                            >
                              {appt.status}
                            </span>
                          </div>
                          <p className="text-xs text-slate-500 mb-2">
                            {new Date(appt.date).toLocaleDateString()} • {appt.time}
                          </p>
                          {appt.notes && (
                            <p className="text-xs text-slate-600 bg-slate-50 rounded-lg p-2">{appt.notes}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-slate-400 italic">No guidance sessions on record for this student.</p>
                  )}
                </section>
              </>
            )}
          </div>
        </div>
      </div>
    )}
    </main>
  );
};

export default StudentInventory;
