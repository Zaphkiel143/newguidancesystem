"use client";

import React, { useCallback, useEffect, useState } from 'react';
import { Calendar as CalendarIcon, Clock, AlignLeft, Users, CheckCircle } from 'lucide-react';
import { getBookedTimesForDate, bookAppointment, getMyBookings } from '../../action/parent';
import { firstBookableDate, isClosedDay, isFullyBooked } from '../../config/timeSlots';
import { DAY_SCHEDULE } from '../../config/timeSlots';
import { useMyChildren } from '../useMyChildren';
import { useOptionList } from '../../../components/useOptionList';
import { optionValue } from '../../../lib/optionListDefaults';
import FullyBookedNotice from '../../../components/FullyBookedNotice';

// "Who is this for?" value meaning the parent themself.
const MYSELF = '__myself__';

type Booking = Awaited<ReturnType<typeof getMyBookings>>[number];
const STATUS: Record<string, { label: string; className: string }> = {
  PENDING: { label: 'Waiting for confirmation', className: 'text-orange-700 bg-orange-50' },
  CONFIRMED: { label: 'Confirmed', className: 'text-emerald-700 bg-emerald-50' },
  COMPLETED: { label: 'Done', className: 'text-slate-600 bg-slate-100' },
  CANCELLED: { label: 'Cancelled', className: 'text-red-700 bg-red-50' },
};

