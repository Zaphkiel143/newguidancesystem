// The Career Planning Form for tertiary (college) students: first-year students
// and transferees fill it in once, and the Guidance Associate reads it in
// Career Guidance. The sections and questions follow the guidance office's own
// form; the consent wording below is written for E-Gabay.
//
// Pure module (no database or Next.js imports) so the page, the server action
// and the tests all use the same questions and the same checks.

import { TERTIARY_COURSES } from "./studentLevels.ts";

// name: capitalised as it's typed; phone: Philippine mobile number;
// toggle: a single checkbox saved as "Yes" (or left out when unticked).
export type FieldType = "text" | "textarea" | "date" | "select" | "radio" | "checks" | "name" | "phone" | "toggle";

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
  // example shown inside an empty box
  placeholder?: string;
  // shares a row with the next half-width field on wide screens
  half?: boolean;
  // offers a "Same as …" button that copies another answer into this one
  copyFrom?: { field: string; label: string };
  // only asked when another answer matches (or is one of a list), e.g. details after "Yes"
  showIf?: { field: string; equals: string | readonly string[] };
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
// Picked from when the nationality is "Other".
export const OTHER_NATIONALITIES = [
  "Afghan", "Albanian", "Algerian", "American", "Andorran", "Angolan", "Argentine", "Armenian", "Australian", "Austrian",
  "Azerbaijani", "Bahamian", "Bahraini", "Bangladeshi", "Barbadian", "Belarusian", "Belgian", "Belizean", "Beninese", "Bhutanese",
  "Bolivian", "Bosnian", "Botswanan", "Brazilian", "British", "Bruneian", "Bulgarian", "Burkinabe", "Burmese", "Burundian",
  "Cambodian", "Cameroonian", "Canadian", "Cape Verdean", "Central African", "Chadian", "Chilean", "Chinese", "Colombian", "Comorian",
  "Congolese", "Costa Rican", "Croatian", "Cuban", "Cypriot", "Czech", "Danish", "Djiboutian", "Dominican", "Dutch",
  "East Timorese", "Ecuadorian", "Egyptian", "Emirati", "Equatorial Guinean", "Eritrean", "Estonian", "Ethiopian", "Fijian", "Finnish",
  "French", "Gabonese", "Gambian", "Georgian", "German", "Ghanaian", "Greek", "Grenadian", "Guatemalan", "Guinean",
  "Guyanese", "Haitian", "Honduran", "Hungarian", "Icelandic", "Indian", "Indonesian", "Iranian", "Iraqi", "Irish",
  "Israeli", "Italian", "Ivorian", "Jamaican", "Japanese", "Jordanian", "Kazakh", "Kenyan", "Kiribati", "Korean (North)",
  "Korean (South)", "Kosovar", "Kuwaiti", "Kyrgyz", "Lao", "Latvian", "Lebanese", "Liberian", "Libyan", "Liechtensteiner",
  "Lithuanian", "Luxembourgish", "Macedonian", "Malagasy", "Malawian", "Malaysian", "Maldivian", "Malian", "Maltese", "Marshallese",
  "Mauritanian", "Mauritian", "Mexican", "Micronesian", "Moldovan", "Monegasque", "Mongolian", "Montenegrin", "Moroccan", "Mozambican",
  "Namibian", "Nauruan", "Nepalese", "New Zealander", "Nicaraguan", "Nigerian", "Nigerien", "Norwegian", "Omani", "Pakistani",
  "Palauan", "Palestinian", "Panamanian", "Papua New Guinean", "Paraguayan", "Peruvian", "Polish", "Portuguese", "Qatari", "Romanian",
  "Russian", "Rwandan", "Saint Lucian", "Salvadoran", "Samoan", "Sammarinese", "Saudi", "Senegalese", "Serbian", "Seychellois",
  "Sierra Leonean", "Singaporean", "Slovak", "Slovenian", "Solomon Islander", "Somali", "South African", "South Sudanese", "Spanish", "Sri Lankan",
  "Sudanese", "Surinamese", "Swazi", "Swedish", "Swiss", "Syrian", "Taiwanese", "Tajik", "Tanzanian", "Thai",
  "Togolese", "Tongan", "Trinidadian", "Tunisian", "Turkish", "Turkmen", "Tuvaluan", "Ugandan", "Ukrainian", "Uruguayan",
  "Uzbek", "Vanuatuan", "Venezuelan", "Vietnamese", "Yemeni", "Zambian", "Zimbabwean",
] as const;
export const GENDERS = ["Male", "Female", "Prefer not to say"] as const;
export const SIBLING_COUNTS = ["None", "1", "2", "More than 2"] as const;
export const RELATIONSHIPS = [
  "Mother",
  "Father",
  "Guardian",
  "Brother",
  "Sister",
  "Spouse",
  "Grandparent",
  "Aunt / Uncle",
  "Cousin",
  "Other relative",
  "Family friend",
  "Other",
] as const;

