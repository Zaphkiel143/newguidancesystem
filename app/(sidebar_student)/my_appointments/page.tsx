"use client";

import React from 'react';
import { Plus, Calendar, Clock, CheckCircle2, AlertCircle } from 'lucide-react';

// Define strict typing for appointment history items
interface Appointment {
  id: string;
  type: string;
  counselor: string;
  date: string;
  time: string;
  status: 'Confirmed' | 'Completed' | 'Pending' | 'Cancelled';
}

export const MyAppointments: React.FC = () => {
  
  // Data strictly extracted from image_9101e7.png
  const appointmentHistory: Appointment[] = [
    {
      id: 'apt-1',
      type: 'Career Guidance',
      counselor: 'Ralph Michael',
      date: '2026-04-30',
      time: '10:00 AM',
      status: 'Confirmed',
    },
    {
      id: 'apt-2',
      type: 'Individual Counseling',
      counselor: 'Ralph Michael',
      date: '2026-04-20',
      time: '2:00 PM',
      status: 'Completed',
    }
  ];

  // Helper function to dynamically output status badges
  const renderStatusBadge = (status: Appointment['status']) => {
    switch (status) {
      case 'Confirmed':
        return (
          <span className="inline-flex items-center gap-1.5 bg-[#e8fbf0] text-[#00c853] text-xs font-bold px-3 py-1 rounded-full border border-[#bbf7d0]">
            <CheckCircle2 size={14} className="stroke-[2.5]" />
            Confirmed
          </span>
        );
      case 'Completed':
        return (
          <span className="inline-flex items-center gap-1.5 bg-[#f1f5f9] text-[#64748b] text-xs font-bold px-3 py-1 rounded-full border border-[#e2e8f0]">
            <AlertCircle size={14} className="stroke-[2.5]" />
            Completed
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="flex-1 bg-[#f8fafc] p-8 overflow-y-auto min-h-screen font-sans antialiased text-slate-800">
      
      {/* Top Header Row with Action Button */}
      <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold text-[#0d2343]">My Appointments</h1>
          <p className="text-sm text-slate-500 mt-1">
            Manage your guidance counseling appointments
          </p>
        </div>
        
        <button className="inline-flex items-center justify-center gap-2 bg-[#1d63ff] hover:bg-blue-700 text-white font-semibold py-2.5 px-5 rounded-xl transition-colors text-sm shadow-sm shrink-0">
          <Plus size={18} className="stroke-[2.5]" />
          <span>Book Appointment</span>
        </button>
      </header>

      {/* Appointment History Main Card Panel */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden max-w-6xl">
        <div className="px-6 py-5 border-b border-slate-100">
          <h2 className="font-bold text-slate-900 text-base">Appointment History</h2>
        </div>

        {/* List of Historical Rows */}
        <div className="p-6 space-y-4">
          {appointmentHistory.map((apt) => (
            <div 
              key={apt.id}
              className="bg-white rounded-xl p-5 border border-slate-200/80 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 transition-all hover:border-slate-300"
            >
              <div className="space-y-1">
                <h3 className="font-bold text-slate-800 text-[16px] tracking-wide">
                  {apt.type}
                </h3>
                <p className="text-sm text-slate-500 font-medium">
                  Counselor: <span className="text-slate-700">{apt.counselor}</span>
                </p>
                
                {/* Embedded Inline Schedule Stamps */}
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 pt-1.5 text-xs text-slate-500 font-medium">
                  <div className="flex items-center gap-1.5">
                    <Calendar size={14} className="text-slate-400" />
                    <span className="font-mono">{apt.date}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Clock size={14} className="text-slate-400" />
                    <span className="font-mono">{apt.time}</span>
                  </div>
                </div>
              </div>

              {/* Status Badge Alignment Wrapper */}
              <div className="shrink-0 self-start sm:self-center">
                {renderStatusBadge(apt.status)}
              </div>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
};

export default MyAppointments;