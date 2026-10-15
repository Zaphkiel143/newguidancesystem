"use client";

import React, { useEffect, useState } from 'react';
import { CheckCircle2, Circle, X, Loader2 } from 'lucide-react';
import { CAREER_STEPS } from '../../config/careerSteps';
import { getCareerPlans, addCareerPlanStudent, advanceCareerPlanProgress, getStudentProfile } from '../../action/counselor';
import type { Appointment as DbAppointment } from '../../../lib/generated';

interface CareerPlan {
  id: string;
  studentName: string;
  studentId: string;
  grade: string;
  stepDates: string[];
}

const CareerTracker = () => {
  const [careerPlans, setCareerPlans] = useState<CareerPlan[]>([]);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [newStudentName, setNewStudentName] = useState("");
  const [newStudentId, setNewStudentId] = useState("");
  const [newGrade, setNewGrade] = useState("Grade 12");

  const [viewingPlan, setViewingPlan] = useState<CareerPlan | null>(null);
  const [isLoadingProfile, setIsLoadingProfile] = useState(false);
  const [sessionHistory, setSessionHistory] = useState<DbAppointment[]>([]);

  const refreshCareerPlans = async () => {
    const data = await getCareerPlans();
    setCareerPlans(data);
  };

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const data = await getCareerPlans();
      if (!cancelled) setCareerPlans(data);
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const handleAddStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    const result = await addCareerPlanStudent({
      studentName: newStudentName,
      studentId: newStudentId,
      grade: newGrade,
    });

    setIsSaving(false);
    if (result.success) {
      setIsAddModalOpen(false);
      setNewStudentName("");
      setNewStudentId("");
      setNewGrade("Grade 12");
      await refreshCareerPlans();
    } else {
      alert(`Database Error: ${result.error || "Failed to add student"}`);
    }
  };

  const handleUpdateProgress = async (id: string) => {
    setUpdatingId(id);
    const result = await advanceCareerPlanProgress(id);
    setUpdatingId(null);

    if (result.success) {
      await refreshCareerPlans();
    } else {
      alert(`Database Error: ${result.error || "Failed to update progress"}`);
    }
  };

  const handleViewFullPlan = async (plan: CareerPlan) => {
    setViewingPlan(plan);
    setIsLoadingProfile(true);
    const profile = await getStudentProfile(plan.studentId, plan.studentName);
    setSessionHistory(profile.appointments);
    setIsLoadingProfile(false);
  };

  return (
    <div className="px-5 sm:px-8 lg:px-12 pt-8 lg:pt-12 pb-16 min-h-[calc(100dvh-var(--topbar-h))] font-sans text-slate-900">
      {/* Header */}
      <header className="mb-8 flex justify-between items-start">
        <div>
          <h1 className="page-title">Career Guidance Tracker</h1>
          <p className="text-slate-500 text-sm">Monitor SHS students&apos; Career Planning Program progress</p>
        </div>
        <button
          onClick={() => setIsAddModalOpen(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm px-5 py-2.5 rounded-xl shadow-sm transition"
        >
          + Add Career Guidance Student
        </button>
      </header>

      {/* Top Legend/Steps Overview */}
      <div className="bg-white p-8 rounded-xl border border-slate-200 shadow-sm mb-8">
        <div className="flex justify-between items-start max-w-5xl mx-auto">
          {CAREER_STEPS.map((step, index) => (
            <div key={index} className="flex flex-col items-center text-center space-y-3 flex-1 px-2">
              <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center font-semibold text-sm border border-blue-100">
                {index + 1}
              </div>
              <p className="text-[11px] font-semibold text-slate-500 tracking-tight leading-tight max-w-20">
                {step}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Student Progress List */}
      <div className="space-y-6">
        <div className="flex justify-between items-center px-2">
          <h2 className="text-lg font-semibold">Student Progress</h2>
          <span className="text-xs font-semibold text-slate-400">{careerPlans.length} Active Career Plans</span>
        </div>

        {careerPlans.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 border-2 border-dashed border-slate-200 rounded-2xl bg-white">
            <span className="text-3xl mb-2">🎯</span>
            <p className="text-sm font-semibold text-slate-500">No career plans yet</p>
            <p className="text-xs text-slate-400">Add a student to start tracking their Career Planning Program</p>
          </div>
        ) : (
          careerPlans.map((plan) => {
            const completedCount = plan.stepDates.filter((date) => date !== "").length;
            const percentage = Math.round((completedCount / CAREER_STEPS.length) * 100);
            const isComplete = completedCount === CAREER_STEPS.length;

            return (
              <div key={plan.id} className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
                {/* Student Header & Main Progress Bar */}
                <div className="flex justify-between items-end mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-slate-800">{plan.studentName}</h3>
                    <p className="text-xs font-semibold text-slate-500">{plan.studentId} • {plan.grade}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-semibold text-blue-600 leading-none">{percentage}%</p>
                    <p className="text-[11px] font-semibold text-slate-400">Complete</p>
                  </div>
                </div>

                {/* Thick Progress Bar */}
                <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden mb-8">
                  <div
                    className="bg-blue-600 h-full rounded-full transition-all duration-700"
                    style={{ width: `${percentage}%` }}
                  />
                </div>

                {/* Step Indicators */}
                <div className="flex justify-between items-start mb-8">
                  {CAREER_STEPS.map((step, i) => (
                    <div key={i} className="flex flex-col items-center flex-1">
                      {plan.stepDates[i] ? (
                        <CheckCircle2 className="text-green-500 mb-2" size={24} />
                      ) : (
                        <Circle className="text-slate-200 mb-2" size={24} />
                      )}
                      <p className="text-[11px] font-semibold text-slate-500 text-center tracking-tight">
                        {step}
                      </p>
                      <p className="text-[9px] text-slate-400 mt-0.5">
                        {plan.stepDates[i] || '—'}
                      </p>
                    </div>
                  ))}
                </div>

                {/* Actions */}
                <div className="flex gap-3">
                  <button
                    onClick={() => handleUpdateProgress(plan.id)}
                    disabled={isComplete || updatingId === plan.id}
                    className="px-4 py-1.5 bg-blue-50 text-blue-600 text-xs font-semibold rounded-md border border-blue-100 hover:bg-blue-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isComplete ? "All Steps Complete" : updatingId === plan.id ? "Updating..." : "Update Progress"}
                  </button>
                  <button
                    onClick={() => handleViewFullPlan(plan)}
                    className="px-4 py-1.5 bg-slate-50 text-slate-600 text-xs font-semibold rounded-md border border-slate-100 hover:bg-slate-100 transition-colors"
                  >
                    View Full Plan
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* ADD STUDENT MODAL */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white w-full max-w-md p-6 rounded-2xl shadow-xl border border-slate-100 space-y-4">
            <div>
              <h3 className="text-lg font-semibold text-slate-900">Add Career Guidance Student</h3>
              <p className="text-xs text-slate-500">Start tracking a new student&apos;s Career Planning Program</p>
            </div>

            <form onSubmit={handleAddStudent} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">Student Name</label>
                <input
                  type="text"
                  required
                  value={newStudentName}
                  onChange={(e) => setNewStudentName(e.target.value)}
                  placeholder="e.g., Juan Dela Cruz"
                  className="w-full text-sm bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">Student ID</label>
                <input
                  type="text"
                  required
                  value={newStudentId}
                  onChange={(e) => setNewStudentId(e.target.value)}
                  placeholder="e.g., 2026-00123"
                  className="w-full text-sm bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">Grade Level</label>
                <select
                  value={newGrade}
                  onChange={(e) => setNewGrade(e.target.value)}
                  className="w-full text-sm bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 focus:outline-none"
                >
                  <option value="Grade 11">Grade 11</option>
                  <option value="Grade 12">Grade 12</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-xl transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-5 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 rounded-xl transition"
                >
                  {isSaving ? "Saving..." : "Add Student"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* VIEW FULL PLAN MODAL */}
      {viewingPlan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white w-full max-w-2xl max-h-[85vh] overflow-y-auto rounded-2xl shadow-xl border border-slate-100">
            <div className="flex justify-between items-start p-6 border-b border-slate-100 sticky top-0 bg-white rounded-t-2xl">
              <div>
                <h3 className="text-lg font-semibold text-slate-900">{viewingPlan.studentName}</h3>
                <p className="text-xs font-semibold text-slate-500">{viewingPlan.studentId} • {viewingPlan.grade}</p>
              </div>
              <button
                onClick={() => setViewingPlan(null)}
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
                  <section>
                    <h4 className="text-sm font-semibold text-slate-800 mb-4">Career Planning Progress</h4>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {CAREER_STEPS.map((step, i) => {
                        const completedOn = viewingPlan.stepDates[i];
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
                  </section>

                  <section>
                    <h4 className="text-sm font-semibold text-slate-800 mb-4">
                      Guidance Session History
                      {sessionHistory.length > 0 && (
                        <span className="ml-2 text-xs font-semibold text-slate-400">
                          {sessionHistory.length} record{sessionHistory.length === 1 ? "" : "s"}
                        </span>
                      )}
                    </h4>
                    {sessionHistory.length > 0 ? (
                      <div className="space-y-3">
                        {sessionHistory.map((appt) => (
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
    </div>
  );
};

export default CareerTracker;
