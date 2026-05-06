import React from 'react';
import { 
  LayoutDashboard, Users, Calendar, FileText, 
  UsersRound, Briefcase, TestTube2, Info, LogOut 
} from 'lucide-react';

const Dashboard = () => {
  return (
    <main>
    <div className="flex h-screen bg-slate-50 font-sans text-slate-900">
      {/* Main Content Area */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Dashboard Body */}
        <div className="p-8 overflow-y-auto">
          <header className="mb-8">
            <h2 className="text-2xl font-bold">Dashboard</h2>
            <p className="text-slate-500">Welcome back! Here's an overview of your guidance activities.</p>
          </header>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <StatCard icon={<Users className="text-blue-600"/>} value="1,247" label="Total Students" color="bg-blue-50" />
            <StatCard icon={<Calendar className="text-green-600"/>} value="8" label="Today's Appointments" color="bg-green-50" />
            <StatCard icon={<FileText className="text-orange-600"/>} value="12" label="Pending Referrals" color="bg-orange-50" />
            <StatCard icon={<Briefcase className="text-purple-600"/>} value="342" label="Active Career Plans" color="bg-purple-50" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Appointments List */}
            <section className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
              <h3 className="text-lg font-bold mb-4">Today's Appointments</h3>
              <div className="space-y-4">
                <AppointmentRow name="Nhel Belarmino" type="Individual Counseling" time="9:00 AM" status="Confirmed" />
                <AppointmentRow name="Dexter Glorioso" type="Career Guidance" time="10:30 AM" status="Confirmed" />
                <AppointmentRow name="Justine Casano" type="Academic Concern" time="2:00 PM" status="Pending" />
              </div>
            </section>

            {/* Referrals List */}
            <section className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
              <h3 className="text-lg font-bold mb-4">Urgent Referrals</h3>
              <div className="space-y-4">
                <ReferralCard name="Dexter Glorioso" referrer="Cho Domingo" reason="Behavioral concern" date="2026-04-28" />
                <ReferralCard name="Kurt Aquino" referrer="Cho Domingo" reason="Academic performance" date="2026-04-27" />
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

interface SidebarItemProps {
  icon: React.ReactNode;
  label: string;
  active?: boolean;
}

const SidebarItem = ({ icon, label, active = false }: SidebarItemProps) => (
  <div className={`flex items-center gap-3 px-4 py-3 rounded-lg cursor-pointer transition-colors ${
    active ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:bg-slate-50'
  }`}>
    {icon}
    <span className="font-medium">{label}</span>
  </div>
);

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