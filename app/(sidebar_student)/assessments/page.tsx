"use client";

import React, { useCallback, useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { getMyAssessments, submitAssessmentResponse } from '../../action/student';
import InlineError from '../../../components/InlineError';

type Assessment = Awaited<ReturnType<typeof getMyAssessments>>[number];

export default function AssessmentsPage() {
  const [assessments, setAssessments] = useState<Assessment[] | null>(null);

  const load = useCallback(async () => setAssessments(await getMyAssessments()), []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const data = await getMyAssessments();
      if (!cancelled) setAssessments(data);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="px-5 sm:px-8 lg:px-12 pt-8 lg:pt-12 pb-16 max-w-3xl text-slate-800">
      <header>
        <h1 className="page-title">Needs Assessment</h1>
        <p className="text-sm text-slate-500 mt-1 max-w-[60ch]">
          Tell the guidance office which topics you&apos;d like group sessions on. Your answers help plan the sessions; only the
          guidance office sees them.
        </p>
      </header>

      {assessments === null ? (
        <div className="py-20 flex justify-center text-slate-500">
          <Loader2 className="animate-spin" size={20} />
        </div>
      ) : assessments.length === 0 ? (
        <p className="mt-10 border-t border-rule pt-4 text-sm text-slate-500">There are no open forms for you right now.</p>
      ) : (
        <div className="mt-10 space-y-12">
          {assessments.map((a) => (
            <AssessmentForm key={a.id} assessment={a} onSaved={load} />
          ))}
        </div>
      )}
    </div>
  );
}

function AssessmentForm({ assessment, onSaved }: { assessment: Assessment; onSaved: () => Promise<void> }) {
  const [selected, setSelected] = useState<string[]>(assessment.myResponse?.selectedTopics ?? []);
  const [comment, setComment] = useState(assessment.myResponse?.comment ?? "");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const toggle = (topic: string) =>
    setSelected((prev) => (prev.includes(topic) ? prev.filter((t) => t !== topic) : [...prev, topic]));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSaved(false);
    if (selected.length === 0) return setError("Pick at least one topic.");

    setIsSaving(true);
    const result = await submitAssessmentResponse({ assessmentId: assessment.id, selectedTopics: selected, comment });
    setIsSaving(false);

    if (result.success) {
      setSaved(true);
      await onSaved();
    } else {
      setError(result.error || "Couldn't save your answers. Try again.");
    }
  };

  return (
    <form onSubmit={handleSubmit} className="border-t border-rule pt-5">
      <h2 className="font-serif text-[22px] text-ink">{assessment.title}</h2>
      <p className="text-[13px] text-slate-500 mt-1">
        {assessment.myResponse ? "You've answered this. You can change your answers until the form closes." : "Choose every topic that applies to you."}
      </p>

      <fieldset className="mt-5">
        <legend className="sr-only">Topics</legend>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {assessment.topics.map((topic) => {
            const isOn = selected.includes(topic);
            return (
              <label
                key={topic}
                className={`flex items-center gap-3 rounded-md border px-3 min-h-11 cursor-pointer text-sm transition-colors ${
                  isOn ? "border-blue-600 bg-blue-50 text-ink" : "border-slate-300 hover:border-slate-400"
                }`}
              >
                <input type="checkbox" checked={isOn} onChange={() => toggle(topic)} className="accent-blue-700 w-4 h-4" />
                {topic}
              </label>
            );
          })}
        </div>
      </fieldset>

      <label htmlFor={`comment-${assessment.id}`} className="block text-[13px] font-medium text-slate-700 mt-5 mb-1.5">
        Anything else you&apos;d like the guidance office to know? (optional)
      </label>
      <textarea
        id={`comment-${assessment.id}`}
        rows={3}
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        className="w-full bg-sheet border border-slate-300 rounded-md px-3 py-2.5 text-sm resize-none"
      />

      <InlineError message={error} onDismiss={() => setError(null)} className="mt-3" />
      {saved && <p role="status" className="mt-3 text-sm text-emerald-700 border-l-2 border-emerald-500 pl-3">Thanks, your answers were saved.</p>}

      <button
        type="submit"
        disabled={isSaving}
        className="mt-4 inline-flex items-center gap-2 bg-blue-700 hover:bg-blue-800 disabled:opacity-60 text-white text-sm font-medium px-4 min-h-11 rounded-full transition-colors"
      >
        {isSaving && <Loader2 size={16} className="animate-spin" />}
        {assessment.myResponse ? "Update answers" : "Submit answers"}
      </button>
    </form>
  );
}
