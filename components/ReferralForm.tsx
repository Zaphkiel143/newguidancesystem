"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Loader2, Send } from "lucide-react";
import {
  CONCERN_TYPES,
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

const PRIORITIES = [
  { value: "Low", label: "Low – mild concern" },
  { value: "Medium", label: "Medium – noticeable concern" },
  { value: "High", label: "High – needs attention soon" },
];

// Faculty pick from a different, deadline-oriented scale instead of the
// Low/Medium/High one students and parents use.
const FACULTY_PRIORITIES = [
  { value: "Emergency", label: "Emergency" },
  { value: "As soon as possible", label: "As soon as possible" },
  { value: "Before this date", label: "Before this date" },
];
const NEEDS_DATE = "Before this date";

const EMPTY = {
  aboutMyself: false,
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
  return { ...EMPTY, priority: mode === "faculty" ? FACULTY_PRIORITIES[0].value : "Medium" };
}

const input = "w-full px-3 py-2.5 bg-sheet border border-slate-300 rounded-lg text-[14px] focus:outline-none focus:ring-2 focus:ring-blue-500";
const label = "text-[13px] font-semibold text-slate-700 block mb-1.5";
const req = <span className="text-rose-600" aria-hidden> *</span>;

// One referral form for students, faculty and parents, so every referral
// reaches the guidance office with the same details.
export default function ReferralForm({ mode, linkedChildren, onSubmit, myReferralsPath }: Props) {
  const [departments] = useOptionList("departments");
  const [f, setF] = useState(() => emptyFor(mode));
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = (patch: Partial<typeof EMPTY>) => setF((prev) => ({ ...prev, ...patch }));
  const aboutSomeoneElse = mode !== "parent" && !(mode === "student" && f.aboutMyself);
  const child = mode === "parent" ? linkedChildren?.find((c) => c.name === f.childName) ?? linkedChildren?.[0] : undefined;
  const isShs = f.department === SHS;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (f.concern === OTHER && !f.concernOther.trim()) return setError("Tell us what the concern is.");
    if (mode === "faculty" && f.priority === NEEDS_DATE && !f.priorityDate) return setError("Choose the date it's needed by.");
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
      mode === "faculty" && f.priority === NEEDS_DATE && f.priorityDate && `Needed by: ${f.priorityDate}`,
      mode === "parent" && f.contactTime.trim() && `Best time to contact me: ${f.contactTime.trim()}`,
    ].filter(Boolean);

    const result = await onSubmit({
      aboutMyself: mode === "student" && f.aboutMyself,
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
      {mode === "student" && (
        <fieldset>
          <legend className={label}>Who is this referral about?</legend>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {[
              { value: false, title: "Someone", hint: "A schoolmate or friend you're worried about" },
              { value: true, title: "Myself", hint: "You'd like the associate to reach out to you" },
            ].map((opt) => (
              <label key={opt.title}
                className={`flex items-start gap-3 rounded-lg border px-4 py-3 cursor-pointer transition-colors ${f.aboutMyself === opt.value ? "border-blue-600 bg-blue-50" : "border-slate-300 hover:border-slate-400"}`}>
                <input type="radio" name="aboutMyself" checked={f.aboutMyself === opt.value} onChange={() => set({ aboutMyself: opt.value })} className="mt-1 accent-blue-700" />
                <span>
                  <span className="block text-sm font-medium text-ink">{opt.title}</span>
                  <span className="block text-xs text-slate-500">{opt.hint}</span>
                </span>
              </label>
            ))}
          </div>
        </fieldset>
      )}

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
            {CONCERN_TYPES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          {f.concern === OTHER && (
            <input aria-label="Describe the concern type" placeholder="What kind of concern?" className={`${input} mt-2`} value={f.concernOther}
              maxLength={60} required onChange={(e) => set({ concernOther: e.target.value })} />
          )}
        </div>
        <div>
          <label htmlFor="ref-priority" className={label}>{mode === "faculty" ? "Level of priority" : "How urgent is it?"}{req}</label>
          <select id="ref-priority" className={input} value={f.priority} onChange={(e) => set({ priority: e.target.value, priorityDate: "" })}>
            {(mode === "faculty" ? FACULTY_PRIORITIES : PRIORITIES).map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
          </select>
          {mode === "faculty" && f.priority === NEEDS_DATE && (
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
          placeholder={mode === "student" && f.aboutMyself ? "Tell the associate what you'd like help with." : "Describe what you've noticed and why you're concerned."}
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
