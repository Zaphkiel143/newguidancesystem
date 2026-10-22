"use client";

import React, { useCallback, useEffect, useState } from 'react';
import { Loader2, Plus, X, Users } from 'lucide-react';
import { useOptionList } from '../../../components/useOptionList';
import { optionValue } from '../../../lib/optionListDefaults';
import {
  getGroupGuidancePrograms,
  addGroupGuidanceProgram,
  recordGroupSession,
  listNeedsAssessments,
  createNeedsAssessment,
  setNeedsAssessmentOpen,
} from '../../action/counselor';
import InlineError from '../../../components/InlineError';
import { listAttachments } from '../../action/attachments';
import AttachmentStrip, { type AttachmentMeta } from '../../../components/AttachmentStrip';
import type { GroupGuidanceProgram } from '../../../lib/generated';

type Assessment = Awaited<ReturnType<typeof listNeedsAssessments>>[number];

// Local (not UTC) YYYY-MM-DD — avoids comparisons rolling back a day near midnight in timezones behind UTC
function toDateString(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function getMinSelectableDate(): string {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  return toDateString(tomorrow);
}

const DEFAULT_TOPICS = [
  "Study habits and time management",
  "Stress and anxiety",
  "Friendships and peer pressure",
  "Family concerns",
  "Bullying",
  "Self-esteem",
  "Choosing a course or career",
  "Online safety",
].join("\n");

export default function GroupGuidance() {
  const minSelectableDate = getMinSelectableDate();
  const [gradeLevels] = useOptionList("gradeLevels");
  const [programs, setPrograms] = useState<GroupGuidanceProgram[] | null>(null);
  const [assessments, setAssessments] = useState<Assessment[] | null>(null);

  // New program
  const [isProgramOpen, setIsProgramOpen] = useState(false);
  const [program, setProgram] = useState({ title: "", gradeLevel: "Grade 11", dateString: minSelectableDate, time: "" });
  const [programError, setProgramError] = useState<string | null>(null);
  const [isSavingProgram, setIsSavingProgram] = useState(false);

  // Record attendance + outcomes
  const [recording, setRecording] = useState<{ id: string; title: string; attendees: string; outcomes: string; headcount: string } | null>(null);
  const [sheets, setSheets] = useState<AttachmentMeta[]>([]);
  const [recordError, setRecordError] = useState<string | null>(null);
  const [isSavingRecord, setIsSavingRecord] = useState(false);

  // New needs assessment
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [form, setForm] = useState({ title: "", gradeLevel: "All", topics: DEFAULT_TOPICS });
  const [formError, setFormError] = useState<string | null>(null);
  const [isSavingForm, setIsSavingForm] = useState(false);
  const [toggleError, setToggleError] = useState<{ id: string; message: string } | null>(null);

  const loadPrograms = useCallback(async () => {
    const data = await getGroupGuidancePrograms();
    setPrograms(data);
    setSheets(await listAttachments("GROUP_ATTENDANCE", data.map((p) => p.id)));
  }, []);
  const loadSheets = useCallback(async () => {
    setSheets(await listAttachments("GROUP_ATTENDANCE", (programs ?? []).map((p) => p.id)));
  }, [programs]);
  const loadAssessments = useCallback(async () => setAssessments(await listNeedsAssessments()), []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [p, a] = await Promise.all([getGroupGuidancePrograms(), listNeedsAssessments()]);
      if (cancelled) return;
      setPrograms(p);
      setAssessments(a);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const saveProgram = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingProgram(true);
    setProgramError(null);
    const result = await addGroupGuidanceProgram(program);
    setIsSavingProgram(false);
    if (result.success) {
      setIsProgramOpen(false);
      await loadPrograms();
    } else {
      setProgramError(`Couldn't save this program: ${result.error || "unknown error"}.`);
    }
  };

  const saveRecord = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!recording) return;
    setIsSavingRecord(true);
    setRecordError(null);
    const result = await recordGroupSession(recording.id, { attendees: recording.attendees.split("\n"), outcomes: recording.outcomes, headcount: Number(recording.headcount) || 0 });
    setIsSavingRecord(false);
    if (result.success) {
      setRecording(null);
      await loadPrograms();
    } else {
      setRecordError(`Couldn't save the session record: ${result.error || "unknown error"}.`);
    }
  };

  const saveForm = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingForm(true);
    setFormError(null);
    const result = await createNeedsAssessment({ title: form.title, gradeLevel: form.gradeLevel, topics: form.topics.split("\n") });
    setIsSavingForm(false);
    if (result.success) {
      setIsFormOpen(false);
      setForm({ title: "", gradeLevel: "All", topics: DEFAULT_TOPICS });
      await loadAssessments();
    } else {
      setFormError(result.error || "Couldn't create the form.");
    }
  };

  const toggleOpen = async (a: Assessment) => {
    setToggleError(null);
    const result = await setNeedsAssessmentOpen(a.id, !a.isOpen);
    if (result.success) await loadAssessments();
    else setToggleError({ id: a.id, message: "Couldn't change this form. Try again." });
  };

  const today = toDateString(new Date());

  return (
    <div className="px-5 sm:px-8 lg:px-12 pt-8 lg:pt-12 pb-16 max-w-6xl text-slate-800">
      <header>
        <h1 className="page-title">Group Guidance</h1>
      </header>

      {/* ---- Needs assessment ---- */}
      <section className="mt-10">
        <div className="flex flex-wrap items-baseline justify-between gap-3 mb-3">
          <h2 className="font-serif text-[22px] text-ink">Needs assessment</h2>
          <button onClick={() => { setFormError(null); setIsFormOpen(true); }}
            className="inline-flex items-center gap-2 bg-blue-700 hover:bg-blue-800 text-white text-sm font-medium px-4 min-h-11 rounded-full transition-colors">
            <Plus size={16} /> New form
          </button>
        </div>
        <p className="text-sm text-slate-500 max-w-[65ch]">
          Students answer in E-Gabay under Needs Assessment. Responses are tallied automatically, most-requested topics first.
        </p>

        {assessments === null ? (
          <div className="py-12 flex justify-center text-slate-500"><Loader2 className="animate-spin" size={20} /></div>
        ) : assessments.length === 0 ? (
          <p className="mt-4 border-t border-rule pt-4 text-sm text-slate-500">No forms yet. Create one to start collecting student needs.</p>
        ) : (
          <div className="mt-4 space-y-8">
            {assessments.map((a) => {
              const max = Math.max(1, ...a.tally.map((t) => t.count));
              return (
                <article key={a.id} className="border-t border-rule pt-5">
                  <div className="flex flex-wrap items-baseline justify-between gap-3">
                    <div>
                      <h3 className="font-medium text-ink">{a.title}</h3>
                      <p className="text-[13px] text-slate-500">
                        {a.gradeLevel === "All" ? "All students" : a.gradeLevel} · {a.responseCount} {a.responseCount === 1 ? "response" : "responses"} ·{" "}
                        <span className={a.isOpen ? "text-emerald-700" : ""}>{a.isOpen ? "Open" : "Closed"}</span>
                      </p>
                    </div>
                    <button onClick={() => toggleOpen(a)} className="px-3 min-h-9 rounded-full text-[13px] text-slate-600 hover:bg-slate-100">
                      {a.isOpen ? "Close form" : "Reopen form"}
                    </button>
                  </div>
                  <InlineError message={toggleError?.id === a.id ? toggleError.message : null} onDismiss={() => setToggleError(null)} className="mt-2" />

                  <table className="mt-4 w-full text-sm">
                    <caption className="sr-only">Responses per topic for {a.title}</caption>
                    <tbody>
                      {a.tally.map((t, i) => (
                        <tr key={t.topic}>
                          <th scope="row" className="py-1.5 pr-4 text-left font-normal text-ink w-1/2">
                            {i === 0 && t.count > 0 && <span className="text-xs text-blue-700 mr-2">Top</span>}
                            {t.topic}
                          </th>
                          <td className="py-1.5 pr-3">
                            <div className="h-2 bg-blue-100 rounded-full overflow-hidden">
                              <div className="h-full bg-blue-500 rounded-full" style={{ width: `${(t.count / max) * 100}%` }} />
                            </div>
                          </td>
                          <td className="py-1.5 w-10 text-right font-mono text-[13px] text-slate-600 tabular">{t.count}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  {a.comments.length > 0 && (
                    <details className="mt-3 text-sm">
                      <summary className="cursor-pointer text-blue-700 min-h-9 inline-flex items-center">Student comments ({a.comments.length})</summary>
                      <ul className="mt-2 divide-y divide-rule border-y border-rule">
                        {a.comments.map((c, i) => (
                          <li key={i} className="py-2.5">
                            <p className="text-ink whitespace-pre-wrap">{c.comment}</p>
                            <p className="text-xs text-slate-500 mt-0.5">{c.studentName}</p>
                          </li>
                        ))}
                      </ul>
                    </details>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </section>

      {/* ---- Programs ---- */}
      <section className="mt-14">
        <div className="flex flex-wrap items-baseline justify-between gap-3 mb-3">
          <h2 className="font-serif text-[22px] text-ink">Group sessions</h2>
          <button onClick={() => { setProgram({ title: "", gradeLevel: "Grade 11", dateString: minSelectableDate, time: "" }); setProgramError(null); setIsProgramOpen(true); }}
            className="inline-flex items-center gap-2 border border-slate-300 hover:bg-slate-100 text-sm font-medium px-4 min-h-11 rounded-full transition-colors">
            <Plus size={16} /> Schedule a session
          </button>
        </div>

        {programs === null ? (
          <div className="py-12 flex justify-center text-slate-500"><Loader2 className="animate-spin" size={20} /></div>
        ) : programs.length === 0 ? (
          <p className="border-t border-rule pt-4 text-sm text-slate-500">No sessions scheduled yet.</p>
        ) : (
          <ul className="divide-y divide-rule border-y border-rule">
            {programs.map((p) => {
              const d = new Date(p.date).toISOString().slice(0, 10); // calendar day, stored as UTC midnight
              const isPast = d < today;
              return (
                <li key={p.id} className="py-4 grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-x-6 gap-y-2">
                  <div>
                    <p className="font-medium text-ink">{p.title}</p>
                    <p className="text-[13px] text-slate-500">
                      {p.gradeLevel} · <span className="font-mono">{new Date(p.date).toLocaleDateString("en-PH", { timeZone: "UTC", month: "short", day: "numeric", year: "numeric" })} · {p.time}</span>
                    </p>
                    {p.outcomes && <p className="text-sm text-slate-700 mt-1.5 whitespace-pre-wrap">{p.outcomes}</p>}
                  </div>
                  <div className="flex items-center gap-3 sm:justify-end">
                    <span className="inline-flex items-center gap-1.5 text-[13px] text-slate-600"><Users size={14} /> {p.participants} attended</span>
                    {sheets.some((s) => s.refId === p.id) && <span className="text-[12px] text-slate-500">· sheet attached</span>}
                    <span className={`text-xs ${isPast ? "text-slate-500" : "text-blue-700"}`}>{isPast ? "Held" : "Upcoming"}</span>
                    <button onClick={() => { setRecordError(null); setRecording({ id: p.id, title: p.title, attendees: p.attendees.join("\n"), outcomes: p.outcomes ?? "", headcount: p.attendees.length ? "" : String(p.participants || "") }); }}
                      className="px-3 min-h-9 rounded-full text-[13px] text-blue-700 hover:bg-blue-50">
                      {p.attendees.length || p.outcomes ? "Edit record" : "Record attendance"}
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {/* New needs assessment */}
      {isFormOpen && (
        <Dialog title="New needs assessment form" onClose={() => setIsFormOpen(false)}>
          <form onSubmit={saveForm} className="space-y-4">
            <Field id="na-title" label="Title">
              <input id="na-title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required placeholder="e.g. 2nd semester needs assessment"
                className="w-full bg-paper border border-slate-300 rounded-md px-3 py-2.5 text-sm" />
            </Field>
            <Field id="na-grade" label="Who should answer">
              <select id="na-grade" value={form.gradeLevel} onChange={(e) => setForm({ ...form, gradeLevel: e.target.value })}
                className="w-full bg-paper border border-slate-300 rounded-md px-3 py-2.5 text-sm">
                <option value="All">All students</option>
                {gradeLevels.map((g) => <option key={g.id} value={optionValue(g)}>{g.label}</option>)}
              </select>
            </Field>
            <Field id="na-topics" label="Topics students can choose (one per line)">
              <textarea id="na-topics" rows={8} value={form.topics} onChange={(e) => setForm({ ...form, topics: e.target.value })}
                className="w-full bg-paper border border-slate-300 rounded-md px-3 py-2.5 text-sm resize-y" />
            </Field>
            <InlineError message={formError} onDismiss={() => setFormError(null)} />
            <DialogButtons onCancel={() => setIsFormOpen(false)} isSaving={isSavingForm} label="Send to students" />
          </form>
        </Dialog>
      )}

      {/* New program */}
      {isProgramOpen && (
        <Dialog title="Schedule a group session" onClose={() => setIsProgramOpen(false)}>
          <form onSubmit={saveProgram} className="space-y-4">
            <Field id="gp-title" label="Title">
              <input id="gp-title" value={program.title} onChange={(e) => setProgram({ ...program, title: e.target.value })} required
                className="w-full bg-paper border border-slate-300 rounded-md px-3 py-2.5 text-sm" />
            </Field>
            <Field id="gp-grade" label="Grade level">
              <select id="gp-grade" value={program.gradeLevel} onChange={(e) => setProgram({ ...program, gradeLevel: e.target.value })}
                className="w-full bg-paper border border-slate-300 rounded-md px-3 py-2.5 text-sm">
                {gradeLevels.map((g) => <option key={g.id} value={optionValue(g)}>{g.label}</option>)}
              </select>
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field id="gp-date" label="Date">
                <input id="gp-date" type="date" min={minSelectableDate} value={program.dateString} onChange={(e) => setProgram({ ...program, dateString: e.target.value })} required
                  className="w-full bg-paper border border-slate-300 rounded-md px-3 py-2.5 text-sm" />
              </Field>
              <Field id="gp-time" label="Time">
                <input id="gp-time" value={program.time} onChange={(e) => setProgram({ ...program, time: e.target.value })} required placeholder="e.g. 10:00 AM"
                  className="w-full bg-paper border border-slate-300 rounded-md px-3 py-2.5 text-sm" />
              </Field>
            </div>
            <InlineError message={programError} onDismiss={() => setProgramError(null)} />
            <DialogButtons onCancel={() => setIsProgramOpen(false)} isSaving={isSavingProgram} label="Schedule" />
          </form>
        </Dialog>
      )}

      {/* Attendance + outcomes */}
      {recording && (
        <Dialog title={`Session record: ${recording.title}`} onClose={() => setRecording(null)}>
          <form onSubmit={saveRecord} className="space-y-4">
            <div>
              <p className="text-[13px] font-medium text-slate-700 mb-1.5">Attendance sheet</p>
              <p className="text-xs text-slate-500 mb-2">Attach a photo of the signed attendance form, type the names below, or both.</p>
              <AttachmentStrip kind="GROUP_ATTENDANCE" refId={recording.id} items={sheets.filter((s) => s.refId === recording.id)}
                onChange={loadSheets} addLabel="Attach photo of sheet" />
            </div>
            <Field id="rec-count" label="Number who attended (if you didn't type the names)">
              <input id="rec-count" type="number" min={0} max={2000} inputMode="numeric" value={recording.headcount}
                onChange={(e) => setRecording({ ...recording, headcount: e.target.value })}
                className="w-40 bg-paper border border-slate-300 rounded-md px-3 py-2.5 text-sm" />
            </Field>
            <Field id="rec-att" label="Attendees (one name per line, optional)">
              <textarea id="rec-att" rows={8} value={recording.attendees} onChange={(e) => setRecording({ ...recording, attendees: e.target.value })}
                className="w-full bg-paper border border-slate-300 rounded-md px-3 py-2.5 text-sm resize-y" />
            </Field>
            <Field id="rec-out" label="Session outcomes">
              <textarea id="rec-out" rows={4} value={recording.outcomes} onChange={(e) => setRecording({ ...recording, outcomes: e.target.value })}
                placeholder="What was covered, how students responded, follow-ups needed"
                className="w-full bg-paper border border-slate-300 rounded-md px-3 py-2.5 text-sm resize-y" />
            </Field>
            <InlineError message={recordError} onDismiss={() => setRecordError(null)} />
            <DialogButtons onCancel={() => setRecording(null)} isSaving={isSavingRecord} label="Save record" />
          </form>
        </Dialog>
      )}
    </div>
  );
}

function Dialog({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4" onClick={onClose}>
      <div role="dialog" aria-modal="true" aria-label={title} onClick={(e) => e.stopPropagation()}
        className="bg-sheet w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-xl border border-rule shadow-xl p-6">
        <div className="flex items-start justify-between gap-4 mb-4">
          <h2 className="font-medium text-ink">{title}</h2>
          <button type="button" onClick={onClose} aria-label="Close" className="w-11 h-11 -m-2 grid place-items-center text-slate-500 hover:text-ink hover:bg-slate-100 rounded-full"><X size={18} /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

function Field({ id, label, children }: { id: string; label: string; children: React.ReactNode }) {
  return (
    <div>
      <label htmlFor={id} className="block text-[13px] font-medium text-slate-700 mb-1.5">{label}</label>
      {children}
    </div>
  );
}

function DialogButtons({ onCancel, isSaving, label }: { onCancel: () => void; isSaving: boolean; label: string }) {
  return (
    <div className="flex justify-end gap-2 pt-2 border-t border-rule">
      <button type="button" onClick={onCancel} className="px-4 min-h-11 rounded-full text-sm text-slate-600 hover:bg-slate-100">Cancel</button>
      <button type="submit" disabled={isSaving}
        className="inline-flex items-center gap-2 bg-blue-700 hover:bg-blue-800 disabled:opacity-60 text-white text-sm font-medium px-4 min-h-11 rounded-full">
        {isSaving && <Loader2 size={16} className="animate-spin" />} {label}
      </button>
    </div>
  );
}
