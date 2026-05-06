"use client";

import React from 'react';
import { User, Clock, Calendar as CalendarIcon, CheckCircle2, AlertCircle } from 'lucide-react';

const AppointmentScheduling = () => {
  return (
    <div className="p-8 bg-slate-50 min-h-screen font-sans text-slate-900">
      {/* Page Header */}
      <header className="mb-8">
        <h1 className="text-2xl font-bold">Appointment Scheduling</h1>
        <p className="text-slate-500 text-sm">Manage student appointments and counseling sessions</p>
      </header>

      <div className="flex flex-col lg:flex-row gap-8">
        
        {/* Left Sidebar: Calendar & Stats */}
        <aside className="w-full lg:w-80 space-y-4">
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
            <h2 className="font-bold mb-4">Calendar</h2>
            
            {/* Date Picker Input */}
            <input 
              type="text" 
              defaultValue="28/04/2026"
              className="w-full p-2 border border-slate-200 rounded-lg mb-6 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />

            {/* Stats Cards */}
            <div className="space-y-3">
              <SidebarStat label="Available Slots" value="12" color="text-blue-600" bgColor="bg-blue-50/50" />
              <SidebarStat label="Confirmed" value="8" color="text-green-600" bgColor="bg-green-50/50" />
              <SidebarStat label="Pending" value="3" color="text-orange-600" bgColor="bg-orange-50/50" />
            </div>

            <button className="w-full mt-6 bg-blue-600 text-white font-semibold py-2.5 rounded-lg hover:bg-blue-700 transition-all shadow-md text-sm">
              Block Time Slot
            </button>
          </div>
        </aside>

        {/* Right Section: Appointments List */}
        <section className="flex-1 bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <h2 className="text-lg font-bold mb-6">Appointments for Tuesday, April 28, 2026</h2>
          
          <div className="space-y-4">
            <AppointmentCard 
              name="Nhel Belarmino" 
              type="Individual Counseling" 
              time="9:00 AM" 
              date="2026-04-28" 
              status="Confirmed" 
            />
            <AppointmentCard 
              name="Dexter Glorioso" 
              type="Career Guidance" 
              time="10:30 AM" 
              date="2026-04-28" 
              status="Confirmed" 
            />
            <AppointmentCard 
              name="Justine Casano" 
              type="Academic Concern" 
              time="2:00 PM" 
              date="2026-04-28" 
              status="Pending" 
            />
          </div>
        </section>
      </div>
    </div>
  );
};

/* Helper: Sidebar Stats */
const SidebarStat = ({ label, value, color, bgColor }: { label: string; value: string; color: string; bgColor: string }) => (
  <div className={`${bgColor} p-3 rounded-lg border border-slate-100`}>
    <p className="text-xs text-slate-600 font-medium">{label}</p>
    <p className={`text-xl font-bold ${color}`}>{value}</p>
  </div>
);

/* Helper: Appointment Card */
const AppointmentCard = ({ name, type, time, date, status }: { name: string; type: string; time: string; date: string; status: 'Confirmed' | 'Pending' }) => (
  <div className="p-5 rounded-xl border border-slate-100 bg-white shadow-sm ring-1 ring-slate-50">
    <div className="flex justify-between items-start mb-4">
      <div className="flex gap-4">
        <div className="bg-blue-100 p-2.5 rounded-lg text-blue-600">
          <User size={20} />
        </div>
        <div>
          <h3 className="font-bold text-slate-800">{name}</h3>
          <p className="text-sm text-slate-500">{type}</p>
        </div>
      </div>
      
      {/* Status Badge */}
      <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold border ${
        status === 'Confirmed' 
          ? 'bg-green-50 text-green-600 border-green-100' 
          : 'bg-orange-50 text-orange-600 border-orange-100'
      }`}>
        {status === 'Confirmed' ? <CheckCircle2 size={14} /> : <AlertCircle size={14} />}
        {status.toUpperCase()}
      </div>
    </div>

    <div className="flex flex-wrap items-center gap-6 mb-5 text-sm text-slate-600">
      <div className="flex items-center gap-2">
        <Clock size={16} className="text-slate-400" />
        {time}
      </div>
      <div className="flex items-center gap-2">
        <CalendarIcon size={16} className="text-slate-400" />
        {date}
      </div>
    </div>

    {/* Action Buttons */}
    <div className="flex gap-3">
      {status === 'Confirmed' ? (
        <button className="px-4 py-1.5 bg-blue-50 text-blue-600 text-xs font-bold rounded-md border border-blue-100 hover:bg-blue-100 transition-colors">
          Start Session
        </button>
      ) : (
        <button className="px-4 py-1.5 bg-green-50 text-green-600 text-xs font-bold rounded-md border border-green-100 hover:bg-green-100 transition-colors">
          Confirm
        </button>
      )}
      <button className="px-4 py-1.5 bg-slate-50 text-slate-600 text-xs font-bold rounded-md border border-slate-100 hover:bg-slate-100 transition-colors">
        Reschedule
      </button>
      <button className="px-4 py-1.5 bg-red-50 text-red-600 text-xs font-bold rounded-md border border-red-100 hover:bg-red-100 transition-colors">
        Cancel
      </button>
    </div>
  </div>
);

export default AppointmentScheduling;