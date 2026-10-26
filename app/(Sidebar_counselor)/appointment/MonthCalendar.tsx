"use client";

import { useEffect, useState } from "react";
import { Ban, ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { getMonthSchedule } from "../../action/counselor";
import { STANDARD_DAY_HOURS } from "../../config/timeSlots";

type Month = Awaited<ReturnType<typeof getMonthSchedule>>;

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
// Chips shown in a day cell before "+N more"
const SHOWN_PER_DAY = 3;

const STATUS_CHIP: Record<string, string> = {
  PENDING: "bg-amber-50 text-amber-800 border-amber-200",
  CONFIRMED: "bg-emerald-50 text-emerald-800 border-emerald-200",
  COMPLETED: "bg-teal-50 text-teal-800 border-teal-200",
};

function shiftMonth(month: string, by: number) {
  const d = new Date(`${month}-01T00:00:00Z`);
  d.setUTCMonth(d.getUTCMonth() + by);
  return d.toISOString().slice(0, 7);
}

function monthLabel(month: string) {
  return new Date(`${month}-01T00:00:00Z`).toLocaleDateString("en-PH", { month: "long", year: "numeric", timeZone: "UTC" });
}

// Every day shown on the grid: whole weeks, Sunday first, padded with the next and previous months
function gridDays(month: string) {
  const first = new Date(`${month}-01T00:00:00Z`);
  const start = new Date(first);
  start.setUTCDate(1 - first.getUTCDay());
  const last = new Date(first);
  last.setUTCMonth(last.getUTCMonth() + 1, 0);
  const days: string[] = [];
  for (let d = new Date(start); d <= last || d.getUTCDay() !== 0; d.setUTCDate(d.getUTCDate() + 1)) {
    days.push(d.toISOString().slice(0, 10));
  }
  return days;
}

const shortName = (name: string | null) => {
  const parts = (name ?? "").trim().split(/\s+/);
  return parts.length > 1 ? `${parts[0]} ${parts[parts.length - 1][0]}.` : parts[0] || "Someone";
};

// The Guidance Associate's month at a glance, like a Teams calendar; a day opens in the day view
export default function MonthCalendar({ today, selected, onPickDay }: { today: string; selected: string; onPickDay: (date: string) => void }) {
  const [month, setMonth] = useState(selected.slice(0, 7));
  const [data, setData] = useState<Month | null>(null);
  const [loadedMonth, setLoadedMonth] = useState("");

  useEffect(() => {
    let cancelled = false;
    getMonthSchedule(month).then((d) => {
      if (cancelled) return;
      setData(d);
      setLoadedMonth(month);
    });
    return () => {
      cancelled = true;
    };
  }, [month]);

  const loading = loadedMonth !== month;
  const days = gridDays(month);
  const apptsOn = (day: string) => (data?.appointments ?? []).filter((a) => a.day === day);
  const blocksOn = (day: string) => (data?.blocks ?? []).filter((b) => b.day === day);
  const monthTotal = (data?.appointments ?? []).length;

  return (
    <section aria-label="Month calendar" className="mt-6">
      <div className="flex flex-wrap items-center gap-2">
        <button onClick={() => setMonth(shiftMonth(month, -1))} aria-label="Previous month" className="w-11 h-11 grid place-items-center rounded-full border border-slate-300 hover:bg-slate-100">
          <ChevronLeft size={18} />
        </button>
        <button onClick={() => setMonth(shiftMonth(month, 1))} aria-label="Next month" className="w-11 h-11 grid place-items-center rounded-full border border-slate-300 hover:bg-slate-100">
          <ChevronRight size={18} />
        </button>
        <h2 className="ml-1 font-serif text-[22px] text-ink">{monthLabel(month)}</h2>
        {month !== today.slice(0, 7) && (
          <button onClick={() => setMonth(today.slice(0, 7))} className="px-4 min-h-11 rounded-full text-sm text-blue-700 hover:bg-blue-50">This month</button>
        )}
        <p className="w-full sm:w-auto sm:ml-auto text-[13px] text-slate-600">
          {loading ? "Loading…" : <><span className="font-semibold text-ink">{monthTotal}</span> appointment{monthTotal === 1 ? "" : "s"} this month</>}
        </p>
      </div>

      <div className="mt-3 overflow-x-auto">
        <div className="min-w-[44rem] border border-rule rounded-xl overflow-hidden bg-sheet">
          <div className="grid grid-cols-7 bg-blue-50 border-b border-rule text-[12px] font-semibold text-slate-600">
            {WEEKDAYS.map((d) => <div key={d} className="px-2 py-2">{d}</div>)}
          </div>
          <div className="relative grid grid-cols-7">
            {loading && (
              <div className="absolute inset-0 z-10 grid place-items-center bg-sheet/60"><Loader2 className="animate-spin text-slate-500" size={20} /></div>
            )}
            {days.map((day) => {
              const inMonth = day.slice(0, 7) === month;
              const weekend = [0, 6].includes(new Date(`${day}T00:00:00Z`).getUTCDay());
              const appts = apptsOn(day);
              const blocks = blocksOn(day);
              const wholeDayBlocked = blocks.length >= STANDARD_DAY_HOURS.length;
              const isToday = day === today;
              return (
                <button
                  key={day}
                  type="button"
                  onClick={() => onPickDay(day)}
                  aria-label={`${new Date(`${day}T00:00:00Z`).toLocaleDateString("en-PH", { weekday: "long", month: "long", day: "numeric", timeZone: "UTC" })}: ${appts.length} appointment${appts.length === 1 ? "" : "s"}${blocks.length ? `, ${blocks.length} blocked hour${blocks.length === 1 ? "" : "s"}` : ""}`}
                  className={`min-h-28 text-left align-top p-1.5 border-b border-r border-rule flex flex-col gap-1 transition-colors hover:bg-blue-50/60 ${
                    weekend || !inMonth ? "bg-slate-50" : ""
                  } ${day === selected ? "ring-2 ring-inset ring-blue-500" : ""}`}
                >
                  <span className={`self-start text-[12px] font-semibold w-6 h-6 grid place-items-center rounded-full ${
                    isToday ? "bg-blue-700 text-white" : inMonth ? "text-ink" : "text-slate-400"
                  }`}>
                    {Number(day.slice(8))}
                  </span>
                  {wholeDayBlocked ? (
                    <span className="text-[11px] text-slate-600 inline-flex items-center gap-1"><Ban size={12} /> Blocked all day</span>
                  ) : blocks.length > 0 ? (
                    <span className="text-[11px] text-slate-500 inline-flex items-center gap-1"><Ban size={12} /> {blocks.length} hour{blocks.length === 1 ? "" : "s"} blocked</span>
                  ) : null}
                  {appts.slice(0, SHOWN_PER_DAY).map((a) => (
                    <span key={a.id} className={`block truncate text-[11px] leading-tight px-1.5 py-1 rounded border ${STATUS_CHIP[a.status] ?? "bg-slate-50 text-slate-700 border-slate-200"}`}>
                      <span className="font-semibold">{a.time.replace(":00 ", " ")}</span> {shortName(a.studentName)}
                    </span>
                  ))}
                  {appts.length > SHOWN_PER_DAY && (
                    <span className="text-[11px] font-medium text-blue-700 px-1">+{appts.length - SHOWN_PER_DAY} more</span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[12px] text-slate-600" aria-label="Legend">
        <li className="inline-flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm border bg-amber-50 border-amber-200" /> Pending</li>
        <li className="inline-flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm border bg-emerald-50 border-emerald-200" /> Confirmed</li>
        <li className="inline-flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm border bg-teal-50 border-teal-200" /> Terminated</li>
        <li>Pick a day to manage its appointments or block time.</li>
      </ul>
    </section>
  );
}
