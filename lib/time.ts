// The server runs in UTC but the guidance office is in the Philippines, so
// "today" and "now" must be computed in Manila time.
export const OFFICE_TZ = "Asia/Manila";

// Today's calendar date in Manila as YYYY-MM-DD (en-CA formats dates that way).
export function manilaToday(now = new Date()) {
  return now.toLocaleDateString("en-CA", { timeZone: OFFICE_TZ });
}

// Calendar days are stored as UTC midnight; this is today's in that form.
export function manilaTodayAsStoredDate(now = new Date()) {
  return new Date(`${manilaToday(now)}T00:00:00Z`);
}

// Minutes since midnight in Manila, to compare against a slot's start time.
export function manilaMinutes(now = new Date()) {
  const [h, m] = now.toLocaleString("en-US", { timeZone: OFFICE_TZ, hour: "numeric", minute: "numeric", hourCycle: "h23" }).split(":");
  return Number(h) * 60 + Number(m);
}

// Current hour (0-23) in Manila.
export function manilaHour(now = new Date()) {
  return Number(now.toLocaleString("en-US", { timeZone: OFFICE_TZ, hour: "numeric", hourCycle: "h23" }));
}
