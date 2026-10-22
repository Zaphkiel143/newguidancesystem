// The Career Planning Form for tertiary (college) students: first-year students
// and transferees fill it in once, and the Guidance Associate reads it in
// Career Guidance. The sections and questions follow the guidance office's own
// form; the consent wording below is written for E-Gabay.
//
// Pure module (no database or Next.js imports) so the page, the server action
// and the tests all use the same questions and the same checks.

import { TERTIARY_COURSES } from "./studentLevels.ts";

export type FieldType = "text" | "textarea" | "date" | "select" | "radio" | "checks";

export type Field = {
  id: string;
  label: string;
  type: FieldType;
  required?: boolean;
  options?: readonly string[];
  // checks/radio: also offer an "Other" box (saved as "Other: <text>")
  other?: boolean;
  // checks: the most options that may be picked
  max?: number;
  hint?: string;
  // only asked when another answer matches, e.g. details after "Yes"
  showIf?: { field: string; equals: string };
};

export type Section = {
  id: string;
  title: string;
  note?: string;
  // only the student and the Guidance Associate can see this section
  confidential?: boolean;
  fields: Field[];
};

export const YES_NO = ["Yes", "No"] as const;
export const NATIONALITIES = ["Filipino", "Other"] as const;
export const EDUCATION_LEVELS = [
  "No formal schooling",
  "Elementary level",
  "Elementary graduate",
  "High school level",
  "High school graduate",
  "Senior High School graduate",
  "Vocational / Technical",
  "College level",
  "College graduate",
  "Post-graduate",
] as const;
export const PARENT_STATUSES = [
  "Married and living together",
  "Married but living apart",
  "Separated",
  "Annulled / Divorced",
  "Single parent",
  "Widowed",
  "Both parents deceased",
] as const;
export const CONCERNS = [
  "Fear",
  "Communication",
  "Shyness",
  "Loneliness",
  "Stress",
  "Anger",
  "Self-confidence",
  "Academic performance",
  "Career",
  "Financial",
  "Relationship with father",
  "Relationship with mother",
  "Relationship with siblings",
  "Relationship with teachers",
  "Relationship with other people",
] as const;

const parent = (who: "Mother" | "Father", key: "mother" | "father"): Field[] => [
  { id: `${key}Name`, label: `${who}'s name (Surname, First name M.I.)`, type: "text", required: true },
  { id: `${key}Birthdate`, label: `${who}'s birthdate`, type: "date", required: true },
  { id: `${key}Nationality`, label: `${who}'s nationality`, type: "select", options: NATIONALITIES, required: true },
  { id: `${key}Religion`, label: `${who}'s religion`, type: "text", required: true },
  { id: `${key}Education`, label: `${who}'s educational attainment`, type: "select", options: EDUCATION_LEVELS, required: true },
  { id: `${key}Contact`, label: `${who}'s contact number`, type: "text", required: true },
  { id: `${key}Occupation`, label: `${who}'s occupation`, type: "text", required: true },
  { id: `${key}Company`, label: `${who}'s company`, type: "text", required: true },
  { id: `${key}Income`, label: `${who}'s monthly income`, type: "text", required: true },
];

const sibling = (n: 1 | 2): Field[] => [
  { id: `sibling${n}Name`, label: `Sibling ${n}'s name`, type: "text", required: true },
  { id: `sibling${n}Age`, label: `Sibling ${n}'s age`, type: "text", required: true },
  { id: `sibling${n}Gender`, label: `Sibling ${n}'s gender`, type: "text", required: true },
  { id: `sibling${n}Program`, label: `Sibling ${n}'s program / occupation`, type: "text", required: true },
  { id: `sibling${n}School`, label: `Sibling ${n}'s school / company`, type: "text", required: true },
];

const yesWithDetails = (id: string, label: string, detailsLabel: string): Field[] => [
  { id, label, type: "radio", options: YES_NO, required: true },
  { id: `${id}Details`, label: detailsLabel, type: "text", required: true, showIf: { field: id, equals: "Yes" } },
];

