import db from "./db";
import type { UserRole } from "./generated";

// In-app notifications (the bell in the top bar). Never throws: a failed
// notification must not undo the action that triggered it.

type Notice = { title: string; body?: string; href?: string };

const ROLE_BY_LABEL: Record<string, UserRole> = {
  Counselor: "COUNSELOR",
  Student: "STUDENT",
  Faculty: "FACULTY",
  Parent: "PARENT",
};

async function create(userIds: string[], notice: Notice) {
  if (userIds.length === 0) return;
  try {
    await db.notification.createMany({
      data: userIds.map((userId) => ({ userId, title: notice.title, body: notice.body ?? null, href: notice.href ?? null })),
    });
  } catch (error) {
    console.error("[notify] Failed to create notification:", error);
  }
}

export async function notifyCounselors(notice: Notice) {
  const counselors = await db.user.findMany({ where: { role: "COUNSELOR", status: "ACTIVE" }, select: { id: true } });
  await create(counselors.map((c) => c.id), notice);
}

export async function notifyUser(userId: string, notice: Notice) {
  await create([userId], notice);
}

// Records across the system name people by "name + role label" (Referral.referrerName,
// Appointment.bookedByName, ...). Notifies every active account that matches.
export async function notifyByName(name: string | null | undefined, roleLabel: string | null | undefined, notice: Notice) {
  if (!name || !roleLabel || !ROLE_BY_LABEL[roleLabel]) return;
  const users = await db.user.findMany({
    where: { name, role: ROLE_BY_LABEL[roleLabel], status: "ACTIVE" },
    select: { id: true },
  });
  await create(users.map((u) => u.id), notice);
}

// Students, faculty and parents share the Bulletin Board/Feed; counselors
// have their own Information Service page instead (mirrors AUDIENCE_FOR in
// app/action/bulletin.tsx, which filters what each role sees there).
type BulletinRole = "STUDENT" | "FACULTY" | "PARENT";
const ROLES_FOR_AUDIENCE: Record<string, BulletinRole[]> = {
  All: ["STUDENT", "FACULTY", "PARENT"],
  Students: ["STUDENT"],
  Faculty: ["FACULTY"],
  Parents: ["PARENT"],
};
export const BULLETIN_PATH_FOR: Record<BulletinRole, string> = {
  STUDENT: "/bulletin",
  FACULTY: "/faculty_bulletin",
  PARENT: "/parent_bulletin",
};

// Notifies everyone who can see a new announcement or event, with a
// per-role notice (each role opens its own Bulletin page). Returns who was
// notified so the caller can also push to each of them.
export async function notifyAudience(
  audience: string,
  noticeFor: (role: BulletinRole) => Notice
): Promise<{ id: string; role: BulletinRole }[]> {
  const roles = ROLES_FOR_AUDIENCE[audience] ?? ROLES_FOR_AUDIENCE.All;
  const users = await db.user.findMany({ where: { role: { in: roles }, status: "ACTIVE" }, select: { id: true, role: true } });
  await Promise.all(
    roles.map((role) => create(users.filter((u) => u.role === role).map((u) => u.id), noticeFor(role)))
  );
  return users.map((u) => ({ id: u.id, role: u.role as BulletinRole }));
}
