"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Loader2, Send } from "lucide-react";
import {
  OTHER,
  SHS,
  programsFor,
  withOther,
  yearLevelsFor,
} from "../app/config/studentLevels";
import { optionValue } from "../lib/optionListDefaults";
import { useOptionList } from "./useOptionList";

export type ReferralPayload = {
  aboutMyself: boolean;
  studentName: string;
  concernType: string;
  priority: string;
  description: string;
};

type Mode = "student" | "faculty" | "parent";

interface Props {
  mode: Mode;
  // Parents choose among their linked children (null while loading).
  linkedChildren?: { name: string; studentId: string; gradeSection: string }[] | null;
  onSubmit: (payload: ReferralPayload) => Promise<{ success: boolean; error?: string }>;
  myReferralsPath: string;
}

// Students and faculty use a deadline-oriented priority scale (the
// "facultyPriorities" option list); parents use the Low/Medium/High scale
// (the "priorities" option list). "High", "Emergency" and "Before this
// date" are protected items - their itemKey stays frozen at these exact
// strings even if a counselor renames the label, which is what the string
// comparisons below depend on.
const NEEDS_DATE = "Before this date";

const EMPTY = {
  childName: "",
  studentName: "",
  studentId: "",
  department: SHS as string,
  yearLevel: "",
  program: "",
  section: "",
  concern: "",
  concernOther: "",
  priority: "Medium",
  priorityDate: "",
  description: "",
  observed: "",
  contactTime: "",
};

function emptyFor(mode: Mode) {
  return { ...EMPTY, priority: mode === "parent" ? "Medium" : "Emergency" };
}

const input = "w-full px-3 py-2.5 bg-sheet border border-slate-300 rounded-lg text-[14px] focus:outline-none focus:ring-2 focus:ring-blue-500";
const label = "text-[13px] font-semibold text-slate-700 block mb-1.5";
const req = <span className="text-rose-600" aria-hidden> *</span>;

