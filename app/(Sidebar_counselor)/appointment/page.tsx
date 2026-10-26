"use client";

import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Ban, CalendarDays, Check, ChevronLeft, ChevronRight, List, Loader2, Lock, X } from "lucide-react";
import {
  blockTime,
  getDaySchedule,
  saveAppointmentDetails,
  unblockTime,
  updateAppointmentStatus,
} from "../../action/counselor";
import { DAY_SCHEDULE, LUNCH_BREAK_LABEL, STANDARD_DAY_HOURS, SLOT_MINUTES, formatMinutesToTime, parseTimeToMinutes } from "../../config/timeSlots";
import { OTHER } from "../../config/studentLevels";
import InlineError from "../../../components/InlineError";
import ConfirmDialog from "../../../components/ConfirmDialog";
import ContactLinks from "../../../components/ContactLinks";
import { manilaToday } from "../../../lib/time";
import { useOptionList } from "../../../components/useOptionList";
import { optionValue } from "../../../lib/optionListDefaults";
import MonthCalendar from "./MonthCalendar";

type Schedule = Awaited<ReturnType<typeof getDaySchedule>>;
type Appt = Schedule["appointments"][number];
type Block = Schedule["blocks"][number];
// End-time choices: the end of every bookable hour (9:00 AM … 4:00 PM).
const END_TIMES = STANDARD_DAY_HOURS.map((t) => formatMinutesToTime(parseTimeToMinutes(t) + SLOT_MINUTES));

