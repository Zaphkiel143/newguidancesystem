"use client";

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Check, X, Loader2, Plus } from 'lucide-react';
import { CAREER_STEPS } from '../../config/careerSteps';
import { isShs } from '../../config/studentLevels';
import {
  getCareerPlans,
  addCareerPlanStudent,
  advanceCareerPlanProgress,
  updateCareerPlanDetails,
  getStudentProfile,
  listStudentProfiles,
} from '../../action/counselor';
import InlineError from '../../../components/InlineError';
import type { CareerPlan, Appointment } from '../../../lib/generated';

type Profile = Awaited<ReturnType<typeof listStudentProfiles>>[number];

export default function CareerTracker() {
  const [plans, setPlans] = useState<CareerPlan[] | null>(null);
  const [profiles, setProfiles] = useState<Profile[]>([]);

  // Advancing a stage, with an optional note on what was completed
  const [advancing, setAdvancing] = useState<{ id: string; note: string } | null>(null);
  const [isAdvancing, setIsAdvancing] = useState(false);
  const [rowError, setRowError] = useState<{ id: string; message: string } | null>(null);

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [newStudent, setNewStudent] = useState("");
  const [newFacilitator, setNewFacilitator] = useState("");
  const [addError, setAddError] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);

  const [details, setDetails] = useState<{ plan: CareerPlan; facilitator: string; notes: string[]; sessions: Appointment[] | null } | null>(null);
  const [detailsError, setDetailsError] = useState<string | null>(null);
  const [isSavingDetails, setIsSavingDetails] = useState(false);

  const load = useCallback(async () => setPlans(await getCareerPlans()), []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [p, s] = await Promise.all([getCareerPlans(), listStudentProfiles()]);
      if (cancelled) return;
      setPlans(p);
      setProfiles(s);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const enrolled = new Set(plans?.map((p) => p.studentName));
  const eligible = profiles.filter((s) => isShs(s.department) && !enrolled.has(s.name));

  const confirmAdvance = async () => {
    if (!advancing) return;
    setIsAdvancing(true);
    setRowError(null);
    const result = await advanceCareerPlanProgress(advancing.id, advancing.note);
    setIsAdvancing(false);
    if (result.success) {
      setAdvancing(null);
      await load();
    } else {
      setRowError({ id: advancing.id, message: `Couldn't update progress: ${result.error || "unknown error"}.` });
    }
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    const student = profiles.find((s) => s.name === newStudent);
    if (!student) return setAddError("Choose a student from the Individual Inventory.");
    setIsAdding(true);
    setAddError(null);
    const result = await addCareerPlanStudent({
      studentName: student.name,
      studentId: student.studentId,
      grade: student.yearLevel ?? student.gradeSection.split(" - ")[0],
      facilitator: newFacilitator,
    });
    setIsAdding(false);
    if (result.success) {
      setIsAddOpen(false);
      setNewStudent("");
      setNewFacilitator("");
      await load();
    } else {
      setAddError(result.error || "Couldn't add this student.");
    }
  };

  const openDetails = async (plan: CareerPlan) => {
    setDetailsError(null);
    setDetails({ plan, facilitator: plan.facilitator ?? "", notes: CAREER_STEPS.map((_, i) => plan.stepNotes[i] ?? ""), sessions: null });
    const record = await getStudentProfile(plan.studentName);
    setDetails((d) => (d && d.plan.id === plan.id ? { ...d, sessions: record.appointments } : d));
  };

  const saveDetails = async () => {
    if (!details) return;
    setIsSavingDetails(true);
    setDetailsError(null);
    const result = await updateCareerPlanDetails(details.plan.id, { facilitator: details.facilitator, stepNotes: details.notes });
    setIsSavingDetails(false);
    if (result.success) {
      setDetails(null);
      await load();
    } else {
      setDetailsError(`Couldn't save: ${result.error || "unknown error"}.`);
    }
  };

  return (
    <div className="px-5 sm:px-8 lg:px-12 pt-8 lg:pt-12 pb-16 max-w-6xl text-slate-800">
      <header className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1 className="page-title">Career Guidance</h1>
          <p className="text-sm text-slate-500 mt-1">Senior High School students&apos; progress through the Career Planning Program</p>
          <Link href="/careerguidance/college" className="inline-block mt-2 text-[13px] text-blue-700 hover:underline">
            Tertiary students: Career Planning Forms →
          </Link>
        </div>
        <button onClick={() => { setAddError(null); setIsAddOpen(true); }}
          className="self-start sm:self-auto inline-flex items-center gap-2 bg-blue-700 hover:bg-blue-800 text-white text-sm font-medium px-4 min-h-11 rounded-full transition-colors">
          <Plus size={16} /> Add student
        </button>
      </header>

      <ol className="mt-8 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 text-[13px]">
        {CAREER_STEPS.map((step, i) => (
          <li key={step} className="bg-blue-50 border border-blue-100 rounded-lg px-3 py-3">
            <span className="font-mono text-xs text-slate-500">{i + 1}</span>
            <span className="block text-ink">{step}</span>
          </li>
        ))}
      </ol>

      {plans === null ? (
        <div className="py-20 flex justify-center text-slate-500"><Loader2 className="animate-spin" size={20} /></div>
      ) : plans.length === 0 ? (
        <p className="mt-10 border-t border-rule pt-4 text-sm text-slate-500">No students in the program yet. Add one from the Individual Inventory.</p>
      ) : (
        <ul className="mt-10 divide-y divide-rule border-y border-rule">
          {plans.map((plan) => {
            const done = plan.stepDates.filter(Boolean).length;
            const next = plan.stepDates.findIndex((d) => !d);
            const isAdvancingThis = advancing?.id === plan.id;
            return (
              <li key={plan.id} className="py-5">
                <div className="flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-2">
                  <div>
                    <p className="font-medium text-ink">{plan.studentName}</p>
                    <p className="text-[13px] text-slate-500">
                      <span className="font-mono">{plan.studentId}</span> · {plan.grade}
                      {plan.facilitator && <> · Facilitator: {plan.facilitator}</>}
                    </p>
                  </div>
                  <p className="text-[13px] text-slate-600 tabular">{done}/{CAREER_STEPS.length} stages</p>
                </div>

                <ol className="mt-3 grid grid-cols-6 gap-1" aria-label={`${plan.studentName}'s stages`}>
                  {CAREER_STEPS.map((step, i) => (
                    <li key={step} title={`${step}: ${plan.stepDates[i] ? `done ${plan.stepDates[i]}` : "not yet"}`}
                      className={`h-1.5 rounded-full ${plan.stepDates[i] ? "bg-blue-500" : i === next ? "bg-butter-300" : "bg-blue-100"}`}>
                      <span className="sr-only">{step}: {plan.stepDates[i] ? `done ${plan.stepDates[i]}` : "not yet"}</span>
                    </li>
                  ))}
                </ol>

                {isAdvancingThis ? (
                  <div className="mt-4 flex flex-col sm:flex-row gap-2 sm:items-end">
                    <div className="flex-1">
                      <label htmlFor={`note-${plan.id}`} className="block text-[13px] font-medium text-slate-700 mb-1.5">
                        What was completed for “{CAREER_STEPS[next]}”? (optional)
                      </label>
                      <input id={`note-${plan.id}`} value={advancing.note} onChange={(e) => setAdvancing({ ...advancing, note: e.target.value })}
                        placeholder="e.g. Submitted skills worksheet; attended career talk"
                        className="w-full bg-sheet border border-slate-300 rounded-md px-3 py-2.5 text-sm" />
                    </div>
                    <div className="flex gap-2">
                      <button onClick={confirmAdvance} disabled={isAdvancing}
                        className="inline-flex items-center gap-2 bg-blue-700 hover:bg-blue-800 disabled:opacity-60 text-white text-sm font-medium px-4 min-h-11 rounded-full">
                        {isAdvancing ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />} Mark done
                      </button>
                      <button onClick={() => setAdvancing(null)} className="px-4 min-h-11 rounded-full text-sm text-slate-600 hover:bg-slate-100">Cancel</button>
                    </div>
                  </div>
                ) : (
                  <div className="mt-3 flex flex-wrap gap-1 text-[13px]">
                    {next === -1 ? (
                      <span className="text-emerald-700 px-2 min-h-9 -ml-2 inline-flex items-center">All stages complete</span>
                    ) : (
                      <button onClick={() => { setRowError(null); setAdvancing({ id: plan.id, note: "" }); }}
                        className="px-2 min-h-9 -ml-2 rounded-full text-blue-700 hover:bg-blue-50">
                        Complete “{CAREER_STEPS[next]}”
                      </button>
                    )}
                    <button onClick={() => openDetails(plan)} className="px-2 min-h-9 rounded-full text-slate-600 hover:bg-slate-100">
                      Activities & facilitator
                    </button>
                  </div>
                )}
                <InlineError message={rowError?.id === plan.id ? rowError.message : null} onDismiss={() => setRowError(null)} className="mt-2" />
              </li>
            );
          })}
        </ul>
      )}

      {isAddOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4" onClick={() => setIsAddOpen(false)}>
          <form role="dialog" aria-modal="true" aria-labelledby="add-title" onSubmit={handleAdd} onClick={(e) => e.stopPropagation()}
            className="bg-sheet w-full max-w-md rounded-xl border border-rule shadow-xl p-6 space-y-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 id="add-title" className="font-medium text-ink">Add to Career Planning Program</h2>
                <p className="text-xs text-slate-500 mt-0.5">Senior High School students from the Individual Inventory</p>
              </div>
              <button type="button" onClick={() => setIsAddOpen(false)} aria-label="Close" className="w-11 h-11 -m-2 grid place-items-center text-slate-500 hover:text-ink hover:bg-slate-100 rounded-full"><X size={18} /></button>
            </div>
            <div>
              <label htmlFor="cpp-student" className="block text-[13px] font-medium text-slate-700 mb-1.5">Student</label>
              <select id="cpp-student" value={newStudent} onChange={(e) => setNewStudent(e.target.value)} required
                className="w-full bg-paper border border-slate-300 rounded-md px-3 py-2.5 text-sm">
                <option value="">{eligible.length ? "Choose a student" : "Everyone is already enrolled"}</option>
                {eligible.map((s) => <option key={s.id} value={s.name}>{s.name} · {s.gradeSection}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="cpp-fac" className="block text-[13px] font-medium text-slate-700 mb-1.5">Facilitator (optional)</label>
              <input id="cpp-fac" value={newFacilitator} onChange={(e) => setNewFacilitator(e.target.value)} placeholder="Teacher or adviser coordinating with you"
                className="w-full bg-paper border border-slate-300 rounded-md px-3 py-2.5 text-sm" />
            </div>
            <InlineError message={addError} onDismiss={() => setAddError(null)} />
            <div className="flex justify-end gap-2 pt-2 border-t border-rule">
              <button type="button" onClick={() => setIsAddOpen(false)} className="px-4 min-h-11 rounded-full text-sm text-slate-600 hover:bg-slate-100">Cancel</button>
              <button type="submit" disabled={isAdding}
                className="inline-flex items-center gap-2 bg-blue-700 hover:bg-blue-800 disabled:opacity-60 text-white text-sm font-medium px-4 min-h-11 rounded-full">
                {isAdding && <Loader2 size={16} className="animate-spin" />} Add student
              </button>
            </div>
          </form>
        </div>
      )}

      {details && (
        <div className="fixed inset-0 z-50 flex justify-end bg-ink/30" onClick={() => setDetails(null)}>
          <aside role="dialog" aria-modal="true" aria-labelledby="details-title" onClick={(e) => e.stopPropagation()}
            className="w-full max-w-xl h-full overflow-y-auto bg-paper border-l border-rule shadow-xl">
            <div className="sticky top-0 bg-paper border-b border-rule px-6 py-5 flex items-start justify-between gap-4">
              <div>
                <h2 id="details-title" className="font-serif text-[26px] leading-tight text-ink">{details.plan.studentName}</h2>
                <p className="font-mono text-[13px] text-slate-500 mt-0.5">{details.plan.studentId} · {details.plan.grade}</p>
              </div>
              <button onClick={() => setDetails(null)} aria-label="Close" className="w-11 h-11 grid place-items-center text-slate-500 hover:text-ink hover:bg-slate-100 rounded-full"><X size={18} /></button>
            </div>
            <div className="px-6 py-6 space-y-6">
              <div>
                <label htmlFor="d-fac" className="block text-[13px] font-medium text-slate-700 mb-1.5">Facilitator</label>
                <input id="d-fac" value={details.facilitator} onChange={(e) => setDetails({ ...details, facilitator: e.target.value })}
                  className="w-full bg-sheet border border-slate-300 rounded-md px-3 py-2.5 text-sm" />
              </div>
              <div>
                <h3 className="font-serif text-xl text-ink mb-3">Completed activities</h3>
                <ol className="space-y-4">
                  {CAREER_STEPS.map((step, i) => (
                    <li key={step}>
                      <label htmlFor={`d-note-${i}`} className="flex justify-between gap-3 text-[13px] mb-1.5">
                        <span className="font-medium text-slate-700">{i + 1}. {step}</span>
                        <span className="text-slate-500">{details.plan.stepDates[i] ? `Done ${details.plan.stepDates[i]}` : "Not yet"}</span>
                      </label>
                      <textarea id={`d-note-${i}`} rows={2} value={details.notes[i]}
                        onChange={(e) => setDetails({ ...details, notes: details.notes.map((n, j) => (j === i ? e.target.value : n)) })}
                        className="w-full bg-sheet border border-slate-300 rounded-md px-3 py-2 text-sm resize-y" />
                    </li>
                  ))}
                </ol>
              </div>
              <InlineError message={detailsError} onDismiss={() => setDetailsError(null)} />
              <div className="flex justify-end gap-2">
                <button onClick={() => setDetails(null)} className="px-4 min-h-11 rounded-full text-sm text-slate-600 hover:bg-slate-100">Cancel</button>
                <button onClick={saveDetails} disabled={isSavingDetails}
                  className="inline-flex items-center gap-2 bg-blue-700 hover:bg-blue-800 disabled:opacity-60 text-white text-sm font-medium px-4 min-h-11 rounded-full">
                  {isSavingDetails && <Loader2 size={16} className="animate-spin" />} Save
                </button>
              </div>
              <div>
                <h3 className="font-serif text-xl text-ink mb-3">Guidance sessions</h3>
                {details.sessions === null ? (
                  <Loader2 className="animate-spin text-slate-500" size={18} />
                ) : details.sessions.length === 0 ? (
                  <p className="border-t border-rule pt-3 text-sm text-slate-500">No sessions yet.</p>
                ) : (
                  <ul className="divide-y divide-rule border-t border-rule text-sm">
                    {details.sessions.map((s) => (
                      <li key={s.id} className="py-2.5 flex justify-between gap-3">
                        <span className="text-ink">{s.appointmentType || "General consultation"}</span>
                        <span className="font-mono text-[13px] text-slate-500">{new Date(s.date).toLocaleDateString("en-PH", { timeZone: "UTC", month: "short", day: "numeric" })}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}
