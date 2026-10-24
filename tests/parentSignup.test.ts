import { test } from "node:test";
import assert from "node:assert/strict";
import {
  validateParentSignup,
  cleanName,
  nameChars,
  passwordStrength,
  PARENT_SIGNUP_FIELDS,
  MIN_PASSWORD,
  type ParentSignupInput,
} from "../lib/parentSignup.ts";

const PHONE_ERROR = "Enter a Philippine mobile number: 11 digits, numbers only: 09XXXXXXXXX, or +639XXXXXXXXX.";
const ID_ERROR = "Enter your child's 11-digit student ID (numbers only).";

function valid(): ParentSignupInput {
  return {
    lastName: "Dela Cruz",
    firstName: "Maria",
    nameExtension: "",
    phone: "0917 123 4567",
    email: "",
    password: "secret123",
    confirm: "secret123",
    childStudentId: "02000123456",
    childName: "Juan Dela Cruz",
    relationship: "Mother",
  };
}

function errorsOf(patch: Partial<ParentSignupInput>) {
  const r = validateParentSignup({ ...valid(), ...patch });
  assert.equal(r.ok, false);
  return r.ok ? {} : r.errors;
}

test("valid input is accepted and cleaned", () => {
  const r = validateParentSignup(valid());
  assert.equal(r.ok, true);
  if (!r.ok) return;
  assert.equal(r.data.phone, "+639171234567");
  assert.equal(r.data.email, null);
  assert.equal(r.data.name, "Maria Dela Cruz");
  assert.equal(r.data.relationship, "Mother");
});

test("name extension is appended and whitespace collapsed", () => {
  const r = validateParentSignup({ ...valid(), nameExtension: "Jr.", firstName: "  Maria   Luz ", lastName: " Dela   Cruz " });
  assert.equal(r.ok, true);
  if (r.ok) assert.equal(r.data.name, "Maria Luz Dela Cruz Jr.");
});

test("all-empty input reports every required field at once", () => {
  const r = validateParentSignup({
    lastName: "", firstName: "", nameExtension: "", phone: "", email: "",
    password: "", confirm: "", childStudentId: "", childName: "", relationship: "",
  });
  assert.equal(r.ok, false);
  if (r.ok) return;
  assert.deepEqual(
    Object.keys(r.errors).sort(),
    ["childName", "childStudentId", "firstName", "lastName", "password", "phone", "relationship"].sort(),
  );
});

test("each rule gives its exact message", () => {
  assert.deepEqual(errorsOf({ lastName: "  " }), { lastName: "Enter your last name." });
  assert.deepEqual(errorsOf({ lastName: "a".repeat(61) }), { lastName: "Keep your last name under 60 characters." });
  assert.deepEqual(errorsOf({ firstName: "" }), { firstName: "Enter your first name." });
  assert.deepEqual(errorsOf({ firstName: "a".repeat(61) }), { firstName: "Keep your first name under 60 characters." });
  assert.deepEqual(errorsOf({ nameExtension: "Esq." }), { nameExtension: "Choose a name extension from the list." });
  assert.deepEqual(errorsOf({ lastName: "Dela Cruz2" }), { lastName: "Use letters only." });
  assert.deepEqual(errorsOf({ firstName: "Ma@ria" }), { firstName: "Use letters only." });
  assert.deepEqual(errorsOf({ phone: "12345" }), { phone: PHONE_ERROR });
  assert.deepEqual(errorsOf({ phone: "" }), { phone: PHONE_ERROR });
  assert.deepEqual(errorsOf({ phone: "9171234567" }), { phone: PHONE_ERROR });
  assert.deepEqual(errorsOf({ phone: "091712345678" }), { phone: PHONE_ERROR });
  assert.deepEqual(errorsOf({ email: "a@b" }), { email: "That isn't a valid email address, like name@gmail.com. You can leave it blank." });
  assert.deepEqual(errorsOf({ password: "abc1234", confirm: "abc1234" }), { password: "Choose a stronger password. Use at least 8 characters." });
  assert.deepEqual(errorsOf({ password: "abcdefgh", confirm: "abcdefgh" }), { password: "Choose a stronger password. Use both letters and numbers." });
  assert.deepEqual(errorsOf({ confirm: "different1" }), { confirm: "The two passwords don't match." });
  assert.deepEqual(errorsOf({ childName: "Jo" }), { childName: "Enter your child's full name." });
  assert.deepEqual(errorsOf({ childName: "a".repeat(121) }), { childName: "Keep your child's name under 120 characters." });
  assert.deepEqual(errorsOf({ childStudentId: "ab" }), { childStudentId: ID_ERROR });
  assert.deepEqual(errorsOf({ childStudentId: "02 000" }), { childStudentId: ID_ERROR });
  assert.deepEqual(errorsOf({ childStudentId: "2024-12345" }), { childStudentId: ID_ERROR });
  assert.deepEqual(errorsOf({ relationship: "" }), { relationship: "Choose your relationship to the student." });
});

