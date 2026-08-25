"use client";

import React, { useEffect, useState } from 'react';
import { Calendar, Clock, Plus, CheckCircle2, AlertCircle } from 'lucide-react';
import { getMyAppointments, getBookedTimesForDate, bookAppointment } from '../../action/faculty';
import BookAppointmentModal from '../../../components/BookAppointmentModal';
import type { Appointment as DbAppointment } from '../../../lib/generated';

const FACULTY_NAME = "Cho Sto Domingo";
const PURPOSE_OPTIONS = ["Consultation", "Student Discussion", "Academic Concern", "General Consultation"];

export const MyAppointmentsPage: React.FC = () => {
  const [appointments, setAppointments] = useState<DbAppointment[]>([]);
  const [isBookingOpen, setIsBookingOpen] = useState(false);

  const refresh = async () => {
    const data = await getMyAppointments(FACULTY_NAME);
    setAppointments(data);
  };

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const data = await getMyAppointments(FACULTY_NAME);
      if (!cancelled) setAppointments(data);
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="max-w-5xl mx-auto font-sans antialiased text-slate-800 space-y-6">

      {/* Upper Main Action Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-blue-900 tracking-tight">My Appointments</h1>
          <p className="text-sm text-slate-500 font-medium mt-1">
            Schedule and manage meetings with the guidance counselor
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsBookingOpen(true)}
          className="bg-[#1d63ff] hover:bg-blue-700 text-white font-bold py-2.5 px-5 rounded-xl transition-colors text-sm shadow-sm flex items-center justify-center gap-1.5 self-start sm:self-auto shrink-0"
        >
          <Plus size={16} className="stroke-[3]" />
          <span>Book Appointment</span>
        </button>
      </div>

      {/* Appointment History Base Layout Card */}
      <div className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden">

        {/* Panel Section Sub-header Title */}
        <div className="px-6 py-5 border-b border-slate-100 bg-slate-50/20">
          <h2 className="font-bold text-slate-900 text-lg tracking-tight">Appointment History</h2>
        </div>

        {appointments.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <p className="text-sm font-semibold text-slate-500">No appointments yet</p>
            <p className="text-xs text-slate-400">Book an appointment with the guidance counselor to get started</p>
          </div>
        ) : (
          <div className="p-6 space-y-4">
            {appointments.map((meeting) => (
              <div
                key={meeting.id}
                className="bg-white border border-slate-100 rounded-xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:shadow-xs transition-shadow"
              >

                {/* Left Column Description Context Info */}
                <div className="space-y-2">
                  <div className="space-y-0.5">
                    <h3 className="text-lg font-bold text-slate-900 tracking-tight">
                      {meeting.appointmentType || "General Consultation"}
                    </h3>
                    <p className="text-xs text-slate-500 font-medium flex items-center gap-1">
                      <span>Counselor:</span>
                      <span className="text-slate-700 font-semibold">Ralph Michael</span>
                    </p>
                  </div>

                  {/* Sub-row Meta Icons Trackers */}
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-slate-400 font-mono font-medium pt-0.5">
                    <div className="flex items-center gap-1.5">
                      <Calendar size={14} className="text-slate-400 shrink-0" />
                      <span className="text-slate-600">{new Date(meeting.date).toLocaleDateString()}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Clock size={14} className="text-slate-400 shrink-0" />
                      <span className="text-slate-600">{meeting.time}</span>
                    </div>
                  </div>
                </div>

                {/* Right Column Badge State Triggers */}
                <div className="self-start sm:self-auto">
                  <span className={`text-[11px] font-bold px-3 py-1 rounded-full flex items-center gap-1.5 font-sans tracking-wide border
                    ${meeting.status === 'CONFIRMED'
                      ? 'bg-[#e8fbf0] border-[#bbf7d0] text-[#00c853]'
                      : 'bg-slate-100 border-slate-200 text-slate-600'
                    }
                  `}>
                    {meeting.status === 'CONFIRMED' ? (
                      <CheckCircle2 size={13} className="stroke-[2.5]" />
                    ) : (
                      <AlertCircle size={13} className="stroke-[2.5]" />
                    )}
                    {meeting.status === 'CONFIRMED' ? 'Confirmed' : 'Pending'}
                  </span>
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
          bookAppointment={(data) => bookAppointment({ ...data, facultyName: FACULTY_NAME })}
          onClose={() => setIsBookingOpen(false)}
          onBooked={refresh}
        />
      )}

    </div>
  );
};

export default MyAppointmentsPage;
