"use client";

import React, { useState } from "react";
import { toggleBlockTimeSlot } from "../../action/counselor";
import { STANDARD_DAY_HOURS } from "../../config/timeSlots";

interface ModalProps {
  date: string;
  onClose: () => void;
}

export default function BlockTimeModal({ date, onClose }: ModalProps) {
  const [togglingHours, setTogglingHours] = useState<string[]>([]);

  const handleTimeToggle = async (time: string) => {
  setTogglingHours(prev => [...prev, time]);

  try {
    // Call your actual block action
    const res = await toggleBlockTimeSlot(date, time);

    if (res?.success) {
      onClose();
    } else {
      alert(`Database Error: ${res?.error || "Failed to update slot"}`);
    }
  } catch (err) {
    console.error("Frontend error:", err);
  } finally {
    setTogglingHours(prev => prev.filter(h => h !== time));
  }
};

 
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Blurry background backdrop overlay */}
      <div 
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-md transition-opacity" 
        onClick={onClose}
      />

      {/* Floating Dialog Window Box */}
      <div className="relative bg-white/90 backdrop-blur-lg border border-slate-200/80 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden transform transition-all p-6">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h3 className="text-lg font-bold text-slate-900">Manage Availability</h3>
            <p className="text-xs text-slate-500">Block or release custom slots for {date}</p>
          </div>
          <button 
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition"
          >
            ✕
          </button>
        </div>

        <hr className="border-slate-100 my-3" />

        <p className="text-xs text-slate-500 font-medium mb-3 uppercase tracking-wider">Select Hourly Blocks</p>
        <div className="grid grid-cols-2 gap-2">
          {STANDARD_DAY_HOURS.map((time) => {
            const isLoading = togglingHours.includes(time);
            return (
              <button
                key={time}
                disabled={isLoading}
                onClick={() => handleTimeToggle(time)}
                className={`py-2.5 px-4 rounded-xl text-xs font-semibold transition text-left flex justify-between items-center ${
                  isLoading 
                    ? "opacity-50 cursor-wait bg-slate-100 text-slate-400"
                    : "bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200/60"
                }`}
              >
                <span>{time}</span>
                {isLoading && <span className="animate-pulse text-[10px]">updating...</span>}
              </button>
            );
          })}
        </div>

        <div className="mt-6 flex justify-end">
          <button
            onClick={onClose}
            className="bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs px-5 py-2.5 rounded-xl shadow-sm transition"
          >
            Save & Finish
          </button>
        </div>
      </div>
    </div>
  );
}