"use client";

import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { KeyRound, Loader2, X } from "lucide-react";
import { changeMyAccountPassword, getMyPasswordStatus } from "../app/action/password";
import { passwordProblem } from "../lib/parentSignup";
import PasswordStrength from "./PasswordStrength";
import ConfirmDialog from "./ConfirmDialog";
import InlineError from "./InlineError";

const input = "w-full px-3.5 py-2.5 bg-sheet border border-slate-300 rounded-md text-[15px]";
const label = "block text-[13px] font-medium text-slate-700 mb-1.5";
const primary = "inline-flex items-center justify-center gap-2 bg-blue-700 hover:bg-blue-800 text-white font-medium px-6 min-h-11 rounded-full text-[14px] disabled:opacity-60";

// "Change password" on every account page: a button opens the form in a pop-up.
// The form is checked first, then a confirmation asks before the password is
// actually changed.
export default function ChangePassword() {
  // null while loading, or hidden when signed out.
  const [status, setStatus] = useState<{ hasPassword: boolean } | null | undefined>(undefined);
  const [pw, setPw] = useState({ current: "", next: "", confirm: "" });
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    getMyPasswordStatus().then(setStatus);
  }, []);

  // Escape closes the pop-up wherever focus is, unless the confirmation on top of it is open.
  useEffect(() => {
    if (!open || confirming || busy) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, confirming, busy]);

  if (status === null) return null;
  const hasPassword = status?.hasPassword ?? true;

  const review = (e: React.FormEvent) => {
    e.preventDefault();
    setDone(false);
    if (hasPassword && !pw.current) return setError("Enter your current password.");
    const weak = passwordProblem(pw.next);
    if (weak) return setError(`Choose a stronger password. ${weak}`);
    if (pw.next !== pw.confirm) return setError("The new passwords don't match.");
    setError(null);
    setConfirming(true);
  };

  const change = async () => {
    setBusy(true);
    const result = await changeMyAccountPassword({ current: hasPassword ? pw.current : undefined, next: pw.next }).catch(() => ({
      success: false,
      error: "Couldn't change your password. Try again.",
    }));
    setBusy(false);
    setConfirming(false);
    if (result.success) {
      setPw({ current: "", next: "", confirm: "" });
      setStatus({ hasPassword: true });
      setOpen(false);
      setDone(true);
    } else {
      setError(result.error ?? "Couldn't change your password. Try again.");
    }
  };

  const openForm = () => {
    setPw({ current: "", next: "", confirm: "" });
    setError(null);
    setDone(false);
    setOpen(true);
  };
  const closeForm = () => {
    if (busy) return;
    setOpen(false);
    setError(null);
  };

  return (
    <section className="bg-sheet border border-rule rounded-2xl p-5 sm:p-6" aria-labelledby="pw-heading">
      <h2 id="pw-heading" className="font-semibold text-[17px] text-ink inline-flex items-center gap-2">
        <KeyRound size={18} className="text-blue-700" /> {hasPassword ? "Change password" : "Set a password"}
      </h2>
      {!hasPassword && <p className="text-sm text-slate-600 mt-1 max-w-[65ch]">No password set yet.</p>}
      {status === undefined ? (
        <div className="py-6 flex text-slate-500"><Loader2 className="animate-spin" size={18} /></div>
      ) : (
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button type="button" onClick={openForm} className={primary}>
            {hasPassword ? "Change password" : "Set password"}
          </button>
          {done && <span role="status" className="text-sm text-emerald-700">Password saved. Other devices were signed out.</span>}
        </div>
      )}

      {/* The form opens as a pop-up in the middle of the screen. */}
      {/* Portal to <body>: an animated (transformed) page wrapper would otherwise trap the fixed overlay. */}
      {open && createPortal(
        <div className="fixed inset-0 z-[55] overflow-y-auto bg-black/40" onClick={closeForm}>
          <div className="min-h-full grid place-items-center p-4">
            <div role="dialog" aria-modal="true" aria-labelledby="pw-dialog-title"
              className="relative w-full max-w-md bg-sheet text-ink rounded-2xl p-6 shadow-xl animate-rise-in"
              onClick={(e) => e.stopPropagation()}>
              <button type="button" onClick={closeForm} aria-label="Close"
                className="absolute top-3 right-3 inline-flex items-center justify-center size-9 rounded-full text-slate-500 hover:text-ink hover:bg-slate-100">
                <X size={18} />
              </button>
              <h2 id="pw-dialog-title" className="text-lg font-semibold inline-flex items-center gap-2">
                <KeyRound size={18} className="text-blue-700" /> {hasPassword ? "Change password" : "Set a password"}
              </h2>
              <form onSubmit={review} noValidate className="mt-5 space-y-4">
                {hasPassword && (
                  <div>
                    <label htmlFor="pw-current" className={label}>Current password</label>
                    <input id="pw-current" type="password" autoComplete="current-password" className={input} value={pw.current} autoFocus
                      onChange={(e) => setPw({ ...pw, current: e.target.value })} />
                  </div>
                )}
                <div>
                  <label htmlFor="pw-next" className={label}>New password</label>
                  <input id="pw-next" type="password" autoComplete="new-password" className={input} value={pw.next} autoFocus={!hasPassword}
                    aria-describedby="pw-next-strength" onChange={(e) => setPw({ ...pw, next: e.target.value })} />
                  {pw.next && <PasswordStrength password={pw.next} id="pw-next-strength" />}
                </div>
                <div>
                  <label htmlFor="pw-confirm" className={label}>Repeat new password</label>
                  <input id="pw-confirm" type="password" autoComplete="new-password" className={input} value={pw.confirm}
                    onChange={(e) => setPw({ ...pw, confirm: e.target.value })} />
                </div>
                <InlineError message={error} onDismiss={() => setError(null)} />
                <div className="pt-2 flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
                  <button type="button" onClick={closeForm} disabled={busy}
                    className="min-h-11 px-5 rounded-full border border-slate-300 text-[14px] hover:bg-slate-50 disabled:opacity-60">
                    Cancel
                  </button>
                  <button type="submit" disabled={busy} className={primary}>
                    {hasPassword ? "Change password" : "Set password"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>,
        document.body
      )}
      <ConfirmDialog
        open={confirming}
        title={hasPassword ? "Change your password?" : "Set this password?"}
        message="You'll use the new password the next time you sign in. Any other phone or computer signed in to your account will be signed out."
        confirmLabel={hasPassword ? "Yes, change it" : "Yes, set it"}
        busy={busy}
        onConfirm={change}
        onCancel={() => setConfirming(false)}
      />
    </section>
  );
}
