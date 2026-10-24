import type { UserRole } from "./generated";

// The one-click demo accounts (see loginAsDemo in app/action/auth.tsx).
// Their stored names stay as they are, because records are linked to people by
// name (student profile, appointments, the demo parent's child). Screens that
// show the signed-in person their own name show DEMO_DISPLAY_NAME instead.
export const DEMO_EMAILS: Record<UserRole, string> = {
  COUNSELOR: "counselor@sti.edu",
  STUDENT: "student@sti.edu",
  FACULTY: "faculty@sti.edu",
  PARENT: "parent@sti.edu",
};

export const DEMO_DISPLAY_NAME = "Demo Account";

const demoEmails = new Set(Object.values(DEMO_EMAILS));

export function isDemoUser(user: { email?: string | null }) {
  return Boolean(user.email && demoEmails.has(user.email.toLowerCase()));
}

// The name to show a person for themselves.
export function shownName(user: { name: string; email?: string | null }) {
  return isDemoUser(user) ? DEMO_DISPLAY_NAME : user.name;
}

// For "Welcome back, ___": a first name, or the whole demo label.
export function greetingName(displayName: string) {
  return displayName === DEMO_DISPLAY_NAME ? displayName : displayName.split(" ")[0];
}
