"use client";

import React, { useState } from "react";
import { logout } from "../app/action/auth";
import ConfirmDialog from "./ConfirmDialog";

// A sign-out button that asks first, so a stray tap doesn't end the session.
export default function SignOutButton({ className, role, children }: { className: string; role?: string; children: React.ReactNode }) {
  const [asking, setAsking] = useState(false);
  const [busy, setBusy] = useState(false);
  return (
    <>
      <button type="button" role={role} onClick={() => setAsking(true)} className={className}>
        {children}
      </button>
      <ConfirmDialog
        open={asking}
        title="Sign out of E-Gabay?"
        message="You'll need to sign in again to use E-Gabay on this device."
        confirmLabel="Sign out"
        danger
        busy={busy}
        onCancel={() => setAsking(false)}
        onConfirm={async () => {
          setBusy(true);
          await logout();
        }}
      />
    </>
  );
}
