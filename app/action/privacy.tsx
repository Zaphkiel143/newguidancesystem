"use server";

import db from "../../lib/db";
import { revalidatePath } from "next/cache";
import { requireActionUser } from "../../lib/session";

// Records that the signed-in person agreed to the privacy notice.
export async function acceptPrivacyNotice() {
  try {
    const me = await requireActionUser();
    await db.user.update({ where: { id: me.id }, data: { privacyAcceptedAt: new Date() } });
    revalidatePath("/", "layout");
    return { success: true };
  } catch (error) {
    console.error("Failed to record privacy consent:", error);
    return { success: false };
  }
}
