"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Loader2, Lock, X } from "lucide-react";
import { getCareerForm, listCareerForms } from "../../../action/counselor";
import { COLLEGE_CAREER_FORM, isShown } from "../../../config/collegeCareerForm";

type Row = Awaited<ReturnType<typeof listCareerForms>>[number];
type Form = NonNullable<Awaited<ReturnType<typeof getCareerForm>>>;

const fmt = (d: Date | string | null) => (d ? new Date(d).toLocaleDateString("en-PH", { dateStyle: "medium" }) : "");

export default function CareerFormsPage() {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState<Form | null>(null);
  const [loadingName, setLoadingName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const r = await listCareerForms();
      if (!cancelled) setRows(r);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Escape closes the form panel
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(null);
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  const view = async (name: string) => {
    setLoadingName(name);
    setError(null);
    const f = await getCareerForm(name);
    setLoadingName(null);
    if (!f) return setError("That form could not be opened. Please try again.");
    setOpen(f);
  };

  const shown = (rows ?? []).filter((r) => r.studentName.toLowerCase().includes(query.trim().toLowerCase()));

  return (
    <div className="px-5 sm:px-8 lg:px-12 pt-8 lg:pt-12 pb-16 max-w-5xl text-slate-800">
      <Link href="/careerguidance" className="inline-flex items-center gap-1.5 text-[13px] text-slate-500 hover:text-blue-700">
        <ArrowLeft size={14} /> Career Guidance
      </Link>
      <header className="mt-3">
        <h1 className="page-title">Career Planning Forms</h1>
      </header>

      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search by student name"
        aria-label="Search by student name"
        className="mt-6 w-full max-w-sm px-3.5 py-2.5 bg-sheet border border-slate-300 rounded-md text-[15px]"
      />
      {error && (
        <p role="alert" className="mt-3 text-[13px] text-red-700">
          {error}
        </p>
      )}

      {rows === null ? (
        <div className="py-16 flex justify-center text-slate-500">
          <Loader2 className="animate-spin" size={20} />
        </div>
      ) : shown.length === 0 ? (
        <p className="mt-8 text-sm text-slate-500">{rows.length ? "No student matches that name." : "No tertiary student has started the Career Planning Form yet."}</p>
      ) : (
        <ul className="mt-6 border-t border-rule">
          {shown.map((r) => (
            <li key={r.id} className="py-3 border-b border-rule flex flex-wrap items-center gap-x-4 gap-y-1">
              <div className="flex-1 min-w-[12rem]">
                <p className="font-medium text-ink">{r.studentName}</p>
                <p className="text-[13px] text-slate-500">
                  {[r.profile?.studentId, r.profile?.strandOrProgram, r.profile?.gradeSection].filter(Boolean).join(" · ") || "No inventory record yet"}
                </p>
              </div>
              <span className={`text-[12px] px-2 py-0.5 rounded-full ${r.submittedAt ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>
                {r.submittedAt ? `Submitted ${fmt(r.submittedAt)}` : `Draft, updated ${fmt(r.updatedAt)}`}
              </span>
              <button
                type="button"
                onClick={() => view(r.studentName)}
                disabled={loadingName !== null}
                className="min-h-10 px-4 rounded-full border border-slate-300 text-[13px] hover:bg-slate-50 inline-flex items-center gap-2 disabled:opacity-60"
              >
                {loadingName === r.studentName && <Loader2 size={14} className="animate-spin" />}
                View form
              </button>
            </li>
          ))}
        </ul>
      )}

      {open && (
        <div className="fixed inset-0 z-50 bg-black/40 flex justify-end" role="dialog" aria-modal="true" aria-labelledby="form-title" onClick={() => setOpen(null)}>
          <div className="w-full max-w-2xl h-full overflow-y-auto bg-sheet p-5 sm:p-8" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start gap-3">
              <div className="flex-1">
                <h2 id="form-title" className="text-xl font-semibold text-ink">
                  {open.studentName}
                </h2>
                <p className="text-[13px] text-slate-500">
                  {open.submittedAt ? `Submitted ${fmt(open.submittedAt)}` : "Draft (not yet submitted)"} · last updated {fmt(open.updatedAt)}
                </p>
              </div>
              <button type="button" autoFocus onClick={() => setOpen(null)} aria-label="Close" className="w-10 h-10 grid place-items-center rounded-full hover:bg-slate-100">
                <X size={18} />
              </button>
            </div>
            {COLLEGE_CAREER_FORM.filter((s) => s.id !== "consent" && s.id !== "certification").map((s) => {
              const fields = s.fields.filter((f) => isShown(f, open.answers));
              const answered = fields.filter((f) => open.answers[f.id] !== undefined);
              return (
                <section key={s.id} className="mt-7">
                  <h3 className="text-[13px] font-semibold uppercase tracking-wide text-slate-500 flex items-center gap-1.5">
                    {s.title}
                    {s.confidential && <Lock size={13} aria-label="Confidential" />}
                  </h3>
                  {answered.length === 0 ? (
                    <p className="mt-2 text-sm text-slate-400">Not answered.</p>
                  ) : (
                    <dl className="mt-2 divide-y divide-rule border-y border-rule">
                      {answered.map((f) => {
                        const v = open.answers[f.id];
                        return (
                          <div key={f.id} className="py-2 grid sm:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] gap-x-4 gap-y-0.5">
                            <dt className="text-[13px] text-slate-500">{f.label}</dt>
                            <dd className="text-[14px] text-ink whitespace-pre-line break-words">{Array.isArray(v) ? v.join(", ") : v}</dd>
                          </div>
                        );
                      })}
                    </dl>
                  )}
                </section>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
