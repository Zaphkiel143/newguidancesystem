import React from "react";
import { APPOINTMENT_STATUS, appointmentStatus } from "../lib/appointmentStatus";

type Appt = { status: string; date: Date | string; time: string; cancelReason?: string | null };

// An appointment's status as every page shows it (lib/appointmentStatus.ts):
// a bordered badge, or a coloured dot with the label for compact lists. A
// cancelled appointment's reason, when the Guidance Associate gave one, is
// shown under the badge.
export default function AppointmentStatusBadge({ appointment, variant = "badge" }: { appointment: Appt; variant?: "badge" | "dot" }) {
  const key = appointmentStatus(appointment);
  const s = APPOINTMENT_STATUS[key];
  if (variant === "dot") {
    const text = s.badge.split(" ").find((c) => c.startsWith("text-"));
    return (
      <span className={`inline-flex items-center gap-1.5 text-[12px] ${text}`}>
        <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
        {s.label}
      </span>
    );
  }
  const badge = <span className={`inline-flex items-center text-xs font-semibold px-2.5 py-1 rounded border whitespace-nowrap ${s.badge}`}>{s.label}</span>;
  if (key !== "CANCELLED" || !appointment.cancelReason) return badge;
  return (
    <span className="inline-flex flex-col items-start sm:items-end gap-1 max-w-64">
      {badge}
      <span className="text-[12px] text-slate-600 sm:text-right [overflow-wrap:anywhere]">Reason: {appointment.cancelReason}</span>
    </span>
  );
}
