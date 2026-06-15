"use client";

import React, { useState } from 'react';
import { Search, AlertTriangle, Clock, CheckCircle2, FileText } from 'lucide-react';

interface ReferralLog {
  id: string;
  studentName: string;
  studentId: string;
  concernType: string;
  dateSubmitted: string;
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  status: 'OPEN' | 'IN PROGRESS' | 'CLOSED';
  feedback?: string;
}

export const MyReferralsPage: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');

  // Structured logs matching image_861124.png and image_86111d.png criteria perfectly
  const referralLogs: ReferralLog[] = [
    {
      id: 'log-1',
      studentName: 'Dexter Glorioso',
      studentId: '2024-12346',
      concernType: 'Behavioral Issues',
      dateSubmitted: '2026-04-28',
      priority: 'HIGH',
      status: 'OPEN',
    },
    {
      id: 'log-2',
      studentName: 'Kurt Aquino',
      studentId: '2024-12348',
      concernType: 'Academic Performance',
      dateSubmitted: '2026-04-27',
      priority: 'MEDIUM',
      status: 'IN PROGRESS',
      feedback: 'Initial counseling session completed. Follow-up scheduled for next week.',
    },
    {
      id: 'log-3',
      studentName: 'Nhel Belarmino',
      studentId: '2024-12345',
      concernType: 'Attendance Problems',
      dateSubmitted: '2026-04-26',
      priority: 'MEDIUM',
      status: 'IN PROGRESS',
    },
    {
      id: 'log-4',
      studentName: 'Justine Casano',
      studentId: '2024-12347',
      concernType: 'Peer Relationships',
      dateSubmitted: '2026-04-25',
      priority: 'LOW',
      status: 'CLOSED',
      feedback: 'Issue resolved through mediation. Student is adjusting well.',
    },
  ];

  // Client-side input filter logic
  const filteredLogs = referralLogs.filter(log =>
    log.studentName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    log.studentId.includes(searchQuery) ||
    log.concernType.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Helper mapping styles for priority status badges matching design guidelines
  const getPriorityStyles = (priority: ReferralLog['priority']) => {
    switch (priority) {
      case 'HIGH': return 'bg-red-50 text-red-600 border border-red-100';
      case 'MEDIUM': return 'bg-orange-50 text-orange-600 border border-orange-100';
      case 'LOW': return 'bg-blue-50 text-blue-600 border border-blue-100';
    }
  };

  const getStatusStyles = (status: ReferralLog['status']) => {
    switch (status) {
      case 'OPEN': return 'bg-red-50 text-red-600 border border-red-200';
      case 'IN PROGRESS': return 'bg-orange-50 text-orange-600 border border-orange-200';
      case 'CLOSED': return 'bg-green-50 text-green-600 border border-green-200';
    }
  };

  return (
    <div className="max-w-7xl mx-auto font-sans antialiased text-slate-800 space-y-6">
      
      {/* Page Heading Headers Section (image_861124.png) */}
      <div>
        <h1 className="text-3xl font-bold text-blue-900 tracking-tight">My Referrals</h1>
        <p className="text-sm text-slate-500 font-medium mt-1">
          Track the status of your submitted student referrals
        </p>
      </div>

      {/* Persistent Search Action Input Field Container (image_861124.png) */}
      <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input
            type="text"
            placeholder="Search referrals..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 text-sm rounded-xl placeholder:text-slate-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
          />
        </div>
      </div>

      {/* Dynamic Rendered List Stack */}
      <div className="space-y-4">
        {filteredLogs.length > 0 ? (
          filteredLogs.map((log) => (
            <div 
              key={log.id} 
              className="bg-white border border-slate-100 rounded-2xl shadow-sm p-6 space-y-4 hover:shadow-md/50 transition-shadow duration-200"
            >
              {/* Card Title Bar Segment Containing Identification Metadata */}
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                <div className="space-y-0.5">
                  <h3 className="text-lg font-bold text-slate-900 tracking-tight">{log.studentName}</h3>
                  <p className="text-xs font-mono font-bold text-slate-400">ID: {log.studentId}</p>
                </div>

                {/* Priority and Progress Badges Row Section */}
                <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md tracking-wider ${getPriorityStyles(log.priority)}`}>
                    {log.priority}
                  </span>
                  
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md tracking-wider flex items-center gap-1.5 ${getStatusStyles(log.status)}`}>
                    {log.status === 'OPEN' && <AlertTriangle size={12} className="stroke-[2.5]" />}
                    {log.status === 'IN PROGRESS' && <Clock size={12} className="stroke-[2.5]" />}
                    {log.status === 'CLOSED' && <CheckCircle2 size={12} className="stroke-[2.5]" />}
                    {log.status}
                  </span>
                </div>
              </div>

              {/* Central Core Parameters Content Summary Block */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1 text-xs">
                <div className="space-y-1">
                  <span className="text-slate-400 font-medium block">Concern Type:</span>
                  <span className="text-slate-800 font-semibold text-[13px]">{log.concernType}</span>
                </div>
                <div className="space-y-1">
                  <span className="text-slate-400 font-medium block">Date Submitted:</span>
                  <span className="text-slate-700 font-mono font-semibold">{log.dateSubmitted}</span>
                </div>
              </div>

              {/* Conditional Nested Office Feedback Container (image_86111d.png) */}
              {log.feedback && (
                <div className="bg-blue-50/50 border border-blue-100 rounded-xl p-4 mt-2">
                  <span className="text-xs font-bold text-blue-900 flex items-center gap-2">
                    <FileText size={14} className="text-blue-600" />
                    Feedback from Guidance Office:
                  </span>
                  <p className="text-xs text-slate-600 font-medium mt-1.5 leading-relaxed pl-5">
                    {log.feedback}
                  </p>
                </div>
              )}

            </div>
          ))
        ) : (
          <div className="text-center p-12 bg-white rounded-2xl border border-dashed border-slate-200 text-slate-400 text-sm font-medium">
            No matching logged student referral records found.
          </div>
        )}
      </div>

    </div>
  );
};

export default MyReferralsPage;