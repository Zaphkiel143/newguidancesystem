// Standard operational hours a counselor can book or block per day, in 30-minute increments

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

function generateTimeSlots(startHour: number, endHour: number, stepMinutes: number): string[] {
  const slots: string[] = [];
  for (let minutes = startHour * 60; minutes <= endHour * 60; minutes += stepMinutes) {
    slots.push(formatMinutesToTime(minutes));
  }
  return slots;
}

// 8:00 AM to 4:00 PM, 30-minute increments
export const STANDARD_DAY_HOURS = generateTimeSlots(8, 16, 30);

export const TOTAL_SLOTS = STANDARD_DAY_HOURS.length;
