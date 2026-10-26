"use server";

import { randomInt } from "crypto";
import { redirect } from "next/navigation";
import db from "../../lib/db";
import { createSession, destroySession, dashboardPathForRole, hashPassword, verifyPassword } from "../../lib/auth";
import { emailConfigured, sendEmail } from "../../lib/email";
import { notifyAdmins, notifyCounselors } from "../../lib/notify";
import { normalizePhone } from "../../lib/phone";
import { cleanName, FIX_FIELDS_MESSAGE, isNameText, validateParentSignup, type ParentSignupErrors } from "../../lib/parentSignup";
import { getOptionList } from "./optionLists";
import { optionValue } from "../../lib/optionListDefaults";
import { allow, clientIp, HOUR, MINUTE } from "../../lib/rateLimit";
import type { UserRole } from "../../lib/generated";
import { SCHOOL_EMAIL_DOMAIN, roleFromSchoolEmail } from "../config/school";
import { gradeSectionLabel, isShs } from "../config/studentLevels";
import { logActivity } from "../../lib/activityLog";
import { ROLE_LABEL } from "../../lib/session";
import { DEMO_EMAILS } from "../../lib/demo";

const DEMO_PASSWORD = "demo1234";

// Demo sign-in is on unless NEXT_PUBLIC_DEMO_LOGIN="false" (set it once real
// accounts can sign in with school-email codes).
const DEMO_LOGIN_ENABLED = process.env.NEXT_PUBLIC_DEMO_LOGIN !== "false";

// Stored names link the demo accounts to the sample records; on screen they
// show as "Demo Account" (lib/demo.ts).
const DEMO_USERS: Record<UserRole, { email: string; name: string }> = {
  ADMIN: { email: DEMO_EMAILS.ADMIN, name: "System Administrator" },
  COUNSELOR: { email: DEMO_EMAILS.COUNSELOR, name: "Ralph Michael" },
  STUDENT: { email: DEMO_EMAILS.STUDENT, name: "Nhel Belarmino" },
  FACULTY: { email: DEMO_EMAILS.FACULTY, name: "Cho Sto Domingo" },
  PARENT: { email: DEMO_EMAILS.PARENT, name: "Mrs. Belarmino" },
};

// Shown when an account exists but can't be used yet (or anymore).
function statusMessage(status: string, role: UserRole) {
  if (status === "PENDING") {
    return role === "PARENT"
      ? "Your parent account is waiting for the guidance office to confirm it. You'll be able to sign in once it's approved."
      : "Your account is waiting for the guidance office to approve it. Try again once it's approved.";
  }
  if (status === "ARCHIVED") return "This account was archived. Please contact the Guidance and Counseling Office to restore it.";
  return "This account can't be used. Please contact the Guidance and Counseling Office.";
}

type LoginResult = { success: true; redirectTo: string } | { success: false; error: string };

// Password sign-in for parents/guardians (mobile number) and demo accounts (email).
export async function login(formData: { identifier: string; password: string }): Promise<LoginResult> {
  try {
    const raw = formData.identifier.trim();
    const phone = normalizePhone(raw);
    // Slows down password guessing: 5 tries per account and 20 per device every 15 minutes.
    const ip = await clientIp();
    if (!(await allow(`login:${phone ?? raw.toLowerCase()}`, 5, 15 * MINUTE)) || !(await allow(`login-ip:${ip}`, 20, 15 * MINUTE))) {
      return { success: false, error: "Too many sign-in attempts. Wait 15 minutes and try again." };
    }
    const user = phone
      ? await db.user.findUnique({ where: { phone } })
      : await db.user.findUnique({ where: { email: raw.toLowerCase() } });

    if (!user || !verifyPassword(formData.password, user.passwordHash)) {
      return { success: false, error: "That number or password isn't right." };
    }
    if (user.status !== "ACTIVE") return { success: false, error: statusMessage(user.status, user.role) };

    await createSession(user.id);
    await logActivity({ name: user.name, roleLabel: ROLE_LABEL[user.role], id: user.id }, "Signed in", "User", user.id);
    return { success: true, redirectTo: dashboardPathForRole(user.role) };
  } catch (error) {
    console.error("Login failed:", error);
    return { success: false, error: "Something went wrong. Please try again." };
  }
}

