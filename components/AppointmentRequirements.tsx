import { ClipboardList } from "lucide-react";

// "Bring: school ID, parent consent form" — what the guidance office asked the
// person to bring, set in Notes & reschedule. Hidden for finished or cancelled
// appointments, where it no longer matters.
export default function AppointmentRequirements({
  requirements,
  status,
  className = "",
}: {
  requirements?: string[] | null;
  status: string;
  className?: string;
}) {
  if (!requirements?.length || status === "CANCELLED" || status === "COMPLETED") return null;
  return (
    <p className={`flex items-start gap-1.5 text-[13px] text-slate-700 ${className}`}>
      <ClipboardList size={14} className="mt-0.5 shrink-0 text-blue-700" aria-hidden />
      <span className="min-w-0 [overflow-wrap:anywhere]">
        <span className="font-semibold">Bring:</span> {requirements.join(", ")}
      </span>
    </p>
  );
}
