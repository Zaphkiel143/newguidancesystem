"use server";

import { randomBytes, randomInt } from "crypto";
import { headers } from "next/headers";
import db from "../../lib/db";
import { createSession, dashboardPathForRole, hashPassword, verifyPassword } from "../../lib/auth";
import { requireActionUser } from "../../lib/session";
import { allow, clientIp, MINUTE } from "../../lib/rateLimit";
import { notifyUser } from "../../lib/notify";
import { pushToUser } from "../../lib/push";

// "Approve on my phone" sign-in

const REQUEST_TTL_MS = 2 * 60 * 1000;

function describeDevice(userAgent: string) {
  const os = /Android/i.test(userAgent) ? "Android" : /iPhone|iPad/i.test(userAgent) ? "iPhone/iPad" : /Windows/i.test(userAgent) ? "Windows" : /Mac OS/i.test(userAgent) ? "Mac" : "a device";
  const browser = /Edg\//.test(userAgent) ? "Edge" : /Chrome\//.test(userAgent) ? "Chrome" : /Firefox\//.test(userAgent) ? "Firefox" : /Safari\//.test(userAgent) ? "Safari" : "a browser";
  return `${browser} on ${os}`;
}

// Step 1, on the browser that wants to sign
export async function requestLoginApproval(rawEmail: string) {
  try {
    const email = rawEmail.trim().toLowerCase();
    const ip = await clientIp();
    if (!(await allow(`approve-req:${email}`, 5, 15 * MINUTE)) || !(await allow(`approve-req-ip:${ip}`, 15, 15 * MINUTE))) {
      return { success: false as const, error: "Too many requests. Wait 15 minutes and try again." };
    }
    const user = await db.user.findUnique({ where: { email }, select: { id: true, status: true } });
    const signedInSomewhere = user
      ? await db.session.count({ where: { userId: user.id, expiresAt: { gt: new Date() } } })
      : 0;
    if (!user || user.status !== "ACTIVE" || signedInSomewhere === 0) {
      return {
        success: false as const,
        error: "There's no device signed in to this account to approve from. Use an email code instead.",
      };
    }

    // One pending request at a time per account
    await db.loginRequest.updateMany({ where: { userId: user.id, status: "PENDING" }, data: { status: "DENIED" } });

    const number = randomInt(10, 100);
    const choices = new Set<number>([number]);
    while (choices.size < 3) choices.add(randomInt(10, 100));
    const shuffled = [...choices].sort(() => Math.random() - 0.5);
    const secret = randomBytes(24).toString("hex");
    const device = describeDevice((await headers()).get("user-agent") ?? "");

    const request = await db.loginRequest.create({
      data: {
        userId: user.id,
        number,
        choices: shuffled,
        secretHash: hashPassword(secret),
        device,
        expiresAt: new Date(Date.now() + REQUEST_TTL_MS),
      },
    });

    await notifyUser(user.id, { title: "Approve a sign-in?", body: `Someone is signing in on ${device}. If it's you, open E-Gabay and tap the matching number.` });
    await pushToUser(user.id, {
      title: "Approve sign-in to E-Gabay?",
      body: `Signing in on ${device}. Tap to approve.`,
      url: "/approve-sign-in",
      tag: `login-${request.id}`,
    });

    return { success: true as const, requestId: request.id, secret, number, expiresAt: request.expiresAt };
  } catch (error) {
    console.error("Failed to request sign-in approval:", error);
    return { success: false as const, error: "Something went wrong. Please try again." };
  }
}

// Step 3, the asking browser polls until the request is approved, denied or expires
export async function checkLoginApproval(requestId: string, secret: string) {
  try {
    const request = await db.loginRequest.findUnique({ where: { id: requestId } });
    if (!request || !verifyPassword(secret, request.secretHash)) return { state: "denied" as const };
    if (request.status === "DENIED") return { state: "denied" as const };
    if (request.status === "USED") return { state: "denied" as const };
    if (request.expiresAt < new Date() && request.status === "PENDING") return { state: "expired" as const };
    if (request.status !== "APPROVED") return { state: "waiting" as const };

    const user = await db.user.findUnique({ where: { id: request.userId } });
    if (!user || user.status !== "ACTIVE") return { state: "denied" as const };
    // Single use: only the first poll after approval gets the session
    const { count } = await db.loginRequest.updateMany({ where: { id: request.id, status: "APPROVED" }, data: { status: "USED" } });
    if (count === 0) return { state: "denied" as const };
    await createSession(user.id);
    return { state: "approved" as const, redirectTo: dashboardPathForRole(user.role) };
  } catch (error) {
    console.error("Failed to check sign-in approval:", error);
    return { state: "waiting" as const };
  }
}

// Step 2, on the signed-in phone: what's waiting for this person
export async function getMyLoginRequests() {
  try {
    const me = await requireActionUser();
    return await db.loginRequest.findMany({
      where: { userId: me.id, status: "PENDING", expiresAt: { gt: new Date() } },
      select: { id: true, choices: true, device: true, createdAt: true, expiresAt: true },
      orderBy: { createdAt: "desc" },
      take: 1,
    });
  } catch {
    return [];
  }
}

export async function answerLoginRequest(requestId: string, picked: number | "deny") {
  try {
    const me = await requireActionUser();
    const request = await db.loginRequest.findFirst({ where: { id: requestId, userId: me.id, status: "PENDING", expiresAt: { gt: new Date() } } });
    if (!request) return { success: false, error: "This request has expired." };
    const approved = picked !== "deny" && picked === request.number;
    await db.loginRequest.update({ where: { id: request.id }, data: { status: approved ? "APPROVED" : "DENIED" } });
    if (picked !== "deny" && !approved) return { success: false, error: "That wasn't the number on the other screen, so the sign-in was blocked." };
    return { success: true, approved };
  } catch (error) {
    console.error("Failed to answer sign-in request:", error);
    return { success: false, error: "Something went wrong." };
  }
}

// Push notifications for this device

export async function savePushSubscription(sub: { endpoint: string; keys: { p256dh: string; auth: string } }) {
  try {
    const me = await requireActionUser();
    if (!/^https:\/\//.test(sub.endpoint) || sub.endpoint.length > 1000) return { success: false };
    await db.pushSubscription.upsert({
      where: { endpoint: sub.endpoint },
      update: { userId: me.id, p256dh: sub.keys.p256dh, auth: sub.keys.auth },
      create: { userId: me.id, endpoint: sub.endpoint, p256dh: sub.keys.p256dh, auth: sub.keys.auth },
    });
    return { success: true };
  } catch (error) {
    console.error("Failed to save push subscription:", error);
    return { success: false };
  }
}

export async function removePushSubscription(endpoint: string) {
  try {
    const me = await requireActionUser();
    await db.pushSubscription.deleteMany({ where: { endpoint, userId: me.id } });
    return { success: true };
  } catch {
    return { success: false };
  }
}
