import type { NextRequest } from "next/server";
import db from "../../../../lib/db";
import { getCurrentUser } from "../../../../lib/auth";
import { detectFileType } from "../../../../lib/documents";

// Opens a supplementary reading material's file for anyone signed in who it
// was shared with (the Guidance Associate sees them all).
const AUDIENCE_FOR: Record<string, string> = { STUDENT: "Students", FACULTY: "Faculty", PARENT: "Parents" };

export async function GET(req: NextRequest, ctx: RouteContext<"/api/reading/[id]">) {
  const { id } = await ctx.params;
  const user = await getCurrentUser();
  if (!user) return new Response("Not signed in", { status: 401 });

  const material = await db.readingMaterial.findUnique({ where: { id }, select: { fileData: true, fileName: true, audience: true } });
  const allowed = material && (user.role === "COUNSELOR" || material.audience === "All" || material.audience === AUDIENCE_FOR[user.role]);
  if (!material?.fileData || !allowed) return new Response("Not found", { status: 404 });

  const bytes = Buffer.from(material.fileData);
  const realType = detectFileType(bytes) ?? "application/octet-stream";
  const viewable = realType === "application/pdf" || realType.startsWith("image/");
  const download = req.nextUrl.searchParams.get("download") === "1" || !viewable;
  const safeName = (material.fileName ?? "reading").replace(/["\\\r\n]/g, "");

  return new Response(new Uint8Array(bytes), {
    headers: {
      "Content-Type": realType,
      "Content-Disposition": `${download ? "attachment" : "inline"}; filename="${safeName}"`,
      "X-Content-Type-Options": "nosniff",
      "Cache-Control": "private, no-store",
    },
  });
}
