"use client";

import React, { useEffect, useState } from 'react';
import { Plus, Calendar, Clock, CheckCircle2, AlertCircle } from 'lucide-react';
import { getMyAppointments, getBookedTimesForDate, bookAppointment } from '../../action/student';
import BookAppointmentModal from '../../../components/BookAppointmentModal';
import type { Appointment as DbAppointment } from '../../../lib/generated';

const STUDENT_NAME = "Nhel Belarmino";
const PURPOSE_OPTIONS = ["Individual Counseling", "Academic Concern", "Career Guidance", "Compliance Interview"];

export const MyAppointments: React.FC = () => {
  const [appointments, setAppointments] = useState<DbAppointment[]>([]);
  const [isBookingOpen, setIsBookingOpen] = useState(false);

  const refresh = async () => {
    const data = await getMyAppointments(STUDENT_NAME);
    setAppointments(data);
  };

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const data = await getMyAppointments(STUDENT_NAME);
      if (!cancelled) setAppointments(data);
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const renderStatusBadge = (status: string) => {
    if (status === "CONFIRMED") {
      return (
        <span className="inline-flex items-center gap-1.5 bg-[#e8fbf0] text-[#00c853] text-xs font-bold px-3 py-1 rounded-full border border-[#bbf7d0]">
          <CheckCircle2 size={14} className="stroke-[2.5]" />
          Confirmed
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 bg-[#fff7ed] text-[#ea580c] text-xs font-bold px-3 py-1 rounded-full border border-[#fed7aa]">
        <AlertCircle size={14} className="stroke-[2.5]" />
        Pending
      </span>
    );
  };

  return (
    <div className="flex-1 bg-[#f8fafc] p-8 overflow-y-auto min-h-screen font-sans antialiased text-slate-800">

      {/* Top Header Row with Action Button */}
      <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold text-[#0d2343]">My Appointments</h1>
          <p className="text-sm text-slate-500 mt-1">
            Manage your guidance counseling appointments
          </p>
        </div>

        <button
          onClick={() => setIsBookingOpen(true)}
          className="inline-flex items-center justify-center gap-2 bg-[#1d63ff] hover:bg-blue-700 text-white font-semibold py-2.5 px-5 rounded-xl transition-colors text-sm shadow-sm shrink-0"
        >
          <Plus size={18} className="stroke-[2.5]" />
          <span>Book Appointment</span>
        </button>
      </header>

      {/* Appointment History Main Card Panel */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden max-w-6xl">
        <div className="px-6 py-5 border-b border-slate-100">
          <h2 className="font-bold text-slate-900 text-base">Appointment History</h2>
        </div>

        {/* List of Historical Rows */}
        {appointments.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <p className="text-sm font-semibold text-slate-500">No appointments yet</p>
            <p className="text-xs text-slate-400">Book an appointment with the guidance counselor to get started</p>
          </div>
        ) : (
          <div className="p-6 space-y-4">
            {appointments.map((apt) => (
              <div
                key={apt.id}
                className="bg-white rounded-xl p-5 border border-slate-200/80 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 transition-all hover:border-slate-300"
              >
                <div className="space-y-1">
                  <h3 className="font-bold text-slate-800 text-[16px] tracking-wide">
                    {apt.appointmentType || "General Consultation"}
                  </h3>
                  <p className="text-sm text-slate-500 font-medium">
                    Counselor: <span className="text-slate-700">Ralph Michael</span>
                  </p>

                  {/* Embedded Inline Schedule Stamps */}
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 pt-1.5 text-xs text-slate-500 font-medium">
                    <div className="flex items-center gap-1.5">
                      <Calendar size={14} className="text-slate-400" />
                      <span className="font-mono">{new Date(apt.date).toLocaleDateString()}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Clock size={14} className="text-slate-400" />
                      <span className="font-mono">{apt.time}</span>
                    </div>
                  </div>
                </div>

                {/* Status Badge Alignment Wrapper */}
                <div className="shrink-0 self-start sm:self-center">
                  {renderStatusBadge(apt.status)}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {isBookingOpen && (
        <BookAppointmentModal
          purposeOptions={PURPOSE_OPTIONS}
          getBookedTimesForDate={getBookedTimesForDate}
          bookAppointment={(data) => bookAppointment({ ...data, studentName: STUDENT_NAME })}
          onClose={() => setIsBookingOpen(false)}
          onBooked={refresh}
        />
      )}

    </div>
  );
};

export default MyAppointments;
