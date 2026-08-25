"use client";

import React, { useEffect, useState } from 'react';
import { Calendar as CalendarIcon, Clock, AlignLeft, Users, CheckCircle } from 'lucide-react';
import { getBookedTimesForDate, bookAppointment } from '../../action/parent';
import { STANDARD_DAY_HOURS } from '../../config/timeSlots';

function toDateString(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function getMinSelectableDate(): string {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  return toDateString(tomorrow);
}

export const ParentBookAppointment: React.FC = () => {
  const minSelectableDate = getMinSelectableDate();

  // State configurations matching parent metrics from image_85ac21.png
  const [selectedChild, setSelectedChild] = useState<string>('Nhel Belarmino');
  const [selectedDate, setSelectedDate] = useState<string>(minSelectableDate);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [purpose, setPurpose] = useState<string>('Academic Counseling');
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
    if (!selectedChild || !selectedDate || !selectedTime || !purpose) return;

    setIsSaving(true);
    setError(null);

    const result = await bookAppointment({
      dateString: selectedDate,
      timeSlot: selectedTime,
      appointmentType: purpose,
      notes: description,
      childName: selectedChild,
    });

    setIsSaving(false);

    if (result.success) {
      setIsSubmitted("Appointment request submitted successfully!");
      setDescription('');
      setSelectedTime(null);
      const taken = await getBookedTimesForDate(selectedDate);
      setBookedTimes(taken);
    } else {
      setError(result.error || "Failed to submit appointment request.");
    }
  };

  return (
    <div className="max-w-3xl mx-auto font-sans antialiased text-slate-800 space-y-6">
      
      {/* Page Context Branding Header */}
      <div>
        <h1 className="text-3xl font-bold text-blue-900 tracking-tight">Book Appointment</h1>
        <p className="text-sm text-slate-500 font-medium mt-1">
          Schedule a meeting with your child&apos;s guidance counselor
        </p>
      </div>

      {/* Main Container Panel Card */}
      <div className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden">
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          
          {/* 1. Select Child Field Segment (Parent Specific Attribute from image_85ac21.png) */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-700 flex items-center gap-2 uppercase tracking-wider">
              <Users size={14} className="text-slate-400" />
              Select Child <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <select
                value={selectedChild}
                onChange={(e) => setSelectedChild(e.target.value)}
                required
                className="w-full px-4 py-2.5 bg-white border border-slate-200 text-sm font-semibold rounded-xl text-slate-700 appearance-none focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
              >
                <option value="Nhel Belarmino">Nhel Belarmino</option>
                {/* Fallback option for multi-child parents */}
                <option value="Other Child">Other Student</option>
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-slate-400 text-xs">
                ▼
              </div>
            </div>
          </div>

          {/* 2. Date and Time Configuration Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-1">
            
            {/* Left: Interactive Date Field */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-700 flex items-center gap-2 uppercase tracking-wider">
                <CalendarIcon size={14} className="text-slate-400" />
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
            </div>

            {/* Right: Available Slots Tracker */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-700 flex items-center gap-2 uppercase tracking-wider">
                <Clock size={14} className="text-slate-400" />
                Available Time Slots <span className="text-red-500">*</span>
              </label>
              
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {STANDARD_DAY_HOURS.map((slot) => {
                  const isTaken = bookedTimes.includes(slot);
                  const isSelected = selectedTime === slot;
                  return (
                    <button
                      key={slot}
                      type="button"
                      disabled={isTaken}
                      onClick={() => setSelectedTime(slot)}
                      className={`py-2 px-3 border text-xs font-semibold font-mono rounded-xl transition-all text-center
                        ${isTaken
                          ? 'bg-slate-50 border-slate-100 text-slate-300 cursor-not-allowed line-through'
                          : isSelected
                          ? 'bg-[#1d63ff] border-[#1d63ff] text-white shadow-sm'
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
              <label className="text-xs font-bold text-slate-700 block uppercase tracking-wider">
                Purpose of Appointment <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <select
                  value={purpose}
                  onChange={(e) => setPurpose(e.target.value)}
                  required
                  className="w-full px-4 py-2.5 bg-white border border-slate-200 text-sm font-semibold rounded-xl text-slate-700 appearance-none focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                >
                  <option value="Academic Counseling">Academic Counseling</option>
                  <option value="Behavioral Concern">Behavioral Concern</option>
                  <option value="Career/College Planning">Career/College Planning</option>
                  <option value="General Consultation">General Consultation</option>
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-slate-400 text-xs">
                  ▼
                </div>
              </div>
            </div>

            {/* Optional Context Textarea Description */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-700 flex items-center gap-2 uppercase tracking-wider">
                <AlignLeft size={14} className="text-slate-400" />
                Description / Notes (Optional)
              </label>
              <textarea
                rows={4}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Briefly describe the reason for the meeting or any specific concerns you wish to discuss with the counselor..."
                className="w-full px-4 py-3 bg-white border border-slate-200 text-sm rounded-xl placeholder:text-slate-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all resize-none leading-relaxed"
              />
            </div>

          </div>

          {/* Feedback Success Notification */}
          {isSubmitted && (
            <div className="bg-[#e8fbf0] border border-[#bbf7d0] text-[#00c853] p-4 rounded-xl flex items-center gap-2.5 text-sm font-medium animate-fade-in">
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
              className="w-full sm:w-auto px-8 py-2.5 bg-[#f1f5f9] hover:bg-slate-200 text-slate-800 font-semibold rounded-xl text-sm transition-colors text-center"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="w-full sm:w-auto bg-[#1d63ff] hover:bg-blue-700 disabled:bg-blue-400 text-white font-semibold py-2.5 px-8 rounded-xl transition-colors text-sm shadow-sm text-center"
            >
              {isSaving ? "Booking..." : "Confirm Booking"}
            </button>
          </div>

        </form>
      </div>

    </div>
  );
};

export default ParentBookAppointment;
