"use client";

import React, { useEffect, useState } from "react";
import { X, CheckCircle2 } from "lucide-react";
import { STANDARD_DAY_HOURS } from "../app/config/timeSlots";

interface BookingPayload {
  dateString: string;
  timeSlot: string;
  appointmentType: string;
  notes: string;
}

interface BookAppointmentModalProps {
  purposeOptions: string[];
  getBookedTimesForDate: (dateString: string) => Promise<string[]>;
  bookAppointment: (data: BookingPayload) => Promise<{ success: boolean; error?: string }>;
  onClose: () => void;
  onBooked: () => void;
}

function toDateString(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function getMinSelectableDate(): string {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  return toDateString(tomorrow);
}

export default function BookAppointmentModal({
  purposeOptions,
  getBookedTimesForDate,
  bookAppointment,
  onClose,
  onBooked,
}: BookAppointmentModalProps) {
  const minSelectableDate = getMinSelectableDate();
  const [date, setDate] = useState(minSelectableDate);
  const [time, setTime] = useState<string | null>(null);
  const [purpose, setPurpose] = useState(purposeOptions[0]);
  const [notes, setNotes] = useState("");
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

    setIsSaving(true);
    setError(null);

    const result = await bookAppointment({
      dateString: date,
      timeSlot: time,
      appointmentType: purpose,
      notes,
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
            <p className="text-xs text-slate-500">Schedule a meeting with the guidance counselor</p>
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
            <div className="grid grid-cols-3 gap-2">
              {STANDARD_DAY_HOURS.map((slot) => {
                const isTaken = bookedTimes.includes(slot);
                const isSelected = time === slot;
                return (
                  <button
                    key={slot}
                    type="button"
                    disabled={isTaken}
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
            <label className="text-xs font-semibold text-slate-700">Purpose of Appointment</label>
            <select
              value={purpose}
              onChange={(e) => setPurpose(e.target.value)}
              className="w-full text-sm bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 focus:outline-none"
            >
              {purposeOptions.map((option) => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-700">Description / Notes (Optional)</label>
            <textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
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
