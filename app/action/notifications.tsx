"use server";

import db from "../../lib/db";
import { requireActionUser } from "../../lib/session";

// Shared by every role: the bell in the top bar and the floating message button

export async function getMyNotices() {
  try {
    const me = await requireActionUser();
    const [items, unread, unreadMessages] = await Promise.all([
      db.notification.findMany({ where: { userId: me.id }, orderBy: { createdAt: "desc" }, take: 20 }),
      db.notification.count({ where: { userId: me.id, readAt: null } }),
      countUnreadMessages(me.role, me.name),
    ]);
    return { items, unread, unreadMessages };
  } catch {
    return { items: [], unread: 0, unreadMessages: 0 };
  }
}

async function countUnreadMessages(role: string, name: string) {
  if (role === "COUNSELOR") {
    return db.message.count({ where: { senderRole: { not: "Counselor" }, readAt: null } });
  }
  const label = role === "STUDENT" ? "Student" : role === "FACULTY" ? "Faculty" : "Parent";
  return db.message.count({
    where: { senderRole: "Counselor", readAt: null, conversation: { participantName: name, participantRole: label } },
  });
}

export async function markNoticesRead(ids?: string[]) {
  try {
    const me = await requireActionUser();
    await db.notification.updateMany({
      // Only ever your own notifications
      where: { userId: me.id, readAt: null, ...(ids ? { id: { in: ids } } : {}) },
      data: { readAt: new Date() },
    });
    return { success: true };
  } catch {
    return { success: false };
  }
}
