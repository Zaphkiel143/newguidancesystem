import React from 'react';
import { 
  Send, 
  Clock, 
  CheckCircle2, 
  Calendar, 
  Upload, 
  FileText,
  TrendingUp
} from 'lucide-react';

// Data types matching the layout screenshots
interface MetricCard {
  id: string;
  title: string;
  value: number;
  change: string;
  changeType: 'positive' | 'negative';
  icon: React.ReactNode;
  iconBg: string;
}

interface ActivityData {
  month: string;
  count: number;
}

interface QuickAction {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  bgClass: string;
  textClass: string;
}

interface RecentReferral {
  id: string;
  studentName: string;
  concern: string;
  date: string;
  status: 'Open' | 'In Progress';
}

export const FacultyDashboard: React.FC = () => {
  
  // Metrics extracted exactly from image_862c42.png
  const metrics: MetricCard[] = [
    {
      id: 'metric-1',
      title: 'Total Referrals Submitted',
      value: 15,
      change: '+2',
      changeType: 'positive',
      icon: <Send size={18} className="text-white" />,
      iconBg: 'bg-[#1d63ff]',
    },
    {
      id: 'metric-2',
      title: 'Pending Review',
      value: 3,
      change: '-1',
      changeType: 'negative',
      icon: <Clock size={18} className="text-white" />,
      iconBg: 'bg-[#ff7a00]',
    },
    {
      id: 'metric-3',
      title: 'Resolved',
      value: 12,
      change: '+3',
      changeType: 'positive',
      icon: <CheckCircle2 size={18} className="text-white" />,
      iconBg: 'bg-[#00c853]',
    },
    {
      id: 'metric-4',
      title: 'My Appointments',
      value: 2,
      change: '',
      changeType: 'positive',
      icon: <Calendar size={18} className="text-white" />,
      iconBg: 'bg-[#a855f7]',
    },
  ];

  // Monthly activity matching graph structure in image_862c42.png
  const activityData: ActivityData[] = [
    { month: 'Jan', count: 2 },
    { month: 'Feb', count: 3 },
    { month: 'Mar', count: 4 },
    { month: 'Apr', count: 3 },
    { month: 'May', count: 3 },
  ];

  // Quick action configurations matching image_862c21.png
  const quickActions: QuickAction[] = [
    {
      id: 'action-1',
      title: 'Submit New Referral',
      description: 'Refer a student or colleague to the Guidance Office',
      icon: <Send size={20} />,
      bgClass: 'bg-[#f0f6ff] hover:bg-blue-100/70',
      textClass: 'text-[#1d63ff]',
    },
    {
      id: 'action-2',
      title: 'Book Appointment',
      description: 'Schedule a meeting with the counselor',
      icon: <Calendar size={20} />,
      bgClass: 'bg-[#faf5ff] hover:bg-purple-100/70',
      textClass: 'text-[#a855f7]',
    },
    {
      id: 'action-3',
      title: 'Upload Documents',
      description: 'Share files with the Guidance Office',
      icon: <Upload size={20} />,
      bgClass: 'bg-[#f0fdf4] hover:bg-green-100/70',
      textClass: 'text-[#00c853]',
    },
    {
      id: 'action-4',
      title: 'View My Referrals',
      description: 'Track status of submitted referrals',
      icon: <FileText size={20} />,
      bgClass: 'bg-[#f8fafc] hover:bg-slate-200/60',
      textClass: 'text-slate-700',
    },
  ];

  // Feed items matching recent rows in image_862c21.png
  const recentReferrals: RecentReferral[] = [
    {
      id: 'ref-1',
      studentName: 'Dexter Glorioso',
      concern: 'Behavioral concern',
      date: '2026-04-28',
      status: 'Open',
    },
    {
      id: 'ref-2',
      studentName: 'Kurt Aquino',
      concern: 'Academic performance',
      date: '2026-04-27',
      status: 'In Progress',
    },
    {
      id: 'ref-3',
      studentName: 'Nhel Belarmino',
      concern: 'Attendance issues',
      date: '2026-04-26',
      status: 'In Progress',
    },
  ];

  return (
    <div className="space-y-6 max-w-7xl mx-auto font-sans antialiased text-slate-800">
      
      {/* SECTION 1: Upper Metric Summary Grid (from image_862c42.png) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {metrics.map((m) => (
          <div key={m.id} className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between min-h-[140px] relative overflow-hidden">
            <div className="flex items-start justify-between">
              <div className={`${m.iconBg} p-2.5 rounded-xl shadow-sm flex items-center justify-center`}>
                {m.icon}
              </div>
              {m.change && (
                <span className={`text-xs font-bold font-mono px-1.5 py-0.5 rounded-md ${
                  m.changeType === 'positive' ? 'text-[#00c853]' : 'text-[#ff2b3d]'
                }`}>
                  {m.change}
                </span>
              )}
            </div>
            <div className="mt-4">
              <span className="text-3xl font-bold text-slate-900 tracking-tight block">{m.value}</span>
              <span className="text-xs font-medium text-slate-400 block mt-0.5">{m.title}</span>
            </div>
          </div>
        ))}
      </div>

      {/* SECTION 2: Data Visualization Graph Container (from image_862c42.png) */}
      <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
        <h2 className="font-bold text-slate-900 text-base mb-8">Monthly Referral Activity</h2>
        
        {/* CSS Flex Graph representing statistical increments cleanly */}
        <div className="flex items-end justify-between max-w-2xl mx-auto h-28 px-4">
          {activityData.map((data) => {
            // Factor base multiplier sizing height values dynamically
            const heightPercent = `${(data.count / 5) * 100}%`;
            return (
              <div key={data.month} className="flex flex-col items-center flex-1 group">
                <div className="w-full flex justify-center mb-2">
                  <span className="text-xs font-bold text-slate-800 transition-transform group-hover:scale-110">
                    {data.count}
                  </span>
                </div>
                {/* Visual Bar Accent */}
                <div className="w-8 bg-blue-50 group-hover:bg-blue-100 rounded-t-md transition-all duration-300 relative flex items-end overflow-hidden" style={{ height: heightPercent }}>
                  <div className="w-full bg-[#1d63ff] h-[15%] rounded-t-md opacity-80" />
                </div>
                <span className="text-xs text-slate-400 font-medium mt-3 block">
                  {data.month}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* SECTION 3: Lower Row Widgets: Actions & Logs Grid split (from image_862c21.png) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Left Column: Quick Actions Button Stack */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="px-6 py-5 border-b border-slate-100">
            <h2 className="font-bold text-slate-900 text-base">Quick Actions</h2>
          </div>
          <div className="p-6 space-y-3">
            {quickActions.map((action) => (
              <button
                key={action.id}
                className={`w-full text-left p-4 rounded-xl flex items-center gap-4 border border-transparent transition-all duration-150 ${action.bgClass}`}
              >
                <div className={`shrink-0 ${action.textClass}`}>
                  {action.icon}
                </div>
                <div className="min-w-0">
                  <h4 className="font-bold text-slate-800 text-sm leading-snug">
                    {action.title}
                  </h4>
                  <p className="text-xs text-slate-400 font-medium mt-0.5 truncate">
                    {action.description}
                  </p>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Right Column: Recent Activity Feed List */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="px-6 py-5 border-b border-slate-100">
            <h2 className="font-bold text-slate-900 text-base">Recent Referrals</h2>
          </div>
          <div className="p-6 space-y-3">
            {recentReferrals.map((ref) => (
              <div 
                key={ref.id}
                className="bg-slate-50/50 hover:bg-slate-50 rounded-xl p-4 border border-slate-100 flex items-center justify-between gap-4 transition-colors"
              >
                <div className="space-y-0.5 min-w-0">
                  <h4 className="font-bold text-slate-800 text-sm truncate">
                    {ref.studentName}
                  </h4>
                  <p className="text-xs text-slate-500 font-medium">
                    {ref.concern}
                  </p>
                  <span className="text-[10px] text-slate-400 font-mono block pt-1">
                    {ref.date}
                  </span>
                </div>

                {/* Status Badging Blocks matches screenshots identically */}
                <div className="shrink-0">
                  {ref.status === 'Open' ? (
                    <span className="bg-[#fff1f2] border border-[#ffe4e6] text-[#ff2b3d] text-[11px] font-bold px-2.5 py-0.5 rounded-full">
                      Open
                    </span>
                  ) : (
                    <span className="bg-[#fff7ed] border border-[#ffedd5] text-[#ff7a00] text-[11px] font-bold px-2.5 py-0.5 rounded-full">
                      In Progress
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
};

export default FacultyDashboard;