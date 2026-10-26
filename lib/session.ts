import { getCurrentUser } from "./auth";
import type { UserRole } from "./generated";

// Labels stored on records (Referral.referrerRole, Message.senderRole, ...).
export const ROLE_LABEL: Record<UserRole, string> = {
  ADMIN: "Admin",
  COUNSELOR: "Counselor",
  STUDENT: "Student",
  FACULTY: "Faculty",
  PARENT: "Parent",
};

export class NotAuthorizedError extends Error {
  constructor() {
    super("You are not allowed to do that. Please sign in again.");
  }
}

// Server actions can be called directly, not only from their own pages, so
// every action checks the session itself instead of trusting the layout.
// Identity (name, role) always comes from the session, never from the client.
export async function requireActionUser(...roles: UserRole[]) {
  const user = await getCurrentUser();
  if (!user || (roles.length > 0 && !roles.includes(user.role))) {
    throw new NotAuthorizedError();
  }
  return { ...user, roleLabel: ROLE_LABEL[user.role] };
}
