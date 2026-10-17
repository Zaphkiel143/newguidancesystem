"use client";

import React, { useEffect, useState } from 'react';
import { User, Loader2 } from 'lucide-react';
import { getChildProfile } from '../../action/parent';
import { CAREER_STEPS } from '../../config/careerSteps';
import { useMyChildren } from '../useMyChildren';

type ChildProfile = NonNullable<Awaited<ReturnType<typeof getChildProfile>>>;

export const ChildProfilePage: React.FC = () => {
  const children = useMyChildren();
  const [chosenChild, setChosenChild] = useState('');
  const childName = chosenChild || children?.[0]?.name || '';
  const [data, setData] = useState<ChildProfile | null>(null);
  const [loadedFor, setLoadedFor] = useState('');

  useEffect(() => {
    if (!childName) return;
    let cancelled = false;
    (async () => {
      const result = await getChildProfile(childName);
      if (cancelled) return;
      setData(result);
      setLoadedFor(childName);
    })();
    return () => {
      cancelled = true;
    };
  }, [childName]);

  const isLoading = children === null || (childName !== '' && loadedFor !== childName);
  const p = data?.profile;

  return (
    <div className="px-5 sm:px-8 lg:px-12 pt-8 lg:pt-12 pb-16 max-w-5xl text-slate-800 space-y-8">
      <header className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1 className="page-title">Child Profile</h1>
          <p className="text-sm text-slate-500 mt-1">Your child&apos;s information, guidance sessions, and career planning progress</p>
        </div>
        {children && children.length > 1 && (
          <select
            aria-label="Choose a child"
            value={childName}
            onChange={(e) => setChosenChild(e.target.value)}
            className="bg-sheet border border-slate-300 rounded-md px-3 py-2 text-sm text-ink"
          >
            {children.map((c) => (
              <option key={c.name} value={c.name}>{c.name}</option>
            ))}
          </select>
        )}
      </header>

      {children?.length === 0 ? (
        <p className="border-l-2 border-orange-500 bg-orange-50 pl-3 py-2 text-sm text-orange-800 max-w-xl">
          No student is linked to your account yet. Ask the Guidance Office to link your child&apos;s record to your account.
        </p>
      ) : isLoading ? (
        <div className="py-20 flex justify-center text-slate-500">
          <Loader2 className="animate-spin" size={20} />
        </div>
      ) : !p ? (
        <p className="text-sm text-red-700">Couldn&apos;t load this profile. Try refreshing the page.</p>
      ) : (
        <>
          <section className="bg-white border border-rule rounded-xl overflow-hidden">
            <div className="px-6 py-6 flex items-center gap-5 border-b border-rule">
              <div className="w-14 h-14 bg-slate-200 text-slate-600 rounded-md flex items-center justify-center shrink-0">
                <User size={26} strokeWidth={1.5} />
              </div>
              <div>
                <h2 className="font-serif text-[28px] leading-tight text-ink">{p.name}</h2>
                <p className="font-mono text-[13px] text-slate-500 mt-0.5">Student ID {p.studentId}</p>
              </div>
            </div>
            <dl className="p-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-5 text-sm">
              <Field label="Department" value={p.department} />
              <Field label="Grade & section" value={p.gradeSection} />
              <Field label="Strand / program" value={p.strandOrProgram} />
              <Field label="School email" value={p.email} />
              <Field label="Phone" value={p.phone} />
              <Field label="Date of birth" value={p.birthDate} />
              <Field label="Address" value={p.address} />
              <Field label="Guardian" value={p.guardianName} />
              <Field label="Guardian contact" value={p.guardianContact} />
            </dl>
          </section>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
            <section>
              <h2 className="font-serif text-[22px] text-ink mb-3">Guidance sessions</h2>
              {data.appointments.length === 0 ? (
                <p className="border-t border-rule pt-4 text-sm text-slate-500">No sessions yet.</p>
              ) : (
                <ul className="divide-y divide-rule border-t border-rule">
                  {data.appointments.map((a) => (
                    <li key={a.id} className="py-3 flex items-baseline justify-between gap-4">
                      <span>
                        <span className="block font-medium text-ink">{a.appointmentType || "General consultation"}</span>
                        <span className="block font-mono text-[13px] text-slate-500">
                          {new Date(a.date).toLocaleDateString("en-PH", { timeZone: "UTC", month: "short", day: "numeric", year: "numeric" })} · {a.time}
                        </span>
                      </span>
                      <span className={`text-xs ${a.status === "CONFIRMED" ? "text-emerald-700" : "text-orange-700"}`}>
                        {a.status === "CONFIRMED" ? "Confirmed" : "Pending"}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
              <p className="text-xs text-slate-500 mt-3">Session notes stay confidential to the guidance office.</p>
            </section>

            <section>
              <h2 className="font-serif text-[22px] text-ink mb-3">Career Planning Program</h2>
              {!data.careerPlan ? (
                <p className="border-t border-rule pt-4 text-sm text-slate-500">Not enrolled in the Career Planning Program yet.</p>
              ) : (
                <ol className="divide-y divide-rule border-t border-rule">
                  {CAREER_STEPS.map((step, i) => {
                    const done = data.careerPlan!.stepDates[i];
                    return (
                      <li key={step} className="py-2.5 flex items-baseline justify-between gap-4 text-sm">
                        <span className={done ? "text-ink" : "text-slate-500"}>
                          <span className="font-mono text-xs text-slate-500 mr-2">{i + 1}</span>
                          {step}
                        </span>
                        <span className={`text-xs ${done ? "text-emerald-700" : "text-slate-500"}`}>
                          {done ? `Done ${done}` : "Not yet"}
                        </span>
                      </li>
                    );
                  })}
                </ol>
              )}
            </section>
          </div>
        </>
      )}
    </div>
  );
};

function Field({ label, value }: { label: string; value: string | null }) {
  return (
    <div>
      <dt className="text-xs text-slate-500">{label}</dt>
      <dd className="text-ink mt-0.5">{value || "—"}</dd>
    </div>
  );
}

export default ChildProfilePage;
