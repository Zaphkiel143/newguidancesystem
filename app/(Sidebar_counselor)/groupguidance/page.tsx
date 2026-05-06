"use client";

import { Users, Calendar, Download, Send, BarChart3 } from 'lucide-react';

const GroupGuidance = () => {
  return (
    <div className="p-8 bg-slate-50 min-h-screen font-sans text-slate-900">
      {/* Header */}
      <header className="mb-8">
        <h1 className="text-2xl font-bold">Group Guidance & Needs Assessment</h1>
        <p className="text-slate-500 text-sm">Plan and track group guidance programs</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Column: Guidance Programs */}
        <div className="lg:col-span-7 space-y-6">
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm min-h-125">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-lg font-bold">Guidance Programs</h2>
              <button className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-blue-700 transition-colors">
                New Program
              </button>
            </div>

            <div className="space-y-4">
              <ProgramCard 
                title="Mental Health Awareness" 
                grade="Grade 11" 
                participants="156" 
                date="2026-04-15" 
                status="Completed" 
              />
              <ProgramCard 
                title="Study Skills Workshop" 
                grade="Grade 12" 
                participants="142" 
                date="2026-04-22" 
                status="Completed" 
              />
              <ProgramCard 
                title="Anti-Bullying Campaign" 
                grade="All Grades" 
                participants="487" 
                date="2026-05-05" 
                status="Upcoming" 
              />
            </div>
          </div>
        </div>

        {/* Right Column: Needs Assessment Results */}
        <div className="lg:col-span-5">
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-lg font-bold">Needs Assessment Results</h2>
              <button className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-md text-xs font-semibold hover:bg-slate-100">
                <Download size={14} />
                Export
              </button>
            </div>

            <div className="mb-8">
              <p className="text-xs text-slate-500 font-medium">Total Responses</p>
              <p className="text-3xl font-bold">487</p>
            </div>

            <div className="space-y-5 mb-8">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Top Student Concerns:</p>
              <ProgressBar label="Academic Stress" percentage={68} count={331} />
              <ProgressBar label="Career Uncertainty" percentage={54} count={263} />
              <ProgressBar label="Peer Relationships" percentage={42} count={205} />
              <ProgressBar label="Family Issues" percentage={28} count={136} />
              <ProgressBar label="Mental Health" percentage={35} count={170} />
            </div>

            <button className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors shadow-md">
              <Send size={18} />
              Send New Assessment Form
            </button>
          </div>
        </div>

        {/* Bottom Section: Timeline Placeholder (Second Screenshot) */}
        <div className="lg:col-span-12">
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-100 bg-white">
              <h2 className="font-bold text-slate-800">Assessment Submissions Timeline</h2>
            </div>
            <div className="h-48 flex flex-col items-center justify-center text-slate-400 bg-white">
              <BarChart3 size={32} className="mb-2 opacity-30" />
              <p className="text-sm">Visual analytics coming soon</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

/* Sub-component for Program Cards */
const ProgramCard = ({ title, grade, participants, date, status }: any) => (
  <div className="p-5 border border-slate-100 rounded-xl hover:border-blue-100 hover:bg-blue-50/20 transition-all group">
    <div className="flex justify-between items-start mb-2">
      <h3 className="font-bold text-slate-800">{title}</h3>
      <span className={`text-[10px] font-bold px-3 py-1 rounded-full ${
        status === 'Completed' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'
      }`}>
        {status}
      </span>
    </div>
    <p className="text-xs text-slate-500 mb-4">{grade}</p>
    <div className="flex items-center gap-6 text-[11px] text-slate-500 mb-4">
      <div className="flex items-center gap-2">
        <Users size={14} /> {participants} participants
      </div>
      <div className="flex items-center gap-2">
        <Calendar size={14} /> Date: {date}
      </div>
    </div>
    <button className="text-blue-600 bg-blue-50 px-3 py-1.5 rounded-md text-xs font-bold hover:bg-blue-100 transition-colors">
      View Details
    </button>
  </div>
);

/* Sub-component for Assessment Progress Bars */
const ProgressBar = ({ label, percentage, count }: any) => (
  <div className="space-y-1.5">
    <div className="flex justify-between text-xs font-medium">
      <span className="text-slate-700">{label}</span>
      <span className="text-slate-500">{percentage}% ({count})</span>
    </div>
    <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
      <div 
        className="bg-blue-600 h-full rounded-full transition-all duration-1000" 
        style={{ width: `${percentage}%` }}
      />
    </div>
  </div>
);

export default GroupGuidance;