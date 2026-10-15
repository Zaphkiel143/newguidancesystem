"use client";

import React from 'react';
import { 
  User, 
  Mail, 
  Phone, 
  Calendar, 
  MapPin, 
  GraduationCap 
} from 'lucide-react';

// Data types for modularity
interface GuidanceSession {
  id: string;
  title: string;
  description: string;
  date: string;
}

export const StudentProfile: React.FC = () => {
  
  // Mock data extracted exactly from image_910549.png
  const guidanceSessions: GuidanceSession[] = [
    {
      id: 'session-1',
      title: 'Individual Counseling',
      description: 'Discussion about academic stress and time management',
      date: '2026-04-20',
    },
    {
      id: 'session-2',
      title: 'Career Guidance',
      description: 'Career interest assessment completed',
      date: '2026-03-15',
    },
  ];

  return (
    <div className="px-5 sm:px-8 lg:px-12 pt-8 lg:pt-12 pb-16 min-h-[calc(100dvh-var(--topbar-h))] font-sans antialiased text-slate-800">
      
      {/* Page Title & Subtitle Header */}
      <header className="mb-6">
        <h1 className="page-title">My Profile</h1>
        <p className="text-sm text-slate-500 mt-1">
          View your personal and academic information
        </p>
      </header>

      <div className="max-w-5xl space-y-6">
        
        {/* 1. Profile Banner & Personal Information Card (from image_9102a1.png) */}
        <section className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          {/* Blue Hero Banner Area */}
          <div className="px-6 py-6 flex items-center gap-5 border-b border-rule">
            <div className="w-14 h-14 rounded-md bg-slate-200 flex items-center justify-center text-slate-600 shrink-0">
              <User size={26} strokeWidth={1.5} />
            </div>
            <div>
              <h2 className="font-serif text-[28px] leading-tight text-ink">Nhel Belarmino</h2>
              <p className="font-mono text-[13px] text-slate-500 mt-0.5">
                Student ID 2024-12345
              </p>
            </div>
          </div>

          {/* Grid Metadata Body */}
          <div className="p-6">
            <h3 className="font-semibold text-slate-900 mb-4 text-base">Personal Information</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-y-5 gap-x-8">
              {/* Email Block */}
              <div className="flex items-start gap-3">
                <div className="p-2 bg-slate-50 rounded-lg text-slate-400 mt-0.5">
                  <Mail size={18} />
                </div>
                <div>
                  <span className="block text-xs font-semibold text-slate-400">Email</span>
                  <span className="text-sm font-medium text-slate-800">nhel.belarmino@sti.edu</span>
                </div>
              </div>

              {/* Phone Block */}
              <div className="flex items-start gap-3">
                <div className="p-2 bg-slate-50 rounded-lg text-slate-400 mt-0.5">
                  <Phone size={18} />
                </div>
                <div>
                  <span className="block text-xs font-semibold text-slate-400">Phone</span>
                  <span className="text-sm font-medium text-slate-800">0912-345-6789</span>
                </div>
              </div>

              {/* Date of Birth Block */}
              <div className="flex items-start gap-3">
                <div className="p-2 bg-slate-50 rounded-lg text-slate-400 mt-0.5">
                  <Calendar size={18} />
                </div>
                <div>
                  <span className="block text-xs font-semibold text-slate-400">Date of Birth</span>
                  <span className="text-sm font-medium text-slate-800 font-mono">2005-03-15</span>
                </div>
              </div>

              {/* Address Block */}
              <div className="flex items-start gap-3">
                <div className="p-2 bg-slate-50 rounded-lg text-slate-400 mt-0.5">
                  <MapPin size={18} />
                </div>
                <div>
                  <span className="block text-xs font-semibold text-slate-400">Address</span>
                  <span className="text-sm font-medium text-slate-800">Sta. Maria, Bulacan</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 2. Academic Information Card (from image_9102a1.png) */}
        <section className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-4 mb-5">
            <GraduationCap className="text-slate-800" size={22} />
            <h3 className="font-semibold text-slate-900 text-base">Academic Information</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-y-5 gap-x-8">
            <div>
              <span className="block text-xs font-semibold text-slate-400">Grade & Section</span>
              <span className="text-sm font-semibold text-slate-800 mt-0.5 block">Grade 12 - STEM-A</span>
            </div>
            
            <div>
              <span className="block text-xs font-semibold text-slate-400">Strand</span>
              <span className="text-sm font-semibold text-slate-800 mt-0.5 block">STEM</span>
            </div>

            <div>
              <span className="block text-xs font-semibold text-slate-400">Enrolled Since</span>
              <span className="text-sm font-semibold text-slate-800 mt-0.5 block">August 2024</span>
            </div>
          </div>
        </section>

        {/* 3. My Guidance Sessions List Card (from image_910549.png) */}
        <section className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="px-6 py-5 border-b border-slate-100">
            <h3 className="font-semibold text-slate-900 text-base">My Guidance Sessions</h3>
          </div>

          <div className="p-6 space-y-4">
            {guidanceSessions.map((session) => (
              <div 
                key={session.id}
                className="bg-slate-50 rounded-xl p-5 border border-slate-50 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 transition-all hover:border-slate-200"
              >
                <div>
                  <h4 className="font-semibold text-slate-800 text-[15px]">
                    {session.title}
                  </h4>
                  <p className="text-sm text-slate-500 mt-1 leading-relaxed">
                    {session.description}
                  </p>
                </div>
                <span className="text-xs font-mono font-semibold text-slate-400 shrink-0 mt-0.5">
                  {session.date}
                </span>
              </div>
            ))}
          </div>
        </section>

      </div>
    </div>
  );
};

export default StudentProfile;