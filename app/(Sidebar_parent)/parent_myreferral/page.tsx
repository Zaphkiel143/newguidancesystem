"use client";

import React, { useState } from 'react';
import { 
  Search, 
  User, 
  Calendar, 
  MessageSquare, 
  Clock, 
  CheckCircle2, 
  AlertCircle,
  FolderOpen
} from 'lucide-react';

interface ReferralCard {
  id: string;
  category: string;
  counselor: string;
  dateSubmitted: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH';
  status: 'OPEN' | 'IN PROGRESS' | 'CLOSED';
  feedback: string;
}

export const MyReferralsPage: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');

  // Explicit dataset extracted verbatim from image_85a086.png and image_859ddb.png
  const referrals: ReferralCard[] = [
    {
      id: 'ref-1',
      category: 'Academic Performance',
      counselor: 'Ralph Michael',
      dateSubmitted: '2026-04-28',
      priority: 'MEDIUM',
      status: 'IN PROGRESS',
      feedback: 'Initial assessment completed. Meeting scheduled with student to discuss study strategies and time management.'
    },
    {
      id: 'ref-2',
      category: 'Career/College Guidance',
      counselor: 'Ralph Michael',
      dateSubmitted: '2026-03-15',
      priority: 'LOW',
      status: 'CLOSED',
      feedback: 'Career assessment completed. Student is on track with college application process. Follow-up scheduled for May.'
    }
  ];

  // Filtering query hook implementation
  const filteredReferrals = referrals.filter(item => 
    item.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.counselor.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="max-w-5xl mx-auto font-sans antialiased text-slate-800 space-y-6">
      
      {/* Page Title & Context Header Copy */}
      <div>
        <h1 className="text-3xl font-bold text-blue-900 tracking-tight">My Referrals</h1>
        <p className="text-sm text-slate-500 font-medium mt-1">
          Track referrals submitted for Nhel Belarmino
        </p>
      </div>

      {/* Target Focus Notice Block Banner (from image_85a086.png) */}
      <div className="bg-[#f0f6ff] border border-[#d8e7fe] px-5 py-3.5 rounded-xl text-sm font-medium text-[#1d63ff]">
        Viewing referrals for: <span className="font-bold">Nhel Belarmino</span> <span className="text-blue-500 font-mono text-xs">(2024-12345)</span>
      </div>

      {/* Main Container Wrapper */}
      <div className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden">
        
        {/* Search Input Bar (from image_85a086.png) */}
        <div className="p-5 border-b border-slate-100 bg-slate-50/30">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              type="text"
              placeholder="Search referrals..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-11 pr-4 py-2.5 bg-white border border-slate-200 text-sm font-medium rounded-xl text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
            />
          </div>
        </div>

        {/* Referrals Cards Stack Stream List */}
        <div className="p-6 space-y-6">
          {filteredReferrals.length > 0 ? (
            filteredReferrals.map((item) => (
              <div 
                key={item.id} 
                className="bg-white border border-slate-100 rounded-xl p-5 space-y-4 hover:shadow-xs transition-shadow"
              >
                {/* Row Header Segment: Title + Badges */}
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="space-y-1">
                    <h3 className="text-lg font-bold text-slate-900 tracking-tight">{item.category}</h3>
                    <div className="text-xs text-slate-500 font-medium flex flex-wrap items-center gap-x-4 gap-y-1">
                      <span>Counselor: <span className="text-slate-700 font-semibold">{item.counselor}</span></span>
                      <span className="hidden sm:inline text-slate-300">•</span>
                      <span className="font-mono">Date Submitted: {item.dateSubmitted}</span>
                    </div>
                  </div>

                  {/* Operational Target State Tags */}
                  <div className="flex items-center gap-2">
                    {/* Priority Indicator Badge */}
                    <span className={`text-[10px] font-bold px-2.5 py-1 rounded-md tracking-wider
                      ${item.priority === 'MEDIUM' ? 'bg-orange-50 text-orange-700' : ''}
                      ${item.priority === 'LOW' ? 'bg-blue-50 text-blue-700' : ''}
                      ${item.priority === 'HIGH' ? 'bg-red-50 text-red-700' : ''}
                    `}>
                      {item.priority}
                    </span>

                    {/* Dynamic Status Track Pill */}
                    <span className={`text-[11px] font-bold px-3 py-1 rounded-full flex items-center gap-1.5 uppercase font-sans tracking-wide
                      ${item.status === 'IN PROGRESS' ? 'bg-orange-50 border border-orange-100 text-orange-700' : ''}
                      ${item.status === 'CLOSED' ? 'bg-[#e8fbf0] border border-[#bbf7d0] text-[#00c853]' : ''}
                      ${item.status === 'OPEN' ? 'bg-red-50 border border-red-100 text-red-600' : ''}
                    `}>
                      {item.status === 'IN PROGRESS' && <Clock size={13} className="stroke-[2.5]" />}
                      {item.status === 'CLOSED' && <CheckCircle2 size={13} className="stroke-[2.5]" />}
                      {item.status === 'OPEN' && <AlertCircle size={13} className="stroke-[2.5]" />}
                      {item.status}
                    </span>
                  </div>
                </div>

                {/* Counselor Feedback Collateral Block Frame */}
                <div className="bg-[#f4fbf7] border border-[#e2f7ec] rounded-xl p-4 space-y-1">
                  <h4 className="text-xs font-bold text-[#00c853] uppercase tracking-wider">Counselor Feedback:</h4>
                  <p className="text-sm text-slate-700 font-medium leading-relaxed">
                    {item.feedback}
                  </p>
                </div>

              </div>
            ))
          ) : (
            <div className="text-center py-12 text-slate-400 font-medium text-sm">
              No matching referrals found.
            </div>
          )}
        </div>
      </div>

      {/* Referral Status Guide Explainer Panel (from image_859ddb.png) */}
      <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm space-y-4">
        <h3 className="text-base font-bold text-slate-900 tracking-tight">Referral Status Guide</h3>
        
        <div className="space-y-4 text-sm font-medium leading-relaxed">
          {/* Row 1: Open */}
          <div className="flex items-start gap-4">
            <span className="w-24 text-center shrink-0 bg-red-50 border border-red-100 text-red-600 font-bold py-1 rounded text-xs tracking-wider uppercase">
              Open
            </span>
            <p className="text-slate-600 pt-0.5">
              Referral has been submitted and is awaiting initial review by the counselor.
            </p>
          </div>

          {/* Row 2: In Progress */}
          <div className="flex items-start gap-4">
            <span className="w-24 text-center shrink-0 bg-orange-50 border border-orange-100 text-orange-700 font-bold py-1 rounded text-xs tracking-wide uppercase leading-tight">
              In Progress
            </span>
            <p className="text-slate-600 pt-0.5">
              Counselor is actively working with your child on the concern. You may receive updates as progress is made.
            </p>
          </div>

          {/* Row 3: Closed */}
          <div className="flex items-start gap-4">
            <span className="w-24 text-center shrink-0 bg-[#e8fbf0] border border-[#bbf7d0] text-[#00c853] font-bold py-1 rounded text-xs tracking-wider uppercase">
              Closed
            </span>
            <p className="text-slate-600 pt-0.5">
              The concern has been addressed. You can view the final feedback and outcomes.
            </p>
          </div>
        </div>
      </div>

    </div>
  );
};

export default MyReferralsPage;