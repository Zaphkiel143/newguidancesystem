import db from "./db";
import { APPOINTMENT_PURPOSES, OTHER } from "../app/config/studentLevels";
import { isBookableTime, isClosedDay } from "../app/config/timeSlots";
import { manilaToday } from "./time";
import { normalizePhone } from "./phone";
import { notifyCounselors } from "./notify";
import { formatAppointmentWhen } from "./email";

// Checks shared by the student, faculty and parent booking actions. The client
// already hides taken, blocked and past slots; this makes sure a request sent
// straight to the server can't get around that.
export async function checkBooking(input: { dateString: string; timeSlot: string; appointmentType: string; notes: string; phone?: string }) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.dateString)) return { error: "Choose a date." } as const;
  if (input.dateString <= manilaToday()) return { error: "Book from tomorrow onward. For today, message or visit the guidance office." } as const;
  const date = new Date(`${input.dateString}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return { error: "Choose a date." } as const;
  if (isClosedDay(input.dateString)) return { error: "Consultations are Monday to Friday only. Pick a weekday." } as const;

  if (!isBookableTime(input.timeSlot)) {
    return { error: "Pick one of the available times (8:00 AM to 3:00 PM, no sessions 12:00–1:00 PM)." } as const;
  }

  const purpose = input.appointmentType.trim();
  const knownPurpose = (APPOINTMENT_PURPOSES as readonly string[]).includes(purpose) && purpose !== OTHER;
  if (!knownPurpose && !/^Other: .{2,60}$/.test(purpose)) return { error: "Choose the purpose of the appointment." } as const;

  const notes = input.notes.trim();
  if (notes.length > 1000) return { error: "Keep the notes under 1,000 characters." } as const;

  let phone: string | null = null;
  if (input.phone?.trim()) {
    phone = normalizePhone(input.phone);
    if (!phone) return { error: "Enter a valid mobile number, like 0917 123 4567, or leave it blank." } as const;
  }

  const [taken, blocked] = await Promise.all([
    db.appointment.findFirst({ where: { date, time: input.timeSlot, status: { not: "CANCELLED" } } }),
    db.blockedSlot.findFirst({ where: { date, time: input.timeSlot } }),
  ]);
  if (taken || blocked) return { error: "That time isn't available anymore. Please pick another time." } as const;

  return { date, appointmentType: purpose, notes: notes || null, phone } as const;
}

export async function announceNewBooking(a: { who: string; role: string; forWhom?: string; date: Date; time: string; purpose: string }) {
  await notifyCounselors({
    title: "New appointment request",
    body: `${a.who} (${a.role})${a.forWhom ? ` for ${a.forWhom}` : ""} · ${a.purpose} · ${formatAppointmentWhen(a.date, a.time)}`,
    href: "/appointment",
  });
}
