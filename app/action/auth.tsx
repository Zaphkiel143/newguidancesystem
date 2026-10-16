"use server";

import { randomInt } from "crypto";
import { redirect } from "next/navigation";
import db from "../../lib/db";
import { createSession, destroySession, dashboardPathForRole, hashPassword, verifyPassword } from "../../lib/auth";
import { emailConfigured, sendEmail } from "../../lib/email";
import type { UserRole } from "../../lib/generated";
import { SCHOOL_EMAIL_DOMAIN } from "../config/school";

const DEMO_PASSWORD = "demo1234";

const DEMO_USERS: Record<UserRole, { email: string; name: string }> = {
  COUNSELOR: { email: "counselor@sti.edu", name: "Ralph Michael" },
  STUDENT: { email: "student@sti.edu", name: "Nhel Belarmino" },
  FACULTY: { email: "faculty@sti.edu", name: "Cho Sto Domingo" },
  PARENT: { email: "parent@sti.edu", name: "Mrs. Belarmino" },
};

type LoginResult = { success: true; redirectTo: string } | { success: false; error: string };

// Password sign-in, kept for parents/guardians (they don't have school emails).
export async function login(formData: { email: string; password: string }): Promise<LoginResult> {
  try {
    const user = await db.user.findUnique({ where: { email: formData.email.trim().toLowerCase() } });

    if (!user || !verifyPassword(formData.password, user.passwordHash)) {
      return { success: false, error: "Invalid email or password." };
    }

    await createSession(user.id);
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
//                       Associate accounts on first sign-in; everyone else
//                       starts as a student (changeable on the Accounts page)

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

    // In production a code that can never arrive is useless; locally the code is
    // printed to the dev server console for testing.
    if (!emailConfigured && process.env.NODE_ENV === "production") {
      return { success: false, error: "Email sign-in isn't set up on this site yet, so codes can't be delivered. Use a demo account below." };
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
    // Older unused codes stop working once a new one is issued.
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

type CodeVerifyResult =
  | { success: true; redirectTo: string }
  | { success: false; needsName: true }
  | { success: false; error: string };

// fullName is only needed the first time someone signs in (no account yet);
// records across the system are linked by name, so we ask rather than guess.
export async function verifyLoginCode(formData: { email: string; code: string; fullName?: string }): Promise<CodeVerifyResult> {
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
      await db.loginCode.update({ where: { id: entry.id }, data: { attempts: { increment: 1 } } });
      const left = MAX_ATTEMPTS - entry.attempts - 1;
      return { success: false, error: left > 0 ? `That code isn't right. ${left} ${left === 1 ? "try" : "tries"} left.` : "Too many wrong tries. Ask for a new code." };
    }

    let user = await db.user.findUnique({ where: { email } });

    if (!user) {
      // A Guidance Associate may already have an inventory record with this email.
      const profile = await db.studentProfile.findFirst({ where: { email } });
      const name = profile?.name ?? formData.fullName?.trim().replace(/\s+/g, " ");
      if (!name) return { success: false, needsName: true }; // code stays valid for this step
      if (name.length < 3) return { success: false, error: "Enter your full name." };

      user = await db.user.create({
        data: {
          email,
          name,
          role: counselorEmailList().includes(email) ? "COUNSELOR" : "STUDENT",
          // Code-only accounts can't use the password form.
          passwordHash: "code-login-only",
        },
      });
    }

    await db.loginCode.update({ where: { id: entry.id }, data: { usedAt: new Date() } });
    await createSession(user.id);
    return { success: true, redirectTo: dashboardPathForRole(user.role) };
  } catch (error) {
    console.error("Failed to verify login code:", error);
    return { success: false, error: "Something went wrong. Please try again." };
  }
}

// One-click demo access — lazily creates the demo account for that role the
// first time it's used, then logs into it. Keeps the existing "Quick Demo
// Access" shortcuts working now that real sessions are enforced.
// Remove the demo buttons before deploying for real use.
export async function loginAsDemo(role: UserRole) {
  const demo = DEMO_USERS[role];

  const user = await db.user.upsert({
    where: { email: demo.email },
    update: {},
    create: {
      email: demo.email,
      name: demo.name,
      role,
      passwordHash: hashPassword(DEMO_PASSWORD),
    },
  });

  await createSession(user.id);
  redirect(dashboardPathForRole(user.role));
}

export async function logout() {
  await destroySession();
  redirect("/Login");
}
