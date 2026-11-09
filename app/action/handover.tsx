"use server";

// ---- Handing over the Guidance Associate role ----
//
// There is no Super Admin. When a Guidance Associate resigns or is replaced,
// the role moves to the new person with a one-time code sent to a school email:
//
// TRANSFER (planned): the current Guidance Associate enters their successor's
//   STI email in My Account. The code goes to that inbox. When the successor
//   redeems it, they become the Guidance Associate and the outgoing account is
//   archived (turned into an archived faculty account, so restoring it later
//   doesn't bring the role back).
//
// CLAIM (the Guidance Associate is gone and can't act): from the sign-in page,
//   the new person enters their STI email. The code goes to the office's own
//   mailbox, GCO_OFFICE_EMAIL, which belongs to the office and is handed to each
//   new Guidance Associate by STI IT. If an active Guidance Associate exists,
//   they're told right away and the code only works after a 24-hour hold, so
//   they can cancel it. On success every other Guidance Associate account is
//   archived, since a password could otherwise still sign them in.
//
// Only a hash of each code is stored; it works once, with at most 5 wrong tries.

import { randomInt } from "crypto";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import db from "../../lib/db";
import { createSession, hashPassword, hasPassword, verifyPassword } from "../../lib/auth";
import { requireActionUser, ROLE_LABEL } from "../../lib/session";
import { sendEmail } from "../../lib/email";
import { notifyUser } from "../../lib/notify";
import { logActivity } from "../../lib/activityLog";
import { allow, clientIp, HOUR } from "../../lib/rateLimit";
import { isDemoUser } from "../../lib/demo";
import { cleanName, isNameText, passwordProblem } from "../../lib/parentSignup";
import {
  checkHandover,
  cleanHandoverCode,
  formatHandoverCode,
  handoverWindow,
  HANDOVER_CODE_LENGTH,
  HANDOVER_MAX_ATTEMPTS,
  isSchoolEmail,
  makeHandoverCode,
  normalizeSchoolEmail,
} from "../../lib/handover";
import { SCHOOL_EMAIL_DOMAIN } from "../config/school";

type Result = { success: true } | { success: false; error: string };

const SIGN_OFF = "\n\n— Guidance and Counseling Office, STI College Sta. Maria";

function officeEmail(): string | null {
  const email = normalizeSchoolEmail(process.env.GCO_OFFICE_EMAIL ?? "");
  return email && isSchoolEmail(email) ? email : null;
}

