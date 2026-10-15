"use server";

import db from "../../lib/db";
import { requireActionUser } from "../../lib/session";

// Information Service board + Events, as seen by students, faculty and parents.
// Opening the board records that this person has seen each announcement shown,
// which the Guidance Associate sees on the Information Service page.

// Event dates are calendar days stored as UTC midnight, so "today" must be too.
function startOfToday() {
  const now = new Date();
  return new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
}

const AUDIENCE_FOR: Record<string, string> = {
  STUDENT: "Students",
  FACULTY: "Faculty",
  PARENT: "Parents",
};

export async function getBulletin() {
  try {
    const me = await requireActionUser("STUDENT", "FACULTY", "PARENT");
    const today = startOfToday();

    const [announcements, events] = await Promise.all([
      db.announcement.findMany({
        where: { isPublished: true, audience: { in: ["All", AUDIENCE_FOR[me.role]] } },
        orderBy: { createdAt: "desc" },
      }),
      db.event.findMany({ where: { date: { gte: today } }, orderBy: [{ date: "asc" }, { time: "asc" }] }),
    ]);

    if (announcements.length > 0) {
      await db.announcementView.createMany({
        data: announcements.map((a) => ({ announcementId: a.id, viewerName: me.name, viewerRole: me.roleLabel })),
        skipDuplicates: true,
      });
    }

    return { announcements, events };
  } catch (error) {
    console.error("[bulletin] Failed to load:", error);
    return { announcements: [], events: [] };
  }
}

// Small preview for dashboards; doesn't mark anything as seen.
export async function getBulletinPreview() {
  try {
    const me = await requireActionUser("STUDENT", "FACULTY", "PARENT");
    const today = startOfToday();
    const [announcement, event] = await Promise.all([
      db.announcement.findFirst({
        where: { isPublished: true, audience: { in: ["All", AUDIENCE_FOR[me.role]] } },
        orderBy: { createdAt: "desc" },
      }),
      db.event.findFirst({ where: { date: { gte: today } }, orderBy: [{ date: "asc" }, { time: "asc" }] }),
    ]);
    return { announcement, event };
  } catch (error) {
    console.error("[bulletin] Failed to load preview:", error);
    return { announcement: null, event: null };
  }
}