export const COLLEGE_CAREER_FORM: Section[] = [
  {
    id: "consent",
    title: "Consent",
    fields: [
      {
        id: "consent",
        label:
          "I understand that guidance and counseling helps me understand myself and my concerns, that what I share is kept confidential except when someone's safety is in danger, when the guidance staff consult each other to help me, or when a court orders it, and that this form will only be used for guidance, counseling and consultation. I give my consent.",
        type: "radio",
        options: ["Yes"],
        required: true,
      },
    ],
  },
  {
    id: "identifying",
    title: "Identifying information",
    fields: [
      { id: "nickname", label: "Nickname", type: "text", required: true },
      { id: "program", label: "Program", type: "select", options: TERTIARY_COURSES, required: true },
      { id: "section", label: "Section", type: "text", required: true },
      { id: "nationality", label: "Nationality", type: "select", options: NATIONALITIES, required: true },
      { id: "religion", label: "Religion", type: "text", required: true },
      { id: "birthdate", label: "Birthdate", type: "date", required: true },
    ],
  },
  {
    id: "contact",
    title: "Contact information",
    fields: [
      { id: "cellphone", label: "Cellphone number/s", type: "text", required: true },
      { id: "email", label: "Email address", type: "text", required: true },
      { id: "altEmail", label: "Alternate email address", type: "text" },
      { id: "homeNumber", label: "Home number", type: "text" },
      { id: "presentAddress", label: "Present address", type: "text", required: true },
      { id: "permanentAddress", label: "Permanent address", type: "text", required: true },
      { id: "provincialAddress", label: "Provincial address", type: "text", required: true, hint: "Write N/A if none." },
    ],
  },
  {
    id: "spouse",
    title: "For married students only",
    note: "Leave this page blank if it does not apply to you.",
    fields: [
      { id: "spouseName", label: "Name of spouse (Surname, First name M.I.)", type: "text" },
      { id: "spouseAge", label: "Age of spouse", type: "text" },
      { id: "spouseOccupation", label: "Occupation of spouse", type: "radio", options: ["Unemployed"], other: true },
      { id: "spouseContact", label: "Contact number of spouse", type: "text" },
    ],
  },
  {
    id: "family",
    title: "Family background",
    fields: [
      ...parent("Mother", "mother"),
      ...parent("Father", "father"),
      { id: "parentStatus", label: "Status of parent/s", type: "select", options: PARENT_STATUSES, required: true },
      { id: "guardianName", label: "Name of guardian/s (Surname, First name M.I.)", type: "text", required: true },
      { id: "familyAddress", label: "Address of parent/s or guardian/s", type: "text", required: true },
      { id: "guardianContact", label: "Contact number of guardian/s", type: "text", required: true },
    ],
  },
  {
    id: "siblings",
    title: "Sibling information",
    note: "Write N/A if not applicable.",
    fields: [
      ...sibling(1),
      ...sibling(2),
      {
        id: "otherSiblings",
        label: "Other siblings: name / age / gender / program or occupation / school or company, one per line",
        type: "textarea",
      },
    ],
  },
  {
    id: "emergency",
    title: "Emergency contact",
    fields: [
      { id: "emergencyContact", label: "In case of emergency, contact (Surname, First name M.I. / Relationship)", type: "text", required: true },
      { id: "emergencyNumber", label: "Contact number of emergency contact", type: "text" },
    ],
  },
  {
    id: "education",
    title: "Educational background",
    fields: [
      { id: "gradeSchool", label: "Grade school name and years attended", type: "text", required: true },
      { id: "juniorHigh", label: "Junior high school name and years attended", type: "text", required: true },
      { id: "seniorHigh", label: "Senior high school name and years attended", type: "text", required: true },
      { id: "college", label: "College and years attended", type: "text", required: true },
      { id: "vocational", label: "Vocational school and years attended", type: "text", required: true, hint: "Write N/A if none." },
      { id: "extracurricular", label: "Extra-curricular activities from previous schools", type: "textarea", required: true },
      { id: "awards", label: "Awards / citations received", type: "textarea", required: true },
      { id: "likedSubjects", label: "Most liked subject/s in school", type: "text", required: true },
      { id: "leastLikedSubjects", label: "Least liked subject/s in school", type: "text", required: true },
      { id: "strengths", label: "Your 3 major strengths as a student", type: "textarea", required: true },
    ],
  },
  {
    id: "work",
    title: "Work experience",
    note: "Start from the most recent. Write N/A if not applicable.",
    fields: [
      { id: "company", label: "Company name", type: "text", required: true },
      { id: "position", label: "Position", type: "text", required: true },
      { id: "duration", label: "Duration (e.g. June 2022 - March 2024)", type: "text", required: true },
      { id: "jobDescription", label: "Job description", type: "text", required: true },
      { id: "otherWork", label: "Other work experience: company / position / duration / job description, one per line", type: "textarea", required: true },
    ],
  },
  {
    id: "interests",
    title: "Interests and recreational activities",
    fields: [
      { id: "sports", label: "Sports", type: "textarea", required: true },
      { id: "hobbies", label: "Hobbies", type: "textarea", required: true },
      { id: "talents", label: "Talents", type: "textarea", required: true },
      { id: "socioCivic", label: "Other activities: socio-civic", type: "textarea", required: true },
      { id: "schoolOrg", label: "Other activities: school organization", type: "textarea", required: true },
    ],
  },
  {
    id: "health",
    title: "Health",
    note: "Please answer honestly. Only you and the Guidance Associate can see this page.",
    confidential: true,
    fields: [
      ...yesWithDetails("hospitalized", "Have you ever been hospitalized?", "When, and why?"),
      ...yesWithDetails("operation", "Have you ever had an operation?", "When, and why?"),
      ...yesWithDetails("illness", "Do you currently have any illness or condition?", "Which illness or condition?"),
      ...yesWithDetails("prescription", "Do you take any prescription drugs?", "Drug name and purpose"),
      { id: "medicalCertificate", label: "Have you submitted a medical certificate / assessment report?", type: "radio", options: YES_NO, required: true, hint: "If not, please submit a copy to the Guidance Office." },
      { id: "familyIllnesses", label: "Common illnesses in your family", type: "textarea", required: true },
      { id: "lastDoctorVisit", label: "When did you last see a doctor?", type: "text", required: true },
      { id: "doctorReason", label: "What was your reason for visiting a doctor?", type: "text", required: true },
      { id: "loss", label: "Any loss you have experienced (e.g. death of a family member or close friend)", type: "textarea", required: true },
      { id: "concerns", label: "Check any of the problems below that currently concern you", type: "checks", options: CONCERNS, other: true, required: true, hint: "Pick none of the list and write N/A under Other if nothing concerns you." },
    ],
  },
  {
    id: "certification",
    title: "Certification",
    fields: [
      {
        id: "certify",
        label: "I certify that the information I entered is true and correct, and I allow the Guidance and Counseling Office to collect it.",
        type: "radio",
        options: ["Yes"],
        required: true,
      },
    ],
  },
];

