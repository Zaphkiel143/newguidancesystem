"use client";

import React, { useEffect, useState } from "react";
import { KeyRound, Loader2 } from "lucide-react";
import { changeMyAccountPassword, getMyPasswordStatus } from "../app/action/password";
import { passwordProblem } from "../lib/parentSignup";
import PasswordStrength from "./PasswordStrength";
import ConfirmDialog from "./ConfirmDialog";
import InlineError from "./InlineError";

const input = "w-full px-3.5 py-2.5 bg-sheet border border-slate-300 rounded-md text-[15px]";
const label = "block text-[13px] font-medium text-slate-700 mb-1.5";
const primary = "inline-flex items-center justify-center gap-2 bg-blue-700 hover:bg-blue-800 text-white font-medium px-6 min-h-11 rounded-full text-[14px] disabled:opacity-60";

// "Change password" on every account page. The form is checked first, then a
// confirmation asks before the password is actually changed.
export default function ChangePassword() {
  // null while loading, or hidden (signed out, or a Super Admin viewing as someone).
  const [status, setStatus] = useState<{ hasPassword: boolean } | null | undefined>(undefined);
  const [pw, setPw] = useState({ current: "", next: "", confirm: "" });
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    getMyPasswordStatus().then(setStatus);
  }, []);

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
      setDone(true);
    } else {
      setError(result.error ?? "Couldn't change your password. Try again.");
    }
  };

  return (
    <section className="bg-sheet border border-rule rounded-2xl p-5 sm:p-6" aria-labelledby="pw-heading">
      <h2 id="pw-heading" className="font-semibold text-[17px] text-ink inline-flex items-center gap-2">
        <KeyRound size={18} className="text-blue-700" /> {hasPassword ? "Change password" : "Set a password"}
      </h2>
      <p className="text-sm text-slate-600 mt-1 max-w-[65ch]">
        {hasPassword
          ? "Use your password with “Use your password” on the sign-in page."
          : "Your account doesn't have a password yet. Choose one so you can sign in without waiting for an email code."}
      </p>
      {status === undefined ? (
        <div className="py-6 flex text-slate-500"><Loader2 className="animate-spin" size={18} /></div>
      ) : (
        <form onSubmit={review} noValidate className={`mt-4 grid grid-cols-1 gap-3 items-start ${hasPassword ? "sm:grid-cols-3" : "sm:grid-cols-2"}`}>
          {hasPassword && (
            <div>
              <label htmlFor="pw-current" className={label}>Current password</label>
              <input id="pw-current" type="password" autoComplete="current-password" className={input} value={pw.current}
                onChange={(e) => { setPw({ ...pw, current: e.target.value }); setDone(false); }} />
            </div>
          )}
          <div>
            <label htmlFor="pw-next" className={label}>New password</label>
            <input id="pw-next" type="password" autoComplete="new-password" className={input} value={pw.next}
              aria-describedby="pw-next-strength" onChange={(e) => { setPw({ ...pw, next: e.target.value }); setDone(false); }} />
            {pw.next && <PasswordStrength password={pw.next} id="pw-next-strength" />}
          </div>
          <div>
            <label htmlFor="pw-confirm" className={label}>Repeat new password</label>
            <input id="pw-confirm" type="password" autoComplete="new-password" className={input} value={pw.confirm}
              onChange={(e) => { setPw({ ...pw, confirm: e.target.value }); setDone(false); }} />
          </div>
          <div className={`space-y-2 ${hasPassword ? "sm:col-span-3" : "sm:col-span-2"}`}>
            <InlineError message={error} onDismiss={() => setError(null)} />
            <div className="flex flex-wrap items-center gap-3">
              <button type="submit" disabled={busy} className={primary}>
                {hasPassword ? "Change password" : "Set password"}
              </button>
              {done && <span role="status" className="text-sm text-emerald-700">Password saved. Other devices were signed out.</span>}
            </div>
          </div>
        </form>
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
