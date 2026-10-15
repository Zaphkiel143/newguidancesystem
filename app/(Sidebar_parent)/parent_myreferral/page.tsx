"use client";

import React, { useEffect, useState } from 'react';
import {
  Search,
  Clock,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { getMyReferrals } from '../../action/parent';
import type { Referral } from '../../../lib/generated';

const PARENT_NAME = "Mrs. Belarmino";
const CHILD_NAME = "Nhel Belarmino";

export const MyReferralsPage: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [referrals, setReferrals] = useState<Referral[]>([]);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const data = await getMyReferrals(PARENT_NAME);
      if (!cancelled) setReferrals(data);
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const filteredReferrals = referrals.filter((item) =>
    item.concernType.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="px-5 sm:px-8 lg:px-12 pt-8 lg:pt-12 pb-16 max-w-5xl font-sans antialiased text-slate-800 space-y-6">

      {/* Page Title & Context Header Copy */}
      <div>
        <h1 className="page-title">My Referrals</h1>
        <p className="text-sm text-slate-500 font-medium mt-1">
          Track referrals submitted for {CHILD_NAME}
        </p>
      </div>

      {/* Target Focus Notice Block Banner */}
      <div className="bg-blue-50 border border-blue-100 px-5 py-3.5 rounded-xl text-sm font-medium text-blue-600">
        Viewing referrals for: <span className="font-semibold">{CHILD_NAME}</span>
      </div>

      {/* Main Container Wrapper */}
      <div className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden">

        {/* Search Input Bar */}
        <div className="p-5 border-b border-slate-100 bg-slate-50/30">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
            <input
              type="text"
                aria-label="Search referrals"
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
                    <h3 className="text-lg font-semibold text-slate-900 tracking-tight">{item.concernType}</h3>
                    <div className="text-xs text-slate-500 font-medium flex flex-wrap items-center gap-x-4 gap-y-1">
                      <span>Counselor: <span className="text-slate-700 font-semibold">Ralph Michael</span></span>
                      <span className="hidden sm:inline text-slate-300">•</span>
                      <span className="font-mono">Date Submitted: {new Date(item.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>

                  {/* Operational Target State Tags */}
                  <div className="flex items-center gap-2">
                    {/* Priority Indicator Badge */}
                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-md
                      ${item.priority === 'Medium' ? 'bg-orange-50 text-orange-700' : ''}
                      ${item.priority === 'Low' ? 'bg-blue-50 text-blue-700' : ''}
                      ${(item.priority === 'High' || item.priority === 'Urgent') ? 'bg-red-50 text-red-700' : ''}
                    `}>
                      {item.priority}
                    </span>

                    {/* Dynamic Status Track Pill */}
                    <span className={`text-xs font-semibold px-3 py-1 rounded flex items-center gap-1.5 font-sans
                      ${item.status === 'IN_PROGRESS' ? 'bg-orange-50 border border-orange-100 text-orange-700' : ''}
                      ${item.status === 'CLOSED' ? 'bg-emerald-50 border border-emerald-200 text-emerald-600' : ''}
                      ${item.status === 'OPEN' ? 'bg-red-50 border border-red-100 text-red-600' : ''}
                    `}>
                      {item.status === 'IN_PROGRESS' && <Clock size={13} className="stroke-[2.5]" />}
                      {item.status === 'CLOSED' && <CheckCircle2 size={13} className="stroke-[2.5]" />}
                      {item.status === 'OPEN' && <AlertCircle size={13} className="stroke-[2.5]" />}
                      {item.status.replace('_', ' ')}
                    </span>
                  </div>
                </div>

                {/* Counselor Feedback Collateral Block Frame */}
                {item.notes && (
                  <div className="bg-emerald-50 border border-emerald-50 rounded-xl p-4 space-y-1">
                    <h4 className="text-xs font-semibold text-emerald-600">Counselor Feedback:</h4>
                    <p className="text-sm text-slate-700 font-medium leading-relaxed">
                      {item.notes}
                    </p>
                  </div>
                )}

              </div>
            ))
          ) : (
            <div className="text-center py-12 text-slate-500 font-medium text-sm">
              No matching referrals found.
            </div>
          )}
        </div>
      </div>

      {/* Referral Status Guide Explainer Panel */}
      <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm space-y-4">
        <h3 className="text-base font-semibold text-slate-900 tracking-tight">Referral Status Guide</h3>

        <div className="space-y-4 text-sm font-medium leading-relaxed">
          {/* Row 1: Open */}
          <div className="flex items-start gap-4">
            <span className="w-24 text-center shrink-0 bg-red-50 border border-red-100 text-red-600 font-semibold py-1 rounded text-xs">
              Open
            </span>
            <p className="text-slate-600 pt-0.5">
              Referral has been submitted and is awaiting initial review by the counselor.
            </p>
          </div>

          {/* Row 2: In Progress */}
          <div className="flex items-start gap-4">
            <span className="w-24 text-center shrink-0 bg-orange-50 border border-orange-100 text-orange-700 font-semibold py-1 rounded text-xs leading-tight">
              In Progress
            </span>
            <p className="text-slate-600 pt-0.5">
              Counselor is actively working with your child on the concern. You may receive updates as progress is made.
            </p>
          </div>

          {/* Row 3: Closed */}
          <div className="flex items-start gap-4">
            <span className="w-24 text-center shrink-0 bg-emerald-50 border border-emerald-200 text-emerald-600 font-semibold py-1 rounded text-xs">
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