function fmtWhen(d: Date) {
  return d.toLocaleString("en-PH", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Manila" });
}

async function handoverLink(email: string) {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  if (!host) return null;
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}/handover?email=${encodeURIComponent(email)}`;
}

// Guidance Associates other than the demo one: the people a handover concerns.
async function activeGuidanceAssociates() {
  const all = await db.user.findMany({ where: { role: "COUNSELOR", status: "ACTIVE" }, select: { id: true, name: true, email: true } });
  return all.filter((u) => !isDemoUser(u));
}

// ---- For the signed-in Guidance Associate (My Account) ----

export type HandoverState = {
  canTransfer: boolean;
  officeEmail: string | null;
  pending: { id: string; kind: string; toEmail: string; usableAfter: Date; expiresAt: Date; mine: boolean; onHold: boolean }[];
};

export async function getHandoverState(): Promise<HandoverState | null> {
  try {
    const me = await requireActionUser("COUNSELOR");
    const now = new Date();
    const pending = await db.roleHandover.findMany({
      where: { usedAt: null, cancelledAt: null, expiresAt: { gt: now } },
      orderBy: { createdAt: "desc" },
      select: { id: true, kind: true, toEmail: true, usableAfter: true, expiresAt: true, fromUserId: true },
    });
    return {
      canTransfer: !isDemoUser(me),
      officeEmail: officeEmail(),
      pending: pending.map(({ fromUserId, ...h }) => ({ ...h, mine: fromUserId === me.id, onHold: h.usableAfter > now })),
    };
  } catch {
    return null;
  }
}

export async function startTransfer(rawEmail: string): Promise<Result> {
  try {
    const me = await requireActionUser("COUNSELOR");
    if (isDemoUser(me)) return { success: false, error: "The demo account can't hand over the Guidance Associate role." };
    const toEmail = normalizeSchoolEmail(rawEmail);
    if (!isSchoolEmail(toEmail)) return { success: false, error: `Enter your successor's STI school email (ending in @${SCHOOL_EMAIL_DOMAIN}).` };
    if (toEmail === me.email) return { success: false, error: "Enter your successor's email, not your own." };
    if (!(await allow(`handover:${me.id}`, 5, HOUR))) return { success: false, error: "Too many handover emails. Try again in an hour." };

    const existing = await db.user.findUnique({ where: { email: toEmail }, select: { role: true, status: true } });
    if (existing?.role === "COUNSELOR" && existing.status === "ACTIVE") {
      return { success: false, error: "That person is already a Guidance Associate." };
    }
    if (existing?.role === "PARENT" || existing?.role === "ADMIN") {
      return { success: false, error: "That email belongs to an account that can't become a Guidance Associate." };
    }

    const code = makeHandoverCode(randomInt);
    const { usableAfter, expiresAt } = handoverWindow("TRANSFER", new Date(), 1);
    // Only one invitation from this person at a time: a new one replaces the old.
    await db.roleHandover.updateMany({
      where: { kind: "TRANSFER", fromUserId: me.id, usedAt: null, cancelledAt: null },
      data: { cancelledAt: new Date() },
    });
    const handover = await db.roleHandover.create({
      data: { kind: "TRANSFER", toEmail, fromUserId: me.id, codeHash: hashPassword(code), usableAfter, expiresAt },
    });

    const link = await handoverLink(toEmail);
    const status = await sendEmail(
      toEmail,
      "You're invited to take over as Guidance Associate in E-Gabay",
      `${me.name} invited you to take over the Guidance Associate role in E-Gabay, the guidance system of STI College Sta. Maria.\n\n` +
        `Your handover code is ${formatHandoverCode(code)}\n\n` +
        `${link ? `Open ${link} and enter the code` : `Open the handover page of E-Gabay (/handover) and enter the code`}. ` +
        `It works once and expires on ${fmtWhen(expiresAt)}.\n\n` +
        `When you accept, you'll get full access to the guidance office's records, and ${me.name}'s account will be closed.\n\n` +
        `If you weren't expecting this, ignore this email and tell the guidance office.${SIGN_OFF}`,
      { logBody: `[handover invitation from ${me.name}; code not stored]` }
    );
    if (status === "FAILED") {
      await db.roleHandover.delete({ where: { id: handover.id } }).catch(() => {});
      return { success: false, error: "We couldn't send the email. Check the address and try again." };
    }

    await logActivity(me, "Started a Guidance Associate handover", "RoleHandover", handover.id, toEmail);
    revalidatePath("/my_account");
    return { success: true };
  } catch (error) {
    console.error("Failed to start handover:", error);
    return { success: false, error: "Something went wrong. Try again." };
  }
}

// Any active Guidance Associate can cancel a pending transfer or claim.
export async function cancelHandover(id: string): Promise<Result> {
  try {
    const me = await requireActionUser("COUNSELOR");
    if (isDemoUser(me)) return { success: false, error: "The demo account can't change handovers." };
    const h = await db.roleHandover.findUnique({ where: { id } });
    if (!h || h.usedAt || h.cancelledAt) return { success: false, error: "That handover is no longer pending." };
    await db.roleHandover.update({ where: { id }, data: { cancelledAt: new Date() } });
    await logActivity(me, h.kind === "CLAIM" ? "Cancelled a claim to the Guidance Associate role" : "Cancelled a Guidance Associate handover", "RoleHandover", id, h.toEmail);
    revalidatePath("/my_account");
    return { success: true };
  } catch (error) {
    console.error("Failed to cancel handover:", error);
    return { success: false, error: "Something went wrong. Try again." };
  }
}

// ---- Public: the new Guidance Associate (handover page) ----

export async function isClaimAvailable(): Promise<boolean> {
  return officeEmail() !== null;
}

