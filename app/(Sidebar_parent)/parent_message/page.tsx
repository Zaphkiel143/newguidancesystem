"use client";

import React from 'react';
import { 
  User, 
  Calendar, 
  MessageSquare, 
  Bell, 
  Clock, 
  ArrowRight,
  CheckCircle2,
  AlertTriangle
} from 'lucide-react';

interface MetricCard {
  id: string;
  title: string;
  value: string | number;
  subtext: string;
  icon: React.ReactNode;
  iconBg: string;
}

interface Announcement {
  id: string;
  title: string;
  content: string;
  date: string;
  important: boolean;
}

interface AppointmentRow {
  id: string;
  childName: string;
  purpose: string;
  date: string;
  time: string;
  status: 'Pending' | 'Approved' | 'Completed';
}

export const ParentDashboard: React.FC = () => {
  
  // Metrics matching parent oversight parameters
  const metrics: MetricCard[] = [
    {
      id: 'metric-1',
      title: "Child's Active Status",
      value: 'Good Standing',
      subtext: 'No active disciplinary actions',
      icon: <CheckCircle2 size={18} className="text-white" />,
      iconBg: 'bg-[#00c853]',
    },
    {
      id: 'metric-2',
      title: 'Upcoming Meetings',
      value: 1,
      subtext: 'Scheduled for April 30, 2026',
      icon: <Calendar size={18} className="text-white" />,
      iconBg: 'bg-[#1d63ff]',
    },
    {
      id: 'metric-3',
      title: 'Unread Messages',
      value: 0,
      subtext: 'All caught up with counselor',
      icon: <MessageSquare size={18} className="text-white" />,
      iconBg: 'bg-slate-400',
    },
  ];

  // Announcements log matching the card look in your system layout
  const announcements: Announcement[] = [
    {
      id: 'ann-1',
      title: 'Parent-Teacher Conference (PTC) Day',
      content: 'Please look out for appointment scheduling options regarding our end-of-term academic review sessions next week.',
      date: '2026-04-15',
      important: true,
    },
    {
      id: 'ann-2',
      title: 'Career Planning Seminar for Grade 12 Students',
      content: 'The Guidance Office will hold a hybrid college readiness assessment overview this coming Friday.',
      date: '2026-04-12',
      important: false,
    }
  ];

  // Appointment schedule mock array rows
  const upcomingAppointments: AppointmentRow[] = [
    {
      id: 'appt-1',
      childName: 'Nhel Belarmino',
      purpose: 'Academic Counseling',
      date: '2026-04-30',
      time: '10:00 AM',
      status: 'Approved',
    }
  ];

  return (
    <div className="max-w-7xl mx-auto font-sans antialiased text-slate-800 space-y-6">
      
      {/* 1. Top Welcome Banner Hero Component */}
      <div className="bg-gradient-to-r from-[#0d2343] to-blue-950 text-white rounded-2xl p-6 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Welcome back, Parent!</h1>
          <p className="text-sm text-slate-300 font-medium">
            Monitor your child's progress and stay connected with the Guidance Office.
          </p>
        </div>
        <div className="bg-white/10 px-4 py-2 rounded-xl text-xs font-mono font-medium backdrop-blur-sm self-start sm:self-auto text-blue-200">
          Academic Year: 2025 - 2026
        </div>
      </div>

      {/* 2. Stat Summary Metric Cards Row Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {metrics.map((m) => (
          <div key={m.id} className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between min-h-[130px]">
            <div className="flex items-start justify-between">
              <div className={`${m.iconBg} p-2.5 rounded-xl shadow-xs flex items-center justify-center`}>
                {m.icon}
              </div>
            </div>
            <div className="mt-3">
              <span className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight block">{m.value}</span>
              <span className="text-xs font-bold text-slate-800 block mt-0.5">{m.title}</span>
              <span className="text-[11px] text-slate-400 font-medium block mt-0.5">{m.subtext}</span>
            </div>
          </div>
        ))}
      </div>

      {/* 3. Splitted Workspace Grid: Announcements vs Appointments Schedule */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left 2 Columns: Schedule Log */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden lg:col-span-2 flex flex-col">
          <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
            <h2 className="font-bold text-slate-900 text-base">Your Scheduled Appointments</h2>
            <span className="bg-blue-50 text-[#1d63ff] font-bold text-xs px-2.5 py-1 rounded-full">
              Active Logs
            </span>
          </div>

          <div className="p-6 flex-1 overflow-x-auto">
            {upcomingAppointments.length > 0 ? (
              <table className="w-full text-left border-collapse min-w-[500px]">
                <thead>
                  <tr className="border-b border-slate-100 text-slate-400 text-xs font-bold uppercase tracking-wider">
                    <th className="pb-3 font-semibold">Student Name</th>
                    <th className="pb-3 font-semibold">Purpose</th>
                    <th className="pb-3 font-semibold">Date & Time</th>
                    <th className="pb-3 font-semibold text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 text-sm">
                  {upcomingAppointments.map((row) => (
                    <tr key={row.id} className="group hover:bg-slate-50/40 transition-colors">
                      <td className="py-3.5 font-bold text-slate-800">{row.childName}</td>
                      <td className="py-3.5 text-slate-500 font-medium">{row.purpose}</td>
                      <td className="py-3.5 space-y-0.5">
                        <span className="font-mono font-semibold text-slate-700 block text-xs">{row.date}</span>
                        <span className="text-slate-400 text-[11px] font-medium block">{row.time}</span>
                      </td>
                      <td className="py-3.5 text-right">
                        <span className="bg-[#e8fbf0] border border-[#bbf7d0] text-[#00c853] text-[11px] font-bold px-2.5 py-0.5 rounded-full inline-flex items-center gap-1">
                          <span className="w-1.5 h-1.5 bg-[#00c853] rounded-full animate-pulse" />
                          {row.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center p-8 text-slate-400 text-sm font-medium">
                No upcoming appointments registered at this time.
              </div>
            )}
          </div>
        </div>

        {/* Right 1 Column: School Guidance Announcements Feed */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden flex flex-col">
          <div className="px-6 py-5 border-b border-slate-100 flex items-center gap-2">
            <Bell size={18} className="text-slate-700" />
            <h2 className="font-bold text-slate-900 text-base">Office Announcements</h2>
          </div>

          <div className="p-6 space-y-4 flex-1 overflow-y-auto max-h-[380px]">
            {announcements.map((ann) => (
              <div 
                key={ann.id}
                className={`p-4 rounded-xl border text-xs space-y-1.5 transition-colors
                  ${ann.important 
                    ? 'bg-orange-50/60 border-orange-100' 
                    : 'bg-slate-50/50 border-slate-100 hover:bg-slate-50'
                  }
                `}
              >
                <div className="flex items-start justify-between gap-2">
                  <h4 className="font-bold text-slate-800 text-[13px] leading-snug">
                    {ann.title}
                  </h4>
                  {ann.important && (
                    <span className="bg-orange-100 text-orange-700 font-extrabold px-1.5 py-0.5 rounded text-[9px] uppercase tracking-wide shrink-0">
                      Urgent
                    </span>
                  )}
                </div>
                
                <p className="text-slate-500 font-medium leading-relaxed">
                  {ann.content}
                </p>

                <div className="flex items-center gap-1 text-slate-400 font-mono text-[10px] pt-1">
                  <Clock size={11} />
                  <span>{ann.date}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>

    </div>
  );
};

export default ParentDashboard;