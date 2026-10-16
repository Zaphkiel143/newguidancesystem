// Bookable consultation hours: one-hour sessions starting 8:00 AM through
// 3:00 PM, with no sessions during the 12:00–1:00 PM lunch break.
// Change the numbers below to adjust the office schedule.

export const FIRST_SLOT_HOUR = 8; // 8:00 AM
export const LAST_SLOT_HOUR = 15; // 3:00 PM (last session starts here)
export const LUNCH_HOUR = 12; // 12:00–1:00 PM, no sessions
export const SLOT_MINUTES = 60;

export function formatMinutesToTime(totalMinutes: number): string {
  const hours = Math.floor(totalMinutes / 60) % 24;
  const minutes = totalMinutes % 60;
  const period = hours >= 12 ? "PM" : "AM";
  const displayHours = hours % 12 === 0 ? 12 : hours % 12;
  return `${displayHours}:${String(minutes).padStart(2, "0")} ${period}`;
}

export function parseTimeToMinutes(time: string): number {
  const [rawTime, period] = time.split(" ");
  const [hoursStr, minutesStr] = rawTime.split(":");
  let hours = Number(hoursStr);
  const minutes = Number(minutesStr);
  if (period === "PM" && hours !== 12) hours += 12;
  if (period === "AM" && hours === 12) hours = 0;
  return hours * 60 + minutes;
}

export const LUNCH_BREAK_LABEL = `${formatMinutesToTime(LUNCH_HOUR * 60)} – ${formatMinutesToTime((LUNCH_HOUR + 1) * 60)}`;

// The day in order, with the lunch break in its place, for slot pickers.
export const DAY_SCHEDULE: ({ kind: "slot"; time: string } | { kind: "lunch"; label: string })[] = [];
for (let hour = FIRST_SLOT_HOUR; hour <= LAST_SLOT_HOUR; hour++) {
  if (hour === LUNCH_HOUR) DAY_SCHEDULE.push({ kind: "lunch", label: LUNCH_BREAK_LABEL });
  else DAY_SCHEDULE.push({ kind: "slot", time: formatMinutesToTime(hour * 60) });
}

// 8:00, 9:00, 10:00, 11:00 AM, 1:00, 2:00, 3:00 PM
export const STANDARD_DAY_HOURS = DAY_SCHEDULE.flatMap((d) => (d.kind === "slot" ? [d.time] : []));

export const TOTAL_SLOTS = STANDARD_DAY_HOURS.length;

export function isBookableTime(time: string) {
  return STANDARD_DAY_HOURS.includes(time);
}