const PHONE_HINT = "Numbers only: an 11-digit Philippine mobile number (09XXXXXXXXX) or +639XXXXXXXXX.";
const PHONE_PLACEHOLDER = "09171234567";
const NAME_PLACEHOLDER = "Dela Cruz, Juan A.";

// A nationality question, plus the full list when "Other" is picked.
const nationality = (id: string, label: string): Field[] => [
  { id, label, type: "select", options: NATIONALITIES, required: true, half: true },
  { id: `${id}Other`, label: `${label}: which?`, type: "select", options: OTHER_NATIONALITIES, required: true, half: true, showIf: { field: id, equals: "Other" } },
];
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
  { id: `${key}Name`, label: `${who}'s name (Surname, First name M.I.)`, type: "name", required: true, placeholder: NAME_PLACEHOLDER },
  { id: `${key}Birthdate`, label: `${who}'s birthdate`, type: "date", required: true, half: true },
  { id: `${key}Religion`, label: `${who}'s religion`, type: "text", required: true, half: true, placeholder: "e.g. Roman Catholic" },
  ...nationality(`${key}Nationality`, `${who}'s nationality`),
  { id: `${key}Education`, label: `${who}'s educational attainment`, type: "select", options: EDUCATION_LEVELS, required: true, half: true },
  { id: `${key}Contact`, label: `${who}'s contact number`, type: "phone", required: true, half: true, hint: PHONE_HINT, placeholder: PHONE_PLACEHOLDER },
  { id: `${key}Occupation`, label: `${who}'s occupation`, type: "text", required: true, half: true, placeholder: "e.g. Teacher, or N/A" },
  { id: `${key}Company`, label: `${who}'s company`, type: "text", required: true, half: true, placeholder: "Where they work, or N/A" },
  { id: `${key}Income`, label: `${who}'s monthly income`, type: "text", required: true, half: true, placeholder: "e.g. ₱20,000, or N/A" },
];

// Sibling 1 is asked about for 1 or more siblings, sibling 2 for 2 or more.
const sibling = (n: 1 | 2): Field[] => {
  const showIf = { field: "siblingCount", equals: n === 1 ? ["1", "2", "More than 2"] : ["2", "More than 2"] };
  return [
    { id: `sibling${n}Name`, label: `Sibling ${n}'s name`, type: "name", required: true, placeholder: NAME_PLACEHOLDER, showIf },
    { id: `sibling${n}Age`, label: `Sibling ${n}'s age`, type: "text", required: true, half: true, placeholder: "e.g. 16", showIf },
    { id: `sibling${n}Gender`, label: `Sibling ${n}'s gender`, type: "select", options: GENDERS, required: true, half: true, showIf },
    { id: `sibling${n}Program`, label: `Sibling ${n}'s program / occupation`, type: "text", required: true, half: true, placeholder: "e.g. Grade 10, or Nurse", showIf },
    { id: `sibling${n}School`, label: `Sibling ${n}'s school / company`, type: "text", required: true, half: true, placeholder: "School or workplace, or N/A", showIf },
  ];
};

// A school's name and the years attended, side by side.
const school = (id: string, label: string, opts: { hint?: string; yearsRequired?: boolean } = {}): Field[] => [
  { id, label, type: "text", required: true, half: true, hint: opts.hint, placeholder: "School name" },
  { id: `${id}Years`, label: "Years attended", type: "text", required: opts.yearsRequired ?? true, half: true, placeholder: "e.g. 2012 – 2018" },
];