// ---- Sign in with a school email code ----
//
// A student or staff member enters their school email, receives a 6-digit
// code in their school inbox, and types it back. Owning the mailbox proves
// they belong to the school, without needing Microsoft sign-in (which STI IT
// would have to approve).
//
// Only addresses ending in @SCHOOL_EMAIL_DOMAIN (app/config/school.ts) may use codes.
// COUNSELOR_EMAILS      comma-separated school emails that become Guidance
//                       Associate accounts on first sign-in. Anyone else who
//                       signs up as faculty or guidance waits for approval.

const SCHOOL_DOMAIN = SCHOOL_EMAIL_DOMAIN.toLowerCase();
const CODE_TTL_MS = 10 * 60 * 1000;
const RESEND_AFTER_MS = 30 * 1000;
const MAX_CODES_PER_HOUR = 5;
const MAX_ATTEMPTS = 5;

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function isSchoolEmail(email: string) {
  return /^[^\s@]+@[^\s@]+$/.test(email) && email.endsWith(`@${SCHOOL_DOMAIN}`);
}

function emailList(value: string | undefined) {
  return (value ?? "")
    .split(",")
    .map((e) => normalizeEmail(e))
    .filter(Boolean);
}

// retryAfter (seconds) lets the page restart its resend countdown when the
// server refuses because a code was sent too recently.
type CodeRequestResult = { success: true; email: string } | { success: false; error: string; retryAfter?: number };

export async function requestLoginCode(rawEmail: string): Promise<CodeRequestResult> {
  try {
    const email = normalizeEmail(rawEmail);
    if (!isSchoolEmail(email)) {
      return { success: false, error: `Use your school email (it ends with @${SCHOOL_DOMAIN}).` };
    }

    // In production a code that can never arrive is useless; locally the code is
    // printed to the dev server console for testing.
    if (!emailConfigured && process.env.NODE_ENV === "production") {
      return { success: false, error: "Email sign-in isn't set up on this site yet, so codes can't be delivered." };
    }

    // Per-device limit on top of the per-email one below.
    if (!(await allow(`code-ip:${await clientIp()}`, 15, HOUR))) {
      return { success: false, error: "Too many codes requested from this device. Try again in an hour." };
    }

    const lastHour = new Date(Date.now() - 60 * 60 * 1000);
    const recent = await db.loginCode.findMany({
      where: { email, createdAt: { gte: lastHour } },
      orderBy: { createdAt: "desc" },
    });
    const waitMs = recent[0] ? RESEND_AFTER_MS - (Date.now() - recent[0].createdAt.getTime()) : 0;
    if (waitMs > 0) {
      // Clamped so a clock difference between server and database can't ask for more than the full wait.
      const retryAfter = Math.min(Math.ceil(waitMs / 1000), RESEND_AFTER_MS / 1000);
      return { success: false, error: "A code was just sent. You can ask for another one when the timer runs out.", retryAfter };
    }
    if (recent.length >= MAX_CODES_PER_HOUR) {
      return { success: false, error: "Too many codes requested. Try again in an hour." };
    }

    const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
    // Older unused codes stop working once a new one is issued.
    await db.loginCode.updateMany({ where: { email, usedAt: null }, data: { usedAt: new Date() } });
    const issued = await db.loginCode.create({
      data: { email, codeHash: hashPassword(code), expiresAt: new Date(Date.now() + CODE_TTL_MS) },
    });

    const status = await sendEmail(
      email,
      "Your E-Gabay sign-in code",
      `Your E-Gabay sign-in code is ${code}.\n\nIt expires in 10 minutes and can only be used once. If you didn't try to sign in, you can ignore this email.\n\n— Guidance and Counseling Office, STI College Sta. Maria`,
      { logBody: "[sign-in code email; code not stored]" }
    );
    if (status === "FAILED") {
      // A code that never went out mustn't start the resend wait or use up the hourly limit.
      await db.loginCode.delete({ where: { id: issued.id } }).catch(() => {});
      return { success: false, error: "We couldn't send the code to your email. Try again in a moment; if it keeps failing, tell the guidance office." };
    }

    return { success: true, email };
  } catch (error) {
    console.error("Failed to send login code:", error);
    return { success: false, error: "Something went wrong. Please try again." };
  }
}

// Who someone says they are on the login page. Students get in right away;
// faculty and guidance staff wait for the Guidance Associate to approve them.
export type SignInAs = "STUDENT" | "FACULTY" | "COUNSELOR";

export type StudentDetails = {
  studentId: string;
  department: string;
  yearLevel: string;
  program: string;
  section: string;
};

