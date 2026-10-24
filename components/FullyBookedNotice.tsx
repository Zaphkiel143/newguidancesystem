"use client";

import React, { useState } from "react";
import { CalendarX, Loader2, RefreshCw } from "lucide-react";

// Shown under the date picker when every time on that day is taken, with a
// refresh in case someone cancels.
export default function FullyBookedNotice({ onRefresh }: { onRefresh: () => Promise<void> }) {
  const [busy, setBusy] = useState(false);
  return (
    <div role="status" className="mt-2 rounded-xl border border-orange-200 bg-orange-50 px-3.5 py-3 text-[13px] text-orange-800">
      <p className="flex items-start gap-2">
        <CalendarX size={16} className="shrink-0 mt-0.5" aria-hidden />
        <span>
          <strong className="font-semibold">All times on this day are fully booked.</strong> Please refresh if a slot opens up, or pick another day.
        </span>
      </p>
      <button
        type="button"
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          await onRefresh();
          setBusy(false);
        }}
        className="mt-2 inline-flex items-center gap-1.5 min-h-9 px-3 rounded-full border border-orange-300 font-medium hover:bg-orange-100 disabled:opacity-60"
      >
        {busy ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />} Refresh times
      </button>
    </div>
  );
}
