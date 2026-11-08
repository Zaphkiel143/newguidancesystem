// Rules for handing over the Guidance Associate role (app/action/handover.tsx).
// Kept free of database and Next.js imports so tests can run them directly.

import { SCHOOL_EMAIL_DOMAIN } from "../app/config/school.ts";

const HOUR_MS = 60 * 60 * 1000;

// How long a handover code works once it can be used.
export const HANDOVER_VALID_MS = 48 * HOUR_MS;
// A claim made while an active Guidance Associate exists waits this long, so
// they're told about it and can cancel it before it works.
export const CLAIM_HOLD_MS = 24 * HOUR_MS;
export const HANDOVER_MAX_ATTEMPTS = 5;

// Easy to read aloud or type: no 0/O, 1/l/I.
const CODE_CHARS = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
export const HANDOVER_CODE_LENGTH = 10;

// randomIndex(n) returns a uniformly random integer in [0, n), e.g. crypto.randomInt.
export function makeHandoverCode(randomIndex: (n: number) => number): string {
  return Array.from({ length: HANDOVER_CODE_LENGTH }, () => CODE_CHARS[randomIndex(CODE_CHARS.length)]).join("");
}

// What the person typed, as stored: upper case, without spaces or dashes.
export function cleanHandoverCode(raw: string): string {
  return raw.toUpperCase().replace(/[\s-]/g, "");
}

// Shown in emails in two halves so it's easier to copy by hand: ABCDE-FGHJK.
export function formatHandoverCode(code: string): string {
  return `${code.slice(0, 5)}-${code.slice(5)}`;
}

export function normalizeSchoolEmail(raw: string): string {
  return raw.trim().toLowerCase();
}

export function isSchoolEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+$/.test(email) && email.endsWith(`@${SCHOOL_EMAIL_DOMAIN.toLowerCase()}`);
}

// When a new handover can first be used and when it stops working.
// A TRANSFER is approved by the current Guidance Associate, so it works right
// away. A CLAIM waits CLAIM_HOLD_MS whenever someone could still object.
export function handoverWindow(
  kind: "TRANSFER" | "CLAIM",
  now: Date,
  activeGuidanceAssociates: number
): { usableAfter: Date; expiresAt: Date } {
  const hold = kind === "CLAIM" && activeGuidanceAssociates > 0 ? CLAIM_HOLD_MS : 0;
  const usableAfter = new Date(now.getTime() + hold);
  return { usableAfter, expiresAt: new Date(usableAfter.getTime() + HANDOVER_VALID_MS) };
}

export type HandoverCheck =
  | { ok: true }
  | { ok: false; reason: "missing" | "used" | "cancelled" | "expired" | "locked" | "waiting" };

// Whether a stored handover can be redeemed now (the code itself is checked separately).
export function checkHandover(
  h: { usedAt: Date | null; cancelledAt: Date | null; expiresAt: Date; usableAfter: Date; attempts: number } | null,
  now: Date
): HandoverCheck {
  if (!h) return { ok: false, reason: "missing" };
  if (h.usedAt) return { ok: false, reason: "used" };
  if (h.cancelledAt) return { ok: false, reason: "cancelled" };
  if (h.expiresAt <= now) return { ok: false, reason: "expired" };
  if (h.attempts >= HANDOVER_MAX_ATTEMPTS) return { ok: false, reason: "locked" };
  if (h.usableAfter > now) return { ok: false, reason: "waiting" };
  return { ok: true };
}
