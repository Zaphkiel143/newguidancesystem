"use client";

import React, { useEffect, useState } from "react";
import { X, CheckCircle2 } from "lucide-react";
import { DAY_SCHEDULE, firstBookableDate, isClosedDay } from "../app/config/timeSlots";
import { APPOINTMENT_PURPOSES, OTHER, withOther } from "../app/config/studentLevels";

interface BookingPayload {
  dateString: string;
  timeSlot: string;
  appointmentType: string;
  notes: string;
  phone?: string;
}

interface BookAppointmentModalProps {
  // Kept for older callers; every booking form now uses APPOINTMENT_PURPOSES.
  purposeOptions?: string[];
  getBookedTimesForDate: (dateString: string) => Promise<string[]>;
  bookAppointment: (data: BookingPayload) => Promise<{ success: boolean; error?: string }>;
  onClose: () => void;
  onBooked: () => void;
}

export default function BookAppointmentModal({
  getBookedTimesForDate,
  bookAppointment,
  onClose,
  onBooked,
}: BookAppointmentModalProps) {
  const minSelectableDate = firstBookableDate();
  const [date, setDate] = useState(() => firstBookableDate());
  const closed = isClosedDay(date);
  const [time, setTime] = useState<string | null>(null);
  const [purpose, setPurpose] = useState<string>(APPOINTMENT_PURPOSES[0]);
  const [purposeOther, setPurposeOther] = useState("");
  const [notes, setNotes] = useState("");
  const [phone, setPhone] = useState("");
  const [bookedTimes, setBookedTimes] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const taken = await getBookedTimesForDate(date);
      if (cancelled) return;
      setBookedTimes(taken);
      setTime((prev) => (prev && taken.includes(prev) ? null : prev));
    })();

    return () => {
      cancelled = true;
    };
  }, [date, getBookedTimesForDate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!time) {
      setError("Please select an available time slot.");
      return;
    }
    if (purpose === OTHER && !purposeOther.trim()) {
      setError("Tell us the purpose of the appointment.");
      return;
    }

    setIsSaving(true);
    setError(null);

    const result = await bookAppointment({
      dateString: date,
      timeSlot: time,
      appointmentType: withOther(purpose, purposeOther),
      notes,
      phone,
    });

    setIsSaving(false);

    if (result.success) {
      onBooked();
      onClose();
    } else {
      setError(result.error || "Failed to book appointment.");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white w-full max-w-lg max-h-[85vh] overflow-y-auto rounded-2xl shadow-xl border border-slate-100">
        <div className="flex items-start justify-between p-6 border-b border-slate-100 sticky top-0 bg-white rounded-t-2xl">
          <div>
            <h3 className="text-lg font-semibold text-slate-900">Book Appointment</h3>
            <p className="text-xs text-slate-500">Schedule a meeting with the guidance associate</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close" className="w-11 h-11 -m-2 grid place-items-center text-slate-500 hover:text-ink hover:bg-slate-100 rounded-full transition"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-700">Date</label>
            <input
              type="date"
              value={date}
              min={minSelectableDate}
              onChange={(e) => {
                if (e.target.value >= minSelectableDate) setDate(e.target.value);
              }}
              required
              className="w-full text-sm bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 focus:outline-none"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-700">Available Time Slots</label>
            {closed && <p role="note" className="text-xs text-orange-700">Consultations are Monday to Friday only. Pick a weekday.</p>}
            <div className="grid grid-cols-3 gap-2">
              {DAY_SCHEDULE.map((entry) => {
                if (entry.kind === "lunch") {
                  return (
                    <div key="lunch" role="note" aria-label={`Lunch break, ${entry.label}, no sessions`}
                      className="min-h-11 py-1.5 px-2 rounded-xl border border-dashed border-butter-300 bg-butter-50 text-center leading-tight">
                      <span className="block text-xs font-semibold text-slate-700">Lunch break</span>
                      <span className="block text-[11px] text-slate-500 font-mono">{entry.label}</span>
                    </div>
                  );
                }
                const slot = entry.time;
                const isTaken = closed || bookedTimes.includes(slot);
                const isSelected = time === slot;
                return (
                  <button
                    key={slot}
                    type="button"
                    disabled={isTaken}
                    aria-label={isTaken ? `${slot}, not available` : slot}
                    onClick={() => setTime(slot)}
                    className={`min-h-11 py-2 px-2 border text-xs font-semibold font-mono rounded-xl transition-all text-center ${
                      isTaken
                        ? "bg-slate-50 border-slate-100 text-slate-300 cursor-not-allowed line-through"
                        : isSelected
                        ? "bg-blue-600 border-blue-600 text-white shadow-sm"
                        : "bg-white border-slate-200 text-slate-700 hover:border-slate-300 hover:bg-slate-50"
                    }`}
                  >
                    {slot}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-1">
            <label htmlFor="book-purpose" className="text-xs font-semibold text-slate-700">Purpose of Appointment</label>
            <select
              id="book-purpose"
              value={purpose}
              onChange={(e) => setPurpose(e.target.value)}
              className="w-full text-sm bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 focus:outline-none"
            >
              {APPOINTMENT_PURPOSES.map((option) => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>
            {purpose === OTHER && (
              <input
                aria-label="Purpose of the appointment"
                placeholder="What is the appointment for?"
                value={purposeOther}
                maxLength={60}
                onChange={(e) => setPurposeOther(e.target.value)}
                className="w-full text-sm bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 focus:outline-none mt-2"
              />
            )}
          </div>

          <div className="space-y-1">
            <label htmlFor="book-phone" className="text-xs font-semibold text-slate-700">Mobile number (optional)</label>
            <input
              id="book-phone"
              type="tel"
              inputMode="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="0917 123 4567"
              className="w-full text-sm bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 focus:outline-none"
            />
            <p className="text-[11px] text-slate-500">So the guidance office can reach you quickly about this appointment.</p>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-700">Description / Notes (Optional)</label>
            <textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              maxLength={1000}
              placeholder="Briefly describe the reason for the meeting..."
              className="w-full text-sm bg-slate-50 border border-slate-200 rounded-xl p-3 focus:outline-none resize-none"
            />
          </div>

          {error && (
            <div className="bg-red-50 border border-red-100 text-red-600 p-3 rounded-xl text-xs font-medium">
              {error}
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-full transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-5 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 rounded-full transition flex items-center gap-2"
            >
              {isSaving ? "Booking..." : (
                <>
                  <CheckCircle2 size={16} />
                  Confirm Booking
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
