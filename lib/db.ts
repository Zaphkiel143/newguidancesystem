// lib/db.ts
import { cookies } from "next/headers";
import { PrismaClient } from "./generated"; // Points to lib/generated based on your schema output
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const connectionString = process.env.DATABASE_URL;

const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

const base =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter,
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = base;

// Super Admin "View as" is read-only: changes are refused while it's on
export class ViewOnlyError extends Error {
  constructor() {
    super("You're viewing as another user, so nothing can be changed. Exit View as first.");
  }
}

const WRITES = new Set([
  "create", "createMany", "createManyAndReturn", "update", "updateMany", "updateManyAndReturn", "upsert", "delete", "deleteMany",
]);
// Still saved while viewing (sign-in session and rate limits)
const KEEP = new Set(["Session", "RateEvent"]);
// Quietly skipped while viewing, so reading a page doesn't count as the user's own visit
const SKIP = new Set(["AnnouncementView", "RecordAccess", "ActivityLog", "Notification", "PushSubscription"]);

async function isViewingAs() {
  let token: string | undefined;
  try {
    token = (await cookies()).get("session")?.value;
  } catch {
    return false; // outside a request (scripts, build)
  }
  if (!token) return false;
  const s = await base.session.findUnique({ where: { token }, select: { viewAsUserId: true } });
  return Boolean(s?.viewAsUserId);
}

export const prisma = base.$extends({
  query: {
    $allModels: {
      async $allOperations({ model, operation, args, query }) {
        if (WRITES.has(operation) && !KEEP.has(model) && (await isViewingAs())) {
          if (SKIP.has(model)) return (operation.endsWith("Many") ? { count: 0 } : null) as never;
          throw new ViewOnlyError();
        }
        return query(args);
      },
    },
  },
});

export default prisma;
