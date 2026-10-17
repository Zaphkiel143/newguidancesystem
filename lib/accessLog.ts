import db from "./db";

// Confidentiality trail: records each time someone opens a student's record
// or document. Never throws; a logging problem must not block the GCO's work.
export async function logRecordAccess(viewer: { name: string; roleLabel: string }, studentName: string | null | undefined, action: string) {
  if (!studentName) return;
  try {
    await db.recordAccess.create({
      data: { viewerName: viewer.name, viewerRole: viewer.roleLabel, studentName, action: action.slice(0, 160) },
    });
  } catch (error) {
    console.error("[accessLog] failed:", error);
  }
}
