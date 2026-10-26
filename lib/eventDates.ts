// Event dates are calendar days stored as UTC midnight; endDate is set only for multi-day events.

const fmt = (d: Date, opts: Intl.DateTimeFormatOptions) => d.toLocaleDateString("en-PH", { ...opts, timeZone: "UTC" });

export function isMultiDay(event: { date: Date | string; endDate?: Date | string | null }) {
  return Boolean(event.endDate) && new Date(event.endDate!).getTime() > new Date(event.date).getTime();
}

// "Oct 27", or for a multi-day event "Oct 27 – 29" / "Oct 30 – Nov 2"
export function eventDateLabel(event: { date: Date | string; endDate?: Date | string | null }, withYear = false) {
  const start = new Date(event.date);
  const year: Intl.DateTimeFormatOptions = withYear ? { year: "numeric" } : {};
  if (!isMultiDay(event)) return fmt(start, { month: "short", day: "numeric", ...year });
  const end = new Date(event.endDate!);
  const sameMonth = start.getUTCMonth() === end.getUTCMonth() && start.getUTCFullYear() === end.getUTCFullYear();
  // Built by hand: a day-and-year-only date formats oddly ("2026 (day: 29)")
  const endText = sameMonth ? String(end.getUTCDate()) : fmt(end, { month: "short", day: "numeric" });
  return `${fmt(start, { month: "short", day: "numeric" })} – ${endText}${withYear ? `, ${end.getUTCFullYear()}` : ""}`;
}