// One referral form for students, faculty and parents, so every referral
// reaches the guidance office with the same details.
export default function ReferralForm({ mode, linkedChildren, onSubmit, myReferralsPath }: Props) {
  const [departments] = useOptionList("departments");
  const [concernTypes] = useOptionList("concernTypes");
  const [priorities] = useOptionList("priorities");
  const [facultyPriorities] = useOptionList("facultyPriorities");
  const [f, setF] = useState(() => emptyFor(mode));
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = (patch: Partial<typeof EMPTY>) => setF((prev) => ({ ...prev, ...patch }));
  const aboutSomeoneElse = mode !== "parent";
  const child = mode === "parent" ? linkedChildren?.find((c) => c.name === f.childName) ?? linkedChildren?.[0] : undefined;
  const isShs = f.department === SHS;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (f.concern === OTHER && !f.concernOther.trim()) return setError("Tell us what the concern is.");
    if (mode !== "parent" && f.priority === NEEDS_DATE && !f.priorityDate) return setError("Choose the date it's needed by.");
    if (mode === "parent" && !child) return setError("No student is linked to your account yet.");
    setSaving(true);
    setError(null);
    setDone(false);

    const details = [
      aboutSomeoneElse && f.studentId.trim() && `Student ID: ${f.studentId.trim()}`,
      aboutSomeoneElse && `Level: ${f.department}`,
      aboutSomeoneElse && f.yearLevel && `${isShs ? "Grade" : "Year level"}: ${f.yearLevel}`,
      aboutSomeoneElse && f.program && `${isShs ? "Strand" : "Course"}: ${f.program}`,
      aboutSomeoneElse && f.section.trim() && `Section: ${f.section.trim()}`,
      f.observed.trim() && `Observed behaviors: ${f.observed.trim()}`,
      mode !== "parent" && f.priority === NEEDS_DATE && f.priorityDate && `Needed by: ${f.priorityDate}`,
      mode === "parent" && f.contactTime.trim() && `Best time to contact me: ${f.contactTime.trim()}`,
    ].filter(Boolean);

    const result = await onSubmit({
      aboutMyself: false,
      studentName: mode === "parent" ? child!.name : f.studentName.trim(),
      concernType: withOther(f.concern, f.concernOther),
      priority: f.priority,
      description: [f.description.trim(), ...details].join("\n\n"),
    });
    setSaving(false);
    if (result.success) {
      setDone(true);
      setF({ ...emptyFor(mode), childName: f.childName });
    } else {
      setError(result.error || "Couldn't send the referral. Try again.");
    }
  };

  if (mode === "parent" && linkedChildren && linkedChildren.length === 0) {
    return (
      <p className="border-l-2 border-orange-500 bg-orange-50 pl-3 py-2 text-sm text-orange-800">
        No student is linked to your account yet. Add your child from{" "}
        <Link href="/parent_profile" className="text-blue-700 underline underline-offset-4">My Profile</Link>; once the guidance office
        confirms it, you can refer them here.
      </p>
    );
  }

  return (
    <form onSubmit={submit} className="bg-sheet rounded-2xl border border-rule shadow-sm p-5 sm:p-6 space-y-5">
      {mode === "parent" && (
        <div>
          <label htmlFor="ref-child" className={label}>Child</label>
          <select id="ref-child" className={input} value={child?.name ?? ""} onChange={(e) => set({ childName: e.target.value })} disabled={!linkedChildren}>
            {(linkedChildren ?? []).map((c) => <option key={c.studentId} value={c.name}>{c.name} · {c.gradeSection}</option>)}
          </select>
        </div>
      )}

      {aboutSomeoneElse && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="ref-name" className={label}>Student&apos;s full name{req}</label>
              <input id="ref-name" className={input} value={f.studentName} maxLength={120} required onChange={(e) => set({ studentName: e.target.value })} />
            </div>
            <div>
              <label htmlFor="ref-id" className={label}>Student ID <span className="font-normal text-slate-500">(if you know it)</span></label>
              <input id="ref-id" className={input} value={f.studentId} maxLength={20} onChange={(e) => set({ studentId: e.target.value })} />
            </div>
          </div>

          <fieldset>
            <legend className={label}>Level{req}</legend>
            <div className="grid grid-cols-2 gap-2 max-w-md">
              {departments.map((d) => {
                const value = optionValue(d);
                return (
                  <label key={d.id} className={`flex items-center gap-2 rounded-lg border px-3 min-h-11 cursor-pointer text-[14px] ${f.department === value ? "border-blue-600 bg-blue-50" : "border-slate-300"}`}>
                    <input type="radio" name="ref-dept" className="accent-blue-700" checked={f.department === value}
                      onChange={() => set({ department: value, yearLevel: "", program: "" })} />
                    {d.label}
                  </label>
                );
              })}
            </div>
          </fieldset>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label htmlFor="ref-year" className={label}>{isShs ? "Grade" : "Year level"}{req}</label>
              <select id="ref-year" className={input} value={f.yearLevel} required onChange={(e) => set({ yearLevel: e.target.value })}>
                <option value="" disabled>Choose…</option>
                {yearLevelsFor(f.department).map((y) => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="ref-program" className={label}>{isShs ? "Strand" : "Course"} <span className="font-normal text-slate-500">(if known)</span></label>
              <select id="ref-program" className={input} value={f.program} onChange={(e) => set({ program: e.target.value })}>
                <option value="">Not sure</option>
                {programsFor(f.department).map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="ref-section" className={label}>Section <span className="font-normal text-slate-500">(if known)</span></label>
              <input id="ref-section" className={input} value={f.section} maxLength={30} onChange={(e) => set({ section: e.target.value })} />
            </div>
          </div>
        </>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label htmlFor="ref-concern" className={label}>Type of concern{req}</label>
          <select id="ref-concern" className={input} value={f.concern} required onChange={(e) => set({ concern: e.target.value })}>
            <option value="" disabled>Choose…</option>
            {concernTypes.map((c) => <option key={c.id} value={optionValue(c)}>{c.label}</option>)}
            <option value={OTHER}>{OTHER}</option>
          </select>
          {f.concern === OTHER && (
            <input aria-label="Describe the concern type" placeholder="What kind of concern?" className={`${input} mt-2`} value={f.concernOther}
              maxLength={60} required onChange={(e) => set({ concernOther: e.target.value })} />
          )}
        </div>
        <div>
          <label htmlFor="ref-priority" className={label}>Level of priority{req}</label>
          <select id="ref-priority" className={input} value={f.priority} onChange={(e) => set({ priority: e.target.value, priorityDate: "" })}>
            {(mode === "parent" ? priorities : facultyPriorities).map((p) => <option key={p.id} value={optionValue(p)}>{p.label}</option>)}
          </select>
          {mode !== "parent" && f.priority === NEEDS_DATE && (
            <input
              aria-label="Date it's needed by"
              type="date"
              className={`${input} mt-2`}
              value={f.priorityDate}
              required
              onChange={(e) => set({ priorityDate: e.target.value })}
            />
          )}
        </div>
      </div>

      <div>
        <label htmlFor="ref-desc" className={label}>Reason for Referral{req}</label>
        <textarea id="ref-desc" rows={4} className={`${input} resize-y`} value={f.description} maxLength={3000} required
          placeholder="Describe what you've noticed and why you're concerned."
          onChange={(e) => set({ description: e.target.value })} />
      </div>

      <div>
        <label htmlFor="ref-observed" className={label}>Actions Taken<span className="font-normal text-slate-500">(optional)</span></label>
        <textarea id="ref-observed" rows={3} className={`${input} resize-y`} value={f.observed} maxLength={2000} onChange={(e) => set({ observed: e.target.value })} />
      </div>

      {mode === "parent" && (
        <div>
          <label htmlFor="ref-time" className={label}>Best time to contact you <span className="font-normal text-slate-500">(optional)</span></label>
          <input id="ref-time" className={input} value={f.contactTime} maxLength={80} placeholder="e.g. weekdays after 5 PM" onChange={(e) => set({ contactTime: e.target.value })} />
        </div>
      )}

      <p className="bg-orange-50 border border-orange-200 rounded-xl p-4 text-sm leading-relaxed text-orange-900">
        <strong className="font-semibold">If someone is in danger right now,</strong> tell a teacher or school staff, or go to the Guidance Office
        right away. Don&apos;t wait for a reply here.
      </p>

      {done && (
        <p role="status" className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm rounded-xl">
          Referral sent. The guidance office will review it, and you&apos;ll get a notification when they update it.{" "}
          <Link href={myReferralsPath} className="underline underline-offset-4">See my referrals</Link>
        </p>
      )}
      {error && (
        <p role="alert" className="p-4 bg-red-50 border border-red-100 text-red-700 text-sm rounded-xl">{error}</p>
      )}

      <div className="flex flex-col-reverse sm:flex-row items-center justify-end gap-3 pt-3 border-t border-rule">
        <button type="button" onClick={() => { setF(emptyFor(mode)); setError(null); setDone(false); }}
          className="w-full sm:w-auto px-8 min-h-11 bg-slate-100 hover:bg-slate-200 text-slate-800 font-medium rounded-full text-sm">
          Clear
        </button>
        <button type="submit" disabled={saving}
          className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-blue-700 hover:bg-blue-800 disabled:opacity-60 text-white font-medium min-h-11 px-8 rounded-full text-sm">
          {saving ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
          {saving ? "Sending…" : "Submit referral"}
        </button>
      </div>
    </form>
  );
}
