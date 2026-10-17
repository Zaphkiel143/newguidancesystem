import { headers } from "next/headers";
import db from "./db";

// Simple anti-spam limits kept in the database (works across serverless
// instances). Each call records one event for the key; once a key has `max`
// events inside the window, further calls are refused until older ones expire.
//
//   if (!(await allow(`referral:${me.id}`, 5, HOUR))) return { error: "..." };

export const MINUTE = 60 * 1000;
export const HOUR = 60 * MINUTE;
export const DAY = 24 * HOUR;

export async function allow(key: string, max: number, windowMs: number): Promise<boolean> {
  try {
    const since = new Date(Date.now() - windowMs);
    const recent = await db.rateEvent.count({ where: { key, createdAt: { gte: since } } });
    if (recent >= max) return false;
    await db.rateEvent.create({ data: { key } });
    // Now and then, clear events older than a day so the table stays small.
    if (Math.random() < 0.02) {
      await db.rateEvent.deleteMany({ where: { createdAt: { lt: new Date(Date.now() - DAY) } } });
    }
    return true;
  } catch (error) {
    // Never lock everyone out because the limiter itself failed.
    console.error("[rateLimit] check failed:", error);
    return true;
  }
}

// The visitor's IP address as reported by the hosting platform.
export async function clientIp(): Promise<string> {
  const h = await headers();
  return h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "unknown";
}

export const SLOW_DOWN = "You're doing that too often. Please wait a while and try again.";