export type Answers = Record<string, string | string[]>;

const ALL_FIELDS = COLLEGE_CAREER_FORM.flatMap((s) => s.fields.map((f) => ({ ...f, section: s.id })));
export const FIELD_IDS = new Set(ALL_FIELDS.map((f) => f.id));
export const CONFIDENTIAL_FIELDS = new Set(ALL_FIELDS.filter((f) => COLLEGE_CAREER_FORM.find((s) => s.id === f.section)?.confidential).map((f) => f.id));

const MAX_TEXT = 300;
const MAX_TEXTAREA = 2000;
export const OTHER_PREFIX = "Other: ";

export function isShown(field: Field, answers: Answers) {
  return !field.showIf || answers[field.showIf.field] === field.showIf.equals;
}

function isBlank(v: string | string[] | undefined) {
  return v === undefined || (Array.isArray(v) ? v.length === 0 : v.trim() === "");
}

// Cleans what the browser sent: keeps only known fields, trims text, drops
// answers to questions that are hidden. Never throws on odd input.
export function cleanAnswers(input: unknown): Answers {
  const raw = input && typeof input === "object" ? (input as Record<string, unknown>) : {};
  const out: Answers = {};
  for (const f of ALL_FIELDS) {
    const v = raw[f.id];
    if (f.type === "checks") {
      const list = Array.isArray(v) ? v.map((x) => String(x ?? "").trim()).filter(Boolean) : [];
      if (list.length) out[f.id] = [...new Set(list)];
    } else if (v !== undefined && v !== null) {
      const s = String(v).trim();
      if (s) out[f.id] = s;
    }
  }
  for (const f of ALL_FIELDS) if (!isShown(f, out)) delete out[f.id];
  return out;
}

// One message per field that is wrong. With `forSubmit`, required fields must
// be filled; drafts only check what has been typed so far. `overrides` lets a
// caller with live data (e.g. the counselor-editable Tertiary Courses list)
// check a field against that instead of this module's own static `options` -
// this file stays database/Next.js-free, so it can't fetch that data itself.
export function validateAnswers(answers: Answers, forSubmit: boolean, overrides: Record<string, readonly string[]> = {}): Record<string, string> {
  const errors: Record<string, string> = {};
  for (const f of ALL_FIELDS) {
    if (!isShown(f, answers)) continue;
    const options = overrides[f.id] ?? f.options;
    const v = answers[f.id];
    if (isBlank(v)) {
      if (forSubmit && f.required) errors[f.id] = "Please answer this question.";
      continue;
    }
    if (f.type === "checks") {
      const list = v as string[];
      const bad = list.find((x) => !(options ?? []).includes(x) && !(f.other && x.startsWith(OTHER_PREFIX) && x.length > OTHER_PREFIX.length));
      if (bad) errors[f.id] = "Pick from the list, or use Other.";
      else if (f.max && list.length > f.max) errors[f.id] = `Pick at most ${f.max}.`;
      else if (list.some((x) => x.length > MAX_TEXT)) errors[f.id] = `Keep each answer under ${MAX_TEXT} characters.`;
      continue;
    }
    const s = v as string;
    if (f.type === "select" || f.type === "radio") {
      const ok = (options ?? []).includes(s) || (f.other && s.startsWith(OTHER_PREFIX) && s.length > OTHER_PREFIX.length);
      if (!ok) errors[f.id] = "Pick one of the choices.";
    } else if (f.type === "date") {
      const d = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
      const date = d ? new Date(`${s}T00:00:00Z`) : null;
      if (!date || Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== s || Number(d![1]) < 1900 || date > new Date())
        errors[f.id] = "Enter a valid date.";
    } else if (s.length > (f.type === "textarea" ? MAX_TEXTAREA : MAX_TEXT)) {
      errors[f.id] = `Keep this under ${f.type === "textarea" ? MAX_TEXTAREA : MAX_TEXT} characters.`;
    }
  }
  return errors;
}

// The first section that has an error, so the form can jump back to it.
export function firstSectionWithError(errors: Record<string, string>) {
  return COLLEGE_CAREER_FORM.findIndex((s) => s.fields.some((f) => errors[f.id]));
}
