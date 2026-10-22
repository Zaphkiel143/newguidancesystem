"use server";

import db from "../../lib/db";
import { revalidatePath } from "next/cache";
import { requireActionUser } from "../../lib/session";
import { sendEmail } from "../../lib/email";
import { notifyUser } from "../../lib/notify";
import { logActivity } from "../../lib/activityLog";
import type { UserRole } from "../../lib/generated";

// ==== Accounts & approvals (Guidance Associates only) ====
//
// Students who sign in with a school email get in right away. Faculty and
// guidance staff who sign up themselves, and every parent account, wait here
// until a Guidance Associate approves them. Parents are linked to a child only
// after their child's student ID is checked against the Individual Inventory.

const counselorOnly = () => requireActionUser("COUNSELOR");

export async function listAccounts() {
  try {
    const me = await counselorOnly();
    const users = await db.user.findMany({
      select: { id: true, name: true, email: true, phone: true, role: true, status: true, createdAt: true },
      orderBy: [{ role: "asc" }, { name: "asc" }],
    });
    return users.map((u) => ({ ...u, isMe: u.id === me.id }));
  } catch (error) {
    console.error("Failed to list accounts:", error);
    return [];
  }
}

// Everything waiting for a decision: new staff accounts and parent link requests,
// each parent request shown next to the inventory record its student ID matches.
export async function listApprovals() {
  try {
    await counselorOnly();
    const [pendingStaff, links] = await Promise.all([
      db.user.findMany({
        where: { status: "PENDING", role: { in: ["FACULTY", "COUNSELOR", "STUDENT"] } },
        select: { id: true, name: true, email: true, role: true, createdAt: true },
        orderBy: { createdAt: "asc" },
      }),
      db.parentChildLink.findMany({
        where: { status: "PENDING", parent: { status: { not: "REJECTED" } } },
        include: { parent: { select: { id: true, name: true, phone: true, email: true, status: true } } },
        orderBy: { createdAt: "asc" },
      }),
    ]);

    const profiles = await db.studentProfile.findMany({
      where: { studentId: { in: links.map((l) => l.studentIdNumber) } },
      select: { id: true, studentId: true, name: true, gradeSection: true, guardianName: true, guardianContact: true },
    });
    const byId = new Map(profiles.map((p) => [p.studentId, p]));

    return {
      pendingStaff,
      parentRequests: links.map((l) => ({ ...l, match: byId.get(l.studentIdNumber) ?? null })),
    };
  } catch (error) {
    console.error("Failed to list approvals:", error);
    return { pendingStaff: [], parentRequests: [] };
  }
}

async function tellUser(user: { id: string; email: string | null; name: string }, title: string, body: string) {
  await notifyUser(user.id, { title, body });
  if (user.email) {
    await sendEmail(user.email, title, `Hello ${user.name},\n\n${body}\n\n— Guidance and Counseling Office, STI College Sta. Maria`);
  }
}

export async function decideStaffAccount(userId: string, approve: boolean) {
  try {
    const me = await counselorOnly();
    if (userId === me.id) return { success: false, error: "You can't approve your own account." };
    const user = await db.user.findUnique({ where: { id: userId } });
    if (!user || user.status !== "PENDING" || user.role === "PARENT") return { success: false, error: "This request was already handled." };

    await db.user.update({ where: { id: userId }, data: { status: approve ? "ACTIVE" : "REJECTED" } });
    if (approve) {
      await tellUser(user, "Your E-Gabay account is approved", "You can now sign in to E-Gabay with your school email.");
    }
    await logActivity(me, approve ? "Approved an account" : "Rejected an account", "User", userId, user.name);
    revalidatePath("/accounts");
    return { success: true };
  } catch (error) {
    console.error("Failed to decide account:", error);
    return { success: false, error: "Something went wrong. Try again." };
  }
}

export async function decideParentLink(linkId: string, approve: boolean, note?: string) {
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
        // A parent's first approved child also turns on their account.
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
      // A brand-new parent account with nothing approved is turned down with it.
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

export async function setAccountRole(userId: string, role: UserRole) {
  try {
    const me = await counselorOnly();
    if (userId === me.id) return { success: false, error: "You can't change your own role." };
    const user = await db.user.findUnique({ where: { id: userId }, select: { role: true, phone: true, email: true } });
    if (!user) return { success: false, error: "Account not found." };
    // Parents sign in with a phone number, everyone else with a school email.
    if ((role === "PARENT") !== (user.role === "PARENT")) {
      return { success: false, error: "Parent accounts and school-email accounts sign in differently, so they can't be switched." };
    }
    await db.user.update({ where: { id: userId }, data: { role } });
    // A changed role must be re-established by signing in again, not picked
    // up mid-session - same as turning an account off (setAccountActive below).
    await db.session.deleteMany({ where: { userId } });
    await logActivity(me, `Changed an account's role to ${role}`, "User", userId);
    revalidatePath("/accounts");
    return { success: true };
  } catch (error) {
    console.error("Failed to change role:", error);
    return { success: false, error: "Couldn't change the role." };
  }
}

// Turn an account off (it can't sign in, and its open sessions stop working) or back on.
export async function setAccountActive(userId: string, active: boolean) {
  try {
    const me = await counselorOnly();
    if (userId === me.id) return { success: false, error: "You can't turn off your own account." };
    await db.user.update({ where: { id: userId }, data: { status: active ? "ACTIVE" : "REJECTED" } });
    if (!active) await db.session.deleteMany({ where: { userId } });
    await logActivity(me, active ? "Turned on an account" : "Turned off an account", "User", userId);
    revalidatePath("/accounts");
    return { success: true };
  } catch (error) {
    console.error("Failed to change account status:", error);
    return { success: false, error: "Couldn't update the account." };
  }
}
