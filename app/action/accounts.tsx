"use server";

import { randomInt } from "crypto";
import { redirect } from "next/navigation";
import db from "../../lib/db";
import { revalidatePath } from "next/cache";
import { requireActionUser } from "../../lib/session";
import { dashboardPathForRole, getSignedInUser, hashPassword } from "../../lib/auth";
import { sendEmail } from "../../lib/email";
import { notifyUser } from "../../lib/notify";
import { logActivity } from "../../lib/activityLog";
import { ROLE_LABEL } from "../../lib/session";
import type { UserRole } from "../../lib/generated";
import { isDemoUser } from "../../lib/demo";

// Accounts: the Super Admin manages every account; the Guidance Associate confirms parents

const adminOnly = () => requireActionUser("ADMIN");
const counselorOnly = () => requireActionUser("COUNSELOR");

type Result = { success: true } | { success: false; error: string };

// The demo Super Admin may only change demo accounts, so real ones stay safe on the public demo
async function checkTarget(me: { id: string; email: string | null }, userId: string): Promise<string | null> {
  if (userId === me.id) return "You can't change your own account here.";
  if (isDemoUser(me)) {
    const target = await db.user.findUnique({ where: { id: userId }, select: { email: true } });
    if (!target || !isDemoUser(target)) return "The demo Super Admin can only change demo accounts.";
  }
  return null;
}

export async function listAccounts() {
  try {
    const me = await adminOnly();
    const users = await db.user.findMany({
      select: { id: true, name: true, email: true, phone: true, role: true, status: true, archivedAt: true, createdAt: true },
      orderBy: [{ role: "asc" }, { name: "asc" }],
    });
    return users.map((u) => ({ ...u, isMe: u.id === me.id }));
  } catch (error) {
    console.error("Failed to list accounts:", error);
    return [];
  }
}

// Staff and student accounts waiting for the Super Admin
export async function listStaffApprovals() {
  try {
    await adminOnly();
    return await db.user.findMany({
      where: { status: "PENDING", role: { not: "PARENT" } },
      select: { id: true, name: true, email: true, role: true, createdAt: true },
      orderBy: { createdAt: "asc" },
    });
  } catch (error) {
    console.error("Failed to list approvals:", error);
    return [];
  }
}

// Parents waiting for the Guidance Associate to check their child's record
export async function listParentRequests() {
  try {
    await counselorOnly();
    const links = await db.parentChildLink.findMany({
      where: { status: "PENDING", parent: { status: { notIn: ["REJECTED", "ARCHIVED"] } } },
      include: { parent: { select: { id: true, name: true, phone: true, email: true, status: true } } },
      orderBy: { createdAt: "asc" },
    });
    const profiles = await db.studentProfile.findMany({
      where: { studentId: { in: links.map((l) => l.studentIdNumber) } },
      select: { id: true, studentId: true, name: true, gradeSection: true, guardianName: true, guardianContact: true },
    });
    const byId = new Map(profiles.map((p) => [p.studentId, p]));
    return links.map((l) => ({ ...l, match: byId.get(l.studentIdNumber) ?? null }));
  } catch (error) {
    console.error("Failed to list parent requests:", error);
    return [];
  }
}

async function tellUser(user: { id: string; email: string | null; name: string }, title: string, body: string) {
  await notifyUser(user.id, { title, body });
  if (user.email) {
    await sendEmail(user.email, title, `Hello ${user.name},\n\n${body}\n\n— Guidance and Counseling Office, STI College Sta. Maria`);
  }
}

export async function decideStaffAccount(userId: string, approve: boolean): Promise<Result> {
  try {
    const me = await adminOnly();
    const problem = await checkTarget(me, userId);
    if (problem) return { success: false, error: problem };
    const user = await db.user.findUnique({ where: { id: userId } });
    if (!user || user.status !== "PENDING" || user.role === "PARENT") return { success: false, error: "This request was already handled." };

    await db.user.update({ where: { id: userId }, data: { status: approve ? "ACTIVE" : "REJECTED" } });
    if (approve) {
      await tellUser(user, "Your E-Gabay account is approved", "You can now sign in to E-Gabay with your school email.");
    }
    await logActivity(me, approve ? "Approved an account" : "Rejected an account", "User", userId, user.name);
    revalidatePath("/admin_accounts");
    return { success: true };
  } catch (error) {
    console.error("Failed to decide account:", error);
    return { success: false, error: "Something went wrong. Try again." };
  }
}

export async function decideParentLink(linkId: string, approve: boolean, note?: string): Promise<Result> {
  try {
    const me = await counselorOnly();
    const link = await db.parentChildLink.findUnique({ where: { id: linkId }, include: { parent: true } });
    if (!link || link.status !== "PENDING") return { success: false, error: "This request was already handled." };

    if (approve) {
      const profile = await db.studentProfile.findUnique({ where: { studentId: link.studentIdNumber } });
      if (!profile) {
        return {
          success: false,
          error: `No Individual Inventory record has student ID ${link.studentIdNumber}. Add the student's record first, or reject the request.`,
        };
      }
      await db.$transaction([
        db.parentChildLink.update({
          where: { id: link.id },
          data: { status: "APPROVED", studentProfileId: profile.id, childName: profile.name, reviewedAt: new Date(), note: note || null },
        }),
        // A parent's first approved child also turns on their account
        db.user.update({ where: { id: link.parentId }, data: { status: "ACTIVE" } }),
      ]);
      await tellUser(
        link.parent,
        "Your parent account is confirmed",
        `The guidance office confirmed you as the ${link.relationship.toLowerCase()} of ${profile.name}. You can now sign in to E-Gabay with your mobile number.`
      );
    } else {
      await db.parentChildLink.update({
        where: { id: link.id },
        data: { status: "REJECTED", reviewedAt: new Date(), note: note || null },
      });
      // A brand-new parent account with nothing approved is turned down with it
      const approved = await db.parentChildLink.count({ where: { parentId: link.parentId, status: "APPROVED" } });
      if (approved === 0 && link.parent.status === "PENDING") {
        await db.user.update({ where: { id: link.parentId }, data: { status: "REJECTED" } });
      } else {
        await tellUser(link.parent, "Request to link a student was not approved", note || "Please contact the guidance office for details.");
      }
    }

    await logActivity(me, approve ? "Approved a parent-child link" : "Rejected a parent-child link", "ParentChildLink", linkId, link.childName);
    revalidatePath("/accounts");
    return { success: true };
  } catch (error) {
    console.error("Failed to decide parent link:", error);
    return { success: false, error: "Something went wrong. Try again." };
  }
}