const ParentBookAppointment: React.FC = () => {
  const [categories] = useOptionList("appointmentCategories");
  const [reasons] = useOptionList("appointmentReasons");
  const minSelectableDate = firstBookableDate();

  // A linked child, or MYSELF. Parents with no linked child yet can still book for themselves.
  const children = useMyChildren();
  const [chosenChild, setChosenChild] = useState<string>('');
  const selectedChild = chosenChild || children?.[0]?.name || (children ? MYSELF : '');
  const [bookings, setBookings] = useState<Booking[] | null>(null);
  const loadBookings = useCallback(async () => setBookings(await getMyBookings()), []);
  useEffect(() => {
    let cancelled = false;
    getMyBookings().then((b) => !cancelled && setBookings(b));
    return () => {
      cancelled = true;
    };
  }, []);
  const [selectedDate, setSelectedDate] = useState<string>(() => firstBookableDate());
  const closed = isClosedDay(selectedDate);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [category, setCategory] = useState<string>('');
  const [reason, setReason] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [isSubmitted, setIsSubmitted] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [bookedTimes, setBookedTimes] = useState<string[]>([]);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const taken = await getBookedTimesForDate(selectedDate);
      if (cancelled) return;
      setBookedTimes(taken);
      setSelectedTime((prev) => (prev && taken.includes(prev) ? null : prev));
    })();

    return () => {
      cancelled = true;
    };
  }, [selectedDate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedChild || !selectedDate || !selectedTime || !category || !reason) {
      setError("Please choose the purpose of the appointment.");
      return;
    }

    setIsSaving(true);
    setError(null);

    const result = await bookAppointment({
      dateString: selectedDate,
      timeSlot: selectedTime,
      appointmentType: reason,
      notes: description,
      childName: selectedChild === MYSELF ? '' : selectedChild,
      forSelf: selectedChild === MYSELF,
    });

    setIsSaving(false);

    if (result.success) {
      setIsSubmitted("Appointment request sent. The guidance office will confirm it, and you'll get a notification.");
      setDescription('');
      setCategory('');
      setReason('');
      setSelectedTime(null);
      const taken = await getBookedTimesForDate(selectedDate);
      setBookedTimes(taken);
      await loadBookings();
    } else {
      setError(result.error || "Failed to submit appointment request.");
    }
  };

  return (
    <div className="px-5 sm:px-8 lg:px-12 pt-8 lg:pt-12 pb-16 max-w-3xl font-sans antialiased text-slate-800 space-y-6">
      
      {/* Page Context Branding Header */}
      <div>
        <h1 className="page-title">Book Appointment</h1>
      </div>

      {/* Main Container Panel Card */}
      <div className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden">
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          
          {/* 1. Select Child Field Segment (Parent Specific Attribute from image_85ac21.png) */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-700 flex items-center gap-2">
              <Users size={14} className="text-slate-500" />
              Who is this appointment for? <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <select
                value={selectedChild}
                onChange={(e) => setChosenChild(e.target.value)}
                required
                aria-describedby="who-for-help"
                className="w-full px-4 py-2.5 bg-white border border-slate-200 text-sm font-semibold rounded-xl text-slate-700 appearance-none focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
              >
                {children?.map((c) => (
                  <option key={c.name} value={c.name}>{c.name} · {c.gradeSection}</option>
                ))}
                <option value={MYSELF}>Myself (parent / guardian)</option>
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-slate-500 text-xs">
                ▼
              </div>
            </div>
            <p id="who-for-help" className="text-xs text-slate-500">
              Pick &ldquo;Myself&rdquo; if you&apos;d like to talk to the guidance associate about a concern of your own.
            </p>
          </div>

          {/* 2. Date and Time Configuration Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-1">
            
            {/* Left: Interactive Date Field */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-700 flex items-center gap-2">
                <CalendarIcon size={14} className="text-slate-500" />
                Select Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => {
                  if (e.target.value >= minSelectableDate) setSelectedDate(e.target.value);
                }}
                min={minSelectableDate}
                required
                className="w-full px-4 py-2.5 bg-white border border-slate-200 text-sm font-medium rounded-xl text-slate-800 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all font-mono"
              />
              {!closed && isFullyBooked(bookedTimes) && <FullyBookedNotice onRefresh={async () => setBookedTimes(await getBookedTimesForDate(selectedDate))} />}
            </div>

            {/* Right: Available Slots Tracker */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-700 flex items-center gap-2">
                <Clock size={14} className="text-slate-500" />
                Available Time Slots <span className="text-red-500">*</span>
              </label>
              {closed && <p role="note" className="text-xs text-orange-700">Consultations are Monday to Friday only. Pick a weekday.</p>}
              
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
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
                  const isSelected = selectedTime === slot;
                  return (
                    <button
                      key={slot}
                      type="button"
                      disabled={isTaken}
                      onClick={() => setSelectedTime(slot)}
                      className={`min-h-11 py-2 px-3 border text-xs font-semibold font-mono rounded-full transition-all text-center
                        ${isTaken
                          ? 'bg-slate-50 border-slate-100 text-slate-300 cursor-not-allowed line-through'
                          : isSelected
                          ? 'bg-blue-600 border-blue-600 text-white shadow-sm'
                          : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300 hover:bg-slate-50/50'
                        }
                      `}
                    >
                      {slot}
                    </button>
                  );
                })}
              </div>
            </div>

          </div>

          {/* 3. Lower Stack: Purpose & Explanatory Context Field */}
          <div className="space-y-5 pt-3 border-t border-slate-50">
            
            {/* Meeting Purpose Selection */}
            <div className="space-y-2">
              <label htmlFor="parent-purpose" className="text-xs font-semibold text-slate-700 block">
                Purpose of Appointment <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <select
                  id="parent-purpose"
                  value={category}
                  onChange={(e) => {
                    setCategory(e.target.value);
                    setReason('');
                  }}
                  required
                  className="w-full px-4 py-2.5 bg-white border border-slate-200 text-sm font-semibold rounded-xl text-slate-700 appearance-none focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                >
                  <option value="" disabled>Select...</option>
                  {categories.map((c) => <option key={c.id} value={optionValue(c)}>{c.label}</option>)}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-slate-500 text-xs">
                  ▼
                </div>
              </div>
              {category && (
                <div className="relative mt-2">
                  <select
                    id="parent-reason"
                    aria-label="Reason for the appointment"
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    required
                    className="w-full px-4 py-2.5 bg-white border border-slate-200 text-sm font-semibold rounded-xl text-slate-700 appearance-none focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                  >
                    <option value="" disabled>Select...</option>
                    {reasons.filter((r) => r.parentItemKey === category).map((r) => <option key={r.id} value={optionValue(r)}>{r.label}</option>)}
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-slate-500 text-xs">
                    ▼
                  </div>
                </div>
              )}
            </div>

            {/* Optional Context Textarea Description */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-700 flex items-center gap-2">
                <AlignLeft size={14} className="text-slate-500" />
                Description / Notes (Optional)
              </label>
              <textarea
                rows={4}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                maxLength={1000}
                placeholder="Briefly describe the reason for the meeting or any specific concerns you wish to discuss with the associate..."
                className="w-full px-4 py-3 bg-white border border-slate-200 text-sm rounded-xl placeholder:text-slate-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all resize-none leading-relaxed"
              />
            </div>

          </div>

          {/* Feedback Success Notification */}
          {isSubmitted && (
            <div className="bg-emerald-50 border border-emerald-200 text-emerald-600 p-4 rounded-xl flex items-center gap-2.5 text-sm font-medium animate-fade-in">
              <CheckCircle size={16} className="stroke-[2.5]" />
              <span>{isSubmitted}</span>
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-100 text-red-600 p-4 rounded-xl text-sm font-medium">
              {error}
            </div>
          )}

          {/* 4. Action Buttons Footer Controls */}
          <div className="flex flex-col sm:flex-row items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              className="w-full sm:w-auto px-8 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold rounded-full text-sm transition-colors text-center"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-semibold py-2.5 px-8 rounded-full transition-colors text-sm shadow-sm text-center"
            >
              {isSaving ? "Booking..." : "Confirm Booking"}
            </button>
          </div>

        </form>
      </div>

      <section aria-labelledby="my-bookings">
        <h2 id="my-bookings" className="font-serif text-[20px] text-ink mb-3">Your appointment requests</h2>
        {bookings === null ? null : bookings.length === 0 ? (
          <p className="border-t border-rule pt-4 text-sm text-slate-500">Nothing booked yet.</p>
        ) : (
          <ul className="divide-y divide-rule border-t border-rule">
            {bookings.map((b) => (
              <li key={b.id} className="py-3 flex flex-wrap items-center justify-between gap-x-4 gap-y-1 text-sm">
                <span className="min-w-0">
                  <span className="block text-ink font-medium">{b.appointmentType || 'General consultation'}</span>
                  <span className="block text-[13px] text-slate-500">
                    For {b.studentName} ·{' '}
                    {new Date(b.date).toLocaleDateString('en-PH', { timeZone: 'UTC', weekday: 'short', month: 'short', day: 'numeric' })}, {b.time}
                  </span>
                </span>
                <span className={`shrink-0 text-[11px] font-medium px-2 py-0.5 rounded-full ${STATUS[b.status]?.className ?? ''}`}>
                  {STATUS[b.status]?.label ?? b.status}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
};

export default ParentBookAppointment;
