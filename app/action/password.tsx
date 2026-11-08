"use server";

import db from "../../lib/db";
import { getSignedInUser, hashPassword, hasPassword, verifyPassword } from "../../lib/auth";
import { passwordProblem } from "../../lib/parentSignup";
import { allow, MINUTE } from "../../lib/rateLimit";
import { logActivity } from "../../lib/activityLog";
import { ROLE_LABEL } from "../../lib/session";

// Change password, from every account page (students, faculty, guidance, parents).

const passwordOwner = getSignedInUser;

export async function getMyPasswordStatus(): Promise<{ hasPassword: boolean } | null> {
  try {
    const me = await passwordOwner();
    if (!me) return null;
    const row = await db.user.findUnique({ where: { id: me.id }, select: { passwordHash: true } });
    return row ? { hasPassword: hasPassword(row.passwordHash) } : null;
  } catch {
    return null;
  }
}

// An account that has a password must give it; one made before passwords were
// required (no password yet) just chooses one. Other devices are signed out.
export async function changeMyAccountPassword(formData: { current?: string; next: string }) {
  try {
    const me = await passwordOwner();
    if (!me) return { success: false, error: "Sign in again to change your password." };
    if (!(await allow(`change-password:${me.id}`, 5, 15 * MINUTE))) {
      return { success: false, error: "Too many tries. Wait 15 minutes and try again." };
    }
    const row = await db.user.findUnique({ where: { id: me.id }, select: { passwordHash: true } });
    if (!row) return { success: false, error: "Please sign in again." };
    const had = hasPassword(row.passwordHash);
    if (had && !verifyPassword(formData.current ?? "", row.passwordHash)) {
      return { success: false, error: "Your current password isn't right." };
    }
    const weak = passwordProblem(formData.next);
    if (weak) return { success: false, error: `Choose a stronger password. ${weak}` };
    if (had && formData.current === formData.next) return { success: false, error: "Choose a password different from your current one." };

    await db.user.update({ where: { id: me.id }, data: { passwordHash: hashPassword(formData.next) } });
    // This device stays signed in; every other one has to sign in again.
    await db.session.deleteMany({ where: { userId: me.id, token: { not: me.sessionToken } } });
    await logActivity({ name: me.name, roleLabel: ROLE_LABEL[me.role], id: me.id }, had ? "Changed their password" : "Set their password", "User", me.id);
    return { success: true };
  } catch (error) {
    console.error("Failed to change password:", error);
    return { success: false, error: "Couldn't change your password. Try again." };
  }
}
