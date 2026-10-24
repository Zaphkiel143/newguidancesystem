"use client";

import React, { useEffect, useRef, useState } from "react";
import { Loader2, Lock, Check } from "lucide-react";
import { getMyCareerForm, saveMyCareerForm } from "../../action/student";
import {
  COLLEGE_CAREER_FORM,
  OTHER_PREFIX,
  firstSectionWithError,
  isShown,
  validateAnswers,
  type Answers,
  type Field,
} from "../../config/collegeCareerForm";
import InlineError from "../../../components/InlineError";

const inputClass = "w-full px-3.5 py-2.5 bg-sheet border border-slate-300 rounded-md text-[15px] placeholder:text-slate-400 transition-colors";
const fieldClass = (bad?: string) => (bad ? inputClass.replace("border-slate-300", "border-red-500") : inputClass);

type Loaded = Extract<Awaited<ReturnType<typeof getMyCareerForm>>, { allowed: true }>;

export default function CareerPlanningFormPage() {
  const [data, setData] = useState<Loaded | null | undefined>(undefined);
  const [answers, setAnswers] = useState<Answers>({});
  const [step, setStep] = useState(0);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState<"draft" | "submit" | null>(null);
  const [savedNote, setSavedNote] = useState<string | null>(null);
  const [submittedAt, setSubmittedAt] = useState<Date | null>(null);
  const topRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const res = await getMyCareerForm();
      if (cancelled) return;
      if (!res.allowed) return setData(null);
      // Start with what the school already knows about the student
      setAnswers({ email: res.email ?? "", ...res.answers });
      setSubmittedAt(res.submittedAt);
      setData(res);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const section = COLLEGE_CAREER_FORM[step];
  const last = step === COLLEGE_CAREER_FORM.length - 1;

  const set = (id: string, value: string | string[]) => {
    setAnswers((a) => ({ ...a, [id]: value }));
    setSavedNote(null);
    if (errors[id]) setErrors((e) => Object.fromEntries(Object.entries(e).filter(([k]) => k !== id)));
  };

  const goTo = (i: number) => {
    setStep(i);
    setFormError(null);
    topRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  // Check only this page before moving on, so students fix things as they go
  const next = () => {
    const pageErrors = Object.fromEntries(
      Object.entries(validateAnswers(answers, true)).filter(([id]) => section.fields.some((f) => f.id === id))
    );
    setErrors(pageErrors);
    if (Object.keys(pageErrors).length) {
      setFormError("Please answer the questions marked in red.");
      document.getElementById(`q-${Object.keys(pageErrors)[0]}`)?.focus();
      return;
    }
    goTo(step + 1);
  };

  const save = async (submit: boolean) => {
    setSaving(submit ? "submit" : "draft");
    setFormError(null);
    if (submit) {
      const all = validateAnswers(answers, true);
      if (Object.keys(all).length) {
        setErrors(all);
        setSaving(null);
        setFormError("Some answers are missing. You've been taken to the first page that needs fixing.");
        goTo(firstSectionWithError(all));
        return;
      }
    }
    const res = await saveMyCareerForm({ answers, submit });
    setSaving(null);
    if (!res.success) {
      setFormError(res.error);
      if (res.fieldErrors) {
        setErrors(res.fieldErrors);
        goTo(firstSectionWithError(res.fieldErrors));
      }
      return;
    }
    setSubmittedAt(res.submittedAt ? new Date(res.submittedAt) : null);
    setSavedNote(submit ? "Submitted. The Guidance Associate can now see your form." : "Draft saved. You can finish it later.");
  };

  if (data === undefined) {
    return (
      <div className="py-24 flex justify-center text-slate-500">
        <Loader2 className="animate-spin" size={20} />
      </div>
    );
  }

  if (data === null) {
    return (
      <div className="px-5 sm:px-8 lg:px-12 pt-8 lg:pt-12 pb-16 max-w-3xl text-slate-800">
        <h1 className="page-title">Career Planning Form</h1>
      </div>
    );
  }

  return (
    <div ref={topRef} className="px-5 sm:px-8 lg:px-12 pt-8 lg:pt-12 pb-16 max-w-3xl text-slate-800 scroll-mt-24">
      <header>
        <h1 className="page-title">Career Planning Form</h1>
        {submittedAt && (
          <p className="mt-2 inline-flex items-center gap-1.5 text-[13px] text-emerald-700">
            <Check size={14} /> Submitted {new Date(submittedAt).toLocaleDateString("en-PH", { dateStyle: "medium" })}. You can still update your answers.
          </p>
        )}
      </header>

      <div className="mt-6 flex items-center gap-3 text-[13px] text-slate-500">
        <span className="tabular">
          Page {step + 1} of {COLLEGE_CAREER_FORM.length}
        </span>
        <div className="flex-1 h-1.5 bg-blue-100 rounded-full overflow-hidden" aria-hidden>
          <div className="h-full bg-blue-600 rounded-full transition-all" style={{ width: `${((step + 1) / COLLEGE_CAREER_FORM.length) * 100}%` }} />
        </div>
      </div>

      <form
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          if (last) save(true);
          else next();
        }}
        className="mt-6 bg-sheet border border-rule rounded-2xl p-5 sm:p-7"
      >
        <h2 className="text-lg font-semibold text-ink flex items-center gap-2">
          {section.title}
          {section.confidential && <Lock size={15} className="text-slate-500" aria-label="Confidential" />}
        </h2>
        {section.note && <p className="text-[13px] text-slate-500 mt-1">{section.note}</p>}
        {step === 1 && (
          <p className="text-[13px] text-slate-500 mt-1">
            Name: <span className="text-ink">{data.name}</span>
            {data.studentId && (
              <>
                {" "}· Student number: <span className="text-ink">{data.studentId}</span>
              </>
            )}
          </p>
        )}

        <div className="mt-5 space-y-5">
          {section.fields.filter((f) => isShown(f, answers)).map((f) => (
            <Question key={f.id} field={f} value={answers[f.id]} error={errors[f.id]} onChange={(v) => set(f.id, v)} />
          ))}
        </div>

        <InlineError message={formError} onDismiss={() => setFormError(null)} className="mt-6" />
        {savedNote && (
          <p role="status" className="mt-6 text-[13px] text-emerald-700">
            {savedNote}
          </p>
        )}

        <div className="mt-7 flex flex-wrap items-center gap-3">
          {step > 0 && (
            <button type="button" onClick={() => goTo(step - 1)} className="min-h-11 px-5 rounded-full border border-slate-300 text-[14px] hover:bg-slate-50">
              Back
            </button>
          )}
          <button type="submit" disabled={saving !== null} className="min-h-11 px-6 rounded-full bg-blue-700 text-white text-[14px] font-medium hover:bg-blue-800 disabled:opacity-60 inline-flex items-center gap-2">
            {saving === "submit" && <Loader2 size={15} className="animate-spin" />}
            {last ? (submittedAt ? "Submit changes" : "Submit") : "Next"}
          </button>
          <button type="button" onClick={() => save(false)} disabled={saving !== null} className="min-h-11 px-4 text-[14px] text-blue-700 hover:underline disabled:opacity-60 inline-flex items-center gap-2">
            {saving === "draft" && <Loader2 size={15} className="animate-spin" />}
            Save draft
          </button>
        </div>
      </form>
    </div>
  );
}

