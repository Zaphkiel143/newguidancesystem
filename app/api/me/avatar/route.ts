import db from "../../../../lib/db";
import { getCurrentUser } from "../../../../lib/auth";

// The signed-in user's own profile photo. Never another user's.
export async function GET() {
  const me = await getCurrentUser();
  if (!me?.avatarType) return new Response(null, { status: 404 });
  const row = await db.user.findUnique({ where: { id: me.id }, select: { avatarData: true, avatarType: true } });
  if (!row?.avatarData || !row.avatarType) return new Response(null, { status: 404 });
  return new Response(new Uint8Array(row.avatarData), {
    headers: {
      "Content-Type": row.avatarType,
      "X-Content-Type-Options": "nosniff",
      // Revalidate every time so a new photo shows right away.
      "Cache-Control": "private, no-cache",
    },
  });
}