type CodeVerifyResult =
  | { success: true; redirectTo: string; role: UserRole }
  | { success: false; needsDetails: true }
  | { success: false; pending: true; message: string }
  | { success: false; error: string };

// First sign-in creates the account. Records across the system are linked by
// name, so we ask for it (and, for students, their school details) rather than guess.
export async function verifyLoginCode(formData: {
  email: string;
  code: string;
  signInAs: SignInAs;
  fullName?: string;
  student?: StudentDetails;
}): Promise<CodeVerifyResult> {
  try {
    const email = normalizeEmail(formData.email);
    const code = formData.code.replace(/\D/g, "");
    if (!isSchoolEmail(email) || code.length !== 6) {
      return { success: false, error: "Enter the 6-digit code from your email." };
    }

    const entry = await db.loginCode.findFirst({
      where: { email, usedAt: null, expiresAt: { gt: new Date() } },
      orderBy: { createdAt: "desc" },
    });
    if (!entry) return { success: false, error: "That code has expired. Ask for a new one." };
    if (entry.attempts >= MAX_ATTEMPTS) {
      return { success: false, error: "Too many wrong tries. Ask for a new code." };
    }

    if (!verifyPassword(code, entry.codeHash)) {
      // An older code (expired, or replaced by "Resend code") is no longer valid;
      // say so instead of calling it wrong, so the user knows to use the new one.
      const older = await db.loginCode.findMany({
        where: { email, id: { not: entry.id }, createdAt: { gt: new Date(Date.now() - 24 * 60 * 60 * 1000) } },
        orderBy: { createdAt: "desc" },
        take: 5,
      });
      if (older.some((o) => verifyPassword(code, o.codeHash))) {
        return { success: false, error: "That code has expired. Ask for a new one." };
      }
      await db.loginCode.update({ where: { id: entry.id }, data: { attempts: { increment: 1 } } });
      const left = MAX_ATTEMPTS - entry.attempts - 1;
      return { success: false, error: left > 0 ? `That code isn't right. ${left} ${left === 1 ? "try" : "tries"} left.` : "Too many wrong tries. Ask for a new code." };
    }

    let user = await db.user.findUnique({ where: { email } });
    let isNewAccount = false;

    if (!user) {
      const created = await createSchoolAccount(email, formData);
      if ("needsDetails" in created || "error" in created) return { success: false, ...created } as CodeVerifyResult;
      user = created.user;
      isNewAccount = true;
    }

    // The code is used up whether or not the account can sign in yet.
    await db.loginCode.update({ where: { id: entry.id }, data: { usedAt: new Date() } });

    const actor = { name: user.name, roleLabel: ROLE_LABEL[user.role], id: user.id };
    if (isNewAccount) await logActivity(actor, "Created their account", "User", user.id);

    if (user.status !== "ACTIVE") {
      return { success: false, pending: true, message: statusMessage(user.status, user.role) };
    }

    await createSession(user.id);
    await logActivity(actor, "Signed in", "User", user.id);
    return { success: true, redirectTo: dashboardPathForRole(user.role), role: user.role };
  } catch (error) {
    console.error("Failed to verify login code:", error);
    return { success: false, error: "Something went wrong. Please try again." };
  }
}

