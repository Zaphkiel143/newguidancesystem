"use client";

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { getMyAppointments } from '../../action/student';
import type { Appointment as DbAppointment } from '../../../lib/generated';

const STUDENT_NAME = "Nhel Belarmino";

interface ProgressBarMetric {
  id: string;
  label: string;
  percentage: number;
}

const SHORTCUTS = [
  { label: 'Book an appointment', path: '/my_appointments' },
  { label: 'View my profile', path: '/profile' },
  { label: 'Refer a classmate', path: '/refer_student' },
  { label: 'Message my counselor', path: '/my_messages' },
];

export const DashboardContent: React.FC = () => {
  const [upcoming, setUpcoming] = useState<DbAppointment | null>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const appointments = await getMyAppointments(STUDENT_NAME);
      if (cancelled) return;
      const next = appointments.find((a) => a.status !== "CANCELLED" && new Date(a.date) >= new Date());
      setUpcoming(next ?? null);
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const figures = [
    { id: 'sessions', count: 8, label: 'Sessions completed' },
    { id: 'goals', count: 5, label: 'Goals reached' },
    { id: 'tasks', count: 3, label: 'Tasks coming up' },
  ];

  const progressMetrics: ProgressBarMetric[] = [
    { id: 'career', label: 'Career planning', percentage: 75 },
    { id: 'personal', label: 'Personal development', percentage: 60 },
    { id: 'academic', label: 'Academic goals', percentage: 85 },
  ];

  const firstName = STUDENT_NAME.split(" ")[0];

  return (
    <div className="px-5 sm:px-8 lg:px-12 pt-8 lg:pt-12 pb-16 max-w-6xl text-slate-800">
      <header>
        <h1 className="page-title">Kumusta, {firstName}.</h1>
        <p className="mt-2 text-slate-600">Here&apos;s where things stand with the guidance office.</p>
      </header>

      {/* E-Gabay invitation: one quiet line, not a banner */}
      <Link
        href="/ai_chat"
        className="group mt-8 flex items-center justify-between gap-6 border border-rule bg-sheet rounded-xl px-6 py-5 hover:border-blue-300 transition-colors"
      >
        <span>
          <span className="block font-serif text-[22px] text-ink leading-snug">Need someone to talk to?</span>
          <span className="block text-[14px] text-slate-500 mt-1">
            E-Gabay listens in English or Filipino. Your counselor is still a message away.
          </span>
        </span>
        <span className="shrink-0 inline-flex items-center gap-2 text-[14px] font-medium text-blue-700">
          Open chat <ArrowRight size={16} className="group-hover:translate-x-0.5 transition-transform" />
        </span>
      </Link>

      <div className="mt-12 grid grid-cols-1 lg:grid-cols-[1.3fr_1fr] gap-12 lg:gap-16">
        {/* Progress */}
        <section>
          <h2 className="font-serif text-[22px] text-ink mb-3">My progress</h2>
          <div className="grid grid-cols-3 gap-px bg-rule border-y border-rule">
            {figures.map((f) => (
              <div key={f.id} className="bg-paper py-5 px-4 first:pl-0">
                <p className="font-serif text-[40px] leading-none text-ink tabular">{f.count}</p>
                <p className="text-[13px] text-slate-500 mt-2">{f.label}</p>
              </div>
            ))}
          </div>

          <ul className="mt-8 space-y-5">
            {progressMetrics.map((item) => (
              <li key={item.id}>
                <div className="flex justify-between items-baseline text-[14px]">
                  <span className="text-slate-700">{item.label}</span>
                  <span className="font-mono text-[12px] text-slate-500 tabular">{item.percentage}%</span>
                </div>
                <div className="mt-2 h-1 bg-slate-200 rounded-full overflow-hidden">
                  <div className="h-full bg-blue-700 rounded-full" style={{ width: `${item.percentage}%` }} />
                </div>
              </li>
            ))}
          </ul>
        </section>

        {/* Side column */}
        <div className="space-y-12">
          <section>
            <div className="flex items-baseline justify-between mb-3">
              <h2 className="font-serif text-[22px] text-ink">Next appointment</h2>
              <Link href="/my_appointments" className="text-[13px] text-slate-500 hover:text-blue-700 transition-colors">
                All appointments
              </Link>
            </div>
            <div className="border-t border-rule pt-4">
              {upcoming ? (
                <>
                  <p className="font-medium text-ink">{upcoming.appointmentType || "General consultation"}</p>
                  <p className="font-mono text-[13px] text-slate-500 mt-1 tabular">
                    {new Date(upcoming.date).toLocaleDateString("en-PH", { weekday: "short", month: "short", day: "numeric" })} · {upcoming.time}
                  </p>
                  <p className={`mt-2 inline-flex items-center gap-1.5 text-[12px] ${upcoming.status === "CONFIRMED" ? "text-emerald-700" : "text-orange-700"}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${upcoming.status === "CONFIRMED" ? "bg-emerald-500" : "bg-orange-500"}`} />
                    {upcoming.status === "CONFIRMED" ? "Confirmed" : "Waiting for confirmation"}
                  </p>
                </>
              ) : (
                <p className="text-[14px] text-slate-500">
                  Nothing booked.{" "}
                  <Link href="/my_appointments" className="text-blue-700 underline underline-offset-4 decoration-blue-200 hover:decoration-blue-600">
                    Book a session
                  </Link>
                </p>
              )}
            </div>
          </section>

          <section>
            <h2 className="font-serif text-[22px] text-ink mb-3">From the office</h2>
            <div className="border-t border-rule pt-4">
              <p className="font-medium text-ink">Career Fair 2026</p>
              <p className="font-mono text-[13px] text-slate-500 mt-1">April 25, 2026</p>
            </div>
          </section>

          <section>
            <h2 className="font-serif text-[22px] text-ink mb-3">Shortcuts</h2>
            <ul className="divide-y divide-rule border-y border-rule">
              {SHORTCUTS.map((s) => (
                <li key={s.path}>
                  <Link href={s.path} className="group flex items-center justify-between py-3 text-[14px] text-slate-700 hover:text-blue-700 transition-colors">
                    {s.label}
                    <ArrowRight size={14} className="text-slate-300 group-hover:text-blue-700 group-hover:translate-x-0.5 transition" />
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        </div>
      </div>
    </div>
  );
};

export default DashboardContent;
