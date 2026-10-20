// School levels the guidance office serves, and the lists used by every form
// that asks where a student belongs (referrals, inventory, first sign-in).

export const SHS = "Senior High School";
export const TERTIARY = "Tertiary";
// College students off the regular year-level track, or enrolled in a
// non-regular term. Both treated the same as Tertiary everywhere except the
// label itself - same courses, same years, same Career Planning Form
// eligibility.
export const IRREGULAR = "Irregular";
export const OFF_TERM = "Off Term";
export const DEPARTMENTS = [SHS, TERTIARY, IRREGULAR, OFF_TERM] as const;
export type Department = (typeof DEPARTMENTS)[number];

export const SHS_GRADES = ["Grade 11", "Grade 12"] as const;
export const SHS_STRANDS = [
  "STEM",
  "ABM",
  "HUMSS",
  "GAS",
  "TVL – ICT",
  "TVL – Home Economics",
  "Arts and Design",
] as const;

export const TERTIARY_YEARS = ["1st Year", "2nd Year", "3rd Year", "4th Year"] as const;
export const TERTIARY_COURSES = [
  "BS Information Technology",
  "BS Computer Science",
  "BS Computer Engineering",
  "BS Information Systems",
  "BS Business Administration",
  "BS Accounting Information Systems",
  "BS Hospitality Management",
  "BS Tourism Management",
  "Bachelor of Multimedia Arts",
] as const;

// Older records were saved with department "College"; treat it as Tertiary.
export function normalizeDepartment(department: string | null | undefined): Department | null {
  if (department === SHS) return SHS;
  if (department === TERTIARY || department === "College") return TERTIARY;
  if (department === IRREGULAR) return IRREGULAR;
  if (department === OFF_TERM) return OFF_TERM;
  return null;
}

export function isShs(department: string | null | undefined) {
  return department === SHS;
}

// Irregular, Off Term, and any new department a counselor adds via Manage
// Options all pick from the same year/course lists as Tertiary, and are all
// eligible for the Career Planning Form - anything that isn't exactly
// Senior High School is treated as tertiary-like, so a newly-added
// department behaves sensibly without needing its own case here.
export function isTertiaryLike(department: string | null | undefined) {
  return Boolean(department) && department !== SHS;
}

export function yearLevelsFor(department: string | null | undefined): readonly string[] {
  return isTertiaryLike(department) ? TERTIARY_YEARS : SHS_GRADES;
}

export function programsFor(department: string | null | undefined): readonly string[] {
  return isTertiaryLike(department) ? TERTIARY_COURSES : SHS_STRANDS;
}

// "Grade 12 - STEM-A" style label kept in StudentProfile.gradeSection.
export function gradeSectionLabel(yearLevel: string, section: string) {
  return [yearLevel.trim(), section.trim()].filter(Boolean).join(" - ");
}

// Shared "pick one, or type your own" options. OTHER reveals a text box and is
// saved as "Other: <what they typed>".
export const OTHER = "Other/s";

export const CONCERN_TYPES = [
  "Academic",
  "Attendance",
  "Behavioral",
  "Emotional / Mental Health",
  "Family",
  "Peer / Relationships",
  "Bullying",
  "Career / Course Choice",
  "Financial",
  "Health",
  OTHER,
] as const;

// Booking is a two-step pick: a category, then a reason specific to it.
export const APPOINTMENT_CATEGORIES = ["Individual Counseling", "Group Guidance"] as const;

export const APPOINTMENT_REASONS: Record<(typeof APPOINTMENT_CATEGORIES)[number], readonly string[]> = {
  "Individual Counseling": ["Academic Concern", "Career Guidance", "Personal / Family Concern", "Peer / Relationship Concern", "Requirements"],
  "Group Guidance": ["Clearance"],
};

// Every bookable reason, flattened - what actually gets saved as
// appointmentType, and the full option list for the counselor's edit view
// (which shows one flat list rather than the two-step category/reason pick).
export const APPOINTMENT_PURPOSES = [
  ...APPOINTMENT_REASONS["Individual Counseling"],
  ...APPOINTMENT_REASONS["Group Guidance"],
] as const;

// Combines a picked option with the "Other/s" text into the value we store.
export function withOther(choice: string, otherText: string) {
  return choice === OTHER ? `Other: ${otherText.trim()}` : choice;
}
