"use server";

import db from "../../lib/db";
import { requireActionUser } from "../../lib/session";

// Shared by every role: the bell in the top bar and the floating message button.

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
      // Only ever your own notifications.
      where: { userId: me.id, readAt: null, ...(ids ? { id: { in: ids } } : {}) },
      data: { readAt: new Date() },
    });
    return { success: true };
  } catch {
    return { success: false };
  }
}

const PAGE_SIZE = 30;

// The full notifications page: newest first, a page at a time (cursor = the
// last id shown), optionally only the unread ones.
export async function getMyNoticePage(opts: { cursor?: string; unreadOnly?: boolean } = {}) {
  try {
    const me = await requireActionUser();
    const rows = await db.notification.findMany({
      where: { userId: me.id, ...(opts.unreadOnly ? { readAt: null } : {}) },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: PAGE_SIZE + 1,
      ...(opts.cursor ? { cursor: { id: opts.cursor }, skip: 1 } : {}),
    });
    const items = rows.slice(0, PAGE_SIZE);
    return { items, nextCursor: rows.length > PAGE_SIZE ? items[items.length - 1].id : null };
  } catch {
    return { items: [], nextCursor: null };
  }
}
