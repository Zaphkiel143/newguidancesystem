import type { NextRequest } from "next/server";
import db from "../../../../../lib/db";
import { getCurrentUser } from "../../../../../lib/auth";
import { detectFileType } from "../../../../../lib/documents";

// Opens an uploaded document (kind "document") or a photo the Guidance
// Associate attached (kind "attachment"). Guidance Associates only. Files were
// checked by content when uploaded (PDF, DOCX or image), so the stored type is real.
export async function GET(req: NextRequest, ctx: RouteContext<"/api/files/[kind]/[id]">) {
  const { kind, id } = await ctx.params;
  const user = await getCurrentUser();
  if (!user) return new Response("Not signed in", { status: 401 });
  if (user.role !== "COUNSELOR") return new Response("Not allowed", { status: 403 });

  const file =
    kind === "document"
      ? await db.document.findUnique({ where: { id }, select: { data: true, fileType: true, fileName: true } })
      : kind === "attachment"
        ? await db.attachment.findUnique({ where: { id }, select: { data: true, fileType: true, fileName: true } })
        : null;
  if (!file) return new Response("Not found", { status: 404 });

  // Older uploads stored whatever type the browser claimed, so check the bytes
  // again; anything unrecognised is only ever downloaded, never shown in the page.
  const bytes = Buffer.from(file.data);
  const realType = detectFileType(bytes) ?? "application/octet-stream";
  const viewable = realType === "application/pdf" || realType.startsWith("image/");
  const download = req.nextUrl.searchParams.get("download") === "1" || !viewable;
  const safeName = file.fileName.replace(/["\\r\n]/g, "");

  return new Response(new Uint8Array(bytes), {
    headers: {
      "Content-Type": realType,
      "Content-Disposition": `${download ? "attachment" : "inline"}; filename="${safeName}"`,
      "X-Content-Type-Options": "nosniff",
      "Cache-Control": "private, no-store",
    },
  });
}
