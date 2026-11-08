import { randomInt } from "crypto";
import { NextResponse, type NextRequest } from "next/server";
import db from "../../../../../lib/db";
import { createSession, dashboardPathForRole, hashPassword, hasPassword } from "../../../../../lib/auth";
import { entraConfigured, entraEmailFromCode, entraRedirectUri } from "../../../../../lib/entra";
import { logActivity } from "../../../../../lib/activityLog";
import { ROLE_LABEL } from "../../../../../lib/session";
import { SCHOOL_EMAIL_DOMAIN } from "../../../../config/school";

// Step 2 of "Continue with Microsoft": Microsoft sends the browser back here.
// An existing account with a password signs straight in. A new account, or one
// that still needs a password, goes back to the sign-in page with a one-time
// code (the same kind an email would bring), so it finishes there: details and
// password for a new account, or just a password.
export async function GET(request: NextRequest) {
  const origin = request.nextUrl.origin;
  const back = (params: Record<string, string>) => {
    const response = NextResponse.redirect(`${origin}/Login?${new URLSearchParams(params)}`);
    response.cookies.delete({ name: "entra_attempt", path: "/api/auth/entra" });
    return response;
  };
  if (!entraConfigured()) return back({ entra_error: "off" });

  const q = request.nextUrl.searchParams;
  // e.g. the person pressed Cancel, or the school hasn't allowed the app yet.
  if (q.get("error")) return back({ entra_error: "denied" });

  let attempt: { state: string; nonce: string; verifier: string } | null = null;
  try {
    attempt = JSON.parse(request.cookies.get("entra_attempt")?.value ?? "null");
  } catch {}
  const code = q.get("code");
  if (!attempt || !code || q.get("state") !== attempt.state) return back({ entra_error: "expired" });

  const email = await entraEmailFromCode({ code, verifier: attempt.verifier, nonce: attempt.nonce, redirectUri: entraRedirectUri(origin) }).catch(
    (error) => {
      console.error("Entra sign-in failed:", error);
      return null;
    }
  );
  if (!email) return back({ entra_error: "failed" });
  if (!email.endsWith(`@${SCHOOL_EMAIL_DOMAIN.toLowerCase()}`)) return back({ entra_error: "domain" });

  const user = await db.user.findUnique({ where: { email } });
  if (user && user.status === "ACTIVE" && hasPassword(user.passwordHash)) {
    await createSession(user.id);
    await logActivity({ name: user.name, roleLabel: ROLE_LABEL[user.role], id: user.id }, "Signed in with Microsoft", "User", user.id);
    const response = NextResponse.redirect(`${origin}${dashboardPathForRole(user.role)}`);
    response.cookies.delete({ name: "entra_attempt", path: "/api/auth/entra" });
    return response;
  }

  // Microsoft proved the person owns this mailbox, which is what an email code proves.
  const ticket = String(randomInt(0, 1_000_000)).padStart(6, "0");
  await db.loginCode.updateMany({ where: { email, usedAt: null }, data: { usedAt: new Date() } });
  await db.loginCode.create({ data: { email, codeHash: hashPassword(ticket), expiresAt: new Date(Date.now() + 10 * 60 * 1000) } });
  return back({ entra_email: email, entra_ticket: ticket });
}
