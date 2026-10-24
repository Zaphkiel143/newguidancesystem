"use server";

import { randomInt } from "crypto";
import { redirect } from "next/navigation";
import db from "../../lib/db";
import { createSession, destroySession, dashboardPathForRole, hashPassword, verifyPassword } from "../../lib/auth";
import { emailConfigured, sendEmail } from "../../lib/email";
import { notifyCounselors } from "../../lib/notify";
import { normalizePhone } from "../../lib/phone";
import { cleanName, FIX_FIELDS_MESSAGE, validateParentSignup, type ParentSignupErrors } from "../../lib/parentSignup";
import { allow, clientIp, HOUR, MINUTE } from "../../lib/rateLimit";
import type { UserRole } from "../../lib/generated";
import { SCHOOL_EMAIL_DOMAIN } from "../config/school";
import { DEPARTMENTS, gradeSectionLabel, programsFor, yearLevelsFor } from "../config/studentLevels";
import { logActivity } from "../../lib/activityLog";
import { ROLE_LABEL } from "../../lib/session";

const DEMO_PASSWORD = "demo1234";

// Demo sign-in is on unless NEXT_PUBLIC_DEMO_LOGIN="false"
const DEMO_LOGIN_ENABLED = process.env.NEXT_PUBLIC_DEMO_LOGIN !== "false";

const DEMO_USERS: Record<UserRole, { email: string; name: string }> = {
  COUNSELOR: { email: "counselor@sti.edu", name: "Ralph Michael" },
  STUDENT: { email: "student@sti.edu", name: "Nhel Belarmino" },
  FACULTY: { email: "faculty@sti.edu", name: "Cho Sto Domingo" },
  PARENT: { email: "parent@sti.edu", name: "Mrs. Belarmino" },
};

// Shown when an account exists but can't be used yet (or anymore)
function statusMessage(status: string, role: UserRole) {
  if (status === "PENDING") {
    return role === "PARENT"
      ? "Your parent account is waiting for the guidance office to confirm it. You'll be able to sign in once it's approved."
      : "Your account is waiting for the guidance office to approve it. Try again once it's approved.";
  }
  return "This account can't be used. Please contact the Guidance and Counseling Office.";
}

type LoginResult = { success: true; redirectTo: string } | { success: false; error: string };