test("boundaries", () => {
  assert.equal(validateParentSignup({ ...valid(), lastName: "a".repeat(60) }).ok, true);
  assert.equal(validateParentSignup({ ...valid(), childName: "a".repeat(120) }).ok, true);
  assert.equal(validateParentSignup({ ...valid(), childName: "abc" }).ok, true);
  assert.equal(validateParentSignup({ ...valid(), password: "abcdefg1", confirm: "abcdefg1" }).ok, true);
  assert.equal(MIN_PASSWORD, 8);
  assert.equal(validateParentSignup({ ...valid(), childStudentId: "02000123456" }).ok, true);
  assert.ok("childStudentId" in errorsOf({ childStudentId: "0200012345" }));
  assert.ok("childStudentId" in errorsOf({ childStudentId: "020001234567" }));
  assert.equal(validateParentSignup({ ...valid(), phone: "+639171234567" }).ok, true);
  assert.equal(validateParentSignup({ ...valid(), phone: "0917-123-4567" }).ok, true);
  const e254 = "a".repeat(249) + "@b.co";
  assert.equal(e254.length, 254);
  assert.equal(validateParentSignup({ ...valid(), email: e254 }).ok, true);
  assert.ok("email" in errorsOf({ email: "a" + e254 }));
});

test("confirm is skipped when omitted and checked when present", () => {
  const noConfirm: ParentSignupInput = valid();
  delete noConfirm.confirm;
  const r = validateParentSignup(noConfirm);
  assert.equal(r.ok, true);
  const bad = validateParentSignup({ ...noConfirm, password: "short" });
  assert.equal(bad.ok, false);
  if (!bad.ok) assert.equal("confirm" in bad.errors, false);
  assert.deepEqual(Object.keys(errorsOf({ confirm: "nope" })), ["confirm"]);
  // empty confirm with non-empty password is a mismatch
  assert.deepEqual(Object.keys(errorsOf({ confirm: "" })), ["confirm"]);
  // short password and mismatch both reported
  assert.deepEqual(Object.keys(errorsOf({ password: "abc", confirm: "abd" })).sort(), ["confirm", "password"]);
});

test("names keep only the characters names use", () => {
  assert.equal(nameChars("Dela Cruz-Santos 2nd!"), "Dela Cruz-Santos nd");
  assert.equal(nameChars("O'Neil, Ma. Niño"), "O'Neil Ma. Niño");
});

test("password strength grows with length, mixed case and symbols", () => {
  assert.equal(passwordStrength("").label, "");
  assert.equal(passwordStrength("abc").label, "Weak");
  assert.equal(passwordStrength("abcdefg1").label, "Fair");
  assert.equal(passwordStrength("Abcdefg1").label, "Good");
  assert.equal(passwordStrength("Abcdefg1!").label, "Strong");
  assert.equal(passwordStrength("abcdefghijk1!").label, "Strong");
});

test("email is trimmed and lowercased", () => {
  const r = validateParentSignup({ ...valid(), email: "  A@B.CO " });
  assert.equal(r.ok, true);
  if (r.ok) assert.equal(r.data.email, "a@b.co");
});

test("tampered relationship and extension are rejected", () => {
  assert.ok("relationship" in errorsOf({ relationship: "Boss" }));
  assert.ok("nameExtension" in errorsOf({ nameExtension: "Esq." }));
});

test("never throws on missing or odd input", () => {
  const r = validateParentSignup({} as unknown as ParentSignupInput);
  assert.equal(r.ok, false);
  assert.equal(validateParentSignup({ lastName: 5, phone: null, email: {} } as unknown as ParentSignupInput).ok, false);
  assert.equal(validateParentSignup(undefined as unknown as ParentSignupInput).ok, false);
});

test("cleanName", () => {
  assert.equal(cleanName("  a   b "), "a b");
  assert.equal(cleanName(undefined), "");
});

test("PARENT_SIGNUP_FIELDS order", () => {
  assert.equal(PARENT_SIGNUP_FIELDS[0], "lastName");
  assert.equal(PARENT_SIGNUP_FIELDS[PARENT_SIGNUP_FIELDS.length - 1], "relationship");
});
