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
    bgClass: 'bg-[#f0f6ff] hover:bg-blue-100/70',
    textClass: 'text-[#1d63ff]',
    path: '/submit_referral',
  },
  {
    id: 'action-2',
    title: 'Book Appointment',
    description: 'Schedule a meeting with the counselor',
    icon: <Calendar size={20} />,
    bgClass: 'bg-[#faf5ff] hover:bg-purple-100/70',
    textClass: 'text-[#a855f7]',
    path: '/faculty_appointment',
  },
  {
    id: 'action-3',
    title: 'Upload Documents',
    description: 'Share files with the Guidance Office',
    icon: <Upload size={20} />,
    bgClass: 'bg-[#f0fdf4] hover:bg-green-100/70',
    textClass: 'text-[#00c853]',
    path: '/upload_documents',
  },
  {
    id: 'action-4',
    title: 'View My Referrals',
    description: 'Track status of submitted referrals',
    icon: <FileText size={20} />,
    bgClass: 'bg-[#f8fafc] hover:bg-slate-200/60',
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
      icon: <Send size={18} className="text-white" />,
      iconBg: 'bg-[#1d63ff]',
    },
    {
      id: 'metric-2',
      title: 'Pending Review',
      value: referrals.filter((r) => r.status === 'OPEN').length,
      icon: <Clock size={18} className="text-white" />,
      iconBg: 'bg-[#ff7a00]',
    },
    {
      id: 'metric-3',
      title: 'Resolved',
      value: referrals.filter((r) => r.status === 'CLOSED').length,
      icon: <CheckCircle2 size={18} className="text-white" />,
      iconBg: 'bg-[#00c853]',
    },
    {
      id: 'metric-4',
      title: 'My Appointments',
      value: appointments.length,
      icon: <Calendar size={18} className="text-white" />,
      iconBg: 'bg-[#a855f7]',
    },
  ];

  const recentReferrals = referrals.slice(0, 3);

  return (
    <div className="space-y-6 max-w-7xl mx-auto font-sans antialiased text-slate-800">

      {/* SECTION 1: Upper Metric Summary Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {metrics.map((m) => (
          <div key={m.id} className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between min-h-[140px] relative overflow-hidden">
            <div className="flex items-start justify-between">
              <div className={`${m.iconBg} p-2.5 rounded-xl shadow-sm flex items-center justify-center`}>
                {m.icon}
              </div>
            </div>
            <div className="mt-4">
              <span className="text-3xl font-bold text-slate-900 tracking-tight block">{m.value}</span>
              <span className="text-xs font-medium text-slate-400 block mt-0.5">{m.title}</span>
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
                      <span className="bg-[#fff1f2] border border-[#ffe4e6] text-[#ff2b3d] text-[11px] font-bold px-2.5 py-0.5 rounded-full">
                        Open
                      </span>
                    )}
                    {ref.status === 'IN_PROGRESS' && (
                      <span className="bg-[#fff7ed] border border-[#ffedd5] text-[#ff7a00] text-[11px] font-bold px-2.5 py-0.5 rounded-full">
                        In Progress
                      </span>
                    )}
                    {ref.status === 'CLOSED' && (
                      <span className="bg-[#e8fbf0] border border-[#bbf7d0] text-[#00c853] text-[11px] font-bold px-2.5 py-0.5 rounded-full">
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