function shiftDate(date: string, days: number) {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function dayLabel(date: string) {
  return new Date(`${date}T00:00:00Z`).toLocaleDateString("en-PH", { weekday: "long", month: "long", day: "numeric", year: "numeric", timeZone: "UTC" });
}

const field = "w-full text-sm bg-sheet border border-slate-300 rounded-lg px-3 py-2.5";
const fieldLabel = "text-xs font-semibold text-slate-700 block mb-1";

export default function AppointmentScheduling() {
  const [appointmentReasons] = useOptionList("appointmentReasons");
  const purposeValues = appointmentReasons.map(optionValue);
  const today = manilaToday();
  // A link like /appointment?date=2026-10-27&time=2:00 PM (e.g. from a booking
  // notification) opens that day and points out that appointment, including
  // when this page is already open.
  const params = useSearchParams();
  const rawDate = params.get("date");
  const rawTime = params.get("time");
  const linkedDate = rawDate && /^\d{4}-\d{2}-\d{2}$/.test(rawDate) ? rawDate : null;
  const linkedTime = linkedDate && rawTime && STANDARD_DAY_HOURS.includes(rawTime) ? rawTime : null;
  const linkKey = linkedDate ? `${linkedDate}|${linkedTime ?? ""}` : null;
  const [date, setDate] = useState(linkedDate ?? today);
  // The month calendar first, like Teams; a linked appointment opens straight on its day.
  const [view, setView] = useState<"month" | "day">(linkedDate ? "day" : "month");
  // The slot to scroll to and highlight once that day has loaded.
  const [highlight, setHighlight] = useState<string | null>(linkedTime);
  const [lastLink, setLastLink] = useState(linkKey);
  if (linkKey !== lastLink) {
    setLastLink(linkKey);
    if (linkedDate) {
      setDate(linkedDate);
      setView("day");
    }
    setHighlight(linkedTime);
  }
  const [schedule, setSchedule] = useState<Schedule | null>(null);
  const [loadedDate, setLoadedDate] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [rowError, setRowError] = useState<{ id: string; message: string } | null>(null);

  // Manage / reschedule an appointment
  const [editing, setEditing] = useState<Appt | null>(null);
  const [edit, setEdit] = useState({ date: "", time: "", purpose: "", purposeOther: "", notes: "", requirement: "", requirements: [] as string[] });
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Block time
  const [blockReasons] = useOptionList("blockReasons");
  const [blocking, setBlocking] = useState(false);
  const [block, setBlock] = useState({ wholeDay: false, start: STANDARD_DAY_HOURS[0], end: END_TIMES[0], reason: "Meeting", reasonOther: "" });
  const [blockResult, setBlockResult] = useState<string | null>(null);
  const [blockError, setBlockError] = useState<string | null>(null);

  const load = useCallback(async (d: string) => {
    const data = await getDaySchedule(d);
    setSchedule(data);
    setLoadedDate(d);
  }, []);

  useEffect(() => {
    let cancelled = false;
    getDaySchedule(date).then((data) => {
      if (cancelled) return;
      setSchedule(data);
      setLoadedDate(date);
    });
    return () => {
      cancelled = true;
    };
  }, [date]);

  const loading = loadedDate !== date;

  // Once the linked day is on screen, bring the appointment into view; the
  // highlight fades after a few seconds.
  useEffect(() => {
    if (!highlight || loading) return;
    document.querySelector(`[data-slot="${highlight}"]`)?.scrollIntoView({ behavior: "smooth", block: "center" });
    const t = setTimeout(() => setHighlight(null), 4000);
    return () => clearTimeout(t);
  }, [highlight, loading]);
  const appts = schedule?.appointments ?? [];
  const blocks = schedule?.blocks ?? [];
  const confirmed = appts.filter((a) => a.status === "CONFIRMED").length;
  const completed = appts.filter((a) => a.status === "COMPLETED").length;
  const pending = appts.filter((a) => a.status === "PENDING").length;
  const open = Math.max(0, STANDARD_DAY_HOURS.length - appts.length - blocks.length);

  // Cancelling or terminating asks first, in a dialog.
  const [asking, setAsking] = useState<{ appt: Appt; status: "COMPLETED" | "CANCELLED" } | null>(null);

  const setStatus = async (a: Appt, status: "CONFIRMED" | "COMPLETED" | "CANCELLED", confirmed = false) => {
    if (status !== "CONFIRMED" && !confirmed) return setAsking({ appt: a, status });
    setBusyId(a.id);
    setRowError(null);
    const result = await updateAppointmentStatus(a.id, status);
    setBusyId(null);
    setAsking(null);
    if (result.success) await load(date);
    else setRowError({
      id: a.id,
      message: status === "CONFIRMED" ? "Couldn't confirm it. Try again." : status === "COMPLETED" ? "Couldn't terminate it. Try again." : "Couldn't cancel it. Try again.",
    });
  };

  const openEditor = (a: Appt) => {
    const known = purposeValues.includes(a.appointmentType ?? "");
    const isOther = a.appointmentType?.startsWith("Other: ");
    setEditing(a);
    setEdit({
      date: new Date(a.date).toISOString().slice(0, 10),
      time: a.time,
      purpose: known ? a.appointmentType! : isOther ? OTHER : a.appointmentType || purposeValues[0] || "",
      purposeOther: isOther ? a.appointmentType!.slice(7) : "",
      notes: a.notes ?? "",
      requirement: "",
      requirements: a.requirements ?? [],
    });
    setFormError(null);
  };

  const saveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editing) return;
    if (edit.purpose === OTHER && !edit.purposeOther.trim()) return setFormError("Type the purpose.");
    setSaving(true);
    setFormError(null);
    const result = await saveAppointmentDetails({
      appointmentId: editing.id,
      dateString: edit.date,
      timeSlot: edit.time,
      appointmentType: edit.purpose === OTHER ? `Other: ${edit.purposeOther.trim()}` : edit.purpose,
      notes: edit.notes,
      requirements: edit.requirements,
    });
    setSaving(false);
    if (result.success) {
      setEditing(null);
      await load(date);
    } else {
      setFormError(result.error || "Couldn't save.");
    }
  };

  const submitBlock = async (e: React.FormEvent) => {
    e.preventDefault();
    const reason = block.reason === OTHER ? block.reasonOther.trim() : block.reason;
    if (!reason) return setBlockError("Say why you're unavailable.");
    if (!block.wholeDay && parseTimeToMinutes(block.end) <= parseTimeToMinutes(block.start)) {
      return setBlockError("The end time must be after the start time.");
    }
    setSaving(true);
    setBlockError(null);
    const result = await blockTime({ dateString: date, startTime: block.start, endTime: block.end, wholeDay: block.wholeDay, reason });
    setSaving(false);
    if (!result.success) return setBlockError(result.error || "Couldn't block that time.");
    const parts = [];
    if (result.blocked?.length) parts.push(`Blocked ${result.blocked.join(", ")}.`);
    if (result.skippedBooked?.length) parts.push(`Not blocked because they're booked: ${result.skippedBooked.join(", ")}. Reschedule or cancel those first.`);
    if (!result.blocked?.length && !result.skippedBooked?.length) parts.push("Those hours were already blocked.");
    setBlockResult(parts.join(" "));
    await load(date);
  };

  const removeBlock = async (b: Block, wholeGroup: boolean) => {
    setBusyId(b.id);
    const result = await unblockTime(b.id, wholeGroup);
    setBusyId(null);
    if (result.success) await load(date);
    else setRowError({ id: b.id, message: result.error || "Couldn't remove it." });
  };

  return (
    <div className="px-5 sm:px-8 lg:px-10 pt-8 lg:pt-10 pb-16 text-slate-900">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="page-title">Appointments</h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
        <div role="tablist" aria-label="Calendar view" className="inline-flex rounded-full bg-slate-100 p-1">
          {([["month", "Month", CalendarDays], ["day", "Day", List]] as const).map(([v, label, Icon]) => (
            <button key={v} role="tab" aria-selected={view === v} onClick={() => setView(v)}
              className={`inline-flex items-center gap-1.5 px-4 min-h-9 rounded-full text-[13px] font-medium ${view === v ? "bg-sheet text-ink shadow-sm" : "text-slate-600 hover:text-ink"}`}>
              <Icon size={15} /> {label}
            </button>
          ))}
        </div>
        <button
          onClick={() => {
            setBlocking(true);
            setBlockResult(null);
            setBlockError(null);
          }}
          className="inline-flex items-center gap-2 bg-blue-700 hover:bg-blue-800 text-white font-medium text-sm px-5 min-h-11 rounded-full"
        >
          <Lock size={16} /> Block time
        </button>
        </div>
      </header>

      {view === "month" ? (
        <MonthCalendar today={today} selected={date} onPickDay={(d) => { setDate(d); setView("day"); }} />
      ) : (
      <>

      <div className="mt-6 flex flex-wrap items-center gap-2">
        <button onClick={() => setDate(shiftDate(date, -1))} aria-label="Previous day" className="w-11 h-11 grid place-items-center rounded-full border border-slate-300 hover:bg-slate-100">
          <ChevronLeft size={18} />
        </button>
        <label htmlFor="appt-date" className="sr-only">Date</label>
        <input id="appt-date" type="date" value={date} onChange={(e) => e.target.value && setDate(e.target.value)}
          className="bg-sheet border border-slate-300 rounded-lg px-3 min-h-11 text-sm" />
        <button onClick={() => setDate(shiftDate(date, 1))} aria-label="Next day" className="w-11 h-11 grid place-items-center rounded-full border border-slate-300 hover:bg-slate-100">
          <ChevronRight size={18} />
        </button>
        {date !== today && (
          <button onClick={() => setDate(today)} className="px-4 min-h-11 rounded-full text-sm text-blue-700 hover:bg-blue-50">Today</button>
        )}
        <p className="w-full sm:w-auto sm:ml-auto text-[13px] text-slate-600">
          <span className="font-semibold text-emerald-700">{confirmed}</span> confirmed · <span className="font-semibold text-teal-700">{completed}</span> terminated · <span className="font-semibold text-orange-700">{pending}</span> pending ·{" "}
          <span className="font-semibold text-ink">{open}</span> open
        </p>
      </div>

      <h2 className="mt-6 font-serif text-[22px] text-ink">{dayLabel(date)}</h2>

      {loading ? (
        <div className="py-20 flex justify-center text-slate-500"><Loader2 className="animate-spin" size={20} /></div>
      ) : (
        <ol className="mt-3 border-t border-rule divide-y divide-rule">
          {DAY_SCHEDULE.map((entry) => {
            if (entry.kind === "lunch") {
              return (
                <li key="lunch" className="py-3 grid grid-cols-[5.5rem_1fr] gap-3 text-sm text-slate-500">
                  <span className="font-mono text-[13px]">12:00 PM</span>
                  <span>Lunch break ({LUNCH_BREAK_LABEL})</span>
                </li>
              );
            }
            const a = appts.find((x) => x.time === entry.time);
            const b = blocks.find((x) => x.time === entry.time);
            return (
              <li key={entry.time} data-slot={entry.time} className="py-3 grid grid-cols-[5.5rem_1fr] gap-3 scroll-mt-24">
                <span className="font-mono text-[13px] text-slate-600 pt-0.5">{entry.time}</span>
                {a ? (
                  <div
                    className={`min-w-0 border rounded-xl p-4 space-y-3 transition-[background-color,border-color,box-shadow] duration-700 ${
                      highlight === entry.time ? "bg-butter-50 border-butter-400 ring-4 ring-butter-200" : "bg-sheet border-rule"
                    }`}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-semibold text-ink">{a.studentName}</p>
                        <p className="text-[13px] text-slate-600">{a.appointmentType || "General consultation"}</p>
                        {a.contactName && a.contactName !== a.studentName && (
                          <p className="text-[12px] text-slate-500">Booked by {a.contactName} ({a.contactRole?.toLowerCase()})</p>
                        )}
                      </div>
                      <span className={`text-[12px] font-semibold px-2 py-0.5 rounded border ${a.status === "COMPLETED" ? "bg-green-100 text-green-800 border-green-200" : a.status === "CONFIRMED" ? "bg-emerald-50 text-emerald-700 border-emerald-100" : "bg-amber-50 text-amber-700 border-amber-100"}`}>
                        {a.status === "COMPLETED" ? "Terminated" : a.status === "CONFIRMED" ? "Confirmed" : "Pending"}
                      </span>
                    </div>
                    {a.notes && <p className="text-[13px] text-slate-700 whitespace-pre-wrap break-words">{a.notes}</p>}
                    <ContactLinks
                      name={a.contactName ?? a.studentName ?? "this person"}
                      email={a.contactEmail}
                      phone={a.contactPhone}
                      subject={`Your guidance appointment on ${dayLabel(date)}, ${a.time}`}
                      role={a.contactRole}
                    />
                    <div className="flex flex-wrap gap-2">
                      {a.status !== "COMPLETED" && (
                        <>
                          {a.status === "PENDING" && (
                            <button onClick={() => setStatus(a, "CONFIRMED")} disabled={busyId === a.id}
                              className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-xs px-4 min-h-9 rounded-full disabled:opacity-60">
                              Confirm
                            </button>
                          )}
                          <button onClick={() => openEditor(a)} className="bg-blue-50 hover:bg-blue-100 text-blue-700 font-medium text-xs px-4 min-h-9 rounded-full">
                            Notes &amp; reschedule
                          </button>
                          <button onClick={() => setStatus(a, "COMPLETED")} disabled={busyId === a.id}
                            className="inline-flex items-center gap-1.5 bg-teal-50 hover:bg-teal-100 text-teal-700 font-medium text-xs px-4 min-h-9 rounded-full disabled:opacity-60">
                            <Check size={14} /> Terminate
                          </button>
                          <button onClick={() => setStatus(a, "CANCELLED")} disabled={busyId === a.id}
                            className="bg-red-50 hover:bg-red-100 text-red-700 font-medium text-xs px-4 min-h-9 rounded-full disabled:opacity-60">
                            Cancel
                          </button>
                        </>
                      )}
                    </div>
                    <InlineError message={rowError?.id === a.id ? rowError.message : null} onDismiss={() => setRowError(null)} />
                  </div>
                ) : b ? (
                  <div className="min-w-0 rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-3 flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm text-slate-700 inline-flex items-center gap-2">
                      <Ban size={15} className="text-slate-500" /> Blocked{b.reason ? `: ${b.reason}` : ""}
                    </p>
                    <div className="flex gap-1">
                      <button onClick={() => removeBlock(b, false)} disabled={busyId === b.id} className="text-[12px] text-blue-700 hover:bg-blue-50 px-3 min-h-9 rounded-full disabled:opacity-60">
                        Unblock this hour
                      </button>
                      {b.groupId && blocks.filter((x) => x.groupId === b.groupId).length > 1 && (
                        <button onClick={() => removeBlock(b, true)} disabled={busyId === b.id} className="text-[12px] text-blue-700 hover:bg-blue-50 px-3 min-h-9 rounded-full disabled:opacity-60">
                          Unblock all {blocks.filter((x) => x.groupId === b.groupId).length} hours
                        </button>
                      )}
                    </div>
                    <InlineError message={rowError?.id === b.id ? rowError.message : null} onDismiss={() => setRowError(null)} className="w-full" />
                  </div>
                ) : (
                  <p className="text-sm text-slate-400 pt-0.5">Open</p>
                )}
              </li>
            );
          })}
        </ol>
      )}

      </>
      )}

      {/* Block time dialog */}
      {blocking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" role="dialog" aria-modal="true" aria-labelledby="block-title">
          <div className="bg-sheet w-full max-w-md p-6 rounded-2xl shadow-xl border border-rule max-h-[90dvh] overflow-y-auto">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 id="block-title" className="text-lg font-semibold text-ink">Block time</h3>
                <p className="text-xs text-slate-500">{dayLabel(date)}. Nobody can book blocked hours.</p>
              </div>
              <button onClick={() => setBlocking(false)} aria-label="Close" className="w-11 h-11 -m-2 grid place-items-center rounded-full hover:bg-slate-100 text-slate-500">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={submitBlock} className="mt-4 space-y-4">
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={block.wholeDay} onChange={(e) => setBlock({ ...block, wholeDay: e.target.checked })} className="w-4 h-4 accent-blue-700" />
                Whole day
              </label>
              {!block.wholeDay && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="blk-start" className={fieldLabel}>From</label>
                    <select id="blk-start" className={field} value={block.start}
                      onChange={(e) => {
                        const start = e.target.value;
                        const end = parseTimeToMinutes(block.end) > parseTimeToMinutes(start) ? block.end : formatMinutesToTime(parseTimeToMinutes(start) + SLOT_MINUTES);
                        setBlock({ ...block, start, end });
                      }}>
                      {STANDARD_DAY_HOURS.map((t) => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                  <div>
                    <label htmlFor="blk-end" className={fieldLabel}>Until</label>
                    <select id="blk-end" className={field} value={block.end} onChange={(e) => setBlock({ ...block, end: e.target.value })}>
                      {END_TIMES.map((t) => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                </div>
              )}
              <div>
                <label htmlFor="blk-reason" className={fieldLabel}>Reason</label>
                <select id="blk-reason" className={field} value={block.reason} onChange={(e) => setBlock({ ...block, reason: e.target.value })}>
                  {blockReasons.map((r) => <option key={r.id} value={optionValue(r)}>{r.label}</option>)}
                  <option value={OTHER}>{OTHER}</option>
                </select>
                {block.reason === OTHER && (
                  <input aria-label="Reason" className={`${field} mt-2`} maxLength={80} placeholder="e.g. Parent conference" value={block.reasonOther}
                    onChange={(e) => setBlock({ ...block, reasonOther: e.target.value })} />
                )}
              </div>
              <p className="text-xs text-slate-500">Lunch ({LUNCH_BREAK_LABEL}) is always closed. Hours that already have an appointment won&apos;t be blocked.</p>
              <InlineError message={blockError} onDismiss={() => setBlockError(null)} />
              {blockResult && <p role="status" className="text-[13px] text-emerald-800 bg-emerald-50 border border-emerald-100 rounded-lg p-3">{blockResult}</p>}
              <div className="flex justify-end gap-2 pt-2 border-t border-rule">
                <button type="button" onClick={() => setBlocking(false)} className="px-4 min-h-10 text-sm text-slate-600 hover:bg-slate-100 rounded-full">Done</button>
                <button type="submit" disabled={saving} className="px-5 min-h-10 text-sm font-medium text-white bg-blue-700 hover:bg-blue-800 rounded-full disabled:opacity-60 inline-flex items-center gap-2">
                  {saving && <Loader2 size={15} className="animate-spin" />} Block
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Notes & reschedule dialog */}
      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" role="dialog" aria-modal="true" aria-labelledby="edit-title">
          <div className="bg-sheet w-full max-w-lg p-6 rounded-2xl shadow-xl border border-rule max-h-[90dvh] overflow-y-auto">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 id="edit-title" className="text-lg font-semibold text-ink">{editing.studentName}</h3>
                <p className="text-xs text-slate-500">Session notes appear in the Daily Log and the student&apos;s record.</p>
              </div>
              <button onClick={() => setEditing(null)} aria-label="Close" className="w-11 h-11 -m-2 grid place-items-center rounded-full hover:bg-slate-100 text-slate-500">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={saveEdit} className="mt-4 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="ed-date" className={fieldLabel}>Date</label>
                  <input id="ed-date" type="date" className={field} value={edit.date} min={today} onChange={(e) => e.target.value && setEdit({ ...edit, date: e.target.value })} />
                </div>
                <div>
                  <label htmlFor="ed-time" className={fieldLabel}>Time</label>
                  <select id="ed-time" className={field} value={edit.time} onChange={(e) => setEdit({ ...edit, time: e.target.value })}>
                    {!STANDARD_DAY_HOURS.includes(edit.time) && <option value={edit.time}>{edit.time} (outside office hours)</option>}
                    {STANDARD_DAY_HOURS.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label htmlFor="ed-purpose" className={fieldLabel}>Purpose</label>
                <select id="ed-purpose" className={field} value={edit.purpose} onChange={(e) => setEdit({ ...edit, purpose: e.target.value })}>
                  {!purposeValues.includes(edit.purpose) && <option value={edit.purpose}>{edit.purpose}</option>}
                  {appointmentReasons.map((r) => <option key={r.id} value={optionValue(r)}>{r.label}</option>)}
                </select>
                {edit.purpose === OTHER && (
                  <input aria-label="Purpose" className={`${field} mt-2`} maxLength={60} value={edit.purposeOther} onChange={(e) => setEdit({ ...edit, purposeOther: e.target.value })} />
                )}
              </div>
              <div>
                <label htmlFor="ed-req" className={fieldLabel}>Requirements to bring</label>
                <div className="flex gap-2">
                  <input id="ed-req" className={field} placeholder="e.g. Parent consent form" value={edit.requirement} maxLength={80}
                    onChange={(e) => setEdit({ ...edit, requirement: e.target.value })} />
                  <button type="button" onClick={() => edit.requirement.trim() && setEdit({ ...edit, requirements: [...edit.requirements, edit.requirement.trim()], requirement: "" })}
                    className="bg-slate-800 text-white text-xs px-4 rounded-full shrink-0">Add</button>
                </div>
                {edit.requirements.length > 0 && (
                  <ul className="flex flex-wrap gap-1.5 mt-2">
                    {edit.requirements.map((r, i) => (
                      <li key={`${r}-${i}`} className="inline-flex items-center gap-1 bg-white text-xs text-slate-700 px-2.5 py-1 rounded-lg border border-slate-200">
                        {r}
                        <button type="button" aria-label={`Remove ${r}`} onClick={() => setEdit({ ...edit, requirements: edit.requirements.filter((_, j) => j !== i) })} className="text-red-600 px-1">×</button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <div>
                <label htmlFor="ed-notes" className={fieldLabel}>Session notes</label>
                <textarea id="ed-notes" rows={4} className={`${field} resize-y`} value={edit.notes} onChange={(e) => setEdit({ ...edit, notes: e.target.value })} />
              </div>
              <InlineError message={formError} onDismiss={() => setFormError(null)} />
              <div className="flex justify-end gap-2 pt-2 border-t border-rule">
                <button type="button" onClick={() => setEditing(null)} className="px-4 min-h-10 text-sm text-slate-600 hover:bg-slate-100 rounded-full">Cancel</button>
                <button type="submit" disabled={saving} className="px-5 min-h-10 text-sm font-medium text-white bg-blue-700 hover:bg-blue-800 rounded-full disabled:opacity-60 inline-flex items-center gap-2">
                  {saving && <Loader2 size={15} className="animate-spin" />} Save
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={asking !== null}
        title={asking?.status === "CANCELLED" ? "Cancel this appointment?" : "Mark this appointment as terminated?"}
        message={
          asking &&
          (asking.status === "CANCELLED"
            ? `The ${asking.appt.time} appointment for ${asking.appt.studentName} will be cancelled, and they'll be notified.`
            : `The ${asking.appt.time} appointment for ${asking.appt.studentName} will be marked as terminated.`)
        }
        confirmLabel={asking?.status === "CANCELLED" ? "Cancel appointment" : "Mark as terminated"}
        cancelLabel={asking?.status === "CANCELLED" ? "Keep it" : "Go back"}
        danger={asking?.status === "CANCELLED"}
        busy={asking !== null && busyId === asking.appt.id}
        onCancel={() => setAsking(null)}
        onConfirm={() => asking && setStatus(asking.appt, asking.status, true)}
      />
    </div>
  );
}
