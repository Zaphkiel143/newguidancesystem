"use client";

import { useEffect, useState } from 'react';
import { Users, Calendar, Download, Send, BarChart3 } from 'lucide-react';
import { GRADE_LEVELS } from '../../config/gradeLevels';
import { getGroupGuidancePrograms, addGroupGuidanceProgram } from '../../action/counselor';

interface Program {
  id: string;
  title: string;
  gradeLevel: string;
  date: string;
  time: string;
  participants: number;
}

// Local (not UTC) YYYY-MM-DD — avoids comparisons rolling back a day near midnight in timezones behind UTC
function toDateString(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function getProgramStatus(dateString: string): "Completed" | "Upcoming" {
  return dateString < toDateString(new Date()) ? "Completed" : "Upcoming";
}

function getMinSelectableDate(): string {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  return toDateString(tomorrow);
}

const GroupGuidance = () => {
  const minSelectableDate = getMinSelectableDate();
  const [programs, setPrograms] = useState<Program[]>([]);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [title, setTitle] = useState("");
  const [gradeLevel, setGradeLevel] = useState<string>(GRADE_LEVELS[0]);
  const [date, setDate] = useState(minSelectableDate);
  const [time, setTime] = useState("");

  const refreshPrograms = async () => {
    const data = await getGroupGuidancePrograms();
    setPrograms(
      data.map((p) => ({
        id: p.id,
        title: p.title,
        gradeLevel: p.gradeLevel,
        date: toDateString(new Date(p.date)),
        time: p.time,
        participants: p.participants,
      }))
    );
  };

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const data = await getGroupGuidancePrograms();
      if (cancelled) return;
      setPrograms(
        data.map((p) => ({
          id: p.id,
          title: p.title,
          gradeLevel: p.gradeLevel,
          date: toDateString(new Date(p.date)),
          time: p.time,
          participants: p.participants,
        }))
      );
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const handleNewProgram = () => {
    setTitle("");
    setGradeLevel(GRADE_LEVELS[0]);
    setDate(minSelectableDate);
    setTime("");
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    const result = await addGroupGuidanceProgram({
      title,
      gradeLevel,
      dateString: date,
      time,
    });

    setIsSaving(false);
    if (result.success) {
      setIsModalOpen(false);
      await refreshPrograms();
    } else {
      alert(`Database Error: ${result.error || "Failed to save program"}`);
    }
  };

  return (
    <div className="px-5 sm:px-8 lg:px-12 pt-8 lg:pt-12 pb-16 min-h-[calc(100dvh-var(--topbar-h))] font-sans text-slate-900">
      {/* Header */}
      <header className="mb-8">
        <h1 className="page-title">Group Guidance & Needs Assessment</h1>
        <p className="text-slate-500 text-sm">Plan and track group guidance programs</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

        {/* Left Column: Guidance Programs */}
        <div className="lg:col-span-7 space-y-6">
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm min-h-125">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-lg font-semibold">Guidance Programs</h2>
              <button
                onClick={handleNewProgram}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-blue-700 transition-colors"
              >
                New Program
              </button>
            </div>

            {programs.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 border-2 border-dashed border-slate-100 rounded-2xl bg-slate-50/40">
                <span className="text-3xl mb-2">📋</span>
                <p className="text-sm font-semibold text-slate-500">No guidance programs scheduled yet</p>
                <p className="text-xs text-slate-400">Click &quot;New Program&quot; to schedule one</p>
              </div>
            ) : (
              <div className="space-y-4">
                {programs.map((program) => (
                  <ProgramCard
                    key={program.id}
                    title={program.title}
                    grade={program.gradeLevel}
                    participants={program.participants}
                    date={program.date}
                    status={getProgramStatus(program.date)}
                  />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Needs Assessment Results */}
        <div className="lg:col-span-5">
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-lg font-semibold">Needs Assessment Results</h2>
              <button className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-md text-xs font-semibold hover:bg-slate-100">
                <Download size={14} />
                Export
              </button>
            </div>

            <div className="mb-8">
              <p className="text-xs text-slate-500 font-medium">Total Responses</p>
              <p className="text-3xl font-semibold">0</p>
            </div>

            <div className="flex flex-col items-center justify-center py-10 mb-8 border-2 border-dashed border-slate-100 rounded-2xl bg-slate-50/40">
              <p className="text-sm font-semibold text-slate-500">No assessment responses yet</p>
              <p className="text-xs text-slate-400 text-center px-4">Send an assessment form to start collecting student concerns</p>
            </div>

            <button className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors shadow-md">
              <Send size={18} />
              Send New Assessment Form
            </button>
          </div>
        </div>

        {/* Bottom Section: Timeline Placeholder */}
        <div className="lg:col-span-12">
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-100 bg-white">
              <h2 className="font-semibold text-slate-800">Assessment Submissions Timeline</h2>
            </div>
            <div className="h-48 flex flex-col items-center justify-center text-slate-400 bg-white">
              <BarChart3 size={32} className="mb-2 opacity-30" />
              <p className="text-sm">Visual analytics coming soon</p>
            </div>
          </div>
        </div>
      </div>

      {/* NEW PROGRAM MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white w-full max-w-md p-6 rounded-2xl shadow-xl border border-slate-100 space-y-4">
            <div>
              <h3 className="text-lg font-semibold text-slate-900">Group Guidance</h3>
              <p className="text-xs text-slate-500">Schedule a new group guidance program</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">Program Title</label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g., Mental Health Awareness"
                  className="w-full text-sm bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">Grade Level</label>
                <select
                  value={gradeLevel}
                  onChange={(e) => setGradeLevel(e.target.value)}
                  className="w-full text-sm bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 focus:outline-none"
                >
                  {GRADE_LEVELS.map((level) => (
                    <option key={level} value={level}>{level}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">Date</label>
                  <input
                    type="date"
                    required
                    value={date}
                    min={minSelectableDate}
                    onChange={(e) => {
                      if (e.target.value >= minSelectableDate) {
                        setDate(e.target.value);
                      }
                    }}
                    className="w-full text-sm bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 focus:outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">Time</label>
                  <input
                    type="time"
                    required
                    value={time}
                    onChange={(e) => setTime(e.target.value)}
                    className="w-full text-sm bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-xl transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-5 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 rounded-xl transition"
                >
                  {isSaving ? "Saving..." : "Schedule Program"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

/* Sub-component for Program Cards */
const ProgramCard = ({ title, grade, participants, date, status }: {
  title: string;
  grade: string;
  participants: number;
  date: string;
  status: "Completed" | "Upcoming";
}) => (
  <div className="p-5 border border-slate-100 rounded-xl hover:border-blue-100 hover:bg-blue-50/20 transition-all group">
    <div className="flex justify-between items-start mb-2">
      <h3 className="font-semibold text-slate-800">{title}</h3>
      <span className={`text-[11px] font-semibold px-3 py-1 rounded ${
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
    <button className="text-blue-600 bg-blue-50 px-3 py-1.5 rounded-md text-xs font-semibold hover:bg-blue-100 transition-colors">
      View Details
    </button>
  </div>
);

export default GroupGuidance;
