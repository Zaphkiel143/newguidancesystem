"use client";

import React from 'react';
import { CheckCircle2, Circle } from 'lucide-react';

const CareerTracker = () => {
  const careerSteps = [
    "Self-Assessment",
    "Career Exploration",
    "Goal Setting",
    "Action Planning",
    "Implementation",
    "Evaluation & Adjustment"
  ];

  const students = [
    {
      name: "Nhel Belarmino",
      id: "2024-12345",
      grade: "Grade 12",
      percentage: 83,
      steps: [
        { status: 'complete', date: '2026-01-15' },
        { status: 'complete', date: '2026-02-10' },
        { status: 'complete', date: '2026-02-28' },
        { status: 'complete', date: '2026-03-15' },
        { status: 'complete', date: '2026-04-05' },
        { status: 'pending', date: null },
      ]
    },
    {
      name: "Dexter Glorioso",
      id: "2024-12346",
      grade: "Grade 12",
      percentage: 50,
      steps: [
        { status: 'complete', date: '2026-02-01' },
        { status: 'complete', date: '2026-03-01' },
        { status: 'complete', date: '2026-03-20' },
        { status: 'pending', date: null },
        { status: 'pending', date: null },
        { status: 'pending', date: null },
      ]
    }
  ];

  return (
    <div className="p-8 bg-slate-50 min-h-screen font-sans text-slate-900">
      {/* Header */}
      <header className="mb-8">
        <h1 className="text-2xl font-bold">Career Guidance Tracker</h1>
        <p className="text-slate-500 text-sm">Monitor SHS students' Career Planning Program progress</p>
      </header>

      {/* Top Legend/Steps Overview */}
      <div className="bg-white p-8 rounded-xl border border-slate-200 shadow-sm mb-8">
        <div className="flex justify-between items-start max-w-5xl mx-auto">
          {careerSteps.map((step, index) => (
            <div key={index} className="flex flex-col items-center text-center space-y-3 flex-1 px-2">
              <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-sm border border-blue-100">
                {index + 1}
              </div>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-tight leading-tight max-w-20">
                {step}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Student Progress List */}
      <div className="space-y-6">
        <div className="flex justify-between items-center px-2">
          <h2 className="text-lg font-bold">Student Progress</h2>
          <span className="text-xs font-semibold text-slate-400">342 Active Career Plans</span>
        </div>

        {students.map((student, idx) => (
          <div key={idx} className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
            {/* Student Header & Main Progress Bar */}
            <div className="flex justify-between items-end mb-4">
              <div>
                <h3 className="text-lg font-bold text-slate-800">{student.name}</h3>
                <p className="text-xs font-semibold text-slate-500">{student.id} • {student.grade}</p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-blue-600 leading-none">{student.percentage}%</p>
                <p className="text-[10px] font-bold text-slate-400 uppercase">Complete</p>
              </div>
            </div>

            {/* Thick Progress Bar */}
            <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden mb-8">
              <div 
                className="bg-blue-600 h-full rounded-full transition-all duration-700" 
                style={{ width: `${student.percentage}%` }}
              />
            </div>

            {/* Step Indicators */}
            <div className="flex justify-between items-start mb-8">
              {careerSteps.map((step, i) => (
                <div key={i} className="flex flex-col items-center flex-1">
                  {student.steps[i].status === 'complete' ? (
                    <CheckCircle2 className="text-green-500 mb-2" size={24} />
                  ) : (
                    <Circle className="text-slate-200 mb-2" size={24} />
                  )}
                  <p className="text-[10px] font-bold text-slate-500 text-center uppercase tracking-tight">
                    {step}
                  </p>
                  <p className="text-[9px] text-slate-400 mt-0.5">
                    {student.steps[i].date || '—'}
                  </p>
                </div>
              ))}
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <button className="px-4 py-1.5 bg-blue-50 text-blue-600 text-xs font-bold rounded-md border border-blue-100 hover:bg-blue-100 transition-colors">
                Update Progress
              </button>
              <button className="px-4 py-1.5 bg-slate-50 text-slate-600 text-xs font-bold rounded-md border border-slate-100 hover:bg-slate-100 transition-colors">
                View Full Plan
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default CareerTracker;