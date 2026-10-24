import type { NextRequest } from "next/server";
import db from "../../../../lib/db";
import { getCurrentUser } from "../../../../lib/auth";

// Someone's profile photo, for the Guidance Associate's Messages list. The URL
// carries a fingerprint of the photo (?v=), so it can be cached until it changes.
export async function GET(_req: NextRequest, ctx: RouteContext<"/api/avatar/[id]">) {
  const { id } = await ctx.params;
  const me = await getCurrentUser();
  if (!me) return new Response("Not signed in", { status: 401 });
  if (me.role !== "COUNSELOR" && me.id !== id) return new Response("Not allowed", { status: 403 });

  const row = await db.user.findUnique({ where: { id }, select: { avatarData: true, avatarType: true } });
  if (!row?.avatarData || !row.avatarType) return new Response(null, { status: 404 });
  return new Response(new Uint8Array(row.avatarData), {
    headers: {
      "Content-Type": row.avatarType,
      "X-Content-Type-Options": "nosniff",
      "Cache-Control": "private, max-age=86400",
    },
  });
}
