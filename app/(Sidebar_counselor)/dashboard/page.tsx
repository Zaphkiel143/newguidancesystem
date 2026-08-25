import React from 'react';
import { Users, Calendar, FileText, Briefcase } from 'lucide-react';
import { getAppointmentsByDate, getDashboardStats, listReferrals } from '../../action/counselor';

const Dashboard = async () => {
  const today = new Date().toISOString().split("T")[0];
  const [todaysAppointments, stats, referrals] = await Promise.all([
    getAppointmentsByDate(today),
    getDashboardStats(),
    listReferrals(),
  ]);

  const urgentReferrals = referrals
    .filter((r) => r.status !== "CLOSED" && (r.priority === "High" || r.priority === "Urgent"))
    .slice(0, 5);

  return (
    <main>
    <div className="flex h-screen bg-slate-50 font-sans text-slate-900">
      {/* Main Content Area */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Dashboard Body */}
        <div className="p-8 overflow-y-auto">
          <header className="mb-8">
            <h2 className="text-2xl font-bold">Dashboard</h2>
            <p className="text-slate-500">Welcome back! Here&apos;s an overview of your guidance activities.</p>
          </header>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <StatCard icon={<Users className="text-blue-600"/>} value={String(stats.totalStudents)} label="Total Students" color="bg-blue-50" />
            <StatCard icon={<Calendar className="text-green-600"/>} value={String(todaysAppointments.length)} label="Today's Appointments" color="bg-green-50" />
            <StatCard icon={<FileText className="text-orange-600"/>} value={String(stats.pendingReferrals)} label="Pending Referrals" color="bg-orange-50" />
            <StatCard icon={<Briefcase className="text-purple-600"/>} value={String(stats.activeCareerPlans)} label="Active Career Plans" color="bg-purple-50" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Appointments List */}
            <section className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
              <h3 className="text-lg font-bold mb-4">Today&apos;s Appointments</h3>
              <div className="space-y-4">
                {todaysAppointments.length === 0 ? (
                  <p className="text-sm text-slate-400">No appointments scheduled for today.</p>
                ) : (
                  todaysAppointments.map((appointment) => (
                    <AppointmentRow
                      key={appointment.id}
                      name={appointment.studentName || "Unnamed Student"}
                      type={appointment.appointmentType || "General"}
                      time={appointment.time}
                      status={appointment.status === "CONFIRMED" ? "Confirmed" : "Pending"}
                    />
                  ))
                )}
              </div>
            </section>

            {/* Referrals List */}
            <section className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
              <h3 className="text-lg font-bold mb-4">Urgent Referrals</h3>
              <div className="space-y-4">
                {urgentReferrals.length === 0 ? (
                  <p className="text-sm text-slate-400">No urgent referrals right now.</p>
                ) : (
                  urgentReferrals.map((referral) => (
                    <ReferralCard
                      key={referral.id}
                      name={referral.studentName}
                      referrer={referral.referrerName}
                      reason={referral.concernType}
                      date={new Date(referral.createdAt).toLocaleDateString()}
                    />
                  ))
                )}
              </div>
            </section>
          </div>
        </div>
      </main>
    </div>
    </main>
  );
};

export default Dashboard;

const StatCard = ({ icon, value, label, color }: { icon: React.ReactNode; value: string; label: string; color: string }) => (
  <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex items-start gap-4">
    <div className={`p-3 rounded-lg ${color}`}>{icon}</div>
    <div>
      <p className="text-2xl font-bold">{value}</p>
      <p className="text-sm text-slate-500">{label}</p>
    </div>
  </div>
);

const AppointmentRow = ({ name, type, time, status }: { name: string; type: string; time: string; status: 'Confirmed' | 'Pending' }) => (
  <div className="flex items-center justify-between p-4 rounded-lg border border-slate-100 bg-slate-50/50">
    <div>
      <p className="font-semibold">{name}</p>
      <p className="text-sm text-slate-500">{type}</p>
    </div>
    <div className="text-right">
      <p className="text-sm font-medium mb-1">{time}</p>
      <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full ${
        status === 'Confirmed' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'
      }`}>
        {status}
      </span>
    </div>
  </div>
);

const ReferralCard = ({ name, referrer, reason, date }: { name: string; referrer: string; reason: string; date: string }) => (
  <div className="p-4 rounded-lg border border-red-100 bg-red-50/30 relative">
    <span className="absolute top-4 right-4 text-[10px] font-bold text-red-600 uppercase">Urgent</span>
    <p className="font-semibold text-slate-800">{name}</p>
    <p className="text-sm text-slate-600">Referred by: {referrer}</p>
    <p className="text-sm text-slate-600 italic">Reason: {reason}</p>
    <p className="text-xs text-slate-400 mt-2">{date}</p>
  </div>
);