const yesWithDetails = (id: string, label: string, detailsLabel: string): Field[] => [
  { id, label, type: "radio", options: YES_NO, required: true },
  { id: `${id}Details`, label: detailsLabel, type: "text", required: true, placeholder: "Please describe briefly", showIf: { field: id, equals: "Yes" } },
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
      { id: "nickname", label: "Nickname", type: "name", required: true, half: true, placeholder: "e.g. Jun" },
      { id: "birthdate", label: "Birthdate", type: "date", required: true, half: true },
      { id: "program", label: "Program", type: "select", options: TERTIARY_COURSES, required: true, half: true },
      { id: "section", label: "Section", type: "text", required: true, half: true, placeholder: "e.g. BSIT 1-101" },
      ...nationality("nationality", "Nationality"),
      { id: "religion", label: "Religion", type: "text", required: true, half: true, placeholder: "e.g. Roman Catholic" },
    ],
  },
  {
    id: "contact",
    title: "Contact information",
    fields: [
      { id: "cellphone", label: "Cellphone number", type: "phone", required: true, half: true, hint: PHONE_HINT, placeholder: PHONE_PLACEHOLDER },
      { id: "homeNumber", label: "Home number", type: "text", half: true, hint: "Landline, numbers only. Optional.", placeholder: "e.g. 0446411234" },
      { id: "email", label: "Email address", type: "text", required: true, half: true, placeholder: "you@stamaria.sti.edu.ph" },
      { id: "altEmail", label: "Alternate email address", type: "text", half: true, placeholder: "Optional" },
      { id: "presentAddress", label: "Present address", type: "text", required: true, placeholder: "House no., street, barangay, city / municipality, province" },
      {
        id: "permanentAddress",
        label: "Permanent address",
        type: "text",
        required: true,
        placeholder: "House no., street, barangay, city / municipality, province",
        copyFrom: { field: "presentAddress", label: "Same as present address" },
      },
      { id: "provincialAddress", label: "Provincial address", type: "text", required: true, hint: "Write N/A if none.", placeholder: "Address in the province, or N/A" },
    ],
  },
  {
    id: "spouse",
    title: "For married students only",
    note: "Leave this page blank if it does not apply to you.",
    fields: [
      { id: "spouseName", label: "Name of spouse (Surname, First name M.I.)", type: "name", placeholder: NAME_PLACEHOLDER },
      { id: "spouseAge", label: "Age of spouse", type: "text", half: true, placeholder: "e.g. 25" },
      { id: "spouseContact", label: "Contact number of spouse", type: "phone", half: true, hint: PHONE_HINT, placeholder: PHONE_PLACEHOLDER },
      { id: "spouseOccupation", label: "Occupation of spouse", type: "radio", options: ["Unemployed"], other: true },
    ],
  },
  {
    id: "family",
    title: "Family background",
    fields: [
      ...parent("Mother", "mother"),
      ...parent("Father", "father"),
      { id: "parentStatus", label: "Status of parent/s", type: "select", options: PARENT_STATUSES, required: true },
      { id: "guardianName", label: "Name of guardian/s (Surname, First name M.I.)", type: "name", required: true, half: true, placeholder: NAME_PLACEHOLDER },
      { id: "guardianContact", label: "Contact number of guardian/s", type: "phone", required: true, half: true, hint: PHONE_HINT, placeholder: PHONE_PLACEHOLDER },
      { id: "familyAddress", label: "Address of parent/s or guardian/s", type: "text", required: true, placeholder: "House no., street, barangay, city / municipality, province" },
    ],
  },
  {
    id: "siblings",
    title: "Sibling information",
    fields: [
      { id: "siblingCount", label: "How many siblings do you have?", type: "radio", options: SIBLING_COUNTS, required: true },
      ...sibling(1),
      ...sibling(2),
      {
        id: "otherSiblings",
        label: "Your other siblings: name / age / gender / program or occupation / school or company, one per line",
        type: "textarea",
        required: true,
        placeholder: "Dela Cruz, Ana B. / 12 / Female / Grade 7 / Sta. Maria National High School",
        showIf: { field: "siblingCount", equals: "More than 2" },
      },
    ],
  },
  {
    id: "emergency",
    title: "Emergency contact",
    fields: [
      { id: "emergencyContact", label: "In case of emergency, contact (Surname, First name M.I.)", type: "name", required: true, placeholder: NAME_PLACEHOLDER },
      { id: "emergencyRelationship", label: "Relationship to you", type: "select", options: RELATIONSHIPS, required: true, half: true },
      { id: "emergencyNumber", label: "Contact number of emergency contact", type: "phone", required: true, half: true, hint: PHONE_HINT, placeholder: PHONE_PLACEHOLDER },
      { id: "emergencyRelationshipOther", label: "Relationship: please specify", type: "text", required: true, placeholder: "e.g. Godmother", showIf: { field: "emergencyRelationship", equals: "Other" } },
    ],
  },
  {
    id: "education",
    title: "Educational background",
    fields: [
      ...school("gradeSchool", "Grade school"),
      ...school("juniorHigh", "Junior high school"),
      ...school("seniorHigh", "Senior high school"),
      ...school("college", "College", { hint: "Write N/A if this is your first college.", yearsRequired: false }),
      ...school("vocational", "Vocational school", { hint: "Write N/A if none.", yearsRequired: false }),
      { id: "extracurricular", label: "Extra-curricular activities from previous schools", type: "textarea", required: true, placeholder: "e.g. Student council, choir, robotics club" },
      { id: "awards", label: "Awards / citations received", type: "textarea", required: true, placeholder: "e.g. With Honors (2024), or N/A" },
      { id: "likedSubjects", label: "Most liked subject/s in school", type: "text", required: true, half: true, placeholder: "e.g. Math, Science" },
      { id: "leastLikedSubjects", label: "Least liked subject/s in school", type: "text", required: true, half: true, placeholder: "e.g. History" },
      { id: "strengths", label: "Your 3 major strengths as a student", type: "textarea", required: true, placeholder: "e.g. Hardworking, good at problem solving, works well with others" },
    ],
  },
  {
    id: "work",
    title: "Work experience",
    note: "Tick the box if you have worked before, starting from your most recent job. Leave it unticked if you haven't.",
    fields: [
      { id: "hasWork", label: "I have work experience", type: "toggle" },
      { id: "company", label: "Company name", type: "text", required: true, half: true, placeholder: "e.g. Jollibee Sta. Maria", showIf: { field: "hasWork", equals: "Yes" } },
      { id: "position", label: "Position", type: "text", required: true, half: true, placeholder: "e.g. Service crew", showIf: { field: "hasWork", equals: "Yes" } },
      { id: "duration", label: "Duration", type: "text", required: true, half: true, placeholder: "e.g. June 2022 – March 2024", showIf: { field: "hasWork", equals: "Yes" } },
      { id: "jobDescription", label: "Job description", type: "text", required: true, half: true, placeholder: "What you did there", showIf: { field: "hasWork", equals: "Yes" } },
      {
        id: "otherWork",
        label: "Other work experience: company / position / duration / job description, one per line",
        type: "textarea",
        placeholder: "Optional",
        showIf: { field: "hasWork", equals: "Yes" },
      },
    ],
  },
  {
    id: "interests",
    title: "Interests and recreational activities",
    fields: [
      { id: "sports", label: "Sports", type: "textarea", required: true, half: true, placeholder: "e.g. Basketball, badminton, or N/A" },
      { id: "hobbies", label: "Hobbies", type: "textarea", required: true, half: true, placeholder: "e.g. Drawing, gaming, reading" },
      { id: "talents", label: "Talents", type: "textarea", required: true, half: true, placeholder: "e.g. Singing, playing guitar" },
      { id: "socioCivic", label: "Other activities: socio-civic", type: "textarea", required: true, half: true, placeholder: "e.g. Church youth group, or N/A" },
      { id: "schoolOrg", label: "Other activities: school organization", type: "textarea", required: true, placeholder: "e.g. Junior Philippine Computer Society, or N/A" },
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
      { id: "familyIllnesses", label: "Common illnesses in your family", type: "textarea", required: true, placeholder: "e.g. Hypertension, diabetes, or N/A" },
      { id: "lastDoctorVisit", label: "When did you last see a doctor?", type: "text", required: true, half: true, placeholder: "e.g. March 2025" },
      { id: "doctorReason", label: "What was your reason for visiting a doctor?", type: "text", required: true, half: true, placeholder: "e.g. Annual check-up" },
      { id: "loss", label: "Any loss you have experienced (e.g. death of a family member or close friend)", type: "textarea", required: true, placeholder: "Share only what you're comfortable with, or N/A" },
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

// A label that makes sense outside the form page, where the field beside it
// isn't visible: "Years attended" becomes "Grade school: years attended".
export function standaloneLabel(field: Field) {
  if (field.id.endsWith("Years")) {
    const school = ALL_FIELDS.find((f) => f.id === field.id.slice(0, -"Years".length));
    if (school) return `${school.label}: years attended`;
  }
  return field.label;
}

// The questions the Guidance Associate reads (consent and certification are
// just the student agreeing), in form order.
export const ANSWER_FIELDS = ALL_FIELDS.filter((f) => f.section !== "consent" && f.section !== "certification");
export const CONFIDENTIAL_FIELDS = new Set(ALL_FIELDS.filter((f) => COLLEGE_CAREER_FORM.find((s) => s.id === f.section)?.confidential).map((f) => f.id));

const MAX_TEXT = 300;
const MAX_TEXTAREA = 2000;
export const OTHER_PREFIX = "Other: ";

export function isShown(field: Field, answers: Answers) {
  if (!field.showIf) return true;
  const v = answers[field.showIf.field];
  const want = field.showIf.equals;
  return typeof v === "string" && (typeof want === "string" ? v === want : want.includes(v));
}

// 09XXXXXXXXX (11 digits) or +639XXXXXXXXX.
export function isPhMobile(s: string) {
  return /^09\d{9}$/.test(s) || /^\+639\d{9}$/.test(s);
}

// Keeps what a phone box may hold: digits, and a + only at the start.
export function phoneChars(s: string) {
  return s.replace(/[^\d+]/g, "").replace(/(?!^)\+/g, "").slice(0, 13);
}

// Capitalises the first letter of every word, including after - ' . and ( ,
// e.g. "dela cruz-santos, juan o'neil" -> "Dela Cruz-Santos, Juan O'Neil".
// Leaves other letters alone so names like "McArthur" stay as typed.
export function capitalizeName(s: string) {
  return s.replace(/(^|[\s\-'’.(,/])(\p{Ll})/gu, (_, before: string, letter: string) => before + letter.toUpperCase());
}

// Letters (any language), spaces and the punctuation names use.
const NAME_CHARS = /^[\p{L}\s.,'’\-()/]+$/u;

// Fills in the newer questions for forms saved before they existed, so an old
// answer isn't hidden (and then dropped) the next time the student saves.
export function withLegacyDefaults(answers: Answers): Answers {
  const a = { ...answers };
  if (a.siblingCount === undefined && (a.sibling1Name || a.sibling2Name || a.otherSiblings)) {
    a.siblingCount = a.otherSiblings ? "More than 2" : a.sibling2Name ? "2" : "1";
  }
  if (a.hasWork === undefined && [a.company, a.position].some((v) => typeof v === "string" && v.trim() && v.trim().toUpperCase() !== "N/A")) {
    a.hasWork = "Yes";
  }
  return a;
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
    if (f.type === "toggle") {
      if (s !== "Yes") errors[f.id] = "Tick the box or leave it empty.";
    } else if (f.type === "phone") {
      if (!isPhMobile(s)) errors[f.id] = "Use numbers only: 09XXXXXXXXX (11 digits) or +639XXXXXXXXX.";
    } else if (f.type === "name") {
      if (!NAME_CHARS.test(s)) errors[f.id] = "Use letters only (spaces, periods, commas, hyphens and apostrophes are fine).";
      else if (s.length > MAX_TEXT) errors[f.id] = `Keep this under ${MAX_TEXT} characters.`;
    } else if (f.id === "email" || f.id === "altEmail") {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s) || s.length > MAX_TEXT) errors[f.id] = "Enter a valid email address.";
    } else if (f.id === "homeNumber") {
      if (!/^\d{7,11}$/.test(s)) errors[f.id] = "Use numbers only, 7 to 11 digits.";
    } else if (f.type === "select" || f.type === "radio") {
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
