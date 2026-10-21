import React from 'react';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { getAppointmentsByDate, getDashboardStats, listReferrals } from '../../action/counselor';
import { getCurrentUser } from '../../../lib/auth';
import { manilaHour, manilaToday, OFFICE_TZ } from '../../../lib/time';
import StudentQuickSearch from '../../../components/StudentQuickSearch';

const Dashboard = async () => {
  const now = new Date();
  const today = manilaToday(now);
  const [todaysAppointments, stats, referrals, user] = await Promise.all([
    getAppointmentsByDate(today),
    getDashboardStats(),
    listReferrals(),
    getCurrentUser(),
  ]);

  const urgentReferrals = referrals
    .filter((r) => r.status !== "CLOSED" && (r.priority === "High" || r.priority === "Urgent" || r.priority === "Emergency"))
    .slice(0, 5);

  const hour = manilaHour(now);
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
  const firstName = user?.name.split(" ")[0];
  const dateLabel = now.toLocaleDateString("en-PH", { timeZone: OFFICE_TZ, weekday: "long", month: "long", day: "numeric" });

  const summary =
    todaysAppointments.length === 0
      ? "Nothing on the calendar today."
      : `${todaysAppointments.length} ${todaysAppointments.length === 1 ? "session" : "sessions"} on the calendar today.`;

  return (
    <div className="px-5 sm:px-8 lg:px-12 pt-8 lg:pt-12 pb-16 max-w-6xl">
      <header>
        <p className="text-sm text-slate-500">{dateLabel}</p>
        <h1 className="page-title mt-2">
          {greeting}{firstName ? `, ${firstName}` : ""}.
        </h1>
        <p className="mt-2 text-slate-600">
          {summary}
          {urgentReferrals.length > 0 && (
            <>
              {" "}
              <Link href="/referral" className="text-red-700 underline underline-offset-4 decoration-red-200 hover:decoration-red-500">
                {urgentReferrals.length} high-priority {urgentReferrals.length === 1 ? "referral" : "referrals"}
              </Link>{" "}
              still open.
            </>
          )}
        </p>
      </header>

      <div className="mt-8">
        <StudentQuickSearch />
      </div>

      {/* Shortcuts to everyday tasks, with what's waiting */}
      <nav aria-label="Shortcuts" className="mt-6 grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-2">
        {[
          { label: "Appointments", href: "/appointment", count: stats.pendingAppointments, hint: "to confirm" },
          { label: "Referrals", href: "/referral", count: stats.pendingReferrals, hint: "open" },
          { label: "Documents", href: "/documents", count: stats.documentsToReview, hint: "to review" },
          { label: "Approvals", href: "/accounts", count: stats.approvalsWaiting, hint: "waiting" },
          { label: "Daily log", href: "/daily_log" },
          { label: "Post announcement", href: "/information" },
        ].map((s) => (
          <Link key={s.href} href={s.href}
            className="group rounded-xl border border-rule bg-sheet px-4 py-3 hover:border-blue-300 hover:bg-blue-50 transition-colors min-h-16">
            <span className="block text-[14px] font-medium text-ink group-hover:text-blue-700">{s.label}</span>
            {s.count !== undefined && (
              <span className={`block text-[12px] mt-0.5 ${s.count > 0 ? "text-red-700 font-semibold" : "text-slate-500"}`}>
                {s.count} {s.hint}
              </span>
            )}
          </Link>
        ))}
      </nav>

      {/* Figures */}
      <div className="mt-10 grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Figure label="Students on record" value={stats.totalStudents} href="/inventory" />
        <Figure label="Appointments today" value={todaysAppointments.length} href="/appointment" />
        <Figure label="Referrals pending" value={stats.pendingReferrals} href="/referral" />
        <Figure label="Active career plans" value={stats.activeCareerPlans} href="/careerguidance" />
      </div>

      <div className="mt-12 grid grid-cols-1 lg:grid-cols-[1.2fr_1fr] gap-12 lg:gap-16">
        <section>
          <SectionHeading title="Today's schedule" href="/appointment" linkLabel="Open calendar" />
          {todaysAppointments.length === 0 ? (
            <Empty>
              No sessions booked for today. Students can request a slot from their own dashboard.
            </Empty>
          ) : (
            <ol className="divide-y divide-rule border-t border-rule">
              {todaysAppointments.map((appointment) => (
                <li key={appointment.id} className="grid grid-cols-[72px_1fr_auto] items-baseline gap-4 py-3.5">
                  <span className="font-mono text-[13px] text-slate-500 tabular">{appointment.time}</span>
                  <span className="min-w-0">
                    <span className="block font-medium text-ink truncate">{appointment.studentName || "Unnamed student"}</span>
                    <span className="block text-[13px] text-slate-500 truncate">{appointment.appointmentType || "General"}</span>
                  </span>
                  <Status confirmed={appointment.status === "CONFIRMED"} completed={appointment.status === "COMPLETED"} />
                </li>
              ))}
            </ol>
          )}
        </section>

        <section>
          <SectionHeading title="Needs attention" href="/referral" linkLabel="All referrals" />
          {urgentReferrals.length === 0 ? (
            <Empty>No high-priority referrals are open.</Empty>
          ) : (
            <ul className="divide-y divide-rule border-t border-rule">
              {urgentReferrals.map((referral) => (
                <li key={referral.id} className="py-4">
                  <div className="flex items-baseline justify-between gap-3">
                    <p className="font-medium text-ink">{referral.studentName}</p>
                    <span className="text-[12px] text-red-700 font-medium shrink-0">{referral.priority}</span>
                  </div>
                  <p className="text-[14px] text-slate-600 mt-0.5">{referral.concernType}</p>
                  <p className="text-[12px] text-slate-500 mt-1.5">
                    From {referral.referrerName} · {new Date(referral.createdAt).toLocaleDateString("en-PH", { month: "short", day: "numeric" })}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
};

export default Dashboard;

const Figure = ({ label, value, href }: { label: string; value: number; href: string }) => (
  <div className="bg-blue-50 border border-blue-100 rounded-xl px-5 py-5">
    <Link href={href} className="group block">
      <p className="font-serif text-[44px] leading-none text-ink tabular">{value}</p>
      <p className="text-[13px] text-slate-500 mt-2 group-hover:text-blue-700 transition-colors">{label}</p>
    </Link>
  </div>
);

const SectionHeading = ({ title, href, linkLabel }: { title: string; href: string; linkLabel: string }) => (
  <div className="flex items-baseline justify-between mb-3">
    <h2 className="font-serif text-[22px] text-ink">{title}</h2>
    <Link href={href} className="group text-[13px] text-slate-500 hover:text-blue-700 inline-flex items-center gap-1 transition-colors">
      {linkLabel} <ArrowRight size={13} className="group-hover:translate-x-0.5 transition-transform" />
    </Link>
  </div>
);

const Empty = ({ children }: { children: React.ReactNode }) => (
  <p className="border-t border-rule pt-4 text-[14px] text-slate-500 max-w-[46ch]">{children}</p>
);

const Status = ({ confirmed, completed }: { confirmed: boolean; completed: boolean }) => (
  <span className={`inline-flex items-center gap-1.5 text-[12px] ${completed ? "text-teal-700" : confirmed ? "text-emerald-700" : "text-orange-700"}`}>
    <span className={`w-1.5 h-1.5 rounded-full ${completed ? "bg-teal-500" : confirmed ? "bg-emerald-500" : "bg-orange-500"}`} />
    {completed ? "Terminated" : confirmed ? "Confirmed" : "Pending"}
  </span>
);
