"use client";

import React, { useState } from 'react';
import { Search, AlertTriangle, Clock, CheckCircle } from 'lucide-react';

interface Referral {
  id: string;
  studentName: string;
  studentId: string;
  referredBy: string;
  date: string;
  reason: string;
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  status: 'OPEN' | 'IN PROGRESS' | 'CLOSED';
}

const ReferralManagement = () => {
  const [filter, setFilter] = useState('All');

  const referrals: Referral[] = [
    {
      id: '1',
      studentName: 'Dexter Glorioso',
      studentId: '2024-12346',
      referredBy: 'Cho Domingo',
      date: '2026-04-28',
      reason: 'Behavioral concern - disruptive in class',
      priority: 'HIGH',
      status: 'OPEN',
    },
    {
      id: '2',
      studentName: 'Kurt Aquino',
      studentId: '2024-12348',
      referredBy: 'Cho Domingo',
      date: '2026-04-27',
      reason: 'Academic performance declining',
      priority: 'MEDIUM',
      status: 'IN PROGRESS',
    },
  ];

  return (
    <div className="p-8 bg-slate-50 min-h-screen font-sans text-slate-900">
      {/* Header */}
      <header className="mb-8">
        <h1 className="text-2xl font-bold">Referral Management</h1>
        <p className="text-slate-500 text-sm">Track and manage student referrals from faculty</p>
      </header>

      {/* Toolbar */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4 mb-8">
        <div className="relative w-full md:max-w-xl">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input
            type="text"
            placeholder="Search referrals..."
            className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-sm"
          />
        </div>

        <div className="flex bg-slate-100 p-1 rounded-lg border border-slate-200">
          {['All', 'Open', 'In Progress', 'Closed'].map((tab) => (
            <button
              key={tab}
              onClick={() => setFilter(tab)}
              className={`px-4 py-1.5 text-xs font-semibold rounded-md transition-all ${
                filter === tab 
                ? 'bg-blue-600 text-white shadow-sm' 
                : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* Referral Cards List */}
      <div className="space-y-6">
        {referrals.map((referral) => (
          <ReferralCard key={referral.id} referral={referral} />
        ))}
      </div>
    </div>
  );
};

const ReferralCard = ({ referral }: { referral: Referral }) => {
  const isHigh = referral.priority === 'HIGH';
  const isOpen = referral.status === 'OPEN';

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden transition-hover hover:shadow-md">
      <div className="p-6">
        {/* Card Header Tags */}
        <div className="flex justify-between items-start mb-4">
          <div>
            <h3 className="text-lg font-bold text-slate-800">{referral.studentName}</h3>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-tight">ID: {referral.studentId}</p>
          </div>
          
          <div className="flex gap-2">
            <span className={`px-3 py-1 rounded-full text-[10px] font-bold border ${
              isHigh ? 'bg-red-50 text-red-600 border-red-100' : 'bg-orange-50 text-orange-600 border-orange-100'
            }`}>
              {referral.priority}
            </span>
            <span className={`flex items-center gap-1 px-3 py-1 rounded-full text-[10px] font-bold border ${
              isOpen ? 'bg-red-50 text-red-600 border-red-100' : 'bg-orange-50 text-orange-600 border-orange-100'
            }`}>
              {isOpen ? <AlertTriangle size={12}/> : <Clock size={12}/>}
              {referral.status}
            </span>
          </div>
        </div>

        {/* Details Section */}
        <div className="space-y-1 mb-4">
          <p className="text-sm text-slate-600"><span className="text-slate-400">Referred by:</span> {referral.referredBy}</p>
          <p className="text-sm text-slate-600"><span className="text-slate-400">Date:</span> {referral.date}</p>
          <p className="text-xs font-bold text-slate-400 mt-2 uppercase">Reason:</p>
        </div>

        {/* Reason Box */}
        <div className="bg-slate-50/80 p-4 rounded-lg border border-slate-100 mb-6 italic text-sm text-slate-700">
          {referral.reason}
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          {isOpen ? (
            <button className="px-4 py-2 bg-orange-50 text-orange-600 text-xs font-bold rounded-lg border border-orange-100 hover:bg-orange-100 transition-colors">
              Start Intervention
            </button>
          ) : (
            <button className="px-4 py-2 bg-green-50 text-green-600 text-xs font-bold rounded-lg border border-green-100 hover:bg-green-100 transition-colors">
              Mark as Resolved
            </button>
          )}
          <button className="px-4 py-2 bg-blue-50 text-blue-600 text-xs font-bold rounded-lg border border-blue-100 hover:bg-blue-100 transition-colors">
            Add Notes
          </button>
          <button className="px-4 py-2 bg-slate-50 text-slate-600 text-xs font-bold rounded-lg border border-slate-100 hover:bg-slate-100 transition-colors">
            Send Feedback
          </button>
        </div>
      </div>
    </div>
  );
};

export default ReferralManagement;