"use server";

import { redirect } from "next/navigation";
import db from "../../lib/db";
import { createSession, destroySession, dashboardPathForRole, hashPassword, verifyPassword } from "../../lib/auth";
import type { UserRole } from "../../lib/generated";

const DEMO_PASSWORD = "demo1234";

const DEMO_USERS: Record<UserRole, { email: string; name: string }> = {
  COUNSELOR: { email: "counselor@sti.edu", name: "Ralph Michael" },
  STUDENT: { email: "student@sti.edu", name: "Nhel Belarmino" },
  FACULTY: { email: "faculty@sti.edu", name: "Cho Sto Domingo" },
  PARENT: { email: "parent@sti.edu", name: "Mrs. Belarmino" },
};

type LoginResult = { success: true; redirectTo: string } | { success: false; error: string };

export async function login(formData: { email: string; password: string }): Promise<LoginResult> {
  try {
    const user = await db.user.findUnique({ where: { email: formData.email.trim().toLowerCase() } });

    if (!user || !verifyPassword(formData.password, user.passwordHash)) {
      return { success: false, error: "Invalid email or password." };
    }

    await createSession(user.id);
    return { success: true, redirectTo: dashboardPathForRole(user.role) };
  } catch (error) {
    console.error("Login failed:", error);
    return { success: false, error: "Something went wrong. Please try again." };
  }
}

// One-click demo access — lazily creates the demo account for that role the
// first time it's used, then logs into it. Keeps the existing "Quick Demo
// Access" shortcuts working now that real sessions are enforced.
export async function loginAsDemo(role: UserRole) {
  const demo = DEMO_USERS[role];

  const user = await db.user.upsert({
    where: { email: demo.email },
    update: {},
    create: {
      email: demo.email,
      name: demo.name,
      role,
      passwordHash: hashPassword(DEMO_PASSWORD),
    },
  });

  await createSession(user.id);
  redirect(dashboardPathForRole(user.role));
}

export async function logout() {
  await destroySession();
  redirect("/Login");
}
