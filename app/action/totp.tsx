"use server";

import QRCode from "qrcode";
import db from "../../lib/db";
import { createSession, dashboardPathForRole } from "../../lib/auth";
import { requireActionUser } from "../../lib/session";
import { currentStep, newTotpSecret, totpUri, verifyTotp } from "../../lib/totp";
import { allow, clientIp, MINUTE } from "../../lib/rateLimit";

// Sign in with an authenticator app instead of an email code

export async function getMyTotpStatus() {
  try {
    const me = await requireActionUser("STUDENT", "FACULTY", "COUNSELOR");
    const row = await db.user.findUnique({ where: { id: me.id }, select: { totpEnabledAt: true } });
    return { enabled: Boolean(row?.totpEnabledAt), since: row?.totpEnabledAt ?? null };
  } catch {
    return { enabled: false, since: null };
  }
}

// Step 1: make a new secret and show it as a QR code
export async function startTotpSetup() {
  try {
    const me = await requireActionUser("STUDENT", "FACULTY", "COUNSELOR");
    if (!me.email) return { success: false as const, error: "Your account needs a school email first." };
    const secret = newTotpSecret();
    await db.user.update({ where: { id: me.id }, data: { totpPending: secret } });
    const uri = totpUri(secret, me.email);
    const qr = await QRCode.toDataURL(uri, { margin: 1, width: 220 });
    return { success: true as const, qr, secret: secret.match(/.{1,4}/g)!.join(" ") };
  } catch (error) {
    console.error("Failed to start authenticator setup:", error);
    return { success: false as const, error: "Couldn't start the setup. Try again." };
  }
}

// Step 2: the person types the code the app shows, proving it's set up right
export async function confirmTotpSetup(code: string) {
  try {
    const me = await requireActionUser("STUDENT", "FACULTY", "COUNSELOR");
    if (!(await allow(`totp-setup:${me.id}`, 10, 15 * MINUTE))) return { success: false, error: "Too many tries. Wait 15 minutes." };
    const row = await db.user.findUnique({ where: { id: me.id }, select: { totpPending: true } });
    if (!row?.totpPending) return { success: false, error: "Start the setup again." };
    const step = verifyTotp(row.totpPending, code);
    if (step === null) return { success: false, error: "That code isn't right. Check the app and try the newest code." };
    await db.user.update({
      where: { id: me.id },
      data: { totpSecret: row.totpPending, totpPending: null, totpLastStep: step, totpEnabledAt: new Date() },
    });
    return { success: true };
  } catch (error) {
    console.error("Failed to confirm authenticator:", error);
    return { success: false, error: "Couldn't save it. Try again." };
  }
}

export async function disableTotp(code: string) {
  try {
    const me = await requireActionUser("STUDENT", "FACULTY", "COUNSELOR");
    if (!(await allow(`totp-setup:${me.id}`, 10, 15 * MINUTE))) return { success: false, error: "Too many tries. Wait 15 minutes." };
    const row = await db.user.findUnique({ where: { id: me.id }, select: { totpSecret: true } });
    if (!row?.totpSecret) return { success: true };
    if (verifyTotp(row.totpSecret, code) === null) return { success: false, error: "Enter the current code from your authenticator app to turn it off." };
    await db.user.update({ where: { id: me.id }, data: { totpSecret: null, totpPending: null, totpLastStep: null, totpEnabledAt: null } });
    return { success: true };
  } catch (error) {
    console.error("Failed to turn off authenticator:", error);
    return { success: false, error: "Couldn't turn it off. Try again." };
  }
}

// Sign-in with email + the authenticator code
export async function signInWithTotp(formData: { email: string; code: string }) {
  try {
    const email = formData.email.trim().toLowerCase();
    const ip = await clientIp();
    if (!(await allow(`totp-login:${email}`, 5, 15 * MINUTE)) || !(await allow(`totp-login-ip:${ip}`, 20, 15 * MINUTE))) {
      return { success: false as const, error: "Too many tries. Wait 15 minutes and try again." };
    }
    const user = await db.user.findUnique({ where: { email } });
    // Same answer whether the email is unknown or the code is wrong
    const wrong = {
      success: false as const,
      error:
        "That code didn't work. Use the code under “E-Gabay STI” in your app (not your STI Microsoft account). If you haven't set it up yet, sign in with an email code, then turn it on from your Profile or My Account page.",
    };
    if (!user?.totpSecret) return wrong;
    const step = verifyTotp(user.totpSecret, formData.code);
    if (step === null || (user.totpLastStep !== null && step <= user.totpLastStep)) return wrong;
    if (user.status !== "ACTIVE") return { success: false as const, error: "This account can't sign in right now. Please contact the guidance office." };

    await db.user.update({ where: { id: user.id }, data: { totpLastStep: Math.max(step, currentStep() - 1) } });
    await createSession(user.id);
    return { success: true as const, redirectTo: dashboardPathForRole(user.role) };
  } catch (error) {
    console.error("Authenticator sign-in failed:", error);
    return { success: false as const, error: "Something went wrong. Please try again." };
  }
}