// Password sign-in for parents/guardians (mobile number) and demo accounts (email)
export async function login(formData: { identifier: string; password: string }): Promise<LoginResult> {
  try {
    const raw = formData.identifier.trim();
    const phone = normalizePhone(raw);
    // Slows down password guessing: 5 tries per account and 20 per device every 15 minutes
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

// Sign in with a school email code
// Students and staff sign in with a 6-digit code sent to their school email

const SCHOOL_DOMAIN = SCHOOL_EMAIL_DOMAIN.toLowerCase();
const CODE_TTL_MS = 10 * 60 * 1000;
const RESEND_AFTER_MS = 60 * 1000;
const MAX_CODES_PER_HOUR = 5;
const MAX_ATTEMPTS = 5;

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function isSchoolEmail(email: string) {
  return /^[^\s@]+@[^\s@]+$/.test(email) && email.endsWith(`@${SCHOOL_DOMAIN}`);
}

function counselorEmailList() {
  return (process.env.COUNSELOR_EMAILS ?? "")
    .split(",")
    .map((e) => normalizeEmail(e))
    .filter(Boolean);
}

type CodeRequestResult = { success: true; email: string } | { success: false; error: string };

export async function requestLoginCode(rawEmail: string): Promise<CodeRequestResult> {
  try {
    const email = normalizeEmail(rawEmail);
    if (!isSchoolEmail(email)) {
      return { success: false, error: `Use your school email (it ends with @${SCHOOL_DOMAIN}).` };
    }

    // Don't send codes in production when email isn't set up
    if (!emailConfigured && process.env.NODE_ENV === "production") {
      return { success: false, error: "Email sign-in isn't set up on this site yet, so codes can't be delivered." };
    }

    // Per-device limit on top of the per-email one below
    if (!(await allow(`code-ip:${await clientIp()}`, 15, HOUR))) {
      return { success: false, error: "Too many codes requested from this device. Try again in an hour." };
    }

    const lastHour = new Date(Date.now() - 60 * 60 * 1000);
    const recent = await db.loginCode.findMany({
      where: { email, createdAt: { gte: lastHour } },
      orderBy: { createdAt: "desc" },
    });
    if (recent[0] && Date.now() - recent[0].createdAt.getTime() < RESEND_AFTER_MS) {
      return { success: false, error: "A code was just sent. Wait a minute before asking for another one." };
    }
    if (recent.length >= MAX_CODES_PER_HOUR) {
      return { success: false, error: "Too many codes requested. Try again in an hour." };
    }

    const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
    // Older unused codes stop working once a new one is issued
    await db.loginCode.updateMany({ where: { email, usedAt: null }, data: { usedAt: new Date() } });
    await db.loginCode.create({
      data: { email, codeHash: hashPassword(code), expiresAt: new Date(Date.now() + CODE_TTL_MS) },
    });

    const status = await sendEmail(
      email,
      "Your E-Gabay sign-in code",
      `Your E-Gabay sign-in code is ${code}.\n\nIt expires in 10 minutes and can only be used once. If you didn't try to sign in, you can ignore this email.\n\n— Guidance and Counseling Office, STI College Sta. Maria`,
      { logBody: "[sign-in code email; code not stored]" }
    );
    if (status === "FAILED") {
      return { success: false, error: "We couldn't send the code. Try again in a moment." };
    }

    return { success: true, email };
  } catch (error) {
    console.error("Failed to send login code:", error);
    return { success: false, error: "Something went wrong. Please try again." };
  }
}

// Who someone says they are on the login page
export type SignInAs = "STUDENT" | "FACULTY" | "COUNSELOR";

export type StudentDetails = {
  studentId: string;
  department: string;
  yearLevel: string;
  program: string;
  section: string;
};

type CodeVerifyResult =
  | { success: true; redirectTo: string }
  | { success: false; needsDetails: true }
  | { success: false; pending: true; message: string }
  | { success: false; error: string };

// First sign-in creates the account
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
      // An old or replaced code: say it expired instead of calling it wrong
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

    // The code is used up whether or not the account can sign in yet
    await db.loginCode.update({ where: { id: entry.id }, data: { usedAt: new Date() } });

    const actor = { name: user.name, roleLabel: ROLE_LABEL[user.role], id: user.id };
    if (isNewAccount) await logActivity(actor, "Created their account", "User", user.id);

    if (user.status !== "ACTIVE") {
      return { success: false, pending: true, message: statusMessage(user.status, user.role) };
    }

    await createSession(user.id);
    await logActivity(actor, "Signed in", "User", user.id);
    return { success: true, redirectTo: dashboardPathForRole(user.role) };
  } catch (error) {
    console.error("Failed to verify login code:", error);
    return { success: false, error: "Something went wrong. Please try again." };
  }
}

async function createSchoolAccount(
  email: string,
  formData: { signInAs: SignInAs; fullName?: string; student?: StudentDetails }
) {
  // A Guidance Associate may already have an inventory record with this email
  const existingProfile = await db.studentProfile.findFirst({ where: { email } });
  const isListedCounselor = counselorEmailList().includes(email);

  const role: UserRole = isListedCounselor
    ? "COUNSELOR"
    : existingProfile
      ? "STUDENT"
      : formData.signInAs === "FACULTY" || formData.signInAs === "COUNSELOR"
        ? formData.signInAs
        : "STUDENT";

  const name = existingProfile?.name ?? cleanName(formData.fullName);
  const needsStudentDetails = role === "STUDENT" && !existingProfile;
  if (!name || (needsStudentDetails && !formData.student)) return { needsDetails: true as const };
  if (name.length < 3 || !name.includes(" ")) return { error: "Enter your first and last name." };

  // Approved right away: listed counselors and students
  const status = role === "STUDENT" || isListedCounselor ? "ACTIVE" : "PENDING";

  if (needsStudentDetails) {
    const problem = checkStudentDetails(formData.student!);
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
        // The office already has this student's record (by ID): link it, keep their name
        await tx.studentProfile.update({ where: { id: sameId.id }, data: { ...details } });
      } else {
        await tx.studentProfile.create({ data: { studentId, name, ...details } });
      }
      return created;
    });
    return { user };
  }

  const user = await db.user.create({
    // Code-only accounts can't use the password form
    data: { email, name, role, status, passwordHash: "code-login-only" },
  });
  if (status === "PENDING") {
    await notifyCounselors({
      title: `New ${role === "FACULTY" ? "faculty" : "guidance staff"} account to approve`,
      body: `${name} (${email})`,
      href: "/accounts",
    });
  }
  return { user };
}

