"use client";

import React from 'react';
import { 
  User, 
  Mail, 
  Phone, 
  Calendar, 
  MapPin, 
  GraduationCap, 
  Bookmark, 
  Clock, 
  FileText 
} from 'lucide-react';

interface SessionItem {
  id: string;
  type: string;
  description: string;
  date: string;
}

export const ChildProfilePage: React.FC = () => {
  
  // Data layout parameters matched exactly with image_85b347.png
  const profile = {
    name: 'Nhel Belarmino',
    studentId: '2024-12345',
    email: 'nhel.belarmino@sti.edu',
    phone: '0912-345-6789',
    dob: '2005-03-15',
    address: 'Sta. Maria, Bulacan',
    gradeSection: 'Grade 12 - STEM-A',
    strand: 'STEM',
    enrolledSince: 'August 2024'
  };

  // Guidance history timeline list matched exactly with image_85b09d.png
  const guidanceSessions: SessionItem[] = [
    {
      id: 'session-1',
      type: 'Individual Counseling',
      description: 'Discussion about academic stress and time management',
      date: '2026-04-20',
    },
    {
      id: 'session-2',
      type: 'Career Guidance',
      description: 'Career interest assessment completed',
      date: '2026-03-15',
    },
  ];

  return (
    <div className="px-5 sm:px-8 lg:px-12 pt-8 lg:pt-12 pb-16 max-w-5xl font-sans antialiased text-slate-800 space-y-6">
      
      {/* Page Context Description Typography */}
      <div>
        <h1 className="page-title">Child Profile</h1>
        <p className="text-sm text-slate-500 font-medium mt-1">
          View your child&apos;s information and guidance progress
        </p>
      </div>

      {/* SECTION 1: Personal Information Hero Block (image_85b347.png) */}
      <div className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden">
        
        {/* Top Accent Blue Header Panel banner area */}
        <div className="px-6 py-6 flex items-center gap-5 border-b border-rule">
          <div className="w-14 h-14 bg-slate-200 text-slate-600 rounded-md flex items-center justify-center shrink-0">
            <User size={26} strokeWidth={1.5} />
          </div>
          <div>
            <h2 className="font-serif text-[28px] leading-tight text-ink">{profile.name}</h2>
            <p className="font-mono text-[13px] text-slate-500 mt-0.5">
              Student ID {profile.studentId}
            </p>
          </div>
        </div>

        {/* Bottom Content Area Grid Details */}
        <div className="p-6">
          <h3 className="text-base font-semibold text-slate-900 mb-5 tracking-tight">Personal Information</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-5 text-sm">
            {/* Email Field Column Segment */}
            <div className="flex items-start gap-3">
              <Mail size={18} className="text-slate-500 shrink-0 mt-0.5" />
              <div className="space-y-0.5">
                <span className="text-xs text-slate-500 font-medium block">Email</span>
                <span className="text-slate-700 font-semibold">{profile.email}</span>
              </div>
            </div>

            {/* Phone Field Column Segment */}
            <div className="flex items-start gap-3">
              <Phone size={18} className="text-slate-500 shrink-0 mt-0.5" />
              <div className="space-y-0.5">
                <span className="text-xs text-slate-500 font-medium block">Phone</span>
                <span className="text-slate-700 font-semibold">{profile.phone}</span>
              </div>
            </div>

            {/* Date of Birth Field Column Segment */}
            <div className="flex items-start gap-3">
              <Calendar size={18} className="text-slate-500 shrink-0 mt-0.5" />
              <div className="space-y-0.5">
                <span className="text-xs text-slate-500 font-medium block">Date of Birth</span>
                <span className="text-slate-700 font-mono font-semibold">{profile.dob}</span>
              </div>
            </div>

            {/* Address Field Column Segment */}
            <div className="flex items-start gap-3">
              <MapPin size={18} className="text-slate-500 shrink-0 mt-0.5" />
              <div className="space-y-0.5">
                <span className="text-xs text-slate-500 font-medium block">Address</span>
                <span className="text-slate-700 font-semibold">{profile.address}</span>
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* SECTION 2: Academic Information Container Block (image_85b347.png) */}
      <div className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-50 flex items-center gap-2 bg-slate-50/20">
          <GraduationCap size={18} className="text-slate-700" />
          <h3 className="text-base font-semibold text-slate-900 tracking-tight">Academic Information</h3>
        </div>

        <div className="p-6 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 text-sm">
          <div className="space-y-1">
            <span className="text-xs text-slate-500 font-medium block">Grade & Section</span>
            <span className="text-slate-800 font-semibold text-[15px]">{profile.gradeSection}</span>
          </div>

          <div className="space-y-1">
            <span className="text-xs text-slate-500 font-medium block">Strand</span>
            <span className="text-slate-800 font-semibold text-[15px]">{profile.strand}</span>
          </div>

          <div className="space-y-1">
            <span className="text-xs text-slate-500 font-medium block">Enrolled Since</span>
            <span className="text-slate-700 font-semibold text-[15px]">{profile.enrolledSince}</span>
          </div>
        </div>
      </div>

      {/* SECTION 3: Guidance History Session Log Timeline (image_85b09d.png) */}
      <div className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden">
        <div className="px-6 py-5 border-b border-slate-50 flex items-center gap-2 bg-slate-50/20">
          <Bookmark size={18} className="text-slate-700" />
          <h3 className="text-base font-semibold text-slate-900 tracking-tight">Guidance Sessions</h3>
        </div>

        <div className="p-6 space-y-4">
          {guidanceSessions.map((session) => (
            <div 
              key={session.id} 
              className="bg-slate-50 hover:bg-slate-50 border border-slate-100 rounded-xl p-4 flex flex-col sm:flex-row sm:items-start justify-between gap-3 transition-colors group"
            >
              <div className="space-y-1 min-w-0 flex-1">
                <h4 className="font-semibold text-slate-800 text-sm group-hover:text-blue-600 transition-colors flex items-center gap-2">
                  <FileText size={15} className="text-slate-500 shrink-0" />
                  {session.type}
                </h4>
                <p className="text-xs text-slate-500 font-medium leading-relaxed pl-5">
                  {session.description}
                </p>
              </div>

              {/* Timestamp Alignments */}
              <div className="flex items-center gap-1.5 text-slate-500 shrink-0 font-mono font-medium text-xs sm:pt-0.5 pl-5 sm:pl-0">
                <Clock size={13} />
                <span>{session.date}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
};

export default ChildProfilePage;