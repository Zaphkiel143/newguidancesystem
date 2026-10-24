"use server";

import db from "../../lib/db";
import { requireActionUser } from "../../lib/session";
import { manilaTodayAsStoredDate } from "../../lib/time";

// Information Service board + Events, as seen by students, faculty and parents.
// Opening the board records that this person has seen each announcement shown,
// which the Guidance Associate sees on the Information Service page.

// Event dates are calendar days stored as UTC midnight, so "today" must be too
// (and it's today in the Philippines, not on the UTC server).
const startOfToday = () => manilaTodayAsStoredDate();

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
        omit: { imageData: true },
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

    // Photos load from /api/announcements/[id]/image instead of travelling here.
    return { announcements: announcements.map(({ imageType, ...a }) => ({ ...a, hasImage: Boolean(imageType) })), events, readings: await readingsFor(me.role) };
  } catch (error) {
    console.error("[bulletin] Failed to load:", error);
    return { announcements: [], events: [], readings: [] };
  }
}

// Supplementary reading materials for this person; files open from
// /api/reading/[id]. Kept apart so the board still loads if this fails.
async function readingsFor(role: string) {
  try {
    return await db.readingMaterial.findMany({
      where: { audience: { in: ["All", AUDIENCE_FOR[role]] } },
      select: { id: true, title: true, description: true, topic: true, link: true, fileName: true, createdAt: true },
      orderBy: { createdAt: "desc" },
    });
  } catch (error) {
    console.error("[bulletin] Failed to load reading materials:", error);
    return [];
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
        omit: { imageData: true },
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