// Asks for a claim code. The answer is the same whether or not anything was
// sent, so this page can't be used to learn who has accounts.
export async function requestClaim(rawEmail: string): Promise<Result> {
  try {
    const office = officeEmail();
    if (!office) {
      return { success: false, error: "Claiming the role isn't set up on this site. Ask STI IT or the developers to set the guidance office mailbox (GCO_OFFICE_EMAIL)." };
    }
    const toEmail = normalizeSchoolEmail(rawEmail);
    if (!isSchoolEmail(toEmail)) return { success: false, error: `Enter your STI school email (ending in @${SCHOOL_EMAIL_DOMAIN}).` };
    if (!(await allow(`claim-ip:${await clientIp()}`, 3, HOUR)) || !(await allow(`claim:${toEmail}`, 3, HOUR))) {
      return { success: false, error: "Too many requests. Try again in an hour." };
    }

    const existing = await db.user.findUnique({ where: { email: toEmail }, select: { role: true, status: true } });
    const unusable = existing && (existing.role === "PARENT" || existing.role === "ADMIN" || (existing.role === "COUNSELOR" && existing.status === "ACTIVE"));
    if (unusable) return { success: true };

    const current = await activeGuidanceAssociates();
    const code = makeHandoverCode(randomInt);
    const { usableAfter, expiresAt } = handoverWindow("CLAIM", new Date(), current.length);
    // A newer claim for the same email replaces an older one.
    await db.roleHandover.updateMany({ where: { kind: "CLAIM", toEmail, usedAt: null, cancelledAt: null }, data: { cancelledAt: new Date() } });
    const handover = await db.roleHandover.create({
      data: { kind: "CLAIM", toEmail, codeHash: hashPassword(code), usableAfter, expiresAt },
    });

    const held = usableAfter.getTime() > Date.now();
    const status = await sendEmail(
      office,
      "Request to become the Guidance Associate in E-Gabay",
      `Someone asked to become the Guidance Associate in E-Gabay using the school email ${toEmail}.\n\n` +
        `The claim code is ${formatHandoverCode(code)}\n\n` +
        `Only the person who manages this guidance office mailbox should use it. ` +
        (held
          ? `Because a Guidance Associate account is still active, the code starts working on ${fmtWhen(usableAfter)}; they've been told and can cancel it before then. `
          : "") +
        `It expires on ${fmtWhen(expiresAt)}. When it's used, ${toEmail} becomes the Guidance Associate and any other Guidance Associate accounts are closed.\n\n` +
        `If you don't know about this request, ignore this email.${SIGN_OFF}`,
      { logBody: `[claim code for ${toEmail}; code not stored]` }
    );
    if (status === "FAILED") {
      await db.roleHandover.delete({ where: { id: handover.id } }).catch(() => {});
      return { success: false, error: "We couldn't send the email. Try again in a moment." };
    }

    // Anyone currently holding the role is warned and can cancel from My Account.
    for (const ga of current) {
      await notifyUser(ga.id, {
        title: "Someone asked to take over the Guidance Associate role",
        body: `${toEmail} asked for a claim code. If this isn't expected, cancel it in My Account before ${fmtWhen(usableAfter)}.`,
        href: "/my_account#handover",
      });
      await sendEmail(
        ga.email,
        "Someone asked to take over your Guidance Associate role",
        `Hello ${ga.name},\n\n${toEmail} asked to become the Guidance Associate in E-Gabay. A claim code was sent to the guidance office mailbox.\n\n` +
          `If you're still the Guidance Associate and didn't expect this, sign in and cancel it under My Account → Hand over the role before ${fmtWhen(usableAfter)}.${SIGN_OFF}`
      );
    }
    await logActivity({ name: toEmail, roleLabel: "Visitor" }, "Asked to claim the Guidance Associate role", "RoleHandover", handover.id);
    return { success: true };
  } catch (error) {
    console.error("Failed to request claim:", error);
    return { success: false, error: "Something went wrong. Please try again." };
  }
}

type AcceptResult =
  | { success: true; redirectTo: string }
  | { success: false; needsDetails: true }
  | { success: false; needsPassword: true }
  | { success: false; error: string };

const REASON: Record<string, string> = {
  missing: "There's no handover waiting for that email, or its code has expired. Ask for a new one.",
  used: "That code was already used.",
  cancelled: "That handover was cancelled.",
  expired: "That code has expired. Ask for a new one.",
  locked: "Too many wrong tries. Ask for a new code.",
};

