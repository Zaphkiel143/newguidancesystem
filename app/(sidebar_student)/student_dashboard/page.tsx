"use client";

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { getMyAppointments, getMyCareerPlan, getMyReferrals, getMyStudentLevel } from '../../action/student';
import { manilaToday } from '../../../lib/time';
import { greetingName } from '../../../lib/demo';
import { getBulletinPreview } from '../../action/bulletin';
import { CAREER_STEPS } from '../../config/careerSteps';
import { useCurrentUser } from '../../../components/CurrentUser';
import type { Appointment as DbAppointment, CareerPlan, Event as DbEvent } from '../../../lib/generated';

type Announcement = NonNullable<Awaited<ReturnType<typeof getBulletinPreview>>["announcement"]>;

const SHORTCUTS = [
  { label: 'Book an appointment', path: '/my_appointments' },
  { label: 'Answer a needs assessment', path: '/assessments' },
  { label: 'Refer yourself or someone', path: '/refer_student' },
  { label: 'Message the guidance office', path: '/my_messages' },
];

interface DashboardData {
  appointments: DbAppointment[];
  careerPlan: CareerPlan | null;
  level: Awaited<ReturnType<typeof getMyStudentLevel>>;
  openReferrals: number;
  announcement: Announcement | null;
  event: DbEvent | null;
}

