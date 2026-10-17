"use client";

import React, { useEffect, useState } from "react";
import { Loader2, ShieldCheck, Smartphone } from "lucide-react";
import { confirmTotpSetup, disableTotp, getMyTotpStatus, startTotpSetup } from "../app/action/totp";
import InlineError from "./InlineError";

// "Sign in with Microsoft Authenticator": scan a QR code once, then sign in
// with the 6-digit code from the app instead of waiting for an email.
export default function AuthenticatorSetup() {
  const [status, setStatus] = useState<{ enabled: boolean; since: Date | null } | null>(null);
  const [setup, setSetup] = useState<{ qr: string; secret: string } | null>(null);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    getMyTotpStatus().then((s) => !cancelled && setStatus(s));
    return () => {
      cancelled = true;
    };
  }, []);

  const start = async () => {
    setBusy(true);
    setError(null);
    setDone(null);
    const result = await startTotpSetup();
    setBusy(false);
    if (result.success) setSetup({ qr: result.qr, secret: result.secret });
    else setError(result.error);
  };

  const confirm = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const result = await confirmTotpSetup(code);
    setBusy(false);
    if (result.success) {
      setSetup(null);
      setCode("");
      setDone("Done. Next time, choose “Use authenticator app” on the sign-in page.");
      setStatus(await getMyTotpStatus());
    } else setError(result.error ?? "That code isn't right.");
  };

  const turnOff = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const result = await disableTotp(code);
    setBusy(false);
    if (result.success) {
      setCode("");
      setDone("Authenticator sign-in is turned off. You'll sign in with email codes.");
      setStatus(await getMyTotpStatus());
    } else setError(result.error ?? "Couldn't turn it off.");
  };

  const codeInput = (id: string) => (
    <input id={id} inputMode="numeric" autoComplete="one-time-code" maxLength={6} placeholder="000000" value={code}
      onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
      className="w-36 font-mono text-center text-lg tracking-[0.3em] bg-sheet border border-slate-300 rounded-md px-3 py-2" />
  );

  return (
    <section className="bg-sheet border border-rule rounded-2xl p-5 sm:p-6" aria-labelledby="totp-heading">
      <h2 id="totp-heading" className="font-semibold text-[17px] text-ink inline-flex items-center gap-2">
        <Smartphone size={18} className="text-blue-700" /> Sign in with Microsoft Authenticator
      </h2>
      <p className="text-sm text-slate-600 mt-1 max-w-[65ch]">
        Instead of waiting for an email code, use the 6-digit code from Microsoft Authenticator (or Google Authenticator) on your phone.
      </p>

      {status === null ? (
        <div className="py-6 flex text-slate-500"><Loader2 className="animate-spin" size={18} /></div>
      ) : status.enabled && !setup ? (
        <div className="mt-4 space-y-3">
          <p className="inline-flex items-center gap-2 text-sm text-emerald-700 font-medium">
            <ShieldCheck size={16} /> Turned on
            {status.since && ` since ${new Date(status.since).toLocaleDateString("en-PH", { month: "long", day: "numeric", year: "numeric", timeZone: "Asia/Manila" })}`}
          </p>
          <form onSubmit={turnOff} className="flex flex-wrap items-end gap-2">
            <div>
              <label htmlFor="totp-off" className="block text-[13px] font-medium text-slate-700 mb-1">To turn it off, enter a current code</label>
              {codeInput("totp-off")}
            </div>
            <button type="submit" disabled={busy || code.length !== 6}
              className="px-4 min-h-10 rounded-full text-sm text-red-700 hover:bg-red-50 border border-red-200 disabled:opacity-50">
              Turn off
            </button>
          </form>
        </div>
      ) : setup ? (
        <div className="mt-4 grid gap-5 sm:grid-cols-[auto_1fr] items-start">
          {/* eslint-disable-next-line @next/next/no-img-element -- generated data URL */}
          <img src={setup.qr} alt="QR code to add E-Gabay to your authenticator app" width={180} height={180} className="rounded-lg border border-rule bg-white" />
          <div className="space-y-3 min-w-0">
            <ol className="list-decimal pl-5 text-sm text-slate-700 space-y-1">
              <li>Open Microsoft Authenticator and tap <strong>+</strong> → <strong>Other account</strong>.</li>
              <li>Scan this QR code. On the same phone? Enter this key instead:</li>
            </ol>
            <p className="font-mono text-[13px] bg-slate-50 border border-rule rounded-md px-3 py-2 break-all select-all">{setup.secret}</p>
            <form onSubmit={confirm} className="flex flex-wrap items-end gap-2">
              <div>
                <label htmlFor="totp-confirm" className="block text-[13px] font-medium text-slate-700 mb-1">3. Type the code the app shows</label>
                {codeInput("totp-confirm")}
              </div>
              <button type="submit" disabled={busy || code.length !== 6}
                className="inline-flex items-center gap-2 bg-blue-700 hover:bg-blue-800 text-white text-sm font-medium px-5 min-h-10 rounded-full disabled:opacity-50">
                {busy && <Loader2 size={15} className="animate-spin" />} Turn on
              </button>
              <button type="button" onClick={() => { setSetup(null); setCode(""); }} className="px-4 min-h-10 rounded-full text-sm text-slate-600 hover:bg-slate-100">
                Cancel
              </button>
            </form>
          </div>
        </div>
      ) : (
        <button onClick={start} disabled={busy}
          className="mt-4 inline-flex items-center gap-2 bg-blue-700 hover:bg-blue-800 text-white text-sm font-medium px-5 min-h-11 rounded-full disabled:opacity-60">
          {busy && <Loader2 size={15} className="animate-spin" />} Set up authenticator app
        </button>
      )}

      <InlineError message={error} onDismiss={() => setError(null)} className="mt-3" />
      {done && <p role="status" className="mt-3 text-sm text-emerald-700">{done}</p>}
    </section>
  );
}