function Question({ field, value, error, onChange }: { field: Field; value: string | string[] | undefined; error?: string; onChange: (v: string | string[]) => void }) {
  const id = `q-${field.id}`;
  const describedBy = [field.hint && `${id}-hint`, error && `${id}-error`].filter(Boolean).join(" ") || undefined;
  const label = (
    <>
      {field.label}
      {field.required && <span className="text-red-600" aria-hidden> *</span>}
    </>
  );
  const hint = field.hint && (
    <p id={`${id}-hint`} className="text-[12px] text-slate-500 mt-1">
      {field.hint}
    </p>
  );
  const err = error && (
    <p id={`${id}-error`} className="text-[12px] text-red-700 mt-1">
      {error}
    </p>
  );

  if (field.type === "radio" || field.type === "checks") {
    const isChecks = field.type === "checks";
    const list = isChecks ? ((value as string[] | undefined) ?? []) : [];
    const single = !isChecks ? ((value as string | undefined) ?? "") : "";
    const otherValue = (isChecks ? list.find((x) => x.startsWith(OTHER_PREFIX)) : single.startsWith(OTHER_PREFIX) ? single : "") ?? "";
    const otherOn = isChecks ? Boolean(otherValue) : single.startsWith(OTHER_PREFIX);
    const toggle = (opt: string) => {
      if (!isChecks) return onChange(opt);
      onChange(list.includes(opt) ? list.filter((x) => x !== opt) : [...list, opt]);
    };
    const setOther = (text: string, on: boolean) => {
      const v = on ? `${OTHER_PREFIX}${text}` : "";
      if (!isChecks) return onChange(v);
      const rest = list.filter((x) => !x.startsWith(OTHER_PREFIX));
      onChange(on ? [...rest, v] : rest);
    };
    return (
      <fieldset aria-describedby={describedBy} aria-invalid={error ? true : undefined}>
        <legend className="text-[14px] font-medium text-ink">{label}</legend>
        {hint}
        <div className={`mt-2 ${isChecks ? "grid sm:grid-cols-2 gap-x-6" : "flex flex-wrap gap-x-6"} gap-y-1`}>
          {(field.options ?? []).map((opt, i) => (
            <label key={opt} className="flex items-center gap-2.5 min-h-10 text-[14px] cursor-pointer">
              <input
                id={i === 0 ? id : undefined}
                type={isChecks ? "checkbox" : "radio"}
                name={field.id}
                checked={isChecks ? list.includes(opt) : single === opt}
                onChange={() => toggle(opt)}
                className="w-4 h-4 accent-blue-700"
              />
              {opt}
            </label>
          ))}
          {field.other && (
            <label className="flex items-center gap-2.5 min-h-10 text-[14px] sm:col-span-2">
              <input
                type={isChecks ? "checkbox" : "radio"}
                name={field.id}
                checked={otherOn}
                onChange={(e) => setOther(otherValue.slice(OTHER_PREFIX.length), isChecks ? e.target.checked : true)}
                className="w-4 h-4 accent-blue-700"
              />
              Other:
              <input
                type="text"
                aria-label={`${field.label}: other`}
                value={otherValue.slice(OTHER_PREFIX.length)}
                onChange={(e) => setOther(e.target.value, true)}
                className={`${inputClass} py-1.5 max-w-xs`}
              />
            </label>
          )}
        </div>
        {err}
      </fieldset>
    );
  }

  const common = {
    id,
    value: (value as string | undefined) ?? "",
    "aria-describedby": describedBy,
    "aria-invalid": error ? true : undefined,
    className: fieldClass(error),
  };
  return (
    <div>
      <label htmlFor={id} className="block text-[14px] font-medium text-ink mb-1.5">
        {label}
      </label>
      {field.type === "textarea" ? (
        <textarea {...common} rows={3} onChange={(e) => onChange(e.target.value)} />
      ) : field.type === "select" ? (
        <select {...common} onChange={(e) => onChange(e.target.value)}>
          <option value="">Choose…</option>
          {(field.options ?? []).map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </select>
      ) : (
        <input {...common} type={field.type === "date" ? "date" : "text"} max={field.type === "date" ? new Date().toISOString().slice(0, 10) : undefined} onChange={(e) => onChange(e.target.value)} />
      )}
      {hint}
      {err}
    </div>
  );
}
