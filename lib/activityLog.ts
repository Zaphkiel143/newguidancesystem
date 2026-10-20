import db from "./db";

// System-wide activity log, counselor/associate only (see
// app/(Sidebar_counselor)/activity/page.tsx). Records every create/update/
// delete across the app. Never throws; a logging problem must not block
// the real action.
export async function logActivity(
  actor: { name: string; roleLabel: string; id?: string },
  action: string,
  model: string,
  recordId?: string,
  detail?: string
) {
  try {
    await db.activityLog.create({
      data: {
        actorName: actor.name,
        actorRole: actor.roleLabel,
        actorUserId: actor.id ?? null,
        action,
        model,
        recordId: recordId ?? null,
        detail: detail?.slice(0, 500) ?? null,
      },
    });
  } catch (error) {
    console.error("[activityLog] failed:", error);
  }
}
