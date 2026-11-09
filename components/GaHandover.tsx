"use client";

import React, { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Loader2, Send, UserRoundCog, X } from "lucide-react";
import { cancelHandover, getHandoverState, startTransfer, type HandoverState } from "../app/action/handover";
import { SCHOOL_EMAIL_DOMAIN } from "../app/config/school";
import ConfirmDialog from "./ConfirmDialog";
import InlineError from "./InlineError";

const input = "w-full px-3.5 py-2.5 bg-sheet border border-slate-300 rounded-md text-[15px]";
const primary = "inline-flex items-center justify-center gap-2 bg-blue-700 hover:bg-blue-800 text-white font-medium px-6 min-h-11 rounded-full text-[14px] disabled:opacity-60";

const fmt = (d: Date | string) =>
  new Date(d).toLocaleString("en-PH", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Manila" });

// My Account (Guidance Associate): pass the role to a successor, and see or
// cancel pending handovers and claims. See app/action/handover.tsx.
export default function GaHandover() {
  const [state, setState] = useState<HandoverState | null | undefined>(undefined);
  const [email, setEmail] = useState("");
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);

  const openForm = () => {
    setEmail("");
    setError(null);
    setSentTo(null);
    setFormOpen(true);
  };
  const closeForm = () => {
    if (busy) return;
    setFormOpen(false);
    setError(null);
  };

  const load = useCallback(async () => setState(await getHandoverState()), []);
  useEffect(() => {
    let cancelled = false;
    getHandoverState().then((s) => !cancelled && setState(s));
    return () => {
      cancelled = true;
    };
  }, []);

  // Escape closes the pop-up wherever focus is, unless the confirmation on top of it is open.
  useEffect(() => {
    if (!formOpen || confirming || busy) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setFormOpen(false);
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [formOpen, confirming, busy]);

  if (state === null) return null;

  const review = (e: React.FormEvent) => {
    e.preventDefault();
    setSentTo(null);
    const v = email.trim().toLowerCase();
    if (!v.endsWith(`@${SCHOOL_EMAIL_DOMAIN}`)) return setError(`Enter your successor's STI school email (ending in @${SCHOOL_EMAIL_DOMAIN}).`);
    setError(null);
    setConfirming(true);
  };

  const send = async () => {
    setBusy(true);
    const result = await startTransfer(email);
    setBusy(false);
    setConfirming(false);
    if (result.success) {
      setSentTo(email.trim().toLowerCase());
      setEmail("");
      setFormOpen(false);
      await load();
    } else setError(result.error);
  };

  const cancel = async (id: string) => {
    setBusy(true);
    const result = await cancelHandover(id);
    setBusy(false);
    if (result.success) await load();
    else setError(result.error);
  };

  return (
    <section id="handover" className="scroll-mt-24 bg-sheet border border-rule rounded-2xl p-5 sm:p-6">
      <h2 className="font-semibold text-[17px] text-ink flex items-center gap-2">
        <UserRoundCog size={18} className="text-slate-500" /> Hand over the Guidance Associate role
      </h2>
      <p className="text-sm text-slate-600 mt-1">
        Leaving or being replaced? Send your successor a one-time code. When they accept it, they become the Guidance Associate with all
        records, and your account is closed.
      </p>

      {state === undefined ? (
        <div className="py-6 flex justify-center text-slate-500"><Loader2 className="animate-spin" size={18} /></div>
      ) : (
        <>
          {state.pending.length > 0 && (
            <ul className="mt-4 space-y-2">
              {state.pending.map((h) => {
                const held = h.onHold;
                return (
                  <li key={h.id} className={`rounded-lg border p-3 text-sm ${h.kind === "CLAIM" ? "border-orange-300 bg-orange-50" : "border-rule bg-slate-50"}`}>
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-medium text-ink break-all">
                          {h.kind === "CLAIM" ? "Claim request from " : "Invitation sent to "}
                          {h.toEmail}
                        </p>
                        <p className="text-[13px] text-slate-600">
                          {h.kind === "CLAIM" && held
                            ? `On hold until ${fmt(h.usableAfter)}. If you didn't expect this, cancel it.`
                            : `Expires ${fmt(h.expiresAt)}.`}
                        </p>
                      </div>
                      {state.canTransfer && (
                        <button type="button" disabled={busy} onClick={() => cancel(h.id)}
                          className="inline-flex items-center gap-1.5 text-[13px] font-medium px-3 min-h-9 rounded-full text-red-700 hover:bg-red-50 disabled:opacity-50">
                          <X size={14} /> Cancel
                        </button>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}

          {state.canTransfer ? (
            <div className="mt-4">
              <button type="button" onClick={openForm} className={primary}>
                <UserRoundCog size={15} /> Hand over the role
              </button>
            </div>
          ) : (
            <p className="mt-4 text-sm text-slate-500">The demo account can&apos;t hand over the role.</p>
          )}

          {sentTo && <p className="mt-3 text-sm text-emerald-700" role="status">Code sent to {sentTo}. The email has a link where they enter the code.</p>}
          {!formOpen && <InlineError message={error} onDismiss={() => setError(null)} className="mt-3" />}

          <p className="mt-4 text-[13px] text-slate-500">
            Claim codes go to the guidance office mailbox{state.officeEmail ? <> (<span className="break-all">{state.officeEmail}</span>)</> : " (not set up yet)"}.
            You&apos;re notified first and can cancel.
          </p>
        </>
      )}

      {/* The successor's email is entered in a pop-up in the middle of the screen. */}
      {/* Portal to <body>: an animated (transformed) page wrapper would otherwise trap the fixed overlay. */}
      {formOpen && createPortal(
        <div className="fixed inset-0 z-[55] overflow-y-auto bg-black/40" onClick={closeForm}>
          <div className="min-h-full grid place-items-center p-4">
            <div role="dialog" aria-modal="true" aria-labelledby="handover-dialog-title"
              className="relative w-full max-w-md bg-sheet text-ink rounded-2xl p-6 shadow-xl animate-rise-in"
              onClick={(e) => e.stopPropagation()}>
              <button type="button" onClick={closeForm} aria-label="Close"
                className="absolute top-3 right-3 inline-flex items-center justify-center size-9 rounded-full text-slate-500 hover:text-ink hover:bg-slate-100">
                <X size={18} />
              </button>
              <h2 id="handover-dialog-title" className="text-lg font-semibold inline-flex items-center gap-2 pr-8">
                <UserRoundCog size={18} className="text-slate-500" /> Hand over the role
              </h2>
              <p className="text-sm text-slate-600 mt-1">Your successor gets a one-time code by email that works for 48 hours.</p>
              <form onSubmit={review} noValidate className="mt-5 space-y-4">
                <div>
                  <label htmlFor="successor" className="block text-[13px] font-medium text-slate-700 mb-1.5">Successor&apos;s school email</label>
                  <input id="successor" type="email" autoComplete="off" autoFocus placeholder={`maria.santos@${SCHOOL_EMAIL_DOMAIN}`} value={email}
                    onChange={(e) => { setEmail(e.target.value); setError(null); }} className={input} />
                </div>
                <InlineError message={error} onDismiss={() => setError(null)} />
                <div className="pt-2 flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
                  <button type="button" onClick={closeForm} disabled={busy}
                    className="min-h-11 px-5 rounded-full border border-slate-300 text-[14px] hover:bg-slate-50 disabled:opacity-60">
                    Cancel
                  </button>
                  <button type="submit" disabled={busy || !email.trim()} className={primary}>
                    <Send size={15} /> Send handover code
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
        title={`Hand over the role to ${email.trim().toLowerCase()}?`}
        message="They'll get a code by email. Once they accept it, they become the Guidance Associate and you're signed out with your account closed. You can cancel the invitation until then."
        confirmLabel="Send code"
        danger
        busy={busy}
        onCancel={() => setConfirming(false)}
        onConfirm={send}
      />
    </section>
  );
}
