"use cient"

import React from 'react';
import { 
  Calendar, 
  FileText, 
  Send, 
  MessageSquare, 
  Award, 
  Target, 
  TrendingUp 
} from 'lucide-react';

//Interfaces for structured data matching the UI
interface QuickAction {
  id: string;
  label: string;
  icon: React.ReactNode;
  iconBg: string;
}

interface MetricCard {
  id: string;
  count: number;
  label: string;
  icon: React.ReactNode;
  iconBg: string;
}

interface ProgressBarMetric {
  id: string;
  label: string;
  percentage: number;
  colorClass: string;
}

export const DashboardContent: React.FC = () => {
  
  const quickActions: QuickAction[] = [
    { id: 'book', label: 'Book Appointment', icon: <Calendar size={20} />, iconBg: 'bg-[#1d63ff]' },
    { id: 'profile', label: 'View My Profile', icon: <FileText size={20} />, iconBg: 'bg-[#00c853]' },
    { id: 'refer', label: 'Refer a Student', icon: <Send size={20} />, iconBg: 'bg-[#ff2b3d]' },
    { id: 'chat', label: 'Chat with E-Gabay', icon: <MessageSquare size={20} />, iconBg: 'bg-[#ff7d00]' },
  ];

  const metricCards: MetricCard[] = [
    { id: 'sessions', count: 8, label: 'Sessions Completed', icon: <Award size={18} />, iconBg: 'bg-[#1d63ff]' },
    { id: 'goals', count: 5, label: 'Goals Achieved', icon: <Target size={18} />, iconBg: 'bg-[#00c853]' },
    { id: 'tasks', count: 3, label: 'Upcoming Tasks', icon: <TrendingUp size={18} />, iconBg: 'bg-[#a855f7]' },
  ];

  const progressMetrics: ProgressBarMetric[] = [
    { id: 'career', label: 'Career Planning', percentage: 75, colorClass: 'bg-[#1d63ff]' },
    { id: 'personal', label: 'Personal Development', percentage: 60, colorClass: 'bg-[#00c853]' },
    { id: 'academic', label: 'Academic Goals', percentage: 85, colorClass: 'bg-[#a855f7]' },
  ];

  return (
    <div className="flex-1 bg-[#f8fafc] p-8 space-y-6 overflow-y-auto min-h-screen font-sans text-slate-800">
      
      {/* 1. Top Quick Action Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {quickActions.map((action) => (
          <button
            key={action.id}
            className="flex flex-col items-start bg-white p-5 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-all group text-left"
          >
            <div className={`p-3 rounded-xl text-white ${action.iconBg} mb-4 shrink-0 shadow-sm`}>
              {action.icon}
            </div>
            <span className="font-semibold text-[15px] text-slate-700 group-hover:text-[#1d63ff] transition-colors">
              {action.label}
            </span>
          </button>
        ))}
      </div>

      {/* 2. Progress Overview Section Card */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
        <h2 className="text-lg font-bold text-[#0d2343] mb-5">My Progress Overview</h2>
        
        {/* Metric Pill Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          {metricCards.map((metric) => (
            <div 
              key={metric.id} 
              className="bg-[#f8fafc] rounded-xl p-4 flex items-center gap-4 border border-slate-50"
            >
              <div className={`w-9 h-9 rounded-lg text-white flex items-center justify-center ${metric.iconBg} shrink-0`}>
                {metric.icon}
              </div>
              <div>
                <div className="text-2xl font-bold text-slate-900 leading-tight">{metric.count}</div>
                <div className="text-xs text-slate-500 font-medium">{metric.label}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Customized Progress Bars */}
        <div className="space-y-5">
          {progressMetrics.map((item) => (
            <div key={item.id} className="space-y-2">
              <div className="flex justify-between items-center text-sm">
                <span className="font-semibold text-slate-700">{item.label}</span>
                <span className="font-bold text-slate-500 text-xs">{item.percentage}%</span>
              </div>
              {/* Outer track */}
              <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                {/* Inner progress fill */}
                <div 
                  className={`h-full rounded-full ${item.colorClass} transition-all duration-500`}
                  style={{ width: `${item.percentage}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 3. Bottom Columns Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Left Column: Upcoming Appointments */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 flex flex-col">
          <h2 className="text-lg font-bold text-[#0d2343] mb-4">Upcoming Appointments</h2>
          <div className="bg-[#f0f6ff] rounded-xl p-4 border border-blue-50 flex-1">
            <h3 className="font-semibold text-slate-800 text-[15px]">Career Guidance</h3>
            <p className="text-xs font-mono text-slate-500 mt-1">2026-04-30 at 10:00 AM</p>
            <div className="mt-3">
              <span className="inline-flex items-center bg-[#e8fbf0] text-[#00c853] text-[11px] font-bold px-2.5 py-1 rounded-full border border-[#bbf7d0]">
                Confirmed
              </span>
            </div>
          </div>
        </div>

        {/* Right Column: Recent Announcements */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 flex flex-col">
          <h2 className="text-lg font-bold text-[#0d2343] mb-4">Recent Announcements</h2>
          <div className="bg-[#f8fafc] rounded-xl p-4 border border-slate-100 flex-1">
            <h3 className="font-semibold text-slate-800 text-[15px]">Career Fair 2026</h3>
            <p className="text-xs font-mono text-slate-400 mt-1">2026-04-25</p>
          </div>
        </div>

      </div>
    </div>
  );
};

export default DashboardContent;