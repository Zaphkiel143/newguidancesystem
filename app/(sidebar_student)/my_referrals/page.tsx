"use client";

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Loader2 } from 'lucide-react';
import { getMyReferrals } from '../../action/student';
import type { Referral } from '../../../lib/generated';

const STATUS: Record<string, { label: string; dot: string; text: string; explain: string }> = {
  OPEN: { label: 'Received', dot: 'bg-red-500', text: 'text-red-700', explain: 'The guidance office has your referral and will review it.' },
  IN_PROGRESS: { label: 'In progress', dot: 'bg-orange-500', text: 'text-orange-700', explain: 'The Guidance Associate is working on this.' },
  CLOSED: { label: 'Resolved', dot: 'bg-emerald-500', text: 'text-emerald-700', explain: 'This referral has been handled and closed.' },
};

export default function MyReferralsPage() {
  const [referrals, setReferrals] = useState<Referral[] | null>(null);

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

  return (
    <div className="px-5 sm:px-8 lg:px-12 pt-8 lg:pt-12 pb-16 max-w-4xl text-slate-800">
      <header className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1 className="page-title">My Referrals</h1>
          <p className="text-sm text-slate-500 mt-1">Referrals you&apos;ve sent, for yourself or a classmate, and where they stand</p>
        </div>
        <Link
          href="/refer_student"
          className="self-start sm:self-auto inline-flex items-center bg-blue-700 hover:bg-blue-800 text-white text-sm font-medium px-4 min-h-11 rounded-full transition-colors"
        >
          New referral
        </Link>
      </header>

      {referrals === null ? (
        <div className="py-20 flex justify-center text-slate-500">
          <Loader2 className="animate-spin" size={20} />
        </div>
      ) : referrals.length === 0 ? (
        <p className="mt-10 border-t border-rule pt-4 text-sm text-slate-500">You haven&apos;t sent any referrals.</p>
      ) : (
        <ul className="mt-10 divide-y divide-rule border-y border-rule">
          {referrals.map((r) => {
            const s = STATUS[r.status] ?? STATUS.OPEN;
            return (
              <li key={r.id} className="py-5 grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-x-6 gap-y-2">
                <div className="min-w-0">
                  <p className="font-medium text-ink">
                    {r.concernType} <span className="text-slate-500 font-normal">· about {r.studentName}</span>
                  </p>
                  <p className="text-[13px] text-slate-500 mt-0.5">
                    Sent {new Date(r.createdAt).toLocaleDateString("en-PH", { month: "long", day: "numeric", year: "numeric" })} · {r.priority} priority
                  </p>
                  <p className="text-[13px] text-slate-600 mt-2">{s.explain}</p>
                </div>
                <span className={`inline-flex items-center gap-1.5 text-[13px] ${s.text} sm:justify-self-end h-fit`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
                  {s.label}
                </span>
              </li>
            );
          })}
        </ul>
      )}
      <p className="text-xs text-slate-500 mt-4">Replies from the Guidance Associate arrive in Messages.</p>
    </div>
  );
}