const SCHOOL_ROLES: UserRole[] = ["STUDENT", "FACULTY", "COUNSELOR", "ADMIN"];

export async function setAccountRole(userId: string, role: UserRole): Promise<Result> {
  try {
    const me = await adminOnly();
    const problem = await checkTarget(me, userId);
    if (problem) return { success: false, error: problem };
    const user = await db.user.findUnique({ where: { id: userId }, select: { name: true, role: true } });
    if (!user) return { success: false, error: "Account not found." };
    // Parents sign in with a phone number, everyone else with a school email
    if (user.role === "PARENT" || !SCHOOL_ROLES.includes(role)) {
      return { success: false, error: "Parent accounts and school-email accounts sign in differently, so they can't be switched." };
    }
    await db.user.update({ where: { id: userId }, data: { role } });
    // A changed role must be re-established by signing in again, not picked up mid-session
    await db.session.deleteMany({ where: { userId } });
    await logActivity(me, `Changed an account's role to ${ROLE_LABEL[role]}`, "User", userId, user.name);
    revalidatePath("/admin_accounts");
    return { success: true };
  } catch (error) {
    console.error("Failed to change role:", error);
    return { success: false, error: "Couldn't change the role." };
  }
}

// Archived accounts can't sign in and their open sessions end; nothing they made is deleted
export async function setAccountArchived(userId: string, archive: boolean): Promise<Result> {
  try {
    const me = await adminOnly();
    const problem = await checkTarget(me, userId);
    if (problem) return { success: false, error: problem };
    const user = await db.user.findUnique({ where: { id: userId }, select: { name: true, status: true } });
    if (!user) return { success: false, error: "Account not found." };
    if (archive) {
      await db.user.update({ where: { id: userId }, data: { status: "ARCHIVED", archivedAt: new Date() } });
      await db.session.deleteMany({ where: { userId } });
    } else {
      await db.user.update({ where: { id: userId }, data: { status: "ACTIVE", archivedAt: null } });
    }
    await logActivity(me, archive ? "Archived an account" : "Restored an archived account", "User", userId, user.name);
    revalidatePath("/admin_accounts");
    return { success: true };
  } catch (error) {
    console.error("Failed to archive account:", error);
    return { success: false, error: "Couldn't update the account." };
  }
}

// Easy to read aloud or type: no 0/O or 1/l
const TEMP_CHARS = "ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";

// A new temporary password for a parent, shown once to the Super Admin
export async function resetParentPassword(userId: string): Promise<{ success: true; password: string } | { success: false; error: string }> {
  try {
    const me = await adminOnly();
    const problem = await checkTarget(me, userId);
    if (problem) return { success: false, error: problem };
    const user = await db.user.findUnique({ where: { id: userId }, select: { id: true, name: true, email: true, role: true } });
    if (!user || user.role !== "PARENT") return { success: false, error: "Only parent accounts have passwords. Others sign in with a school email code." };

    const password = Array.from({ length: 10 }, () => TEMP_CHARS[randomInt(TEMP_CHARS.length)]).join("");
    await db.user.update({ where: { id: userId }, data: { passwordHash: hashPassword(password) } });
    await db.session.deleteMany({ where: { userId } });
    await notifyUser(user.id, { title: "Your password was reset", body: "Sign in with the temporary password from the guidance office, then change it in My Profile." });
    await logActivity(me, "Reset a parent's password", "User", userId, user.name);
    return { success: true, password };
  } catch (error) {
    console.error("Failed to reset password:", error);
    return { success: false, error: "Couldn't reset the password." };
  }
}

// View as: the Super Admin sees the system as another user, read-only (see lib/db.ts)
export async function startViewAs(userId: string): Promise<Result> {
  const admin = await getSignedInUser();
  if (!admin || admin.role !== "ADMIN") return { success: false, error: "Only the Super Admin can do that." };
  if (userId === admin.id) return { success: false, error: "Choose someone else." };
  const target = await db.user.findUnique({ where: { id: userId }, select: { name: true, role: true, status: true } });
  if (!target || target.status !== "ACTIVE") return { success: false, error: "Only active accounts can be viewed." };
  await logActivity({ name: admin.name, roleLabel: ROLE_LABEL.ADMIN, id: admin.id }, "Started View as", "User", userId, `${target.name} (${ROLE_LABEL[target.role]})`);
  await db.session.update({ where: { token: admin.sessionToken }, data: { viewAsUserId: userId } });
  redirect(dashboardPathForRole(target.role));
}

export async function stopViewAs() {
  const admin = await getSignedInUser();
  if (!admin) redirect("/Login");
  if (admin.role === "ADMIN") {
    await db.session.update({ where: { token: admin.sessionToken }, data: { viewAsUserId: null } });
  }
  redirect(dashboardPathForRole(admin.role));
}
