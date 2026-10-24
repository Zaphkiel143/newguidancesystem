import webpush from "web-push";
import db from "./db";

// Browser push notifications (phones and computers)

const PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
const PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY;
export const pushConfigured = Boolean(PUBLIC_KEY && PRIVATE_KEY);

if (pushConfigured) {
  webpush.setVapidDetails("mailto:no-reply@egabay.local", PUBLIC_KEY!, PRIVATE_KEY!);
}

export type PushPayload = { title: string; body: string; url: string; tag?: string };

// Sends to every device where the user turned on notifications
export async function pushToUser(userId: string, payload: PushPayload) {
  if (!pushConfigured) return;
  const subs = await db.pushSubscription.findMany({ where: { userId } });
  await Promise.all(
    subs.map(async (s) => {
      try {
        await webpush.sendNotification(
          { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
          JSON.stringify(payload),
          { TTL: 120, urgency: "high" }
        );
      } catch (error) {
        const status = (error as { statusCode?: number }).statusCode;
        // Gone or invalid: the browser unsubscribed; forget it
        if (status === 404 || status === 410) await db.pushSubscription.deleteMany({ where: { id: s.id } });
        else console.error("[push] send failed:", status ?? error);
      }
    })
  );
}