async function createSchoolAccount(
  email: string,
  formData: { signInAs: SignInAs; fullName?: string; student?: StudentDetails }
) {
  // A Guidance Associate may already have an inventory record with this email.
  const existingProfile = await db.studentProfile.findFirst({ where: { email } });
  // SUPER_ADMIN_EMAILS and COUNSELOR_EMAILS (comma-separated) get those roles on first sign-in.
  const isListedAdmin = emailList(process.env.SUPER_ADMIN_EMAILS).includes(email);
  const isListedCounselor = emailList(process.env.COUNSELOR_EMAILS).includes(email);

  // The email's format settles student vs faculty when it can (see
  // roleFromSchoolEmail); guidance staff use faculty-style emails, so they can
  // still ask for a guidance account.
  const fromEmail = roleFromSchoolEmail(email);
  const role: UserRole = isListedAdmin
    ? "ADMIN"
    : isListedCounselor
    ? "COUNSELOR"
    : existingProfile || fromEmail === "STUDENT"
      ? "STUDENT"
      : fromEmail === "FACULTY"
        ? formData.signInAs === "COUNSELOR" ? "COUNSELOR" : "FACULTY"
        : formData.signInAs === "FACULTY" || formData.signInAs === "COUNSELOR"
          ? formData.signInAs
          : "STUDENT";

  const name = existingProfile?.name ?? cleanName(formData.fullName);
  const needsStudentDetails = role === "STUDENT" && !existingProfile;
  if (!name || (needsStudentDetails && !formData.student)) return { needsDetails: true as const };
  if (name.length < 3 || !name.includes(" ")) return { error: "Enter your first and last name." };
  if (!existingProfile && !isNameText(name)) return { error: "Use letters only in your name." };

  // Approved right away: listed admins and counselors, and students. Self-declared
  // faculty and guidance staff wait for the Super Admin to approve them.
  const status = role === "STUDENT" || isListedAdmin || isListedCounselor ? "ACTIVE" : "PENDING";

  if (needsStudentDetails) {
    const problem = await checkStudentDetails(formData.student!);
    if (problem) return { error: problem };
    const s = formData.student!;
    const studentId = s.studentId.trim();

    const [sameId, sameName] = await Promise.all([
      db.studentProfile.findUnique({ where: { studentId } }),
      db.studentProfile.findUnique({ where: { name } }),
    ]);
    if (sameId && sameId.email && sameId.email !== email) {
      return { error: "That student ID is already registered to another account. Please see the guidance office." };
    }
    if (sameName && sameName.studentId !== studentId) {
      return { error: "A student with that name is already on record with a different ID. Please see the guidance office." };
    }

    const user = await db.$transaction(async (tx) => {
      const created = await tx.user.create({
        data: { email, name, role, status, passwordHash: "code-login-only" },
      });
      const details = {
        department: s.department,
        yearLevel: s.yearLevel,
        section: s.section.trim(),
        strandOrProgram: s.program,
        gradeSection: gradeSectionLabel(s.yearLevel, s.section),
        email,
      };
      if (sameId) {
        // The office already has this student's record (by ID): link it, keep their name.
        await tx.studentProfile.update({ where: { id: sameId.id }, data: { ...details } });
      } else {
        await tx.studentProfile.create({ data: { studentId, name, ...details } });
      }
      return created;
    });
    return { user };
  }

  const user = await db.user.create({
    // Code-only accounts can't use the password form.
    data: { email, name, role, status, passwordHash: "code-login-only" },
  });
  if (status === "PENDING") {
    await notifyAdmins({
      title: `New ${role === "FACULTY" ? "faculty" : "guidance staff"} account to approve`,
      body: `${name} (${email})`,
      href: "/admin_accounts",
    });
  }
  return { user };
}

async function checkStudentDetails(s: StudentDetails): Promise<string | null> {
  if (!/^[A-Za-z0-9-]{4,20}$/.test(s.studentId.trim())) return "Enter your student ID number (letters, numbers and dashes only).";
  const [departments, shsGrades, tertiaryYears, shsStrands, tertiaryCourses] = await Promise.all([
    getOptionList("departments"),
    getOptionList("shsGrades"),
    getOptionList("tertiaryYears"),
    getOptionList("shsStrands"),
    getOptionList("tertiaryCourses"),
  ]);
  if (!departments.some((d) => optionValue(d) === s.department)) return "Choose Senior High School, Tertiary, Irregular, or Off Term.";
  const levels = isShs(s.department) ? shsGrades : tertiaryYears;
  if (!levels.some((l) => optionValue(l) === s.yearLevel)) return "Choose your grade or year level.";
  const programs = isShs(s.department) ? shsStrands : tertiaryCourses;
  if (!programs.some((p) => optionValue(p) === s.program)) return "Choose your strand or course.";
  if (!s.section.trim() || s.section.trim().length > 30) return "Enter your section.";
  return null;
}

// ---- Parent / guardian accounts ----
//
// Parents don't have school emails. They register with their mobile number and
// their child's student ID; the Guidance Associate checks the ID against the
// Individual Inventory and approves the account before it can be used.

