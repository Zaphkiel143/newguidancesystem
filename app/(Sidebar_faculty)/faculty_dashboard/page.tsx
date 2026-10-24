import React from 'react';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { getMyReferrals, getMyAppointments } from '../../action/faculty';
import { getCurrentUser } from '../../../lib/auth';


const SHORTCUTS = [
  { title: 'Submit a referral', description: 'Flag a student who may need support', path: '/submit_referral' },
  { title: 'Book an appointment', description: 'Meet with the guidance associate', path: '/faculty_appointment' },
  { title: 'Upload documents', description: 'Share files with the office', path: '/upload_documents' },
  { title: 'My referrals', description: 'Follow up on what you sent', path: '/faculty_myreferral' },
];

const STATUS: Record<string, { label: string; dot: string; text: string }> = {
  OPEN: { label: 'Open', dot: 'bg-red-500', text: 'text-red-700' },
  IN_PROGRESS: { label: 'In progress', dot: 'bg-orange-500', text: 'text-orange-700' },
  CLOSED: { label: 'Closed', dot: 'bg-emerald-500', text: 'text-emerald-700' },
};

const FacultyDashboard = async () => {
  const [referrals, appointments, user] = await Promise.all([
    getMyReferrals(),
    getMyAppointments(),
    getCurrentUser(),
  ]);

  const figures = [
    { id: 'submitted', label: 'Referrals sent', value: referrals.length },
    { id: 'pending', label: 'Awaiting review', value: referrals.filter((r) => r.status === 'OPEN').length },
    { id: 'resolved', label: 'Resolved', value: referrals.filter((r) => r.status === 'CLOSED').length },
    { id: 'appointments', label: 'Appointments', value: appointments.length },
  ];

  const recentReferrals = referrals.slice(0, 5);

  return (
    <div className="px-5 sm:px-8 lg:px-12 pt-8 lg:pt-12 pb-16 max-w-6xl text-slate-800">
      <header className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-5">
        <div>
          <h1 className="page-title">Welcome back{user ? `, ${user.name.split(" ")[0]}` : ""}.</h1>
        </div>
        <Link
          href="/submit_referral"
          className="self-start sm:self-auto inline-flex items-center gap-2 bg-blue-700 hover:bg-blue-800 text-white text-[14px] font-medium px-4 py-2.5 rounded-full transition-colors"
        >
          New referral <ArrowRight size={15} />
        </Link>
      </header>

      <div className="mt-10 grid grid-cols-2 lg:grid-cols-4 gap-3">
        {figures.map((f) => (
          <div key={f.id} className="bg-blue-50 border border-blue-100 rounded-xl px-5 py-5">
            <p className="font-serif text-[44px] leading-none text-ink tabular">{f.value}</p>
            <p className="text-[13px] text-slate-500 mt-2">{f.label}</p>
          </div>
        ))}
      </div>

      <div className="mt-12 grid grid-cols-1 lg:grid-cols-[1.2fr_1fr] gap-12 lg:gap-16">
        <section>
          <div className="flex items-baseline justify-between mb-3">
            <h2 className="font-serif text-[22px] text-ink">Recent referrals</h2>
            <Link href="/faculty_myreferral" className="text-[13px] text-slate-500 hover:text-blue-700 transition-colors">
              See all
            </Link>
          </div>
          {recentReferrals.length === 0 ? (
            <p className="border-t border-rule pt-4 text-[14px] text-slate-500">You haven&apos;t sent any referrals yet.</p>
          ) : (
            <ul className="divide-y divide-rule border-t border-rule">
              {recentReferrals.map((ref) => {
                const status = STATUS[ref.status] ?? STATUS.OPEN;
                return (
                  <li key={ref.id} className="py-3.5 flex items-baseline justify-between gap-4">
                    <div className="min-w-0">
                      <p className="font-medium text-ink truncate">{ref.studentName}</p>
                      <p className="text-[13px] text-slate-500">
                        {ref.concernType} · {new Date(ref.createdAt).toLocaleDateString("en-PH", { month: "short", day: "numeric" })}
                      </p>
                    </div>
                    <span className={`shrink-0 inline-flex items-center gap-1.5 text-[12px] ${status.text}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${status.dot}`} />
                      {status.label}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <section>
          <h2 className="font-serif text-[22px] text-ink mb-3">Shortcuts</h2>
          <ul className="divide-y divide-rule border-y border-rule">
            {SHORTCUTS.map((s) => (
              <li key={s.path}>
                <Link href={s.path} className="group flex items-center justify-between gap-4 py-3.5">
                  <span>
                    <span className="block text-[14px] font-medium text-ink group-hover:text-blue-700 transition-colors">{s.title}</span>
                    <span className="block text-[13px] text-slate-500">{s.description}</span>
                  </span>
                  <ArrowRight size={15} className="text-slate-300 group-hover:text-blue-700 group-hover:translate-x-0.5 transition" />
                </Link>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
};

export default FacultyDashboard;
