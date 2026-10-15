"use client";

import { useState, useEffect } from "react";
import { saveAppointmentDetails, getAppointmentsByDate, getDateStats, updateAppointmentStatus } from "../../action/counselor";
import type { Appointment as DbAppointment } from "../../../lib/generated";
import { STANDARD_DAY_HOURS, parseTimeToMinutes, formatMinutesToTime } from "../../config/timeSlots";
import InlineError from "../../../components/InlineError";

const MAX_BLOCK_MINUTES = 60;

interface Appointment {
  id: string;
  studentName: string;
  appointmentType: string;
  time: string;
  date: string;
  status: "CONFIRMED" | "PENDING" | "CANCELLED";
  notes?: string;
  requirements?: string[];
}

function toAppointment(a: DbAppointment, dateString: string): Appointment {
  return {
    id: a.id,
    studentName: a.studentName || "Unnamed Student",
    appointmentType: a.appointmentType || "",
    time: a.time,
    date: dateString,
    status: a.status as "CONFIRMED" | "PENDING" | "CANCELLED",
    notes: a.notes || "",
    requirements: a.requirements || [],
  };
}

// Local (not UTC) YYYY-MM-DD — avoids the date input rolling back a day near midnight in timezones behind UTC
function toDateString(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function getMinSelectableDate(): string {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  return toDateString(tomorrow);
}

export default function AppointmentScheduling() {
  const minSelectableDate = getMinSelectableDate();
  const [selectedDate, setSelectedDate] = useState<string>(minSelectableDate);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [stats, setStats] = useState({ available: 12, confirmed: 0, pending: 0 });

  // Modal State Management
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  const [appointmentType, setAppointmentType] = useState("");
  const [notes, setNotes] = useState("");
  const [requirements, setRequirements] = useState<string[]>([]);
  const [newRequirementInput, setNewRequirementInput] = useState("");
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [cancelingId, setCancelingId] = useState<string | null>(null);
  // Errors are shown where they happened: on the appointment card, or in the edit form.
  const [rowError, setRowError] = useState<{ id: string; message: string } | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [editDate, setEditDate] = useState("");
  const [editTime, setEditTime] = useState("");

  // Block Time Slot scheduling — end time is capped at MAX_BLOCK_MINUTES after start
  const [blockStartTime, setBlockStartTime] = useState<string>(STANDARD_DAY_HOURS[0]);
  const [blockEndTime, setBlockEndTime] = useState<string>(
    formatMinutesToTime(parseTimeToMinutes(STANDARD_DAY_HOURS[0]) + 30)
  );
  const isBlockMode = selectedAppointment?.id.startsWith("block-") ?? false;

  // Only offer end times within (start, start + MAX_BLOCK_MINUTES]
  const blockEndTimeOptions = Array.from(
    { length: MAX_BLOCK_MINUTES / 30 },
    (_, i) => formatMinutesToTime(parseTimeToMinutes(blockStartTime) + (i + 1) * 30)
  );

  const applyBlockTimeRange = (startTime: string, endTime: string) => {
    setSelectedAppointment((prev) => (prev ? { ...prev, time: `${startTime} - ${endTime}` } : prev));
  };

  const handleBlockStartTimeChange = (value: string) => {
    setBlockStartTime(value);
    const defaultEndTime = formatMinutesToTime(parseTimeToMinutes(value) + 30);
    setBlockEndTime(defaultEndTime);
    applyBlockTimeRange(value, defaultEndTime);
  };

  const handleBlockEndTimeChange = (value: string) => {
    setBlockEndTime(value);
    applyBlockTimeRange(blockStartTime, value);
  };

  const refreshData = async (dateString: string) => {
    const [freshStats, freshAppointments] = await Promise.all([
      getDateStats(dateString),
      getAppointmentsByDate(dateString),
    ]);
    setStats(freshStats);
    setAppointments(freshAppointments.map((a) => toAppointment(a, dateString)));
  };

  // Load overview stats and appointment details for the selected date from the database
  useEffect(() => {
    let cancelled = false;

    (async () => {
      const [freshStats, freshAppointments] = await Promise.all([
        getDateStats(selectedDate),
        getAppointmentsByDate(selectedDate),
      ]);
      if (cancelled) return;

      setStats(freshStats);
      setAppointments(freshAppointments.map((a) => toAppointment(a, selectedDate)));
    })();

    return () => {
      cancelled = true;
    };
  }, [selectedDate]);

  const handleStartSession = async (appointment: Appointment) => {
    setConfirmingId(appointment.id);
    setRowError(null);
    const result = await updateAppointmentStatus(appointment.id, "CONFIRMED");
    setConfirmingId(null);

    if (result.success) {
      await refreshData(selectedDate);
    } else {
      setRowError({ id: appointment.id, message: "Couldn't start this session. Try again." });
    }
  };

  // NEW: Handler to open the modal specifically for blocking out a schedule slot
  const handleBlockTimeSlot = () => {
    const startTime = STANDARD_DAY_HOURS[0];
    const endTime = formatMinutesToTime(parseTimeToMinutes(startTime) + 30);

    setBlockStartTime(startTime);
    setBlockEndTime(endTime);
    setSelectedAppointment({
      id: `block-${Date.now()}`,
      studentName: "ADMINISTRATIVE BLOCK",
      appointmentType: "Unavailable / Reserved Slot",
      time: `${startTime} - ${endTime}`,
      date: selectedDate,
      status: "CONFIRMED"
    });
    setAppointmentType("Unavailable / Reserved Slot");
    setNotes("Time slot manually blocked by counselor.");
    setFormError(null);
    setRequirements([]);
    setIsFormOpen(true);
  };

  const handleOpenConfigurator = (appointment: Appointment) => {
    setSelectedAppointment(appointment);
    setAppointmentType(appointment.appointmentType || "Individual Counseling");
    setNotes(appointment.notes || "");
    setRequirements(appointment.requirements || []);
    setFormError(null);
    setEditDate(appointment.date);
    setEditTime(appointment.time);
    setIsFormOpen(true);
  };

  const handleCancelAppointment = async (appointment: Appointment) => {
    if (!window.confirm(`Cancel the appointment for ${appointment.studentName}?`)) return;

    setCancelingId(appointment.id);
    setRowError(null);
    const result = await updateAppointmentStatus(appointment.id, "CANCELLED");
    setCancelingId(null);

    if (result.success) {
      await refreshData(selectedDate);
    } else {
      setRowError({ id: appointment.id, message: "Couldn't cancel this appointment. Try again." });
    }
  };

  const handleAddRequirement = () => {
    if (newRequirementInput.trim()) {
      setRequirements([...requirements, newRequirementInput.trim()]);
      setNewRequirementInput("");
    }
  };

  const handleRemoveRequirement = (index: number) => {
    setRequirements(requirements.filter((_, i) => i !== index));
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setFormError(null);

    // Blocks use a fake client-side id ("block-<timestamp>") that doesn't exist
    // in the database yet — sending it as appointmentId would make the server
    // try to UPDATE a row that was never created, which always fails silently.
    const isNewBlock = selectedAppointment?.id.startsWith("block-") ?? false;

    const result = await saveAppointmentDetails({
      appointmentId: isNewBlock ? undefined : selectedAppointment?.id,
      dateString: isBlockMode ? selectedDate : editDate,
      timeSlot: isBlockMode ? (selectedAppointment?.time || "") : editTime,
      appointmentType,
      notes,
      requirements,
    });

    setIsSaving(false);
    if (result.success) {
      setIsFormOpen(false);

      // Re-fetch from the database instead of patching local state — the local
      // copy may still be holding the fake "block-<timestamp>" id that only
      // ever existed on the client, never in the database.
      await refreshData(selectedDate);

      setAppointmentType("");
      setNotes("");
      setRequirements([]);
    } else {
      setFormError(`Couldn't save: ${result.error || "unknown error"}.`);
    }
  };

  return (
    <div className="px-5 sm:px-8 lg:px-12 pt-8 lg:pt-12 pb-16 max-w-7xl text-slate-900">
      <div className="mb-6">
        <h1 className="page-title">Appointment Scheduling</h1>
        <p className="text-slate-500 text-sm">Manage student appointments and counseling sessions</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* LEFT COLUMN PANEL */}
        <div className="lg:col-span-4 bg-white border border-slate-100 rounded-2xl p-5 shadow-sm space-y-5">
          <div>
            <label className="block text-sm font-semibold text-slate-800 mb-2">Calendar</label>
            <input
              type="date"
              value={selectedDate}
              min={minSelectableDate}
              onChange={(e) => {
                if (e.target.value >= minSelectableDate) {
                  setSelectedDate(e.target.value);
                }
              }}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-700 font-medium focus:outline-none"
            />
          </div>

          <dl className="divide-y divide-rule border-y border-rule text-[14px]">
            <div className="flex items-baseline justify-between py-3">
              <dt className="text-slate-600">Open slots</dt>
              <dd className="font-serif text-2xl text-ink tabular">{stats.available}</dd>
            </div>
            <div className="flex items-baseline justify-between py-3">
              <dt className="text-slate-600">Confirmed</dt>
              <dd className="font-serif text-2xl text-emerald-700 tabular">{stats.confirmed}</dd>
            </div>
            <div className="flex items-baseline justify-between py-3">
              <dt className="text-slate-600">Pending</dt>
              <dd className="font-serif text-2xl text-orange-700 tabular">{stats.pending}</dd>
            </div>
          </dl>

          {/* Connected Button click target */}
          <button 
            onClick={handleBlockTimeSlot}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-xl shadow-sm transition text-sm text-center"
          >
            Block Time Slot
          </button>
        </div>

        {/* RIGHT COLUMN PANEL */}
        <div className="lg:col-span-8 bg-white border border-slate-100 rounded-2xl p-6 shadow-sm space-y-6 min-h-[460px] flex flex-col justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-900 mb-4">
              Appointments for Tuesday, April 28, 2026
            </h2>

            {appointments.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 border-2 border-dashed border-slate-100 rounded-2xl bg-slate-50/40">
                <p className="text-sm font-semibold text-slate-500">No active sessions scheduled yet</p>
                <p className="text-xs text-slate-500">Newly placed student appointment records will render here automatically</p>
              </div>
            ) : (
              <div className="space-y-4">
                {appointments.map((appointment) => (
                  <div 
                    key={appointment.id} 
                    className="border border-slate-100 bg-white rounded-2xl p-5 shadow-sm space-y-4 relative"
                  >
                    <div className="absolute top-5 right-5">
                      {appointment.status === "CONFIRMED" ? (
                        <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-600 font-semibold text-[12px] px-2 py-0.5 rounded border border-emerald-100">
                          Confirmed
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-600 font-semibold text-[12px] px-2 py-0.5 rounded border border-amber-100">
                          Pending
                        </span>
                      )}
                    </div>

                    <div className="flex items-start gap-4">
                      <div className="w-10 h-10 bg-slate-200 text-slate-600 rounded-md grid place-items-center text-xs font-semibold">{appointment.studentName?.split(" ").map((p) => p[0]).slice(0, 2).join("")}</div>
                      <div>
                        <h3 className="font-semibold text-slate-900 text-base">{appointment.studentName}</h3>
                        <p className="text-slate-500 text-sm">{appointment.appointmentType}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-6 text-slate-500 text-sm">
                      <span className="flex items-center gap-1.5 font-medium text-slate-700">{appointment.time}</span>
                      <span className="flex items-center gap-1.5 font-medium text-slate-700">{appointment.date}</span>
                    </div>

                    <div className="flex items-center gap-2 pt-2">
                      {appointment.status === "PENDING" ? (
                        <button
                          onClick={() => handleStartSession(appointment)}
                          disabled={confirmingId === appointment.id}
                          className="bg-emerald-50 hover:bg-emerald-100 text-emerald-600 font-semibold text-xs px-4 py-2 rounded-xl transition disabled:opacity-50"
                        >
                          {confirmingId === appointment.id ? "Starting..." : "Start Session"}
                        </button>
                      ) : (
                        <button
                          onClick={() => handleOpenConfigurator(appointment)}
                          className="bg-blue-50 hover:bg-blue-100 text-blue-600 font-semibold text-xs px-4 py-2 rounded-xl transition"
                        >
                          Manage
                        </button>
                      )}
                      <button
                        onClick={() => handleOpenConfigurator(appointment)}
                        className="bg-slate-50 hover:bg-slate-100 text-slate-600 font-semibold text-xs px-4 py-2 rounded-xl transition"
                      >
                        Reschedule
                      </button>
                      <button
                        onClick={() => handleCancelAppointment(appointment)}
                        disabled={cancelingId === appointment.id}
                        className="bg-red-50 hover:bg-red-100 text-red-600 font-semibold text-xs px-4 py-2 rounded-xl transition disabled:opacity-50"
                      >
                        {cancelingId === appointment.id ? "Canceling..." : "Cancel"}
                      </button>
                    </div>
                    <InlineError
                      message={rowError?.id === appointment.id ? rowError.message : null}
                      onDismiss={() => setRowError(null)}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* MODAL WINDOW DRAWER */}
      {isFormOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white w-full max-w-lg p-6 rounded-2xl shadow-xl border border-slate-100 space-y-4">
            <div>
              <h3 className="text-lg font-semibold text-slate-900">Configure Appointment Parameters</h3>
              <p className="text-xs text-slate-500">Target Session: {selectedAppointment?.studentName}</p>
            </div>

            <form onSubmit={handleFormSubmit} className="space-y-4">
              {isBlockMode && (
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-700">Start Time</label>
                    <select
                      value={blockStartTime}
                      onChange={(e) => handleBlockStartTimeChange(e.target.value)}
                      className="w-full text-sm bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 focus:outline-none"
                    >
                      {STANDARD_DAY_HOURS.map((slot) => (
                        <option key={slot} value={slot}>{slot}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-700">End Time</label>
                    <select
                      value={blockEndTime}
                      onChange={(e) => handleBlockEndTimeChange(e.target.value)}
                      className="w-full text-sm bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 focus:outline-none"
                    >
                      {blockEndTimeOptions.map((slot) => (
                        <option key={slot} value={slot}>{slot}</option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              {!isBlockMode && (
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-700">Date</label>
                    <input
                      type="date"
                      value={editDate}
                      min={minSelectableDate}
                      onChange={(e) => {
                        if (e.target.value >= minSelectableDate) setEditDate(e.target.value);
                      }}
                      className="w-full text-sm bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 focus:outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-700">Time</label>
                    <select
                      value={editTime}
                      onChange={(e) => setEditTime(e.target.value)}
                      className="w-full text-sm bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 focus:outline-none"
                    >
                      {STANDARD_DAY_HOURS.map((slot) => (
                        <option key={slot} value={slot}>{slot}</option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">Classification Type</label>
                <select
                  value={appointmentType}
                  onChange={(e) => setAppointmentType(e.target.value)}
                  className="w-full text-sm bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 focus:outline-none"
                >
                  <option value="Individual Counseling">Individual Counseling</option>
                  <option value="Academic Concern">Academic Concern</option>
                  <option value="Career Guidance">Career Guidance</option>
                  <option value="Compliance Interview">Compliance Interview</option>
                  <option value="Unavailable / Reserved Slot">Unavailable / Reserved Slot</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">Prescribed Checklist Requirements</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newRequirementInput}
                    onChange={(e) => setNewRequirementInput(e.target.value)}
                    placeholder="e.g., Parent Consent form, Good Moral certificate..."
                    className="flex-1 text-sm bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={handleAddRequirement}
                    className="bg-slate-900 text-white font-medium text-xs px-4 rounded-xl hover:bg-slate-800 transition"
                  >
                    Add
                  </button>
                </div>
                
                {requirements.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-2 max-h-24 overflow-y-auto p-1 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                    {requirements.map((req, idx) => (
                      <span key={idx} className="inline-flex items-center gap-1 bg-white text-xs text-slate-700 font-medium px-2.5 py-1 rounded-lg border border-slate-200 shadow-sm">
                        {req}
                        <button type="button" onClick={() => handleRemoveRequirement(idx)} className="text-red-500 font-semibold hover:text-red-700">×</button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">Administrative Notes / Internal Changes</label>
                <textarea
                  rows={3}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Insert custom tracking criteria or summary details here..."
                  className="w-full text-sm bg-slate-50 border border-slate-200 rounded-xl p-3 focus:outline-none resize-none"
                />
              </div>

              <InlineError message={formError} onDismiss={() => setFormError(null)} />

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-xl transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-5 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 rounded-xl transition flex items-center gap-2"
                >
                  {isSaving ? "Saving..." : "Save Specifications"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}