// Default/seed data for every counselor-editable dropdown (see
// app/action/optionLists.tsx). Protected items use TODAY'S EXACT literal
// string as their itemKey, permanently - that string is what's already
// saved on existing records and what behavioral code compares against, so
// nothing needs to be migrated. Renaming a protected item's label never
// changes what gets stored or what code checks; it only changes what's
// displayed. Plain items (no itemKey) store their label directly, same as
// today's freeform lists - renaming changes what NEW records store, old
// records keep their original text.

export interface DefaultOptionItem {
  itemKey?: string;
  parentItemKey?: string;
  label: string;
  isProtected?: boolean;
}

export interface DefaultOptionList {
  label: string;
  parentKey?: string;
  items: DefaultOptionItem[];
}

const plain = (labels: readonly string[]): DefaultOptionItem[] => labels.map((label) => ({ label }));

// What gets saved to a plain-text DB column when this item is picked:
// protected items always store their frozen itemKey; plain items store
// their current label (same as today's freeform lists).
export function optionValue(item: { itemKey: string | null; label: string }) {
  return item.itemKey ?? item.label;
}

export const OPTION_LIST_DEFAULTS: Record<string, DefaultOptionList> = {
  departments: {
    label: "Student Level",
    items: [
      { itemKey: "Senior High School", label: "Senior High School", isProtected: true },
      { itemKey: "Tertiary", label: "Tertiary", isProtected: true },
      { itemKey: "Irregular", label: "Irregular", isProtected: true },
      { itemKey: "Off Term", label: "Off Term", isProtected: true },
    ],
  },
  shsStrands: {
    label: "Senior High Strands",
    items: plain(["STEM", "ABM", "HUMSS", "GAS", "TVL – ICT", "TVL – Home Economics", "Arts and Design"]),
  },
  tertiaryCourses: {
    label: "Tertiary Courses",
    items: plain([
      "BS Information Technology",
      "BS Computer Science",
      "BS Computer Engineering",
      "BS Information Systems",
      "BS Business Administration",
      "BS Accounting Information Systems",
      "BS Hospitality Management",
      "BS Tourism Management",
      "Bachelor of Multimedia Arts",
    ]),
  },
  shsGrades: {
    label: "Senior High Grade Levels",
    items: plain(["Grade 11", "Grade 12"]),
  },
  tertiaryYears: {
    label: "Tertiary Year Levels",
    items: plain(["1st Year", "2nd Year", "3rd Year", "4th Year"]),
  },
  concernTypes: {
    label: "Referral Concern Types",
    items: plain([
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
    ]),
  },
  appointmentCategories: {
    label: "Appointment Categories",
    items: [
      { itemKey: "Individual Counseling", label: "Individual Counseling", isProtected: true },
      { itemKey: "Group Guidance", label: "Group Guidance", isProtected: true },
    ],
  },
  appointmentReasons: {
    label: "Appointment Reasons",
    parentKey: "appointmentCategories",
    items: [
      { parentItemKey: "Individual Counseling", label: "Academic Concern" },
      { parentItemKey: "Individual Counseling", label: "Career Guidance" },
      { parentItemKey: "Individual Counseling", label: "Personal / Family Concern" },
      { parentItemKey: "Individual Counseling", label: "Peer / Relationship Concern" },
      { parentItemKey: "Individual Counseling", label: "Requirements" },
      { parentItemKey: "Group Guidance", label: "Clearance" },
    ],
  },
  priorities: {
    label: "Referral Priority (Student / Parent)",
    items: [
      { label: "Low" },
      { label: "Medium" },
      { itemKey: "High", label: "High", isProtected: true },
    ],
  },
  facultyPriorities: {
    label: "Referral Priority (Faculty)",
    items: [
      { itemKey: "Emergency", label: "Emergency", isProtected: true },
      { label: "As soon as possible" },
      { itemKey: "Before this date", label: "Before this date", isProtected: true },
    ],
  },
  blockReasons: {
    label: "Appointment Block Reasons",
    items: plain(["Meeting", "Seminar / Training", "Class or school activity", "On leave"]),
  },
  documentCategories: {
    label: "Document Categories",
    items: plain(["Excuse letter", "Medical certificate", "Intent to wear gender-affirming clothing", "Exit interview form", "Parent consent form", "Other"]),
  },
  announcementCategories: {
    label: "Announcement Categories",
    items: plain(["General", "Seminar", "Mental Health", "Career", "Reminder", "Awareness Month"]),
  },
  announcementAudiences: {
    label: "Announcement Audiences",
    items: [
      { itemKey: "All", label: "Everyone", isProtected: true },
      { itemKey: "Students", label: "Students", isProtected: true },
      { itemKey: "Faculty", label: "Faculty", isProtected: true },
      { itemKey: "Parents", label: "Parents", isProtected: true },
    ],
  },
  gradeLevels: {
    label: "Grade / Year Levels",
    items: plain(["Grade 11", "Grade 12", "1st Year", "2nd Year", "3rd Year", "4th Year"]),
  },
  relationships: {
    label: "Parent's Relationship to Student",
    items: plain(["Mother", "Father", "Guardian", "Grandparent", "Sibling", "Other relative"]),
  },
  nameExtensions: {
    label: "Name Extensions",
    items: plain(["Jr.", "Sr.", "II", "III", "IV", "V"]),
  },
};