export const DashboardContent: React.FC = () => {
  const me = useCurrentUser();
  const [data, setData] = useState<DashboardData | null>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const [appointments, careerPlan, referrals, preview, level] = await Promise.all([
        getMyAppointments(),
        getMyCareerPlan(),
        getMyReferrals(),
        getBulletinPreview(),
        getMyStudentLevel(),
      ]);
      if (cancelled) return;
      setData({
        appointments,
        careerPlan,
        level,
        openReferrals: referrals.filter((r) => r.status !== "CLOSED").length,
        announcement: preview.announcement,
        event: preview.event,
      });
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  // Appointment dates are calendar days stored as UTC midnight; compare as YYYY-MM-DD.
  const today = manilaToday();
  const isShs = data?.level.isShs ?? false;
  const day = (d: Date) => new Date(d).toISOString().slice(0, 10);
  const upcoming = data?.appointments
    .filter((a) => a.status !== "CANCELLED" && a.status !== "COMPLETED" && day(a.date) >= today)
    .sort((a, b) => +new Date(a.date) - +new Date(b.date))[0];
  const sessionsDone = data?.appointments.filter((a) => a.status === "COMPLETED" || (a.status === "CONFIRMED" && day(a.date) < today)).length ?? 0;
  const stagesDone = data?.careerPlan?.stepDates.filter(Boolean).length ?? 0;
  const nextStage = data?.careerPlan ? CAREER_STEPS[data.careerPlan.stepDates.findIndex((d) => !d)] : undefined;

  // Career stages only apply to senior high students (Career Planning Program).
  const figures = [
    { id: 'sessions', count: sessionsDone, label: 'Sessions attended' },
    ...(isShs ? [{ id: 'cpp', count: stagesDone, label: `of ${CAREER_STEPS.length} career stages done` }] : []),
    { id: 'referrals', count: data?.openReferrals ?? 0, label: 'Open referrals you sent' },
  ];

  return (
    <div className="px-5 sm:px-8 lg:px-12 pt-8 lg:pt-12 pb-16 max-w-6xl text-slate-800">
      <header>
        <h1 className="page-title">Kumusta, {greetingName(me.displayName)}.</h1>
      </header>

      {data && !data.level.hasProfile && (
        <Link href="/profile" className="mt-6 block rounded-2xl border border-orange-200 bg-orange-50 px-5 py-4 text-[14px] text-orange-900 hover:bg-orange-100 transition-colors">
          <strong className="font-semibold">Add your school details.</strong> Tell us your student ID, level and section so the guidance office can find your records. →
        </Link>
      )}

      {/* E-Gabay invitation. Stacks on phones so the text never spills out of the box. */}
      <Link
        href="/ai_chat"
        className="group mt-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-6 border border-butter-200 bg-butter-100 rounded-2xl px-5 sm:px-6 py-5 hover:border-butter-300 hover:bg-butter-50 transition-colors"
      >
        <span className="min-w-0">
          <span className="block font-serif text-[20px] sm:text-[22px] text-ink leading-snug break-words">Need someone to talk to?</span>
          <span className="block text-[14px] text-slate-600 mt-1 break-words">
            E-Gabay listens in English or Filipino. Your guidance associate is still a message away.
          </span>
        </span>
        <span className="shrink-0 inline-flex items-center gap-2 text-[14px] font-medium text-blue-700">
          Open chat <ArrowRight size={16} className="group-hover:translate-x-0.5 transition-transform" />
        </span>
      </Link>

      <div className="mt-12 grid grid-cols-1 lg:grid-cols-[1.3fr_1fr] gap-12 lg:gap-16">
        <section>
          <div className="flex items-baseline justify-between mb-3">
            <h2 className="font-serif text-[22px] text-ink">My progress</h2>
            {isShs && (
              <Link href="/my_career" className="text-[13px] text-slate-500 hover:text-blue-700 transition-colors">
                Career plan
              </Link>
            )}
          </div>
          <div className={`grid gap-3 ${figures.length === 3 ? "grid-cols-3" : "grid-cols-2"}`}>
            {figures.map((f) => (
              <div key={f.id} className="min-w-0 bg-blue-50 border border-blue-100 rounded-xl py-4 sm:py-5 px-3 sm:px-4">
                <p className="font-serif text-[32px] sm:text-[40px] leading-none text-ink tabular">{data ? f.count : "–"}</p>
                <p className="text-[12px] sm:text-[13px] text-slate-500 mt-2 break-words">{f.label}</p>
              </div>
            ))}
          </div>

          <div className="mt-6 text-[14px] text-slate-600">
            {!data || !isShs ? null : data.careerPlan ? (
              <>
                <div className="h-1.5 bg-blue-100 rounded-full overflow-hidden">
                  <div className="h-full bg-blue-500 rounded-full" style={{ width: `${(stagesDone / CAREER_STEPS.length) * 100}%` }} />
                </div>
                <p className="mt-3">
                  {nextStage ? (
                    <>Next stage: <span className="text-ink font-medium">{nextStage}</span></>
                  ) : (
                    "You've completed every stage of the Career Planning Program."
                  )}
                </p>
              </>
            ) : (
              <p>You&apos;re not enrolled in the Career Planning Program yet. The guidance office adds students to it.</p>
            )}
          </div>
        </section>

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
                    {new Date(upcoming.date).toLocaleDateString("en-PH", { timeZone: "UTC", weekday: "short", month: "short", day: "numeric" })} · {upcoming.time}
                  </p>
                  <p className={`mt-2 inline-flex items-center gap-1.5 text-xs ${upcoming.status === "CONFIRMED" ? "text-emerald-700" : "text-orange-700"}`}>
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
            <div className="flex items-baseline justify-between mb-3">
              <h2 className="font-serif text-[22px] text-ink">From the office</h2>
              <Link href="/bulletin" className="text-[13px] text-slate-500 hover:text-blue-700 transition-colors">
                Bulletin
              </Link>
            </div>
            <div className="border-t border-rule pt-4 space-y-4">
              {data?.announcement && (
                <div>
                  <p className="text-xs text-slate-500">{data.announcement.category}</p>
                  <p className="font-medium text-ink">{data.announcement.title}</p>
                </div>
              )}
              {data?.event && (
                <div>
                  <p className="text-xs text-slate-500">Upcoming event</p>
                  <p className="font-medium text-ink">{data.event.title}</p>
                  <p className="font-mono text-[13px] text-slate-500 mt-0.5">
                    {new Date(data.event.date).toLocaleDateString("en-PH", { timeZone: "UTC", month: "long", day: "numeric" })} · {data.event.time}
                  </p>
                </div>
              )}
              {data && !data.announcement && !data.event && (
                <p className="text-[14px] text-slate-500">No announcements or events right now.</p>
              )}
            </div>
          </section>

          <section>
            <h2 className="font-serif text-[22px] text-ink mb-3">Shortcuts</h2>
            <ul className="divide-y divide-rule border-y border-rule">
              {SHORTCUTS.map((s) => (
                <li key={s.path}>
                  <Link href={s.path} className="group flex items-center justify-between min-h-11 text-[14px] text-slate-700 hover:text-blue-700 transition-colors">
                    {s.label}
                    <ArrowRight size={14} className="text-slate-400 group-hover:text-blue-700 group-hover:translate-x-0.5 transition" />
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