export async function registerParent(formData: {
  lastName: string;
  firstName: string;
  nameExtension: string;
  phone: string;
  email: string;
  password: string;
  childStudentId: string;
  childName: string;
  relationship: string;
  // Hidden field people never see; bots that fill every field get caught.
  website?: string;
}): Promise<{ success: true } | { success: false; error: string; fieldErrors?: ParentSignupErrors }> {
  try {
    if (formData.website) return { success: true }; // quietly ignore bots

    // Same rules the form runs in the browser. Checked before the rate limit so a typo doesn't use up a sign-up.
    const [nameExtensions, relationships] = await Promise.all([getOptionList("nameExtensions"), getOptionList("relationships")]);
    const check = validateParentSignup(formData, {
      nameExtensions: nameExtensions.map(optionValue),
      relationships: relationships.map(optionValue),
    });
    if (!check.ok) return { success: false, error: FIX_FIELDS_MESSAGE, fieldErrors: check.errors };

    if (!(await allow(`register-ip:${await clientIp()}`, 3, HOUR))) {
      return { success: false, error: "Too many sign-ups from this device. Try again in an hour." };
    }
    const { name, phone, email, password, childStudentId, childName, relationship } = check.data;

    // A parent account the guidance office declined doesn't hold on to its
    // number: signing up again with it replaces that account with a new
    // request (old child links and sessions go with it).
    const samePhone = await db.user.findUnique({ where: { phone }, select: { id: true, role: true, status: true } });
    const declined = samePhone?.role === "PARENT" && samePhone.status === "REJECTED" ? samePhone : null;

    const duplicates: ParentSignupErrors = {};
    if (samePhone && !declined) {
      duplicates.phone = "That mobile number already has an account. Sign in instead.";
    }
    const sameEmail = email ? await db.user.findUnique({ where: { email }, select: { id: true } }) : null;
    if (sameEmail && sameEmail.id !== declined?.id) {
      duplicates.email = "That email is already used by another account. Leave it blank or use another.";
    }
    if (Object.keys(duplicates).length > 0) {
      return { success: false, error: FIX_FIELDS_MESSAGE, fieldErrors: duplicates };
    }

    const account = {
      name,
      phone,
      email,
      role: "PARENT" as const,
      status: "PENDING",
      passwordHash: hashPassword(password),
      childLinks: { create: { studentIdNumber: childStudentId, childName, relationship } },
    };
    const parent = declined
      ? await db.$transaction(async (tx) => {
          await tx.parentChildLink.deleteMany({ where: { parentId: declined.id } });
          await tx.session.deleteMany({ where: { userId: declined.id } });
          return tx.user.update({
            where: { id: declined.id },
            data: { ...account, avatarData: null, avatarType: null, privacyAcceptedAt: null },
          });
        })
      : await db.user.create({ data: account });
    await logActivity({ name, roleLabel: ROLE_LABEL.PARENT, id: parent.id }, "Registered a parent account", "User", parent.id, childName);

    await notifyCounselors({
      title: "New parent account to confirm",
      body: `${name} says they are the ${relationship.toLowerCase()} of ${childName} (ID ${childStudentId}).`,
      href: "/accounts",
    });
    return { success: true };
  } catch (error) {
    console.error("Parent registration failed:", error);
    return { success: false, error: "Something went wrong. Please try again." };
  }
}

// Forgot password (parents only; everyone else signs in with an emailed code).
// With an email on file the parent gets a reset code; otherwise the Super Admin is asked to help.

const RESET_KEY = (userId: string) => `reset:${userId}`;

type ResetRequestResult = { success: true; emailed: boolean } | { success: false; error: string };

export async function requestParentReset(rawPhone: string): Promise<ResetRequestResult> {
  try {
    const phone = normalizePhone(rawPhone);
    if (!phone) return { success: false, error: "Enter a valid mobile number, like 0917 123 4567." };
    if (!(await allow(`reset:${phone}`, 3, HOUR)) || !(await allow(`reset-ip:${await clientIp()}`, 10, HOUR))) {
      return { success: false, error: "Too many reset requests. Try again in an hour." };
    }
    const user = await db.user.findUnique({ where: { phone }, select: { id: true, name: true, email: true, role: true, status: true } });
    // Same answer whether or not the number has an account.
    if (!user || user.role !== "PARENT" || user.status !== "ACTIVE") return { success: true, emailed: false };

    if (!user.email) {
      await notifyAdmins({ title: "A parent forgot their password", body: `${user.name} (${rawPhone.trim()}) asked for a password reset.`, href: "/admin_accounts" });
      return { success: true, emailed: false };
    }
    const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
    await db.loginCode.updateMany({ where: { email: RESET_KEY(user.id), usedAt: null }, data: { usedAt: new Date() } });
    const issued = await db.loginCode.create({
      data: { email: RESET_KEY(user.id), codeHash: hashPassword(code), expiresAt: new Date(Date.now() + CODE_TTL_MS) },
    });
    const status = await sendEmail(
      user.email,
      "Reset your E-Gabay password",
      `Your E-Gabay password reset code is ${code}.\n\nIt expires in 10 minutes. If you didn't ask to reset your password, you can ignore this email.\n\n— Guidance and Counseling Office, STI College Sta. Maria`,
      { logBody: "[password reset email; code not stored]" }
    );
    if (status === "FAILED") {
      await db.loginCode.delete({ where: { id: issued.id } }).catch(() => {});
      return { success: false, error: "We couldn't send the email. Try again in a moment." };
    }
    return { success: true, emailed: true };
  } catch (error) {
    console.error("Password reset request failed:", error);
    return { success: false, error: "Something went wrong. Please try again." };
  }
}

