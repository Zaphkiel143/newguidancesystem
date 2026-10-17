import type { NextRequest } from "next/server";
import db from "../../../../../lib/db";
import { getCurrentUser } from "../../../../../lib/auth";

const AUDIENCE_FOR: Record<string, string> = {
  STUDENT: "Students",
  FACULTY: "Faculty",
  PARENT: "Parents",
};

// Serves an announcement's photo. Guidance Associates see every photo; others
// only see photos of published announcements meant for them.
export async function GET(_req: NextRequest, ctx: RouteContext<"/api/announcements/[id]/image">) {
  const { id } = await ctx.params;
  const user = await getCurrentUser();
  if (!user) return new Response("Not signed in", { status: 401 });

  const a = await db.announcement.findUnique({
    where: { id },
    select: { imageData: true, imageType: true, isPublished: true, audience: true },
  });
  if (!a?.imageData || !a.imageType) return new Response("Not found", { status: 404 });

  const allowed =
    user.role === "COUNSELOR" || (a.isPublished && (a.audience === "All" || a.audience === AUDIENCE_FOR[user.role]));
  if (!allowed) return new Response("Not found", { status: 404 });

  return new Response(Buffer.from(a.imageData), {
    headers: {
      "Content-Type": a.imageType,
      "X-Content-Type-Options": "nosniff",
      // Never stored by the browser: on a shared lab computer, a later user
      // (or a signed-out one) must not see photos meant for someone else.
      "Cache-Control": "private, no-store",
    },
  });
}
