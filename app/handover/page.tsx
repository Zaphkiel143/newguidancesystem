"use client";

import React, { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, Loader2 } from "lucide-react";
import { acceptHandover, requestClaim } from "../action/handover";
import { SCHOOL_EMAIL_DOMAIN } from "../config/school";
import { LogoMark } from "../../components/Logo";
import PasswordStrength from "../../components/PasswordStrength";

const input = "w-full px-3.5 py-2.5 bg-sheet border border-slate-300 rounded-md text-[15px]";
const label = "block text-[13px] font-medium text-slate-700 mb-1.5";
const primary = "w-full inline-flex items-center justify-center gap-2 bg-blue-700 hover:bg-blue-800 text-white font-medium min-h-11 rounded-full text-[15px] disabled:opacity-60";

type Mode = "accept" | "claim" | "claimSent";

// For the new Guidance Associate: redeem a handover code (from the outgoing
// Guidance Associate's invitation, or a claim code from the office mailbox),
// or ask for a claim code when nobody can hand the role over.
function HandoverForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [mode, setMode] = useState<Mode>("accept");
  const [email, setEmail] = useState(params.get("email") ?? "");
  const [code, setCode] = useState("");
  const [fullName, setFullName] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [needs, setNeeds] = useState<{ details: boolean; password: boolean }>({ details: false, password: false });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const accept = async (e: React.FormEvent) => {
    e.preventDefault();
    if (needs.password && password !== confirm) return setError("The passwords don't match.");
    setBusy(true);
    setError(null);
    const result = await acceptHandover({
      email,
      code,
      fullName: needs.details ? fullName : undefined,
      newPassword: needs.password ? password : undefined,
    });
    if (result.success) {
      router.push(result.redirectTo);
      return;
    }
    setBusy(false);
    if ("needsDetails" in result) setNeeds({ details: true, password: true });
    else if ("needsPassword" in result) setNeeds((n) => ({ ...n, password: true }));
    else setError(result.error);
  };

  const claim = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const result = await requestClaim(email);
    setBusy(false);
    if (result.success) setMode("claimSent");
    else setError(result.error);
  };

  const heading: Record<Mode, [string, string]> = {
    accept: ["New Guidance Associate", "Enter your school email and the handover code you received."],
    claim: ["Claim the role", "For when the previous Guidance Associate left without handing over."],
    claimSent: ["Check the office mailbox", "If the request can go ahead, a claim code is on its way."],
  };

  return (
    <section className="w-full max-w-[440px] bg-sheet border border-rule rounded-2xl shadow-lg p-6 sm:p-8">
      <div className="text-center">
        <LogoMark size={64} className="block mx-auto rounded-[14px] shadow-md" />
        <h1 className="mt-4 text-2xl font-bold tracking-tight text-ink">{heading[mode][0]}</h1>
        <p className="text-sm text-slate-500 mt-1">{heading[mode][1]}</p>
      </div>

      {mode === "accept" && (
        <form onSubmit={accept} noValidate className="mt-7 space-y-4">
          <div>
            <label htmlFor="ho-email" className={label}>School email</label>
            <input id="ho-email" type="email" autoComplete="username" placeholder={`maria.santos@${SCHOOL_EMAIL_DOMAIN}`} value={email}
              onChange={(e) => setEmail(e.target.value)} className={input} />
          </div>
          <div>
            <label htmlFor="ho-code" className={label}>Handover or claim code</label>
            <input id="ho-code" type="text" autoComplete="one-time-code" placeholder="ABCDE-FGHJK" value={code} maxLength={14}
              onChange={(e) => setCode(e.target.value.toUpperCase())} className={`${input} font-mono tracking-wider`} />
          </div>
          {needs.details && (
            <div>
              <label htmlFor="ho-name" className={label}>Your full name</label>
              <input id="ho-name" type="text" autoComplete="name" placeholder="Maria Santos" value={fullName}
                onChange={(e) => setFullName(e.target.value)} className={input} />
            </div>
          )}
          {needs.password && (
            <>
              <div>
                <label htmlFor="ho-pw" className={label}>Choose a password</label>
                <input id="ho-pw" type="password" autoComplete="new-password" value={password}
                  onChange={(e) => setPassword(e.target.value)} className={input} aria-describedby="ho-pw-strength" />
                <PasswordStrength password={password} id="ho-pw-strength" />
              </div>
              <div>
                <label htmlFor="ho-pw2" className={label}>Type it again</label>
                <input id="ho-pw2" type="password" autoComplete="new-password" value={confirm}
                  onChange={(e) => setConfirm(e.target.value)} className={input} />
              </div>
            </>
          )}
          {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
          <button type="submit" disabled={busy || !email.trim() || !code.trim()} className={primary}>
            {busy && <Loader2 size={16} className="animate-spin" />} Become the Guidance Associate
          </button>
          <p className="text-[13px] text-slate-500 text-center">
            No code because the previous Guidance Associate already left?{" "}
            <button type="button" onClick={() => { setMode("claim"); setError(null); }} className="text-blue-700 font-medium underline underline-offset-2">
              Claim the role
            </button>
          </p>
        </form>
      )}

      {mode === "claim" && (
        <form onSubmit={claim} noValidate className="mt-7 space-y-4">
          <p className="text-sm text-slate-600">
            We&apos;ll send a claim code to the guidance office&apos;s own mailbox, not to you. STI IT gives that mailbox to the new Guidance Associate.
            If someone still holds the role, they&apos;re told, and the code only works after 24 hours.
          </p>
          <div>
            <label htmlFor="cl-email" className={label}>Your school email</label>
            <input id="cl-email" type="email" autoComplete="username" placeholder={`maria.santos@${SCHOOL_EMAIL_DOMAIN}`} value={email}
              onChange={(e) => setEmail(e.target.value)} className={input} />
          </div>
          {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
          <button type="submit" disabled={busy || !email.trim()} className={primary}>
            {busy && <Loader2 size={16} className="animate-spin" />} Send claim code to the office mailbox
          </button>
          <button type="button" onClick={() => { setMode("accept"); setError(null); }} className="w-full text-[13px] text-slate-600 inline-flex items-center justify-center gap-1">
            <ArrowLeft size={14} /> I have a code
          </button>
        </form>
      )}

      {mode === "claimSent" && (
        <div className="mt-7 space-y-4">
          <p className="text-sm text-slate-600">
            Open the guidance office mailbox and look for &ldquo;Request to become the Guidance Associate in E-Gabay&rdquo;. Then enter the code here with
            your email. The email says when the code starts working.
          </p>
          <button type="button" onClick={() => setMode("accept")} className={primary}>Enter the code</button>
        </div>
      )}

      <Link href="/Login" className="mt-6 block text-center text-[13px] text-slate-500 hover:text-ink">Back to sign in</Link>
    </section>
  );
}

export default function HandoverPage() {
  return (
    <main className="min-h-dvh bg-blue-900 flex items-center justify-center px-4 py-10">
      <Suspense fallback={<Loader2 className="animate-spin text-white" />}>
        <HandoverForm />
      </Suspense>
    </main>
  );
}
