"use client";

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Calendar,
  FileText,
  Send,
  Sparkles,
  Award,
  Target,
  TrendingUp,
  ArrowUpRight,
  Clock,
  Megaphone
} from 'lucide-react';
import { getMyAppointments } from '../../action/student';
import type { Appointment as DbAppointment } from '../../../lib/generated';

const STUDENT_NAME = "Nhel Belarmino";

//Interfaces for structured data matching the UI
interface QuickAction {
  id: string;
  label: string;
  hint: string;
  icon: React.ReactNode;
  tone: string;
  path: string;
}

interface MetricCard {
  id: string;
  count: number;
  label: string;
  icon: React.ReactNode;
  tone: string;
}

interface ProgressBarMetric {
  id: string;
  label: string;
  percentage: number;
  colorClass: string;
}

export const DashboardContent: React.FC = () => {
  const router = useRouter();
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

  const quickActions: QuickAction[] = [
    { id: 'book', label: 'Book Appointment', hint: 'Meet your counselor', icon: <Calendar size={19} />, tone: 'bg-blue-50 text-blue-600', path: '/my_appointments' },
    { id: 'profile', label: 'View My Profile', hint: 'Your guidance record', icon: <FileText size={19} />, tone: 'bg-emerald-50 text-emerald-600', path: '/profile' },
    { id: 'refer', label: 'Refer a Student', hint: 'Look out for a friend', icon: <Send size={19} />, tone: 'bg-rose-50 text-rose-500', path: '/refer_student' },
  ];

  const metricCards: MetricCard[] = [
    { id: 'sessions', count: 8, label: 'Sessions completed', icon: <Award size={18} />, tone: 'bg-blue-50 text-blue-600' },
    { id: 'goals', count: 5, label: 'Goals achieved', icon: <Target size={18} />, tone: 'bg-emerald-50 text-emerald-600' },
    { id: 'tasks', count: 3, label: 'Upcoming tasks', icon: <TrendingUp size={18} />, tone: 'bg-violet-50 text-violet-600' },
  ];

  const progressMetrics: ProgressBarMetric[] = [
    { id: 'career', label: 'Career Planning', percentage: 75, colorClass: 'bg-blue-600' },
    { id: 'personal', label: 'Personal Development', percentage: 60, colorClass: 'bg-emerald-500' },
    { id: 'academic', label: 'Academic Goals', percentage: 85, colorClass: 'bg-violet-500' },
  ];

  const firstName = STUDENT_NAME.split(" ")[0];

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl text-slate-800">

      {/* 1. Hero: greeting + E-Gabay entry point */}
      <section className="relative overflow-hidden rounded-2xl bg-navy text-white p-6 sm:p-8">
        <div className="pointer-events-none absolute -top-24 -right-10 w-80 h-80 rounded-full bg-blue-600/40 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-28 right-48 w-64 h-64 rounded-full bg-gold-400/15 blur-3xl" />
        <div className="relative flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div>
            <p className="text-gold-300 text-xs font-bold uppercase tracking-[0.14em]">Kumusta, {firstName}!</p>
            <h1 className="text-2xl sm:text-[28px] font-extrabold tracking-tight mt-2">How are you feeling today?</h1>
            <p className="text-white/60 text-sm mt-1.5 max-w-md">
              E-Gabay is here to listen — in English or Filipino — whenever you need someone to talk to.
            </p>
          </div>
          <button
            onClick={() => router.push('/ai_chat')}
            className="group self-start md:self-auto inline-flex items-center gap-2 bg-gold-400 text-navy font-bold text-sm px-5 py-3 rounded-xl hover:bg-gold-300 transition-colors shadow-[0_10px_24px_-10px_rgb(255_200_31/0.8)]"
          >
            <Sparkles size={17} />
            Chat with E-Gabay
            <ArrowUpRight size={16} className="transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          </button>
        </div>
      </section>

      {/* 2. Quick actions */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {quickActions.map((action) => (
          <button
            key={action.id}
            onClick={() => router.push(action.path)}
            className="flex items-center gap-4 bg-white p-4 rounded-2xl border border-slate-200/70 shadow-sm hover:shadow-md hover:border-slate-300 transition-all group text-left"
          >
            <div className={`w-11 h-11 rounded-xl grid place-items-center shrink-0 ${action.tone}`}>
              {action.icon}
            </div>
            <span className="min-w-0 flex-1">
              <span className="block font-semibold text-[15px] text-slate-900">{action.label}</span>
              <span className="block text-xs text-slate-500">{action.hint}</span>
            </span>
            <ArrowUpRight size={17} className="text-slate-300 group-hover:text-blue-600 transition-colors" />
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 3. Progress overview */}
        <section className="lg:col-span-2 bg-white rounded-2xl border border-slate-200/70 shadow-sm p-6">
          <h2 className="text-base font-bold text-slate-900 mb-5">My progress overview</h2>

          <div className="grid grid-cols-3 gap-3 mb-7">
            {metricCards.map((metric) => (
              <div key={metric.id} className="rounded-xl p-4 bg-slate-50">
                <div className={`w-9 h-9 rounded-lg grid place-items-center ${metric.tone}`}>
                  {metric.icon}
                </div>
                <div className="text-2xl font-extrabold text-slate-900 leading-none mt-3">{metric.count}</div>
                <div className="text-xs text-slate-500 font-medium mt-1">{metric.label}</div>
              </div>
            ))}
          </div>

          <div className="space-y-5">
            {progressMetrics.map((item) => (
              <div key={item.id} className="space-y-2">
                <div className="flex justify-between items-center text-sm">
                  <span className="font-semibold text-slate-700">{item.label}</span>
                  <span className="font-bold text-slate-900 text-xs tabular-nums">{item.percentage}%</span>
                </div>
                <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${item.colorClass} transition-all duration-500`}
                    style={{ width: `${item.percentage}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* 4. Side column */}
        <div className="space-y-6">
          <section className="bg-white rounded-2xl border border-slate-200/70 shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-bold text-slate-900">Next appointment</h2>
              <button onClick={() => router.push('/my_appointments')} className="text-xs font-semibold text-blue-600 hover:text-blue-700">
                View all
              </button>
            </div>
            {upcoming ? (
              <div className="rounded-xl p-4 bg-blue-50/70 border border-blue-100">
                <h3 className="font-semibold text-slate-900 text-[15px]">{upcoming.appointmentType || "General Consultation"}</h3>
                <p className="text-xs text-slate-500 mt-1.5 flex items-center gap-1.5">
                  <Clock size={13} />
                  <span className="font-mono">{new Date(upcoming.date).toLocaleDateString()} · {upcoming.time}</span>
                </p>
                <span className={`inline-flex mt-3 text-[11px] font-bold px-2.5 py-1 rounded-full ${
                  upcoming.status === "CONFIRMED"
                    ? "bg-emerald-100 text-emerald-700"
                    : "bg-orange-100 text-orange-700"
                }`}>
                  {upcoming.status === "CONFIRMED" ? "Confirmed" : "Pending"}
                </span>
              </div>
            ) : (
              <div className="rounded-xl py-8 bg-slate-50 border border-dashed border-slate-200 text-center">
                <Calendar size={20} className="mx-auto text-slate-300" />
                <p className="text-sm text-slate-400 mt-2">No upcoming appointments</p>
              </div>
            )}
          </section>

          <section className="bg-white rounded-2xl border border-slate-200/70 shadow-sm p-6">
            <h2 className="text-base font-bold text-slate-900 mb-4">Announcements</h2>
            <div className="flex gap-3">
              <span className="w-9 h-9 rounded-lg bg-gold-100 text-gold-600 grid place-items-center shrink-0">
                <Megaphone size={17} />
              </span>
              <div>
                <h3 className="font-semibold text-slate-900 text-[15px]">Career Fair 2026</h3>
                <p className="text-xs font-mono text-slate-400 mt-0.5">2026-04-25</p>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};

export default DashboardContent;
