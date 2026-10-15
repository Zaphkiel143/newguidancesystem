import React from 'react';
import Link from 'next/link';
import {
  Send,
  Clock,
  CheckCircle2,
  Calendar,
  Upload,
  FileText,
} from 'lucide-react';
import { getMyReferrals, getMyAppointments } from '../../action/faculty';

const FACULTY_NAME = "Cho Sto Domingo";

interface QuickAction {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  bgClass: string;
  textClass: string;
  path: string;
}

const quickActions: QuickAction[] = [
  {
    id: 'action-1',
    title: 'Submit New Referral',
    description: 'Refer a student to the Guidance Office',
    icon: <Send size={20} />,
    bgClass: 'bg-blue-50 hover:bg-blue-100/70',
    textClass: 'text-blue-600',
    path: '/submit_referral',
  },
  {
    id: 'action-2',
    title: 'Book Appointment',
    description: 'Schedule a meeting with the counselor',
    icon: <Calendar size={20} />,
    bgClass: 'bg-violet-50 hover:bg-purple-100/70',
    textClass: 'text-violet-500',
    path: '/faculty_appointment',
  },
  {
    id: 'action-3',
    title: 'Upload Documents',
    description: 'Share files with the Guidance Office',
    icon: <Upload size={20} />,
    bgClass: 'bg-emerald-50 hover:bg-green-100/70',
    textClass: 'text-emerald-600',
    path: '/upload_documents',
  },
  {
    id: 'action-4',
    title: 'View My Referrals',
    description: 'Track status of submitted referrals',
    icon: <FileText size={20} />,
    bgClass: 'bg-slate-50 hover:bg-slate-200/60',
    textClass: 'text-slate-700',
    path: '/faculty_myreferral',
  },
];

export const FacultyDashboard = async () => {
  const [referrals, appointments] = await Promise.all([
    getMyReferrals(FACULTY_NAME),
    getMyAppointments(FACULTY_NAME),
  ]);

  const metrics = [
    {
      id: 'metric-1',
      title: 'Total Referrals Submitted',
      value: referrals.length,
      icon: <Send size={18} />,
      iconBg: 'bg-blue-50 text-blue-600',
    },
    {
      id: 'metric-2',
      title: 'Pending Review',
      value: referrals.filter((r) => r.status === 'OPEN').length,
      icon: <Clock size={18} />,
      iconBg: 'bg-orange-50 text-orange-600',
    },
    {
      id: 'metric-3',
      title: 'Resolved',
      value: referrals.filter((r) => r.status === 'CLOSED').length,
      icon: <CheckCircle2 size={18} />,
      iconBg: 'bg-emerald-50 text-emerald-600',
    },
    {
      id: 'metric-4',
      title: 'My Appointments',
      value: appointments.length,
      icon: <Calendar size={18} />,
      iconBg: 'bg-violet-50 text-violet-600',
    },
  ];

  const recentReferrals = referrals.slice(0, 3);

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto font-sans antialiased text-slate-800">

      {/* Greeting banner */}
      <section className="relative overflow-hidden rounded-2xl bg-navy text-white p-6 sm:p-8">
        <div className="pointer-events-none absolute -top-24 -right-10 w-80 h-80 rounded-full bg-blue-600/40 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-28 right-40 w-64 h-64 rounded-full bg-gold-400/15 blur-3xl" />
        <div className="relative flex flex-col md:flex-row md:items-end md:justify-between gap-6">
          <div>
            <p className="text-gold-300 text-xs font-bold uppercase tracking-[0.14em]">Faculty portal</p>
            <h1 className="text-2xl sm:text-[28px] font-extrabold tracking-tight mt-2">Welcome back, {FACULTY_NAME.split(" ")[0]}</h1>
            <p className="text-white/60 text-sm mt-1.5">Noticed a student who needs support? A referral takes just a minute.</p>
          </div>
          <Link href="/submit_referral" className="self-start md:self-auto inline-flex items-center gap-2 bg-gold-400 text-navy font-bold text-sm px-5 py-3 rounded-xl hover:bg-gold-300 transition-colors">
            <Send size={16} /> Submit a referral
          </Link>
        </div>
      </section>

      {/* SECTION 1: Upper Metric Summary Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {metrics.map((m) => (
          <div key={m.id} className="bg-white p-5 rounded-2xl border border-slate-200/70 shadow-sm flex flex-col justify-between relative overflow-hidden">
            <div className="flex items-start justify-between">
              <div className={`${m.iconBg} w-10 h-10 rounded-xl grid place-items-center`}>
                {m.icon}
              </div>
            </div>
            <div className="mt-4">
              <span className="text-[28px] font-extrabold text-slate-900 tracking-tight leading-none block">{m.value}</span>
              <span className="text-[13px] font-medium text-slate-500 block mt-1.5">{m.title}</span>
            </div>
          </div>
        ))}
      </div>

      {/* SECTION 2: Lower Row Widgets: Actions & Logs Grid split */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Left Column: Quick Actions Button Stack */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="px-6 py-5 border-b border-slate-100">
            <h2 className="font-bold text-slate-900 text-base">Quick Actions</h2>
          </div>
          <div className="p-6 space-y-3">
            {quickActions.map((action) => (
              <Link
                key={action.id}
                href={action.path}
                className={`w-full text-left p-4 rounded-xl flex items-center gap-4 border border-transparent transition-all duration-150 ${action.bgClass}`}
              >
                <div className={`shrink-0 ${action.textClass}`}>
                  {action.icon}
                </div>
                <div className="min-w-0">
                  <h4 className="font-bold text-slate-800 text-sm leading-snug">
                    {action.title}
                  </h4>
                  <p className="text-xs text-slate-400 font-medium mt-0.5 truncate">
                    {action.description}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Right Column: Recent Activity Feed List */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="px-6 py-5 border-b border-slate-100">
            <h2 className="font-bold text-slate-900 text-base">Recent Referrals</h2>
          </div>
          <div className="p-6 space-y-3">
            {recentReferrals.length === 0 ? (
              <p className="text-sm text-slate-400 font-medium text-center py-6">No referrals submitted yet</p>
            ) : (
              recentReferrals.map((ref) => (
                <div
                  key={ref.id}
                  className="bg-slate-50/50 hover:bg-slate-50 rounded-xl p-4 border border-slate-100 flex items-center justify-between gap-4 transition-colors"
                >
                  <div className="space-y-0.5 min-w-0">
                    <h4 className="font-bold text-slate-800 text-sm truncate">
                      {ref.studentName}
                    </h4>
                    <p className="text-xs text-slate-500 font-medium">
                      {ref.concernType}
                    </p>
                    <span className="text-[10px] text-slate-400 font-mono block pt-1">
                      {new Date(ref.createdAt).toLocaleDateString()}
                    </span>
                  </div>

                  {/* Status Badging Blocks */}
                  <div className="shrink-0">
                    {ref.status === 'OPEN' && (
                      <span className="bg-rose-50 border border-rose-100 text-rose-500 text-[11px] font-bold px-2.5 py-0.5 rounded-full">
                        Open
                      </span>
                    )}
                    {ref.status === 'IN_PROGRESS' && (
                      <span className="bg-orange-50 border border-orange-100 text-orange-500 text-[11px] font-bold px-2.5 py-0.5 rounded-full">
                        In Progress
                      </span>
                    )}
                    {ref.status === 'CLOSED' && (
                      <span className="bg-emerald-50 border border-emerald-200 text-emerald-600 text-[11px] font-bold px-2.5 py-0.5 rounded-full">
                        Closed
                      </span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

      </div>
    </div>
  );
};

export default FacultyDashboard;