function checkStudentDetails(s: StudentDetails): string | null {
  if (!/^[A-Za-z0-9-]{4,20}$/.test(s.studentId.trim())) return "Enter your student ID number (letters, numbers and dashes only).";
  if (!(DEPARTMENTS as readonly string[]).includes(s.department)) return "Choose Senior High School, Tertiary, Irregular, or Off Term.";
  if (!yearLevelsFor(s.department).includes(s.yearLevel)) return "Choose your grade or year level.";
  if (!programsFor(s.department).includes(s.program)) return "Choose your strand or course.";
  if (!s.section.trim() || s.section.trim().length > 30) return "Enter your section.";
  return null;
}

// Parent / guardian accounts
// Parents don't have school emails

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
  // Hidden field people never see; bots that fill every field get caught
  website?: string;
}): Promise<{ success: true } | { success: false; error: string; fieldErrors?: ParentSignupErrors }> {
  try {
    if (formData.website) return { success: true }; // quietly ignore bots

    // Same rules the form runs in the browser
    const check = validateParentSignup(formData);
    if (!check.ok) return { success: false, error: FIX_FIELDS_MESSAGE, fieldErrors: check.errors };

    if (!(await allow(`register-ip:${await clientIp()}`, 3, HOUR))) {
      return { success: false, error: "Too many sign-ups from this device. Try again in an hour." };
    }
    const { name, phone, email, password, childStudentId, childName, relationship } = check.data;

    const duplicates: ParentSignupErrors = {};
    if (await db.user.findUnique({ where: { phone } })) {
      duplicates.phone = "That mobile number already has an account. Sign in instead.";
    }
    if (email && (await db.user.findUnique({ where: { email } }))) {
      duplicates.email = "That email is already used by another account. Leave it blank or use another.";
    }
    if (Object.keys(duplicates).length > 0) {
      return { success: false, error: FIX_FIELDS_MESSAGE, fieldErrors: duplicates };
    }

    const parent = await db.user.create({
      data: {
        name,
        phone,
        email,
        role: "PARENT",
        status: "PENDING",
        passwordHash: hashPassword(password),
        childLinks: {
          create: { studentIdNumber: childStudentId, childName, relationship },
        },
      },
    });
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

// One-click demo sign-in; creates the demo account on first use
export async function loginAsDemo(role: UserRole) {
  if (!DEMO_LOGIN_ENABLED) throw new Error("Demo sign-in is turned off.");
  const demo = DEMO_USERS[role];
  // Student, faculty and parent demos show the privacy notice; the Associate demo skips it
  const privacyAcceptedAt = role === "COUNSELOR" ? new Date() : null;

  const user = await db.user.upsert({
    where: { email: demo.email },
    update: {
      name: demo.name,
      role,
      passwordHash: hashPassword(DEMO_PASSWORD),
      status: "ACTIVE",
      privacyAcceptedAt,
    },
    create: {
      email: demo.email,
      name: demo.name,
      role,
      status: "ACTIVE",
      passwordHash: hashPassword(DEMO_PASSWORD),
      privacyAcceptedAt,
    },
  });

  // Link the demo parent to the sample students that list them as parent
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