export async function finishParentReset(formData: { phone: string; code: string; password: string }): Promise<LoginResult> {
  try {
    const phone = normalizePhone(formData.phone);
    const code = formData.code.replace(/\D/g, "");
    if (!phone || code.length !== 6) return { success: false, error: "Enter the 6-digit code from your email." };
    if (formData.password.length < 8) return { success: false, error: "Use a new password with at least 8 characters." };
    const user = await db.user.findUnique({ where: { phone } });
    if (!user || user.role !== "PARENT" || user.status !== "ACTIVE") return { success: false, error: "That code isn't right." };

    const entry = await db.loginCode.findFirst({
      where: { email: RESET_KEY(user.id), usedAt: null, expiresAt: { gt: new Date() } },
      orderBy: { createdAt: "desc" },
    });
    if (!entry) return { success: false, error: "That code has expired. Ask for a new one." };
    if (entry.attempts >= MAX_ATTEMPTS) return { success: false, error: "Too many wrong tries. Ask for a new code." };
    if (!verifyPassword(code, entry.codeHash)) {
      await db.loginCode.update({ where: { id: entry.id }, data: { attempts: { increment: 1 } } });
      return { success: false, error: "That code isn't right." };
    }

    await db.loginCode.update({ where: { id: entry.id }, data: { usedAt: new Date() } });
    await db.user.update({ where: { id: user.id }, data: { passwordHash: hashPassword(formData.password) } });
    // Other devices are signed out.
    await db.session.deleteMany({ where: { userId: user.id } });
    const actor = { name: user.name, roleLabel: ROLE_LABEL.PARENT, id: user.id };
    await logActivity(actor, "Reset their password", "User", user.id);
    await createSession(user.id);
    await logActivity(actor, "Signed in", "User", user.id);
    return { success: true, redirectTo: dashboardPathForRole(user.role) };
  } catch (error) {
    console.error("Password reset failed:", error);
    return { success: false, error: "Something went wrong. Please try again." };
  }
}

// One-click demo access — lazily creates the demo account for that role the
// first time it's used, then logs into it.
// Turn off with NEXT_PUBLIC_DEMO_LOGIN="false" before real use.
export async function loginAsDemo(role: UserRole) {
  if (!DEMO_LOGIN_ENABLED) throw new Error("Demo sign-in is turned off.");
  const demo = DEMO_USERS[role];

  const user = await db.user.upsert({
    where: { email: demo.email },
    update: {
      name: demo.name,
      role,
      passwordHash: hashPassword(DEMO_PASSWORD),
      status: "ACTIVE",
    },
    create: {
      email: demo.email,
      name: demo.name,
      role,
      status: "ACTIVE",
      passwordHash: hashPassword(DEMO_PASSWORD),
    },
  });

  // The demo parent is linked to the sample students whose inventory record
  // names them as parent, so the parent pages have a child to show.
  if (role === "PARENT") {
    const children = await db.studentProfile.findMany({ where: { parentName: demo.name } });
    for (const child of children) {
      await db.parentChildLink.upsert({
        where: { parentId_studentIdNumber: { parentId: user.id, studentIdNumber: child.studentId } },
        update: {
          childName: child.name,
          relationship: "Mother",
          status: "APPROVED",
          studentProfileId: child.id,
          reviewedAt: new Date(),
        },
        create: {
          parentId: user.id,
          studentIdNumber: child.studentId,
          childName: child.name,
          relationship: "Mother",
          status: "APPROVED",
          studentProfileId: child.id,
          reviewedAt: new Date(),
        },
      });
    }
  }

  await createSession(user.id);
  redirect(dashboardPathForRole(user.role));
}

export async function logout() {
  await destroySession();
  redirect("/Login");
}
