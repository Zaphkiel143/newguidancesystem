// Parent / guardian sign-up rules, shared by the browser (so parents see every
// problem at once) and the server action (which never trusts the browser).
// Keep this file free of server-only and browser-only imports.
import { normalizePhone } from "./phone.ts";

export const MIN_PASSWORD = 8;
export const NAME_EXTENSIONS = ["Jr.", "Sr.", "II", "III", "IV", "V"] as const;
export const RELATIONSHIPS = ["Mother", "Father", "Guardian", "Grandparent", "Sibling", "Other relative"] as const;
// Student IDs are 11 digits, e.g. 02000123456.
export const STUDENT_ID_PATTERN = /^\d{11}$/;
export const FIX_FIELDS_MESSAGE = "Some details need fixing. Check the messages under each field.";
export const PHONE_HELP = "11 digits, numbers only: 09XXXXXXXXX, or +639XXXXXXXXX.";

export function cleanName(name: string | undefined): string {
  return (name ?? "").trim().replace(/\s+/g, " ");
}

// Names are letters (any language) plus the spaces, periods, hyphens and
// apostrophes real names use, e.g. "Dela Cruz-Santos", "O'Neil", "Ma. Clara".
const NAME_LETTERS = /^[\p{L}\s.'’-]+$/u;
export const isNameText = (s: string) => NAME_LETTERS.test(s);
// Drops anything a name can't contain, as it's typed.
export const nameChars = (s: string) => s.replace(/[^\p{L}\s.'’-]/gu, "");

// A Philippine mobile number as typed: 09XXXXXXXXX or +639XXXXXXXXX (spaces
// and dashes ignored).
export const isPhMobileInput = (s: string) => /^(09\d{9}|\+639\d{9})$/.test(s.replace(/[\s-]/g, ""));

// Passwords need 8+ characters with both letters and numbers. The strength
// meter also rewards length, mixed case and symbols.
export function passwordProblem(password: string): string | null {
  if (password.length < MIN_PASSWORD) return `Use at least ${MIN_PASSWORD} characters.`;
  if (!/\p{L}/u.test(password) || !/\d/.test(password)) return "Use both letters and numbers.";
  return null;
}

export function passwordStrength(password: string): { score: 0 | 1 | 2 | 3 | 4; label: string } {
  if (!password) return { score: 0, label: "" };
  if (passwordProblem(password)) return { score: 1, label: "Weak" };
  const extras = [password.length >= 12, /[a-z]/.test(password) && /[A-Z]/.test(password), /[^\p{L}\d]/u.test(password)].filter(Boolean).length;
  return extras >= 2 ? { score: 4, label: "Strong" } : extras === 1 ? { score: 3, label: "Good" } : { score: 2, label: "Fair" };
}

// Field keys in on-screen order (used to focus the first bad field).
export const PARENT_SIGNUP_FIELDS = [
  "lastName",
  "firstName",
  "nameExtension",
  "phone",
  "email",
  "password",
  "confirm",
  "childName",
  "childStudentId",
  "relationship",
] as const;

export type ParentSignupInput = {
  lastName: string;
  firstName: string;
  nameExtension: string;
  phone: string;
  email: string;
  password: string;
  confirm?: string; // browser only; checked only when !== undefined
  childStudentId: string;
  childName: string;
  relationship: string;
};

export type ParentSignupField = (typeof PARENT_SIGNUP_FIELDS)[number];
export type ParentSignupErrors = Partial<Record<ParentSignupField, string>>;

export type ParentSignupClean = {
  name: string;
  phone: string; // "+639XXXXXXXXX"
  email: string | null; // trimmed + lowercased, null when blank
  password: string; // unchanged (not trimmed)
  childStudentId: string;
  childName: string;
  relationship: string;
};

export type ParentSignupResult =
  | { ok: true; data: ParentSignupClean }
  | { ok: false; errors: ParentSignupErrors };

const str = (v: unknown): string => String(v ?? "");

// lists defaults to the static arrays above (used by tests and any caller
// that doesn't have live option-list data on hand); callers that do - the
// sign-up form and registerParent - pass the counselor-editable lists
// instead, so a renamed/added choice is recognized without a code change.
export function validateParentSignup(
  input: ParentSignupInput,
  lists: { nameExtensions: readonly string[]; relationships: readonly string[] } = { nameExtensions: NAME_EXTENSIONS, relationships: RELATIONSHIPS }
): ParentSignupResult {
  const src = (input ?? {}) as Partial<ParentSignupInput>;
  const lastName = cleanName(str(src.lastName));
  const firstName = cleanName(str(src.firstName));
  const nameExtension = str(src.nameExtension).trim();
  const phoneRaw = str(src.phone);
  const email = str(src.email).trim().toLowerCase();
  const password = str(src.password);
  const childName = cleanName(str(src.childName));
  const childStudentId = str(src.childStudentId).trim();
  const relationship = str(src.relationship).trim();

  const errors: ParentSignupErrors = {};

  if (!lastName) errors.lastName = "Enter your last name.";
  else if (!isNameText(lastName)) errors.lastName = "Use letters only.";
  else if (lastName.length > 60) errors.lastName = "Keep your last name under 60 characters.";

  if (!firstName) errors.firstName = "Enter your first name.";
  else if (!isNameText(firstName)) errors.firstName = "Use letters only.";
  else if (firstName.length > 60) errors.firstName = "Keep your first name under 60 characters.";

  if (nameExtension !== "" && !lists.nameExtensions.includes(nameExtension)) {
    errors.nameExtension = "Choose a name extension from the list.";
  }

  const phone = isPhMobileInput(phoneRaw) ? normalizePhone(phoneRaw) : null;
  if (!phone) errors.phone = `Enter a Philippine mobile number: ${PHONE_HELP}`;

  if (email && (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))) {
    errors.email = "That isn't a valid email address, like name@gmail.com. You can leave it blank.";
  }

  const weak = passwordProblem(password);
  if (weak) errors.password = `Choose a stronger password. ${weak}`;

  if (src.confirm !== undefined && str(src.confirm) !== password) {
    errors.confirm = "The two passwords don't match.";
  }

  if (childName.length < 3) errors.childName = "Enter your child's full name.";
  else if (childName.length > 120) errors.childName = "Keep your child's name under 120 characters.";

  if (!STUDENT_ID_PATTERN.test(childStudentId)) {
    errors.childStudentId = "Enter your child's 11-digit student ID (numbers only).";
  }

  if (!lists.relationships.includes(relationship)) {
    errors.relationship = "Choose your relationship to the student.";
  }

  if (Object.keys(errors).length > 0 || !phone) return { ok: false, errors };

  return {
    ok: true,
    data: {
      name: cleanName([firstName, lastName, nameExtension].filter(Boolean).join(" ")),
      phone,
      email: email || null,
      password,
      childStudentId,
      childName,
      relationship,
    },
  };
}
