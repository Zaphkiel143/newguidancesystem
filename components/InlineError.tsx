"use client";

import React from "react";
import { X } from "lucide-react";

interface InlineErrorProps {
  message: string | null;
  onDismiss?: () => void;
  className?: string;
}

// Error shown next to the control that failed, instead of a window.alert()
export default function InlineError({ message, onDismiss, className = "" }: InlineErrorProps) {
  if (!message) return null;

  return (
    <div
      role="alert"
      className={`flex items-start gap-2 border-l-2 border-red-500 bg-red-50 pl-3 pr-1 py-1.5 text-[13px] text-red-700 ${className}`}
    >
      <p className="flex-1 py-1">{message}</p>
      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Dismiss error"
          className="w-8 h-8 shrink-0 grid place-items-center rounded-full text-red-700/70 hover:text-red-700 hover:bg-red-100 transition-colors"
        >
          <X size={14} />
        </button>
      )}
    </div>
  );
}
