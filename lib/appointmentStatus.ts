// One place for how an appointment's status reads, and for which hourly slots
// a booking takes, so the Guidance Associate's pages and the student, faculty
// and parent pages always agree.
import { SLOT_MINUTES, STANDARD_DAY_HOURS, parseTimeToMinutes } from "../app/config/timeSlots.ts";
import { manilaMinutes, manilaToday } from "./time.ts";

// EXPIRED is not stored: it's a PENDING request whose time has already passed
// without the Guidance Associate confirming it.
export type AppointmentStatusKey = "PENDING" | "EXPIRED" | "CONFIRMED" | "COMPLETED" | "CANCELLED";

export const APPOINTMENT_STATUS: Record<AppointmentStatusKey, { label: string; badge: string; dot: string }> = {
  PENDING: { label: "Pending", badge: "bg-orange-50 text-orange-700 border-orange-200", dot: "bg-orange-500" },
  EXPIRED: { label: "Not confirmed", badge: "bg-slate-100 text-slate-600 border-slate-200", dot: "bg-slate-400" },
  CONFIRMED: { label: "Confirmed", badge: "bg-emerald-50 text-emerald-700 border-emerald-200", dot: "bg-emerald-500" },
  COMPLETED: { label: "Terminated", badge: "bg-teal-50 text-teal-700 border-teal-200", dot: "bg-teal-500" },
  CANCELLED: { label: "Cancelled", badge: "bg-red-50 text-red-700 border-red-200", dot: "bg-red-500" },
};

// Start of a booking in minutes after midnight: "9:00 AM" and "9:00 AM - 9:30 AM"
// both start at 540. NaN when the time isn't a clock time (e.g. "Custom Block").
function startMinutes(time: string) {
  return parseTimeToMinutes(time.split(" - ")[0].trim());
}

// Calendar days are stored as UTC midnight, so the stored day is the ISO date.
const dayOf = (date: Date | string) => new Date(date).toISOString().slice(0, 10);

// Whether the appointment's time is already over (Manila time). An unreadable
// time counts from the end of its day.
export function hasPassed(a: { date: Date | string; time: string }, now = new Date()) {
  const day = dayOf(a.date);
  const today = manilaToday(now);
  if (day !== today) return day < today;
  const start = startMinutes(a.time);
  return Number.isNaN(start) ? false : start < manilaMinutes(now);
}

export function appointmentStatus(a: { status: string; date: Date | string; time: string }, now = new Date()): AppointmentStatusKey {
  if (a.status === "PENDING" && hasPassed(a, now)) return "EXPIRED";
  return (a.status in APPOINTMENT_STATUS ? a.status : "PENDING") as AppointmentStatusKey;
}

export const statusLabel = (a: { status: string; date: Date | string; time: string }, now = new Date()) =>
  APPOINTMENT_STATUS[appointmentStatus(a, now)].label;

// The bookable hours a booked or blocked time covers. Today every booking is a
// whole hour ("9:00 AM"), but older records hold ranges ("8:00 AM - 9:00 AM"),
// half hours ("8:30 AM") or "Custom Block"; each one takes every hour it
// overlaps, and a time that can't be read takes the whole day, so nothing is
// ever offered twice.
export function slotsCoveredBy(time: string): string[] {
  const [from, to] = time.split(" - ").map((t) => t.trim());
  const start = parseTimeToMinutes(from);
  if (Number.isNaN(start)) return [...STANDARD_DAY_HOURS];
  const parsedEnd = to ? parseTimeToMinutes(to) : NaN;
  const end = Number.isNaN(parsedEnd) || parsedEnd <= start ? start + SLOT_MINUTES : parsedEnd;
  return STANDARD_DAY_HOURS.filter((slot) => {
    const s = parseTimeToMinutes(slot);
    return s < end && start < s + SLOT_MINUTES;
  });
}

// Every bookable hour taken by any of these booked or blocked times.
export function takenSlots(times: readonly string[]): string[] {
  const taken = new Set(times.flatMap(slotsCoveredBy));
  return STANDARD_DAY_HOURS.filter((t) => taken.has(t));
}
