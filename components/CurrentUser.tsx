"use client";

import React, { createContext, useContext } from "react";

export interface CurrentUser {
  name: string;
  // Label stored on records, e.g. "Student", "Counselor" (see lib/session.ts)
  roleLabel: string;
}

const CurrentUserContext = createContext<CurrentUser | null>(null);

export function CurrentUserProvider({ user, children }: { user: CurrentUser; children: React.ReactNode }) {
  return <CurrentUserContext.Provider value={user}>{children}</CurrentUserContext.Provider>;
}

// For display and "is this message mine" checks only
export function useCurrentUser(): CurrentUser {
  const user = useContext(CurrentUserContext);
  if (!user) throw new Error("useCurrentUser must be used inside the role layout");
  return user;
}
