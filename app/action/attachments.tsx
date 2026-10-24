"use server";

import db from "../../lib/db";
import { revalidatePath } from "next/cache";
import { requireActionUser } from "../../lib/session";
import { checkDocument } from "../../lib/documents";
import { logActivity } from "../../lib/activityLog";

// Photos the Guidance Associate attaches to records

type Kind = "DAILY_LOG" | "GROUP_ATTENDANCE";
const MAX_PER_RECORD = 10;

async function recordExists(kind: Kind, refId: string) {
  if (kind === "DAILY_LOG") return Boolean(await db.appointment.findUnique({ where: { id: refId }, select: { id: true } }));
  return Boolean(await db.groupGuidanceProgram.findUnique({ where: { id: refId }, select: { id: true } }));
}

export async function listAttachments(kind: Kind, refIds: string[]) {
  try {
    await requireActionUser("COUNSELOR");
    if (refIds.length === 0) return [];
    return await db.attachment.findMany({
      where: { kind, refId: { in: refIds.slice(0, 500) } },
      select: { id: true, refId: true, fileName: true, fileType: true, createdAt: true },
      orderBy: { createdAt: "asc" },
    });
  } catch (error) {
    console.error("Failed to list attachments:", error);
    return [];
  }
}

export async function addAttachment(formData: { kind: Kind; refId: string; fileName: string; dataBase64: string }) {
  try {
    const me = await requireActionUser("COUNSELOR");
    if (formData.kind !== "DAILY_LOG" && formData.kind !== "GROUP_ATTENDANCE") return { success: false, error: "Unknown record." };
    if (!(await recordExists(formData.kind, formData.refId))) return { success: false, error: "That record no longer exists." };
    const count = await db.attachment.count({ where: { kind: formData.kind, refId: formData.refId } });
    if (count >= MAX_PER_RECORD) return { success: false, error: `Up to ${MAX_PER_RECORD} photos per record.` };

    // Photos, or a scanned PDF
    const file = checkDocument(formData.dataBase64, formData.fileName);
    if (!file.ok) return { success: false, error: file.error };
    if (!file.type.startsWith("image/") && file.type !== "application/pdf") return { success: false, error: "Use a photo (JPG, PNG) or a PDF scan." };

    await db.attachment.create({
      data: { kind: formData.kind, refId: formData.refId, fileName: file.fileName, fileType: file.type, data: new Uint8Array(file.bytes) },
    });
    await logActivity(me, "Attached a photo", "Attachment", formData.refId, file.fileName);
    revalidatePath(formData.kind === "DAILY_LOG" ? "/daily_log" : "/groupguidance");
    return { success: true };
  } catch (error) {
    console.error("Failed to add attachment:", error);
    return { success: false, error: "Couldn't save the photo. Try again." };
  }
}

export async function deleteAttachment(id: string) {
  try {
    const me = await requireActionUser("COUNSELOR");
    await db.attachment.deleteMany({ where: { id } });
    await logActivity(me, "Deleted an attached photo", "Attachment", id);
    revalidatePath("/daily_log");
    revalidatePath("/groupguidance");
    return { success: true };
  } catch (error) {
    console.error("Failed to delete attachment:", error);
    return { success: false, error: "Couldn't remove it. Try again." };
  }
}
