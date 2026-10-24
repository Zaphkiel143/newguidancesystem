import db from "./db";
import type { UserRole } from "./generated";

// In-app notifications (the bell in the top bar)

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

// Records across the system name people by "name + role label"
export async function notifyByName(name: string | null | undefined, roleLabel: string | null | undefined, notice: Notice) {
  if (!name || !roleLabel || !ROLE_BY_LABEL[roleLabel]) return;
  const users = await db.user.findMany({
    where: { name, role: ROLE_BY_LABEL[roleLabel], status: "ACTIVE" },
    select: { id: true },
  });
  await create(users.map((u) => u.id), notice);
}
