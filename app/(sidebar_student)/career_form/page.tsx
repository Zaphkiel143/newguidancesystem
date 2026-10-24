"use client";

import React, { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Lock, Check, CircleCheck } from "lucide-react";
import { getMyCareerForm, saveMyCareerForm } from "../../action/student";
import {
  COLLEGE_CAREER_FORM,
  OTHER_PREFIX,
  capitalizeName,
  firstSectionWithError,
  isShown,
  phoneChars,
  validateAnswers,
  withLegacyDefaults,
  type Answers,
  type Field,
} from "../../config/collegeCareerForm";
import InlineError from "../../../components/InlineError";
import { useOptionList } from "../../../components/useOptionList";
import { optionValue } from "../../../lib/optionListDefaults";

const inputClass = "w-full px-3.5 py-2.5 bg-sheet border border-slate-300 rounded-md text-[15px] placeholder:text-slate-400 transition-colors";
const fieldClass = (bad?: string) => (bad ? inputClass.replace("border-slate-300", "border-red-500") : inputClass);

// After a successful submit, the dashboard opens on its own after this long.
const REDIRECT_MS = 3000;

type Loaded = Extract<Awaited<ReturnType<typeof getMyCareerForm>>, { allowed: true }>;

export default function CareerPlanningFormPage() {
  const router = useRouter();
  const [tertiaryCourses] = useOptionList("tertiaryCourses");
  const overrides: Record<string, string[]> = { program: tertiaryCourses.map(optionValue) };
  const [data, setData] = useState<Loaded | null | undefined>(undefined);
  const [answers, setAnswers] = useState<Answers>({});
  const [step, setStep] = useState(0);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState<"draft" | "submit" | null>(null);
  const [savedNote, setSavedNote] = useState<string | null>(null);
  const [submittedAt, setSubmittedAt] = useState<Date | null>(null);
  const [justSubmitted, setJustSubmitted] = useState(false);
  const topRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const res = await getMyCareerForm();
      if (cancelled) return;
      if (!res.allowed) return setData(null);
      // Start with what the school already knows about the student.
      setAnswers(withLegacyDefaults({ email: res.email ?? "", ...res.answers }));
      setSubmittedAt(res.submittedAt);
      setData(res);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // The success pop-up hands over to the dashboard by itself.
  useEffect(() => {
    if (!justSubmitted) return;
    const t = setTimeout(() => router.push("/student_dashboard"), REDIRECT_MS);
    return () => clearTimeout(t);
  }, [justSubmitted, router]);

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

  // Check only this page before moving on, so students fix things as they go.
  const next = () => {
    const pageErrors = Object.fromEntries(
      Object.entries(validateAnswers(answers, true, overrides)).filter(([id]) => section.fields.some((f) => f.id === id))
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
      // Every page is checked again, so a skipped question can't slip through.
      const all = validateAnswers(answers, true, overrides);
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
    if (submit) setJustSubmitted(true);
    else setSavedNote("Draft saved. You can finish it later.");
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
      <div className="px-5 sm:px-8 lg:px-12 pt-8 lg:pt-12 pb-16 max-w-4xl mx-auto text-slate-800">
        <h1 className="page-title">Career Planning Form</h1>
      </div>
    );
  }

  const fields = section.fields.filter((f) => isShown(f, answers));

  return (
    <div ref={topRef} className="px-5 sm:px-8 lg:px-12 pt-8 lg:pt-12 pb-16 max-w-4xl mx-auto text-slate-800 scroll-mt-24">
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
        className="mt-6 bg-sheet border border-rule rounded-2xl p-5 sm:p-8"
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

        <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-5">
          {fields.map((f) => (
            <div key={f.id} className={f.half ? undefined : "sm:col-span-2"}>
              <Question
                field={overrides[f.id] ? { ...f, options: overrides[f.id] } : f}
                value={answers[f.id]}
                error={errors[f.id]}
                onChange={(v) => set(f.id, v)}
                copySource={f.copyFrom ? answers[f.copyFrom.field] : undefined}
              />
            </div>
          ))}
        </div>

        <InlineError message={formError} onDismiss={() => setFormError(null)} className="mt-6" />
        {savedNote && (
          <p role="status" className="mt-6 text-[13px] text-emerald-700">
            {savedNote}
          </p>
        )}

        <div className="mt-8 flex flex-wrap items-center gap-3">
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

      {justSubmitted && (
        <div className="fixed inset-0 z-50 bg-black/40 grid place-items-center p-4" role="dialog" aria-modal="true" aria-labelledby="submitted-title">
          <div className="w-full max-w-sm bg-sheet rounded-2xl p-6 sm:p-7 text-center shadow-xl">
            <CircleCheck size={48} className="mx-auto text-emerald-600" aria-hidden />
            <h2 id="submitted-title" className="mt-3 text-xl font-semibold text-ink">
              Form submitted
            </h2>
            <p className="mt-2 text-[14px] text-slate-600">
              Your Career Planning Form was sent to the Guidance Associate. Taking you to your dashboard…
            </p>
            <button
              type="button"
              autoFocus
              onClick={() => router.push("/student_dashboard")}
              className="mt-5 w-full min-h-11 rounded-full bg-blue-700 text-white text-[14px] font-medium hover:bg-blue-800"
            >
              Go to dashboard
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function Question({
  field,
  value,
  error,
  onChange,
  copySource,
}: {
  field: Field;
  value: string | string[] | undefined;
  error?: string;
  onChange: (v: string | string[]) => void;
  copySource?: string | string[];
}) {
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

  if (field.type === "toggle") {
    return (
      <div>
        <label className="flex items-center gap-3 min-h-11 text-[15px] font-medium text-ink cursor-pointer">
          <input
            id={id}
            type="checkbox"
            checked={value === "Yes"}
            onChange={(e) => onChange(e.target.checked ? "Yes" : "")}
            aria-describedby={describedBy}
            className="w-5 h-5 accent-blue-700"
          />
          {field.label}
        </label>
        {hint}
        {err}
      </div>
    );
  }

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
        <div className={`mt-2 ${isChecks ? "grid sm:grid-cols-2 lg:grid-cols-3 gap-x-6" : "flex flex-wrap gap-x-6"} gap-y-1`}>
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
                placeholder="Please specify"
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
    placeholder: field.placeholder,
    "aria-describedby": describedBy,
    "aria-invalid": error ? true : undefined,
    className: fieldClass(error),
  };
  const canCopy = typeof copySource === "string" && copySource.trim() !== "";
  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-x-3 gap-y-1 mb-1.5">
        <label htmlFor={id} className="block text-[14px] font-medium text-ink">
          {label}
        </label>
        {field.copyFrom && (
          <button
            type="button"
            onClick={() => canCopy && onChange(copySource as string)}
            disabled={!canCopy}
            title={canCopy ? undefined : "Fill in the present address first."}
            className="text-[13px] text-blue-700 font-medium hover:underline disabled:text-slate-400 disabled:no-underline"
          >
            {field.copyFrom.label}
          </button>
        )}
      </div>
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
      ) : field.type === "phone" ? (
        <input {...common} type="tel" inputMode="tel" autoComplete="tel" maxLength={13} onChange={(e) => onChange(phoneChars(e.target.value))} />
      ) : field.type === "name" ? (
        <input {...common} type="text" autoCapitalize="words" onChange={(e) => onChange(capitalizeName(e.target.value))} />
      ) : field.id === "homeNumber" ? (
        <input {...common} type="tel" inputMode="numeric" maxLength={11} onChange={(e) => onChange(e.target.value.replace(/\D/g, ""))} />
      ) : (
        <input
          {...common}
          type={field.type === "date" ? "date" : field.id.toLowerCase().includes("email") ? "email" : "text"}
          max={field.type === "date" ? new Date().toISOString().slice(0, 10) : undefined}
          onChange={(e) => onChange(e.target.value)}
        />
      )}
      {hint}
      {err}
    </div>
  );
}
