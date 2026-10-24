// Parent / guardian sign-up rules, shared by the browser
import { normalizePhone } from "./phone.ts";

export const MIN_PASSWORD = 8;
export const NAME_EXTENSIONS = ["Jr.", "Sr.", "II", "III", "IV", "V"] as const;
export const RELATIONSHIPS = ["Mother", "Father", "Guardian", "Grandparent", "Sibling", "Other relative"] as const;
export const STUDENT_ID_PATTERN = /^[A-Za-z0-9-]{4,20}$/;
export const FIX_FIELDS_MESSAGE = "Some details need fixing. Check the messages under each field.";

export function cleanName(name: string | undefined): string {
  return (name ?? "").trim().replace(/\s+/g, " ");
}

// Field keys in on-screen order (used to focus the first bad field)
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

export function validateParentSignup(input: ParentSignupInput): ParentSignupResult {
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
  else if (lastName.length > 60) errors.lastName = "Keep your last name under 60 characters.";

  if (!firstName) errors.firstName = "Enter your first name.";
  else if (firstName.length > 60) errors.firstName = "Keep your first name under 60 characters.";

  if (nameExtension !== "" && !(NAME_EXTENSIONS as readonly string[]).includes(nameExtension)) {
    errors.nameExtension = "Choose a name extension from the list.";
  }

  const phone = normalizePhone(phoneRaw);
  if (!phone) errors.phone = "Enter a valid mobile number, like 0917 123 4567.";

  if (email && (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))) {
    errors.email = "That email doesn't look right. You can leave it blank.";
  }

  if (password.length < MIN_PASSWORD) errors.password = `Use a password with at least ${MIN_PASSWORD} characters.`;

  if (src.confirm !== undefined && str(src.confirm) !== password) {
    errors.confirm = "The two passwords don't match.";
  }

  if (childName.length < 3) errors.childName = "Enter your child's full name.";
  else if (childName.length > 120) errors.childName = "Keep your child's name under 120 characters.";

  if (!STUDENT_ID_PATTERN.test(childStudentId)) {
    errors.childStudentId = "Enter your child's student ID number (letters, numbers and dashes only).";
  }

  if (!(RELATIONSHIPS as readonly string[]).includes(relationship)) {
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