export async function acceptHandover(formData: {
  email: string;
  code: string;
  fullName?: string;
  newPassword?: string;
}): Promise<AcceptResult> {
  try {
    const email = normalizeSchoolEmail(formData.email);
    const code = cleanHandoverCode(formData.code);
    if (!isSchoolEmail(email) || code.length !== HANDOVER_CODE_LENGTH) {
      return { success: false, error: "Enter your school email and the 10-character code from the email." };
    }
    if (!(await allow(`handover-accept-ip:${await clientIp()}`, 20, HOUR))) {
      return { success: false, error: "Too many tries from this device. Try again in an hour." };
    }

    const h = await db.roleHandover.findFirst({ where: { toEmail: email }, orderBy: { createdAt: "desc" } });
    const now = new Date();
    const check = checkHandover(h, now);
    if (!check.ok) {
      if (check.reason === "waiting") {
        return { success: false, error: `This claim is on hold so the current Guidance Associate can respond. Try again after ${fmtWhen(h!.usableAfter)}.` };
      }
      return { success: false, error: REASON[check.reason] };
    }
    const handover = h!;
    if (!verifyPassword(code, handover.codeHash)) {
      await db.roleHandover.update({ where: { id: handover.id }, data: { attempts: { increment: 1 } } });
      const left = HANDOVER_MAX_ATTEMPTS - handover.attempts - 1;
      return { success: false, error: left > 0 ? `That code isn't right. ${left} ${left === 1 ? "try" : "tries"} left.` : REASON.locked };
    }

    // The code stays unused until we have everything needed to finish.
    const existing = await db.user.findUnique({ where: { email } });
    if (existing && (existing.role === "PARENT" || existing.role === "ADMIN")) {
      return { success: false, error: "That email belongs to an account that can't become a Guidance Associate." };
    }
    const name = existing?.name ?? cleanName(formData.fullName);
    if (!existing && !formData.fullName) return { success: false, needsDetails: true };
    if (!existing && (name.length < 3 || !name.includes(" ") || !isNameText(name))) return { success: false, error: "Enter your first and last name, in letters." };
    const needsPassword = !existing || !hasPassword(existing.passwordHash);
    if (needsPassword && !formData.newPassword) return { success: false, needsPassword: true };
    if (formData.newPassword !== undefined) {
      const weak = passwordProblem(formData.newPassword);
      if (weak) return { success: false, error: `Choose a stronger password. ${weak}` };
    }

    // Who loses the role: the inviter (TRANSFER), or every other Guidance Associate (CLAIM).
    const outgoing =
      handover.kind === "TRANSFER"
        ? await db.user.findMany({ where: { id: handover.fromUserId ?? "", role: "COUNSELOR" }, select: { id: true, name: true, email: true } })
        : (await activeGuidanceAssociates()).filter((u) => u.email !== email);

    const user = await db.$transaction(async (tx) => {
      // Single use, even if two tabs race: only one update finds it unused.
      const claimed = await tx.roleHandover.updateMany({ where: { id: handover.id, usedAt: null, cancelledAt: null }, data: { usedAt: now } });
      if (claimed.count !== 1) throw new Error("HANDOVER_TAKEN");
      await tx.roleHandover.updateMany({ where: { usedAt: null, cancelledAt: null }, data: { cancelledAt: now } });

      const passwordHash = formData.newPassword ? hashPassword(formData.newPassword) : undefined;
      const newGa = existing
        ? await tx.user.update({
            where: { id: existing.id },
            data: { role: "COUNSELOR", status: "ACTIVE", archivedAt: null, ...(passwordHash ? { passwordHash } : {}) },
          })
        : await tx.user.create({ data: { email, name, role: "COUNSELOR", status: "ACTIVE", passwordHash: passwordHash! } });

      for (const old of outgoing) {
        await tx.user.update({ where: { id: old.id }, data: { role: "FACULTY", status: "ARCHIVED", archivedAt: now } });
        await tx.session.deleteMany({ where: { userId: old.id } });
      }
      // The new Guidance Associate starts fresh on every device.
      await tx.session.deleteMany({ where: { userId: newGa.id } });
      return newGa;
    });

    const actor = { name: user.name, roleLabel: ROLE_LABEL.COUNSELOR, id: user.id };
    await logActivity(
      actor,
      handover.kind === "CLAIM" ? "Claimed the Guidance Associate role" : "Accepted the Guidance Associate handover",
      "RoleHandover",
      handover.id,
      outgoing.length ? `Closed: ${outgoing.map((o) => o.name).join(", ")}` : undefined
    );
    for (const old of outgoing) {
      await sendEmail(
        old.email,
        "Your Guidance Associate access in E-Gabay has ended",
        `Hello ${old.name},\n\n${user.name} (${email}) is now the Guidance Associate in E-Gabay, and your account was closed. ` +
          `If this is a mistake, contact the guidance office or STI IT right away.${SIGN_OFF}`
      );
    }

    await createSession(user.id);
    await logActivity(actor, "Signed in", "User", user.id);
    return { success: true, redirectTo: "/dashboard" };
  } catch (error) {
    if (error instanceof Error && error.message === "HANDOVER_TAKEN") return { success: false, error: REASON.used };
    console.error("Failed to accept handover:", error);
    return { success: false, error: "Something went wrong. Please try again." };
  }
}
