"use client";

import { useEffect, useState } from "react";
import { Ban, ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { getWeekSchedule } from "../../action/counselor";
import { DAY_SCHEDULE, LUNCH_BREAK_LABEL } from "../../config/timeSlots";

type Week = Awaited<ReturnType<typeof getWeekSchedule>>;

const STATUS_CELL: Record<string, string> = {
  PENDING: "bg-amber-50 text-amber-900 border-amber-300",
  CONFIRMED: "bg-emerald-50 text-emerald-900 border-emerald-300",
  COMPLETED: "bg-teal-50 text-teal-900 border-teal-300",
};
const STATUS_LABEL: Record<string, string> = { PENDING: "Pending", CONFIRMED: "Confirmed", COMPLETED: "Terminated" };

function addDays(date: string, days: number) {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

// The Sunday that starts the week containing date
export function weekStartOf(date: string) {
  return addDays(date, -new Date(`${date}T00:00:00Z`).getUTCDay());
}

const fmt = (date: string, opts: Intl.DateTimeFormatOptions) =>
  new Date(`${date}T00:00:00Z`).toLocaleDateString("en-PH", { ...opts, timeZone: "UTC" });

function weekLabel(start: string) {
  const end = addDays(start, 6);
  const year = end.slice(0, 4);
  return start.slice(0, 7) === end.slice(0, 7)
    ? `${fmt(start, { month: "long", day: "numeric" })} – ${Number(end.slice(8))}, ${year}`
    : `${fmt(start, { month: "short", day: "numeric" })} – ${fmt(end, { month: "short", day: "numeric" })}, ${year}`;
}

// One week as a time grid (days across, office hours down), like a Teams calendar; a day opens in the day view
export default function WeekCalendar({ today, selected, onPickDay }: { today: string; selected: string; onPickDay: (date: string, time?: string) => void }) {
  const [start, setStart] = useState(weekStartOf(selected));
  const [data, setData] = useState<Week | null>(null);
  const [loadedStart, setLoadedStart] = useState("");

  useEffect(() => {
    let cancelled = false;
    getWeekSchedule(start).then((d) => {
      if (cancelled) return;
      setData(d);
      setLoadedStart(start);
    });
    return () => {
      cancelled = true;
    };
  }, [start]);

  const loading = loadedStart !== start;
  const days = Array.from({ length: 7 }, (_, i) => addDays(start, i));
  const weekTotal = (data?.appointments ?? []).length;
  const thisWeek = weekStartOf(today);

  return (
    <section aria-label="Week calendar" className="mt-6">
      <div className="flex flex-wrap items-center gap-2">
        <button onClick={() => setStart(addDays(start, -7))} aria-label="Previous week" className="w-11 h-11 grid place-items-center rounded-full border border-slate-300 hover:bg-slate-100">
          <ChevronLeft size={18} />
        </button>
        <button onClick={() => setStart(addDays(start, 7))} aria-label="Next week" className="w-11 h-11 grid place-items-center rounded-full border border-slate-300 hover:bg-slate-100">
          <ChevronRight size={18} />
        </button>
        <h2 className="ml-1 font-serif text-[22px] text-ink">{weekLabel(start)}</h2>
        {start !== thisWeek && (
          <button onClick={() => setStart(thisWeek)} className="px-4 min-h-11 rounded-full text-sm text-blue-700 hover:bg-blue-50">This week</button>
        )}
        <p className="w-full sm:w-auto sm:ml-auto text-[13px] text-slate-600">
          {loading ? "Loading…" : <><span className="font-semibold text-ink">{weekTotal}</span> appointment{weekTotal === 1 ? "" : "s"} this week</>}
        </p>
      </div>

      <div className="mt-3 overflow-x-auto">
        <div className="relative min-w-[52rem] border border-rule rounded-xl overflow-hidden bg-sheet">
          {loading && (
            <div className="absolute inset-0 z-10 grid place-items-center bg-sheet/60"><Loader2 className="animate-spin text-slate-500" size={20} /></div>
          )}
          <div className="grid grid-cols-[5rem_repeat(7,minmax(0,1fr))]">
            {/* Day headers */}
            <div className="bg-blue-50 border-b border-rule" />
            {days.map((day) => {
              const isToday = day === today;
              return (
                <button key={day} type="button" onClick={() => onPickDay(day)}
                  className={`bg-blue-50 border-b border-l border-rule px-2 py-2 text-left hover:bg-blue-100 ${day === selected ? "ring-2 ring-inset ring-blue-500" : ""}`}
                  aria-label={`Open ${fmt(day, { weekday: "long", month: "long", day: "numeric" })}`}>
                  <span className="block text-[12px] font-semibold text-slate-600">{fmt(day, { weekday: "short" })}</span>
                  <span className={`inline-grid place-items-center w-7 h-7 rounded-full text-[14px] font-semibold ${isToday ? "bg-blue-700 text-white" : "text-ink"}`}>
                    {Number(day.slice(8))}
                  </span>
                </button>
              );
            })}

            {/* Office hours, one row per slot */}
            {DAY_SCHEDULE.map((entry) =>
              entry.kind === "lunch" ? (
                <div key="lunch" className="contents">
                  <div className="px-2 py-1.5 border-b border-rule text-[11px] text-slate-500 font-mono">12:00 PM</div>
                  <div className="col-span-7 border-b border-l border-rule bg-slate-50 px-2 py-1.5 text-[11px] text-slate-500">Lunch break ({LUNCH_BREAK_LABEL})</div>
                </div>
              ) : (
                <div key={entry.time} className="contents">
                  <div className="px-2 py-2 border-b border-rule text-[11px] text-slate-600 font-mono">{entry.time}</div>
                  {days.map((day) => {
                    const weekend = [0, 6].includes(new Date(`${day}T00:00:00Z`).getUTCDay());
                    const a = data?.appointments.find((x) => x.day === day && x.time === entry.time);
                    const b = data?.blocks.find((x) => x.day === day && x.time === entry.time);
                    return (
                      <button key={day} type="button" onClick={() => onPickDay(day, entry.time)}
                        className={`min-h-16 border-b border-l border-rule p-1 text-left hover:bg-blue-50/60 ${weekend ? "bg-slate-50" : ""}`}
                        aria-label={`${fmt(day, { weekday: "long", month: "long", day: "numeric" })}, ${entry.time}: ${a ? `${a.studentName ?? "appointment"}, ${STATUS_LABEL[a.status] ?? a.status}` : b ? "blocked" : "open"}`}>
                        {a ? (
                          <span className={`block h-full rounded-md border-l-4 border px-1.5 py-1 text-[11px] leading-tight ${STATUS_CELL[a.status] ?? "bg-slate-50 border-slate-300"}`}>
                            <span className="block font-semibold truncate">{a.studentName ?? "Appointment"}</span>
                            <span className="block truncate opacity-80">{a.appointmentType || "Consultation"}</span>
                          </span>
                        ) : b ? (
                          <span className="flex h-full items-center gap-1 rounded-md bg-slate-100 border border-dashed border-slate-300 px-1.5 text-[11px] text-slate-600">
                            <Ban size={11} /> <span className="truncate">{b.reason || "Blocked"}</span>
                          </span>
                        ) : null}
                      </button>
                    );
                  })}
                </div>
              )
            )}
          </div>
        </div>
      </div>
      <p className="mt-3 text-[12px] text-slate-600">Pick a day or an hour to manage it in the day view.</p>
    </section>
  );
}
