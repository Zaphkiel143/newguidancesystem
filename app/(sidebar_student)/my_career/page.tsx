"use client";

import React, { useEffect, useState } from 'react';
import { Loader2, Check } from 'lucide-react';
import { getMyCareerPlan } from '../../action/student';
import { CAREER_STEPS } from '../../config/careerSteps';
import type { CareerPlan } from '../../../lib/generated';

export default function MyCareerPlanPage() {
  const [plan, setPlan] = useState<CareerPlan | null | undefined>(undefined);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const data = await getMyCareerPlan();
      if (!cancelled) setPlan(data);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const done = plan?.stepDates.filter(Boolean).length ?? 0;
  const currentIndex = plan ? plan.stepDates.findIndex((d) => !d) : -1;

  return (
    <div className="px-5 sm:px-8 lg:px-12 pt-8 lg:pt-12 pb-16 max-w-3xl text-slate-800">
      <header>
        <h1 className="page-title">My Career Plan</h1>
        <p className="text-sm text-slate-500 mt-1">Your progress through the Career Planning Program</p>
      </header>

      {plan === undefined ? (
        <div className="py-20 flex justify-center text-slate-500">
          <Loader2 className="animate-spin" size={20} />
        </div>
      ) : plan === null ? (
        <p className="mt-10 border-t border-rule pt-4 text-sm text-slate-500 max-w-[55ch]">
          You&apos;re not enrolled in the Career Planning Program yet. The Guidance Associate adds Senior High School students to
          the program; message the guidance office if you think you should be in it.
        </p>
      ) : (
        <>
          <div className="mt-8 flex flex-wrap items-baseline gap-x-8 gap-y-2 text-sm">
            <p>
              <span className="font-serif text-[40px] leading-none text-ink tabular">{done}</span>
              <span className="text-slate-500"> of {CAREER_STEPS.length} stages done</span>
            </p>
            <p className="text-slate-600">{plan.grade}</p>
            {plan.facilitator && <p className="text-slate-600">Facilitator: <span className="text-ink">{plan.facilitator}</span></p>}
          </div>
          <div className="mt-4 h-1.5 bg-blue-100 rounded-full overflow-hidden">
            <div className="h-full bg-blue-500 rounded-full" style={{ width: `${(done / CAREER_STEPS.length) * 100}%` }} />
          </div>

          <ol className="mt-8 border-t border-rule">
            {CAREER_STEPS.map((step, i) => {
              const date = plan.stepDates[i];
              const note = plan.stepNotes[i];
              const isCurrent = i === currentIndex;
              return (
                <li key={step} className="py-4 border-b border-rule grid grid-cols-[32px_1fr] gap-3">
                  <span
                    className={`w-7 h-7 rounded-full grid place-items-center text-xs font-semibold ${
                      date ? "bg-emerald-600 text-white" : isCurrent ? "border-2 border-blue-700 text-blue-700" : "border border-slate-300 text-slate-500"
                    }`}
                    aria-hidden
                  >
                    {date ? <Check size={14} /> : i + 1}
                  </span>
                  <div>
                    <p className={`font-medium ${date || isCurrent ? "text-ink" : "text-slate-500"}`}>
                      {step}
                      {isCurrent && <span className="ml-2 text-xs font-normal text-blue-700">Current stage</span>}
                    </p>
                    <p className="text-[13px] text-slate-500 mt-0.5">{date ? `Completed ${date}` : "Not yet completed"}</p>
                    {note && <p className="text-sm text-slate-700 mt-1.5">{note}</p>}
                  </div>
                </li>
              );
            })}
          </ol>
        </>
      )}
    </div>
  );
}
