import { randomBytes, randomUUID, scryptSync, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import db from "./db";
import type { UserRole } from "./generated";

const SESSION_COOKIE = "session";
// Signed-in sessions last 30 days and renew while the person keeps using the
// site (proxy.ts renews the cookie; getCurrentUser renews the database row).
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;
const RENEW_WHEN_LEFT_MS = 29 * 24 * 60 * 60 * 1000;

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  const hashBuffer = Buffer.from(hash, "hex");
  const suppliedBuffer = scryptSync(password, salt, 64);
  return hashBuffer.length === suppliedBuffer.length && timingSafeEqual(hashBuffer, suppliedBuffer);
}

export async function createSession(userId: string) {
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);
  const session = await db.session.create({
    data: { token: randomUUID(), userId, expiresAt },
  });

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, session.token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
}

export async function destroySession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (token) {
    await db.session.delete({ where: { token } }).catch(() => {});
  }
  cookieStore.delete(SESSION_COOKIE);
}

export async function getCurrentUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  // The photo bytes are left out here; /api/me/avatar loads them on their own.
  const session = await db.session.findUnique({ where: { token }, include: { user: { omit: { avatarData: true, totpSecret: true, totpPending: true } } } });
  if (!session || session.expiresAt < new Date()) return null;
  // An account the guidance office hasn't approved (or has turned off) can't
  // use an old session either.
  if (session.user.status !== "ACTIVE") return null;

  // Sliding expiry, at most about once a day per session.
  if (session.expiresAt.getTime() - Date.now() < RENEW_WHEN_LEFT_MS) {
    await db.session
      .update({ where: { token }, data: { expiresAt: new Date(Date.now() + SESSION_TTL_MS) } })
      .catch(() => {});
  }

  return session.user;
}

export function dashboardPathForRole(role: UserRole): string {
  switch (role) {
    case "COUNSELOR":
      return "/dashboard";
    case "FACULTY":
      return "/faculty_dashboard";
    case "PARENT":
      // Parents land on the announcements and events feed.
      return "/parent_bulletin";
    case "STUDENT":
      return "/student_dashboard";
  }
}

// Call at the top of a role-scoped layout to enforce that only a signed-in
// user with that exact role can view anything under it.
export async function requireRole(role: UserRole) {
  const user = await getCurrentUser();
  if (!user) redirect("/Login");
  if (user.role !== role) redirect(dashboardPathForRole(user.role));
  return user;
}
