"use client";

import React, { useEffect, useState } from 'react';
import { Search, AlertTriangle, Clock, CheckCircle2, FileText } from 'lucide-react';
import { getMyReferrals } from '../../action/faculty';
import type { Referral } from '../../../lib/generated';


export const MyReferralsPage: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [referrals, setReferrals] = useState<Referral[]>([]);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const data = await getMyReferrals();
      if (!cancelled) setReferrals(data);
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const filteredLogs = referrals.filter((log) =>
    log.studentName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    log.concernType.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getPriorityStyles = (priority: string) => {
    switch (priority) {
      case 'High':
      case 'Urgent': return 'bg-red-50 text-red-600 border border-red-100';
      case 'Medium': return 'bg-orange-50 text-orange-600 border border-orange-100';
      default: return 'bg-blue-50 text-blue-600 border border-blue-100';
    }
  };

  const getStatusStyles = (status: string) => {
    switch (status) {
      case 'OPEN': return 'bg-red-50 text-red-600 border border-red-200';
      case 'IN_PROGRESS': return 'bg-orange-50 text-orange-600 border border-orange-200';
      default: return 'bg-green-50 text-green-600 border border-green-200';
    }
  };

  return (
    <div className="px-5 sm:px-8 lg:px-12 pt-8 lg:pt-12 pb-16 max-w-7xl font-sans antialiased text-slate-800 space-y-6">

      {/* Page Heading Headers Section */}
      <div>
        <h1 className="page-title">My Referrals</h1>
        <p className="text-sm text-slate-500 font-medium mt-1">
          Track the status of your submitted student referrals
        </p>
      </div>

      {/* Persistent Search Action Input Field Container */}
      <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
          <input
            type="text"
                aria-label="Search referrals"
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
                  <h3 className="text-lg font-semibold text-slate-900 tracking-tight">{log.studentName}</h3>
                </div>

                {/* Priority and Progress Badges Row Section */}
                <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-md ${getPriorityStyles(log.priority)}`}>
                    {log.priority}
                  </span>

                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-md flex items-center gap-1.5 ${getStatusStyles(log.status)}`}>
                    {log.status === 'OPEN' && <AlertTriangle size={12} className="stroke-[2.5]" />}
                    {log.status === 'IN_PROGRESS' && <Clock size={12} className="stroke-[2.5]" />}
                    {log.status === 'CLOSED' && <CheckCircle2 size={12} className="stroke-[2.5]" />}
                    {log.status.replace('_', ' ')}
                  </span>
                </div>
              </div>

              {/* Central Core Parameters Content Summary Block */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1 text-xs">
                <div className="space-y-1">
                  <span className="text-slate-500 font-medium block">Concern Type:</span>
                  <span className="text-slate-800 font-semibold text-[13px]">{log.concernType}</span>
                </div>
                <div className="space-y-1">
                  <span className="text-slate-500 font-medium block">Date Submitted:</span>
                  <span className="text-slate-700 font-mono font-semibold">{new Date(log.createdAt).toLocaleDateString()}</span>
                </div>
              </div>

              {/* Conditional Nested Office Feedback Container */}
              {log.notes && (
                <div className="bg-blue-50/50 border border-blue-100 rounded-xl p-4 mt-2">
                  <span className="text-xs font-semibold text-blue-900 flex items-center gap-2">
                    <FileText size={14} className="text-blue-600" />
                    Feedback from Guidance Office:
                  </span>
                  <p className="text-xs text-slate-600 font-medium mt-1.5 leading-relaxed pl-5">
                    {log.notes}
                  </p>
                </div>
              )}

            </div>
          ))
        ) : (
          <div className="text-center p-12 bg-white rounded-2xl border border-dashed border-slate-200 text-slate-500 text-sm font-medium">
            No matching logged student referral records found.
          </div>
        )}
      </div>

    </div>
  );
};

export default MyReferralsPage;
