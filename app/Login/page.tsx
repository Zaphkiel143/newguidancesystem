"use client";

import React, { useEffect, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { login, loginAsDemo, requestLoginCode, verifyLoginCode } from '../action/auth';
import { LogoMark } from '../../components/Logo';
import { SCHOOL_EMAIL_DOMAIN } from '../config/school';
import type { UserRole } from '../../lib/generated';

const DEMO_ROLES: { role: UserRole; label: string }[] = [
  { role: "COUNSELOR", label: "Counselor" },
  { role: "STUDENT", label: "Student" },
  { role: "FACULTY", label: "Faculty" },
  { role: "PARENT", label: "Parent" },
];

const SHOW_DEMO = process.env.NEXT_PUBLIC_DEMO_LOGIN !== "false";

// "email" → enter school email; "code" → enter the emailed code;
// "name" → first sign-in only, tell us your full name; "password" → parents.
type Step = "email" | "code" | "name" | "password";

const RESEND_SECONDS = 60;

const LoginPage = () => {
  const router = useRouter();
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [nameExtension, setNameExtension] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [resendIn, setResendIn] = useState(0);
  const [demoLoadingRole, setDemoLoadingRole] = useState<UserRole | null>(null);
  const codeInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (resendIn <= 0) return;
    const t = setTimeout(() => setResendIn((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [resendIn]);

  const go = (next: Step) => {
    setError(null);
    setStep(next);
  };

  const sendCode = async (e?: React.FormEvent) => {
    e?.preventDefault();
    setIsSubmitting(true);
    setError(null);
    const result = await requestLoginCode(email);
    setIsSubmitting(false);
    if (result.success) {
      setEmail(result.email);
      setCode('');
      setResendIn(RESEND_SECONDS);
      setStep("code");
      setTimeout(() => codeInput.current?.focus(), 0);
    } else {
      setError(result.error);
    }
  };

  const checkCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    // Records are linked by name in "First Last Ext" order, e.g. "Juan Dela Cruz Jr."
    const fullName = [firstName, lastName, nameExtension].map((s) => s.trim()).filter(Boolean).join(" ");
    const result = await verifyLoginCode({ email, code, fullName: step === "name" ? fullName : undefined });
    setIsSubmitting(false);
    if (result.success) {
      router.push(result.redirectTo);
    } else if ("needsName" in result) {
      go("name");
    } else {
      setError(result.error);
    }
  };

  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    const result = await login({ email, password });
    setIsSubmitting(false);
    if (result.success) {
      router.push(result.redirectTo);
    } else {
      setError(result.error || "Login failed.");
    }
  };

  const handleDemoAccess = async (role: UserRole) => {
    setDemoLoadingRole(role);
    await loginAsDemo(role);
  };

  const inputClass = "w-full px-3.5 py-2.5 bg-sheet border border-slate-300 rounded-md text-[15px] placeholder:text-slate-400 transition-colors";
  const primaryButton = "w-full inline-flex items-center justify-center gap-2 bg-blue-700 text-white font-medium py-2.5 rounded-full hover:bg-blue-800 transition-colors text-[15px] disabled:opacity-60";

  const heading: Record<Step, [string, string]> = {
    email: ["Sign in", "Use your STI school email. We'll send you a code."],
    code: ["Check your email", `We sent a 6-digit code to ${email}.`],
    name: ["Welcome to E-Gabay", "First time here? Tell us your name."],
    password: ["Parent or guardian sign in", "Use the email and password from the guidance office."],
  };

  return (
    <main className="min-h-dvh bg-paper flex flex-col">
      {/* STI top bar: navy with the yellow stripe, as on One STI */}
      <header className="h-(--topbar-h) bg-blue-700 text-white border-t-4 border-sti-yellow shadow-md">
        <div className="h-full max-w-5xl mx-auto px-6 sm:px-10 flex items-center gap-3">
          <LogoMark size={36} tone="light" className="shrink-0" />
          <span className="font-semibold text-[17px] tracking-tight">E-Gabay</span>
          <span aria-hidden className="hidden sm:block w-px h-5 bg-white/30" />
          <span className="hidden sm:block text-[13px] text-white/80">Guidance and Counseling Office</span>
        </div>
      </header>

      <div className="flex-1 w-full px-5 py-10 sm:py-14 flex items-center justify-center">
        {/* One card: campus photo, school logo, then sign in */}
        <section className="w-full max-w-[420px] bg-sheet border border-rule rounded-2xl shadow-lg overflow-hidden animate-rise-in">
          <div className="relative h-36 sm:h-40">
            <Image
              src="/campus.jpg"
              alt="STI College Sta. Maria campus"
              fill
              priority
              sizes="420px"
              className="object-cover object-[50%_58%]"
            />
            <div aria-hidden className="absolute inset-x-0 bottom-0 h-16 bg-linear-to-t from-white to-white/0" />
          </div>

          <div className="relative px-7 sm:px-8 pb-8 -mt-10">
            <Image src="/sti-logo.jpg" alt="STI College Sta. Maria" width={72} height={72} className="rounded-2xl shadow-md ring-4 ring-white" />
            <h1 className="mt-4 text-2xl font-bold tracking-tight text-ink">{heading[step][0]}</h1>
            <p className="text-sm text-slate-500 mt-1 break-words">{heading[step][1]}</p>

            {step === "email" && (
              <form onSubmit={sendCode} className="mt-7 space-y-5">
                <div>
                  <label htmlFor="email" className="block text-[13px] font-medium text-slate-700 mb-1.5">School email</label>
                  <input
                    id="email"
                    type="email"
                    autoComplete="email"
                    inputMode="email"
                    placeholder={`juan.delacruz@${SCHOOL_EMAIL_DOMAIN}`}
                    className={inputClass}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
                <ErrorLine error={error} />
                <button type="submit" disabled={isSubmitting} className={primaryButton}>
                  {isSubmitting ? <><Loader2 size={16} className="animate-spin" /> Sending code</> : "Send code"}
                </button>
              </form>
            )}

            {(step === "code" || step === "name") && (
              <form onSubmit={checkCode} className="mt-7 space-y-5">
                {step === "code" ? (
                  <div>
                    <label htmlFor="code" className="block text-[13px] font-medium text-slate-700 mb-1.5">6-digit code</label>
                    <input
                      id="code"
                      ref={codeInput}
                      type="text"
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      pattern="[0-9]{6}"
                      maxLength={6}
                      placeholder="000000"
                      className={`${inputClass} font-mono text-center text-xl tracking-[0.5em]`}
                      value={code}
                      onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                      required
                    />
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div>
                      <label htmlFor="lastName" className="block text-[13px] font-medium text-slate-700 mb-1.5">Last name</label>
                      <input id="lastName" type="text" autoComplete="family-name" placeholder="Dela Cruz" className={inputClass}
                        value={lastName} onChange={(e) => setLastName(e.target.value)} required autoFocus />
                    </div>
                    <div className="grid grid-cols-[1fr_7rem] gap-3">
                      <div>
                        <label htmlFor="firstName" className="block text-[13px] font-medium text-slate-700 mb-1.5">First name</label>
                        <input id="firstName" type="text" autoComplete="given-name" placeholder="Juan" className={inputClass}
                          value={firstName} onChange={(e) => setFirstName(e.target.value)} required />
                      </div>
                      <div>
                        <label htmlFor="nameExtension" className="block text-[13px] font-medium text-slate-700 mb-1.5">
                          Ext. <span className="font-normal text-slate-500">(optional)</span>
                        </label>
                        <select id="nameExtension" autoComplete="honorific-suffix" className={inputClass}
                          value={nameExtension} onChange={(e) => setNameExtension(e.target.value)}>
                          <option value="">None</option>
                          {["Jr.", "Sr.", "II", "III", "IV", "V"].map((x) => <option key={x} value={x}>{x}</option>)}
                        </select>
                      </div>
                    </div>
                    <p className="text-xs text-slate-500">Use the name on your school records so the guidance office can find you.</p>
                  </div>
                )}
                <ErrorLine error={error} />
                <button type="submit" disabled={isSubmitting || (step === "code" && code.length !== 6)} className={primaryButton}>
                  {isSubmitting ? <><Loader2 size={16} className="animate-spin" /> Checking</> : step === "code" ? "Sign in" : "Continue"}
                </button>
                {step === "code" && (
                  <div className="flex items-center justify-between text-[13px]">
                    <button type="button" onClick={() => go("email")} className="inline-flex items-center gap-1 px-2 min-h-9 -ml-2 rounded-full text-slate-600 hover:text-ink hover:bg-slate-100">
                      <ArrowLeft size={14} /> Different email
                    </button>
                    <button type="button" onClick={() => sendCode()} disabled={resendIn > 0 || isSubmitting}
                      className="px-2 min-h-9 -mr-2 rounded-full text-blue-700 hover:bg-blue-50 disabled:text-slate-500 disabled:hover:bg-transparent">
                      {resendIn > 0 ? `Resend in ${resendIn}s` : "Resend code"}
                    </button>
                  </div>
                )}
              </form>
            )}

            {step === "password" && (
              <form onSubmit={handlePasswordLogin} className="mt-7 space-y-5">
                <div>
                  <label htmlFor="p-email" className="block text-[13px] font-medium text-slate-700 mb-1.5">Email</label>
                  <input id="p-email" type="email" autoComplete="email" className={inputClass} value={email}
                    onChange={(e) => setEmail(e.target.value)} required />
                </div>
                <div>
                  <label htmlFor="password" className="block text-[13px] font-medium text-slate-700 mb-1.5">Password</label>
                  <input id="password" type="password" autoComplete="current-password" className={inputClass} value={password}
                    onChange={(e) => setPassword(e.target.value)} required />
                </div>
                <ErrorLine error={error} />
                <button type="submit" disabled={isSubmitting} className={primaryButton}>
                  {isSubmitting ? <><Loader2 size={16} className="animate-spin" /> Signing in</> : "Sign in"}
                </button>
                <button type="button" onClick={() => go("email")} className="inline-flex items-center gap-1 px-2 min-h-9 -ml-2 rounded-full text-[13px] text-slate-600 hover:text-ink hover:bg-slate-100">
                  <ArrowLeft size={14} /> Student or staff? Use your school email
                </button>
              </form>
            )}

            {step === "email" && (
              <p className="mt-5 text-center text-[13px] text-slate-600">
                Parent or guardian?{" "}
                <button type="button" onClick={() => go("password")} className="px-1 rounded text-blue-700 font-medium hover:underline underline-offset-4">
                  Sign in with a password
                </button>
              </p>
            )}

            {SHOW_DEMO && (
            <div className="mt-8 pt-6 border-t border-rule">
              <p className="text-[13px] text-slate-500">Demo accounts</p>
              <ul className="mt-2 divide-y divide-rule">
                {DEMO_ROLES.map(({ role, label }) => (
                  <li key={role}>
                    <button
                      type="button"
                      onClick={() => handleDemoAccess(role)}
                      disabled={demoLoadingRole !== null}
                      className="group w-full flex items-center justify-between min-h-11 text-[14px] text-ink hover:text-blue-700 disabled:opacity-50 transition-colors"
                    >
                      <span>Continue as {label}</span>
                      {demoLoadingRole === role ? (
                        <Loader2 size={15} className="animate-spin text-slate-500" />
                      ) : (
                        <ArrowRight size={15} className="text-slate-300 group-hover:text-blue-700 group-hover:translate-x-0.5 transition" />
                      )}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
            )}
          </div>
        </section>
      </div>

      <footer className="px-6 sm:px-10 py-6 text-[12px] text-slate-500 flex flex-wrap gap-x-6 gap-y-1">
        <span>© {new Date().getFullYear()} STI College Sta. Maria</span>
        <span>Guidance and Counseling Office</span>
      </footer>
    </main>
  );
};

function ErrorLine({ error }: { error: string | null }) {
  if (!error) return null;
  return (
    <p role="alert" className="text-[13px] text-red-700 border-l-2 border-red-500 pl-3">
      {error}
    </p>
  );
}

export default LoginPage;
