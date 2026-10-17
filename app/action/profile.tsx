"use server";

import db from "../../lib/db";
import { revalidatePath } from "next/cache";
import { requireActionUser } from "../../lib/session";
import { checkImage } from "../../lib/image";

// Profile photo for any signed-in user. Photos are checked by their actual
// bytes and kept small; pass null to remove it.
const MAX_PHOTO_BYTES = 2 * 1024 * 1024;

export async function setMyPhoto(dataBase64: string | null) {
  try {
    const me = await requireActionUser();
    if (dataBase64 === null) {
      await db.user.update({ where: { id: me.id }, data: { avatarData: null, avatarType: null } });
    } else {
      const image = checkImage(dataBase64);
      if (!image.ok) return { success: false, error: image.error };
      if (image.bytes.length > MAX_PHOTO_BYTES) return { success: false, error: "Profile photos must be 2 MB or smaller." };
      await db.user.update({ where: { id: me.id }, data: { avatarData: new Uint8Array(image.bytes), avatarType: image.type } });
    }
    revalidatePath("/", "layout");
    return { success: true };
  } catch (error) {
    console.error("Failed to update photo:", error);
    return { success: false, error: "Couldn't save the photo. Try again." };
  }
}
