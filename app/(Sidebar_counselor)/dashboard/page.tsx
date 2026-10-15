import React from 'react';
import Link from 'next/link';
import { Users, Calendar, FileText, Briefcase, ArrowUpRight, Clock, AlertTriangle } from 'lucide-react';
import { getAppointmentsByDate, getDashboardStats, listReferrals } from '../../action/counselor';

const Dashboard = async () => {
  const today = new Date().toISOString().split("T")[0];
  const [todaysAppointments, stats, referrals] = await Promise.all([
    getAppointmentsByDate(today),
    getDashboardStats(),
    listReferrals(),
  ]);

  const urgentReferrals = referrals
    .filter((r) => r.status !== "CLOSED" && (r.priority === "High" || r.priority === "Urgent"))
    .slice(0, 5);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl">
      {/* Greeting banner */}
      <section className="relative overflow-hidden rounded-2xl bg-navy text-white p-6 sm:p-8">
        <div className="pointer-events-none absolute -top-24 -right-10 w-80 h-80 rounded-full bg-blue-600/40 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-28 right-40 w-64 h-64 rounded-full bg-gold-400/15 blur-3xl" />
        <div className="relative flex flex-col md:flex-row md:items-end md:justify-between gap-6">
          <div>
            <p className="text-gold-300 text-xs font-bold uppercase tracking-[0.14em]">{greeting}</p>
            <h1 className="text-2xl sm:text-[28px] font-extrabold tracking-tight mt-2">
              Here&apos;s your guidance overview
            </h1>
            <p className="text-white/60 text-sm mt-1.5">
              {todaysAppointments.length === 0
                ? "Your calendar is clear today."
                : `You have ${todaysAppointments.length} session${todaysAppointments.length === 1 ? "" : "s"} on the calendar today.`}
              {urgentReferrals.length > 0 && ` ${urgentReferrals.length} referral${urgentReferrals.length === 1 ? " needs" : "s need"} attention.`}
            </p>
          </div>
          <div className="flex gap-2">
            <Link href="/appointment" className="inline-flex items-center gap-1.5 bg-white text-navy text-sm font-semibold px-4 py-2.5 rounded-xl hover:bg-gold-50 transition-colors">
              Open schedule <ArrowUpRight size={16} />
            </Link>
            <Link href="/referral" className="inline-flex items-center gap-1.5 bg-white/10 ring-1 ring-white/15 text-white text-sm font-semibold px-4 py-2.5 rounded-xl hover:bg-white/15 transition-colors">
              Referrals
            </Link>
          </div>
        </div>
      </section>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Users} value={stats.totalStudents} label="Total students" tone="bg-blue-50 text-blue-600" />
        <StatCard icon={Calendar} value={todaysAppointments.length} label="Today's appointments" tone="bg-emerald-50 text-emerald-600" />
        <StatCard icon={FileText} value={stats.pendingReferrals} label="Pending referrals" tone="bg-orange-50 text-orange-600" />
        <StatCard icon={Briefcase} value={stats.activeCareerPlans} label="Active career plans" tone="bg-violet-50 text-violet-600" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Appointments */}
        <Panel title="Today's appointments" href="/appointment">
          {todaysAppointments.length === 0 ? (
            <EmptyState icon={Calendar} text="No appointments scheduled for today." />
          ) : (
            <ul className="divide-y divide-slate-100">
              {todaysAppointments.map((appointment) => (
                <AppointmentRow
                  key={appointment.id}
                  name={appointment.studentName || "Unnamed Student"}
                  type={appointment.appointmentType || "General"}
                  time={appointment.time}
                  status={appointment.status === "CONFIRMED" ? "Confirmed" : "Pending"}
                />
              ))}
            </ul>
          )}
        </Panel>

        {/* Referrals */}
        <Panel title="Urgent referrals" href="/referral">
          {urgentReferrals.length === 0 ? (
            <EmptyState icon={AlertTriangle} text="No urgent referrals right now." />
          ) : (
            <ul className="space-y-3">
              {urgentReferrals.map((referral) => (
                <ReferralCard
                  key={referral.id}
                  name={referral.studentName}
                  referrer={referral.referrerName}
                  reason={referral.concernType}
                  date={new Date(referral.createdAt).toLocaleDateString()}
                />
              ))}
            </ul>
          )}
        </Panel>
      </div>
    </div>
  );
};

export default Dashboard;

const StatCard = ({ icon: Icon, value, label, tone }: { icon: React.ElementType; value: number; label: string; tone: string }) => (
  <div className="bg-white p-5 rounded-2xl border border-slate-200/70 shadow-sm">
    <div className={`w-10 h-10 rounded-xl grid place-items-center ${tone}`}>
      <Icon size={19} />
    </div>
    <p className="text-[28px] font-extrabold tracking-tight text-slate-900 mt-4 leading-none">{value}</p>
    <p className="text-[13px] text-slate-500 mt-1.5 font-medium">{label}</p>
  </div>
);

const Panel = ({ title, href, children }: { title: string; href: string; children: React.ReactNode }) => (
  <section className="bg-white rounded-2xl border border-slate-200/70 shadow-sm">
    <div className="flex items-center justify-between px-6 pt-5 pb-4">
      <h2 className="text-base font-bold text-slate-900">{title}</h2>
      <Link href={href} className="text-xs font-semibold text-blue-600 hover:text-blue-700 inline-flex items-center gap-1">
        View all <ArrowUpRight size={14} />
      </Link>
    </div>
    <div className="px-6 pb-6">{children}</div>
  </section>
);

const EmptyState = ({ icon: Icon, text }: { icon: React.ElementType; text: string }) => (
  <div className="flex flex-col items-center justify-center text-center py-10 rounded-xl bg-slate-50 border border-dashed border-slate-200">
    <Icon size={22} className="text-slate-300" />
    <p className="text-sm text-slate-400 mt-2">{text}</p>
  </div>
);

const AppointmentRow = ({ name, type, time, status }: { name: string; type: string; time: string; status: 'Confirmed' | 'Pending' }) => (
  <li className="flex items-center gap-4 py-3.5 first:pt-0 last:pb-0">
    <div className="w-14 shrink-0 text-center rounded-xl bg-slate-50 py-2">
      <Clock size={14} className="mx-auto text-slate-400" />
      <p className="text-[11px] font-bold text-slate-700 mt-1 font-mono">{time}</p>
    </div>
    <div className="min-w-0 flex-1">
      <p className="font-semibold text-slate-900 truncate">{name}</p>
      <p className="text-[13px] text-slate-500 truncate">{type}</p>
    </div>
    <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full ${
      status === 'Confirmed' ? 'bg-emerald-50 text-emerald-700' : 'bg-orange-50 text-orange-700'
    }`}>
      {status}
    </span>
  </li>
);

const ReferralCard = ({ name, referrer, reason, date }: { name: string; referrer: string; reason: string; date: string }) => (
  <li className="p-4 rounded-xl border border-rose-100 bg-rose-50/40">
    <div className="flex items-start justify-between gap-3">
      <p className="font-semibold text-slate-900">{name}</p>
      <span className="text-[10px] font-bold text-rose-700 bg-rose-100 px-2 py-0.5 rounded-full uppercase tracking-wide shrink-0">Urgent</span>
    </div>
    <p className="text-[13px] text-slate-600 mt-1">{reason}</p>
    <p className="text-xs text-slate-400 mt-2">Referred by {referrer} · {date}</p>
  </li>
);
