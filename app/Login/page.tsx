"use client";

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, BookOpen, Heart, Loader2, Users } from 'lucide-react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { login, loginAsDemo, registerParent, requestLoginCode, verifyLoginCode, type SignInAs } from '../action/auth';
import { SCHOOL_EMAIL_DOMAIN, roleFromSchoolEmail } from '../config/school';
import { LogoMark } from '../../components/Logo';
import { signInWithTotp } from '../action/totp';
import { checkLoginApproval, requestLoginApproval } from '../action/loginApproval';
import { isShs, SHS } from '../config/studentLevels';
import { optionValue } from '../../lib/optionListDefaults';
import { useOptionList } from '../../components/useOptionList';
import type { UserRole } from '../../lib/generated';
import {
  FIX_FIELDS_MESSAGE,
  PARENT_SIGNUP_FIELDS,
  PHONE_HELP,
  nameChars,
  validateParentSignup,
  type ParentSignupErrors,
  type ParentSignupField,
} from '../../lib/parentSignup';
import { capitalizeName, phoneChars } from '../config/collegeCareerForm';
import PasswordStrength from '../../components/PasswordStrength';

// What's wrong with a typed school email, if anything.
function schoolEmailProblem(value: string): string | null {
  const v = value.trim().toLowerCase();
  if (!v) return "Enter your school email.";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) return `That isn't a valid email address. It should look like juan.delacruz@${SCHOOL_EMAIL_DOMAIN}.`;
  if (!v.endsWith(`@${SCHOOL_EMAIL_DOMAIN}`)) return `Use your STI school email, ending in @${SCHOOL_EMAIL_DOMAIN}.`;
  return null;
}

const DEMO_ROLES: { role: UserRole; label: string }[] = [
  { role: "COUNSELOR", label: "Associate" },
  { role: "STUDENT", label: "Student" },
  { role: "FACULTY", label: "Faculty" },
  { role: "PARENT", label: "Parent" },
];

const SHOW_DEMO = process.env.NEXT_PUBLIC_DEMO_LOGIN !== "false";

// Which input to focus for each sign-up field that has an error.
const REG_INPUT_IDS: Record<ParentSignupField, string> = {
  lastName: "lastName",
  firstName: "firstName",
  nameExtension: "nameExtension",
  phone: "r-phone",
  email: "r-email",
  password: "r-password",
  confirm: "r-confirm",
  childName: "r-child",
  childStudentId: "r-childId",
  relationship: "r-rel",
};

type Step = "who" | "email" | "code" | "details" | "parent" | "register" | "waiting" | "totp" | "approve";

const RESEND_SECONDS = 30;

// Labels for the "your account is registered as ___" notice - kept separate
// from WHO_OPTIONS below now that one door (Student, Faculty or Staff) can
// resolve to either of two roles.
const ROLE_DOOR_LABEL: Record<UserRole, string> = {
  STUDENT: "Student",
  FACULTY: "Faculty or staff",
  PARENT: "Parent or guardian",
  COUNSELOR: "Guidance office",
};
const roleLabel = (role: UserRole) => ROLE_DOOR_LABEL[role] ?? role;

// Students and faculty/staff sign in the same way (school email + code) and,
// since a role change already forces a fresh sign-in, which door they click
// never decides an existing account's role - so they share one door. A
// brand-new account picks between the two at the details step below.
const WHO_OPTIONS: { value: SignInAs | "PARENT"; label: string; hint: string; icon: typeof Users }[] = [
  { value: "STUDENT", label: "Student, Faculty or Staff", hint: "Senior high, tertiary, teachers and advisers", icon: BookOpen },
  { value: "PARENT", label: "Parent or guardian", hint: "Sign in with your mobile number", icon: Heart },
  { value: "COUNSELOR", label: "Guidance office", hint: "Guidance Associates", icon: Users },
];

const LoginPage = () => {
  const router = useRouter();
  const [departments] = useOptionList("departments");
  const [nameExtensions] = useOptionList("nameExtensions");
  const [relationships] = useOptionList("relationships");
  const [shsGrades] = useOptionList("shsGrades");
  const [tertiaryYears] = useOptionList("tertiaryYears");
  const [shsStrands] = useOptionList("shsStrands");
  const [tertiaryCourses] = useOptionList("tertiaryCourses");
  const [step, setStep] = useState<Step>("who");
  const [signInAs, setSignInAs] = useState<SignInAs>("STUDENT");
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [name, setName] = useState({ last: '', first: '', ext: '' });
  const [student, setStudent] = useState({ studentId: '', department: SHS as string, yearLevel: '', program: '', section: '' });
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [reg, setReg] = useState({ email: '', password: '', confirm: '', childStudentId: '', childName: '', relationship: '', website: '' });
  const [regErrors, setRegErrors] = useState<ParentSignupErrors>({});
  const [waitingMessage, setWaitingMessage] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [roleNotice, setRoleNotice] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [resendIn, setResendIn] = useState(0);
  const [emailError, setEmailError] = useState<string | null>(null);
  // The email the resend countdown applies to; another email can ask right away.
  const [resendFor, setResendFor] = useState('');
  const [demoLoadingRole, setDemoLoadingRole] = useState<UserRole | null>(null);
  const codeInput = useRef<HTMLInputElement>(null);
  const [approval, setApproval] = useState<{ requestId: string; secret: string; number: number } | null>(null);

  // The picked "who" door only matters for a brand-new account (see
  // createSchoolAccount); for an existing one the server returns whatever
  // role is on file. If that differs from what was picked - most often
  // because the guidance office changed it - say so before moving on.
  const finishLogin = useCallback(
    (result: { redirectTo: string; role: UserRole }) => {
      if (signInAs !== result.role) {
        setRoleNotice(`Your account is registered as ${roleLabel(result.role)}. Signing you in there.`);
        setTimeout(() => router.push(result.redirectTo), 1800);
      } else {
        router.push(result.redirectTo);
      }
    },
    [signInAs, router]
  );

  useEffect(() => {
    if (step !== "approve" || !approval) return;
    let stopped = false;
    const tick = async () => {
      const r = await checkLoginApproval(approval.requestId, approval.secret);
      if (stopped) return;
      if (r.state === "approved") {
        stopped = true;
        finishLogin(r);
      } else if (r.state === "denied") {
        stopped = true;
        setApproval(null);
        setStep("email");
        setError("The sign-in was denied on your other device.");
      } else if (r.state === "expired") {
        stopped = true;
        setApproval(null);
        setStep("email");
        setError("The request expired. Try again, or use an email code.");
      }
    };
    const id = setInterval(tick, 2000);
    return () => {
      stopped = true;
      clearInterval(id);
    };
  }, [step, approval, finishLogin]);

  const askApproval = async () => {
    setIsSubmitting(true);
    setError(null);
    const r = await requestLoginApproval(email);
    setIsSubmitting(false);
    if (r.success) {
      setApproval({ requestId: r.requestId, secret: r.secret, number: r.number });
      setStep("approve");
    } else {
      setError(r.error);
    }
  };

  useEffect(() => {
    if (resendIn <= 0) return;
    const t = setTimeout(() => setResendIn((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [resendIn]);

  const go = (next: Step) => {
    setError(null);
    setRoleNotice(null);
    setRegErrors({});
    setStep(next);
  };

  const pickWho = (value: SignInAs | "PARENT") => {
    if (value === "PARENT") return go("parent");
    setSignInAs(value);
    go("email");
  };

  const fullName = () => [name.first, name.last, name.ext].map((s) => s.trim()).filter(Boolean).join(" ");

  const sendCode = async (e?: React.FormEvent) => {
    e?.preventDefault();
    const emailProblem = schoolEmailProblem(email);
    if (emailProblem) {
      setEmailError(emailProblem);
      document.getElementById("email")?.focus();
      return;
    }
    setIsSubmitting(true);
    setError(null);
    // A request the host cuts off (or a dropped connection) throws instead of returning.
    const result: Awaited<ReturnType<typeof requestLoginCode>> = await requestLoginCode(email).catch(
      () => ({ success: false, error: "Sending the code took too long. Try again in a moment." })
    );
    setIsSubmitting(false);
    if (result.success) {
      setEmail(result.email);
      setCode('');
      setResendIn(RESEND_SECONDS);
      setResendFor(result.email);
      setStep("code");
      setTimeout(() => codeInput.current?.focus(), 0);
    } else {
      setError(result.error);
      if (result.retryAfter) {
        setResendIn(result.retryAfter);
        setResendFor(email.trim().toLowerCase());
      }
    }
  };

  const checkCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (step === "code" && code.length !== 6) return setError("Enter the 6-digit code from your email.");
    setIsSubmitting(true);
    setError(null);
    const withDetails = step === "details";
    const result = await verifyLoginCode({
      email,
      code,
      signInAs,
      fullName: withDetails ? fullName() : undefined,
      student: withDetails && signInAs === "STUDENT" ? student : undefined,
    });
    setIsSubmitting(false);
    if (result.success) {
      finishLogin(result);
    } else if ("needsDetails" in result) {
      // The email's format already says student or faculty (guidance staff keep their own door).
      const fromEmail = roleFromSchoolEmail(email);
      if (fromEmail && signInAs !== "COUNSELOR") setSignInAs(fromEmail);
      go("details");
    } else if ("pending" in result) {
      setWaitingMessage(result.message);
      go("waiting");
    } else {
      setError(result.error);
    }
  };

  const handleTotpLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    const result = await signInWithTotp({ email, code });
    setIsSubmitting(false);
    if (result.success) finishLogin(result);
    else setError(result.error);
  };

  const handleParentLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    const result = await login({ identifier: phone, password });
    setIsSubmitting(false);
    if (result.success) {
      router.push(result.redirectTo);
    } else {
      setError(result.error);
    }
  };

  const focusFirstError = (errors: ParentSignupErrors) => {
    const first = PARENT_SIGNUP_FIELDS.find((f) => errors[f]);
    if (first) document.getElementById(REG_INPUT_IDS[first])?.focus();
  };

  const clearRegError = (f: ParentSignupField) =>
    setRegErrors((e) => {
      if (!e[f]) return e;
      const n = { ...e };
      delete n[f];
      return n;
    });

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    const check = validateParentSignup(
      {
        lastName: name.last,
        firstName: name.first,
        nameExtension: name.ext,
        phone,
        email: reg.email,
        password: reg.password,
        confirm: reg.confirm,
        childStudentId: reg.childStudentId,
        childName: reg.childName,
        relationship: reg.relationship,
      },
      { nameExtensions: nameExtensions.map(optionValue), relationships: relationships.map(optionValue) }
    );
    if (!check.ok) {
      setRegErrors(check.errors);
      setError(FIX_FIELDS_MESSAGE);
      focusFirstError(check.errors);
      return;
    }
    setRegErrors({});
    setIsSubmitting(true);
    setError(null);
    const result = await registerParent({
      lastName: name.last,
      firstName: name.first,
      nameExtension: name.ext,
      phone,
      email: reg.email,
      password: reg.password,
      childStudentId: reg.childStudentId,
      childName: reg.childName,
      relationship: reg.relationship,
      website: reg.website,
    });
    setIsSubmitting(false);
    if (result.success) {
      setWaitingMessage(
        "Thank you. The guidance office will check your child's student ID and confirm your account. Once it's approved, sign in with your mobile number and password."
      );
      setPassword('');
      setReg({ email: '', password: '', confirm: '', childStudentId: '', childName: '', relationship: '', website: '' });
      go("waiting");
    } else {
      setError(result.error);
      if (result.fieldErrors) {
        setRegErrors(result.fieldErrors);
        focusFirstError(result.fieldErrors);
      }
    }
  };

  const handleDemoAccess = async (role: UserRole) => {
    setDemoLoadingRole(role);
    await loginAsDemo(role);
  };

  const inputClass = "w-full px-3.5 py-2.5 bg-sheet border border-slate-300 rounded-md text-[15px] placeholder:text-slate-400 transition-colors";
  const fieldClass = (bad?: string) => (bad ? inputClass.replace("border-slate-300", "border-red-500") : inputClass);
  const labelClass = "block text-[13px] font-medium text-slate-700 mb-1.5";
  const primaryButton = "w-full inline-flex items-center justify-center gap-2 bg-blue-700 text-white font-medium py-2.5 rounded-full hover:bg-blue-800 transition-colors text-[15px] disabled:opacity-60";
  const backButton = "inline-flex items-center gap-1 px-2 min-h-9 -ml-2 rounded-full text-[13px] text-slate-600 hover:text-ink hover:bg-slate-100";

  const heading: Record<Step, [string, string]> = {
    who: ["Sign in", "Who's signing in?"],
    email: ["Sign in", "Use your STI school email. We'll send you a code."],
    code: ["Check your email", `We sent a 6-digit code to ${email}. Check Junk too.`],
    details: ["Welcome to E-Gabay", signInAs === "STUDENT" ? "First time here? Tell us who you are." : "First time here? Tell us your name."],
    parent: ["Parent or guardian", "Sign in with your mobile number."],
    register: ["Create a parent account", "The guidance office confirms every parent account before it can be used."],
    waiting: ["Almost there", waitingMessage],
    approve: ["Check your phone", "Open E-Gabay on a phone or computer where you're already signed in, and tap this number."],
    totp: ["Use your authenticator app", "Enter your school email and the 6-digit code under “E-Gabay STI” in Microsoft Authenticator (not your STI Microsoft account)."],
  };

  const nameFields = (
    <>
      <div>
        <label htmlFor="lastName" className={labelClass}>Last name</label>
        <input id="lastName" type="text" autoComplete="family-name" placeholder="Dela Cruz" className={fieldClass(regErrors.lastName)}
          aria-invalid={regErrors.lastName ? true : undefined} aria-describedby={regErrors.lastName ? "r-lastName-error" : "r-name-help"}
          value={name.last} onChange={(e) => { setName({ ...name, last: capitalizeName(nameChars(e.target.value)) }); clearRegError("lastName"); }} required maxLength={60} autoFocus />
        <p id="r-name-help" className="text-xs text-slate-500 mt-1">Letters only.</p>
        <FieldError id="r-lastName-error" message={regErrors.lastName} />
      </div>
      <div className="grid grid-cols-[1fr_7rem] gap-3">
        <div>
          <label htmlFor="firstName" className={labelClass}>First name</label>
          <input id="firstName" type="text" autoComplete="given-name" placeholder="Juan" className={fieldClass(regErrors.firstName)}
            aria-invalid={regErrors.firstName ? true : undefined} aria-describedby={regErrors.firstName ? "r-firstName-error" : undefined}
            value={name.first} onChange={(e) => { setName({ ...name, first: capitalizeName(nameChars(e.target.value)) }); clearRegError("firstName"); }} required maxLength={60} />
          <FieldError id="r-firstName-error" message={regErrors.firstName} />
        </div>
        <div>
          <label htmlFor="nameExtension" className={labelClass}>
            Ext. <span className="font-normal text-slate-500">(optional)</span>
          </label>
          <select id="nameExtension" autoComplete="honorific-suffix" className={fieldClass(regErrors.nameExtension)}
            aria-invalid={regErrors.nameExtension ? true : undefined} aria-describedby={regErrors.nameExtension ? "r-nameExtension-error" : undefined}
            value={name.ext} onChange={(e) => { setName({ ...name, ext: e.target.value }); clearRegError("nameExtension"); }}>
            <option value="">None</option>
            {nameExtensions.map((x) => <option key={x.id} value={optionValue(x)}>{x.label}</option>)}
          </select>
          <FieldError id="r-nameExtension-error" message={regErrors.nameExtension} />
        </div>
      </div>
    </>
  );

  return (
    <main className="relative isolate min-h-dvh bg-blue-900 flex flex-col">
      {/* Campus photo behind the sign-in card, tinted so the card stays readable */}
      <div aria-hidden className="fixed inset-0 -z-10 overflow-hidden">
        <Image src="/campus-hq.jpg" alt="" fill priority sizes="100vw" className="object-cover object-[30%_80%]" />
        <div className="absolute inset-0 bg-linear-to-b from-blue-900/55 via-blue-800/35 to-blue-900/70" />
      </div>
      <header className="relative h-(--topbar-h) bg-blue-700 text-white border-t-4 border-sti-yellow shadow-md">
        <div className="h-full max-w-5xl mx-auto px-6 sm:px-10 flex items-center gap-3">
          <LogoMark size={36} tone="light" className="shrink-0" />
          <span className="font-semibold text-[17px] tracking-tight">E-Gabay</span>
          <span aria-hidden className="hidden sm:block w-px h-5 bg-white/30" />
          <span className="hidden sm:block text-[13px] text-white/85">Guidance and Counseling Office · <span className="font-medium text-white">STI College Sta. Maria</span></span>
        </div>
      </header>

      <div className="flex-1 w-full px-4 sm:px-5 py-8 sm:py-14 flex items-center justify-center lg:justify-end lg:pr-[9vw]">
        <section className="w-full max-w-[440px] bg-sheet border border-rule rounded-2xl shadow-lg overflow-hidden animate-rise-in">
          <div className="relative px-6 sm:px-8 pt-8 pb-8">
            <div className="text-center">
              <LogoMark size={72} className="block mx-auto rounded-[16px] shadow-md" />
              <h1 className="mt-4 text-2xl font-bold tracking-tight text-ink">{heading[step][0]}</h1>
              <p className="text-sm text-slate-500 mt-1 break-words">{heading[step][1]}</p>
            </div>

            {step === "who" && (
              <ul className="mt-6 space-y-2">
                {WHO_OPTIONS.map(({ value, label, hint, icon: Icon }) => (
                  <li key={value}>
                    <button
                      type="button"
                      onClick={() => pickWho(value)}
                      className="group w-full flex items-center gap-3 rounded-xl border border-slate-200 hover:border-blue-400 hover:bg-blue-50 px-4 py-3 text-left transition-colors"
                    >
                      <span className="w-10 h-10 rounded-full bg-blue-50 group-hover:bg-white text-blue-700 grid place-items-center shrink-0">
                        <Icon size={18} />
                      </span>
                      <span className="flex-1 min-w-0">
                        <span className="block text-[15px] font-medium text-ink">{label}</span>
                        <span className="block text-[13px] text-slate-500">{hint}</span>
                      </span>
                      <ArrowRight size={16} className="text-slate-300 group-hover:text-blue-700" />
                    </button>
                  </li>
                ))}
              </ul>
            )}

            {step === "email" && (
              <form onSubmit={sendCode} noValidate className="mt-7 space-y-5">
                <div>
                  <label htmlFor="email" className={labelClass}>School email</label>
                  <input id="email" type="email" autoComplete="email" inputMode="email" placeholder={`juan.delacruz@${SCHOOL_EMAIL_DOMAIN}`}
                    className={fieldClass(emailError ?? undefined)} value={email} required autoFocus
                    aria-invalid={emailError ? true : undefined} aria-describedby={emailError ? "email-error" : undefined}
                    onChange={(e) => { setEmail(e.target.value); setEmailError(null); }}
                    onBlur={() => email.trim() && setEmailError(schoolEmailProblem(email))} />
                  <FieldError id="email-error" message={emailError ?? undefined} />
                </div>
                <ErrorLine error={error} />
                {resendIn > 0 && email.trim().toLowerCase() === resendFor && <ResendTimer seconds={resendIn} />}
                <button type="submit" disabled={isSubmitting || (resendIn > 0 && email.trim().toLowerCase() === resendFor)} className={primaryButton}>
                  {isSubmitting ? <><Loader2 size={16} className="animate-spin" /> Sending code</> : "Send code"}
                </button>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <button type="button" onClick={() => go("who")} className={backButton}>
                    <ArrowLeft size={14} /> Back
                  </button>
                  <button type="button" onClick={() => { setCode(''); go("totp"); }}
                    className="px-2 min-h-9 rounded-full text-[13px] text-blue-700 font-medium hover:bg-blue-50">
                    Use authenticator app instead
                  </button>
                </div>
                <button type="button" onClick={askApproval} disabled={isSubmitting || !email.trim()}
                  className="w-full min-h-11 rounded-full border border-blue-300 text-[14px] text-blue-700 font-medium hover:bg-blue-50 disabled:opacity-50">
                  Approve on my phone instead
                </button>
              </form>
            )}

            {step === "approve" && approval && (
              <div className="mt-7 text-center space-y-5">
                <p className="text-6xl font-bold tracking-wider text-ink tabular" aria-live="polite">{approval.number}</p>
                <p className="inline-flex items-center gap-2 text-sm text-slate-600">
                  <Loader2 size={15} className="animate-spin" /> Waiting for approval…
                </p>
                <NoticeLine message={roleNotice} />
                <p className="text-xs text-slate-500">
                  No notification? Open E-Gabay on your phone; the request pops up there. It expires in 2 minutes.
                </p>
                <button type="button" onClick={() => { setApproval(null); go("email"); }} className={backButton}>
                  <ArrowLeft size={14} /> Use an email code instead
                </button>
              </div>
            )}

            {step === "totp" && (
              <form onSubmit={handleTotpLogin} className="mt-7 space-y-5">
                <div>
                  <label htmlFor="t-email" className={labelClass}>School email</label>
                  <input id="t-email" type="email" autoComplete="email" inputMode="email" className={inputClass} value={email}
                    onChange={(e) => setEmail(e.target.value)} required />
                </div>
                <div>
                  <label htmlFor="t-code" className={labelClass}>Code from the app</label>
                  <input id="t-code" type="text" inputMode="numeric" autoComplete="one-time-code" maxLength={6} placeholder="000000"
                    className={`${inputClass} font-mono text-center text-xl tracking-[0.5em]`} value={code}
                    onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))} required autoFocus />
                </div>
                <ErrorLine error={error} />
                <NoticeLine message={roleNotice} />
                <button type="submit" disabled={isSubmitting || code.length !== 6} className={primaryButton}>
                  {isSubmitting ? <><Loader2 size={16} className="animate-spin" /> Checking</> : "Sign in"}
                </button>
                <p className="text-xs text-slate-500">
                  Haven&apos;t set it up? Sign in with an email code first, then turn it on from your Profile or My Account page.
                </p>
                <button type="button" onClick={() => go("email")} className={backButton}>
                  <ArrowLeft size={14} /> Use an email code instead
                </button>
              </form>
            )}

            {(step === "code" || step === "details") && (
              <form onSubmit={checkCode} className="mt-7 space-y-5">
                {step === "code" ? (
                  <div>
                    <label htmlFor="code" className={labelClass}>6-digit code</label>
                    <input id="code" ref={codeInput} type="text" inputMode="numeric" autoComplete="one-time-code" maxLength={6}
                      placeholder="000000" className={`${inputClass} font-mono text-center text-xl tracking-[0.5em]`} value={code}
                      onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))} />
                  </div>
                ) : (
                  <div className="space-y-4">
                    {nameFields}
                    {signInAs !== "COUNSELOR" && roleFromSchoolEmail(email) && (
                      <p className="text-[13px] text-slate-600 bg-blue-50 border border-blue-100 rounded-lg px-3 py-2">
                        From your school email, you&apos;re signing in as {signInAs === "STUDENT" ? "a student" : "faculty or staff"}.
                      </p>
                    )}
                    {signInAs !== "COUNSELOR" && !roleFromSchoolEmail(email) && (
                      <fieldset>
                        <legend className={labelClass}>I am a</legend>
                        <div className="grid grid-cols-2 gap-2">
                          {(["STUDENT", "FACULTY"] as const).map((r) => (
                            <label key={r} className={`flex items-center gap-2 rounded-lg border px-3 min-h-11 cursor-pointer text-[14px] ${signInAs === r ? "border-blue-600 bg-blue-50" : "border-slate-300"}`}>
                              <input type="radio" name="signInAsDetails" checked={signInAs === r} className="accent-blue-700"
                                onChange={() => setSignInAs(r)} />
                              {r === "STUDENT" ? "Student" : "Faculty or staff"}
                            </label>
                          ))}
                        </div>
                      </fieldset>
                    )}
                    {signInAs === "STUDENT" && (
                      <>
                        <div>
                          <label htmlFor="studentId" className={labelClass}>Student ID number</label>
                          <input id="studentId" type="text" placeholder="02000123456" className={inputClass} value={student.studentId}
                            onChange={(e) => setStudent({ ...student, studentId: e.target.value })} required maxLength={20} />
                        </div>
                        <fieldset>
                          <legend className={labelClass}>Level</legend>
                          <div className="grid grid-cols-2 gap-2">
                            {departments.map((d) => {
                              const value = optionValue(d);
                              return (
                                <label key={d.id} className={`flex items-center gap-2 rounded-lg border px-3 min-h-11 cursor-pointer text-[14px] ${student.department === value ? "border-blue-600 bg-blue-50" : "border-slate-300"}`}>
                                  <input type="radio" name="department" checked={student.department === value} className="accent-blue-700"
                                    onChange={() => setStudent({ ...student, department: value, yearLevel: '', program: '' })} />
                                  {d.label}
                                </label>
                              );
                            })}
                          </div>
                        </fieldset>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label htmlFor="yearLevel" className={labelClass}>{student.department === SHS ? "Grade" : "Year level"}</label>
                            <select id="yearLevel" className={inputClass} value={student.yearLevel} required
                              onChange={(e) => setStudent({ ...student, yearLevel: e.target.value })}>
                              <option value="" disabled>Choose…</option>
                              {(isShs(student.department) ? shsGrades : tertiaryYears).map((y) => <option key={y.id} value={optionValue(y)}>{y.label}</option>)}
                            </select>
                          </div>
                          <div>
                            <label htmlFor="section" className={labelClass}>Section</label>
                            <input id="section" type="text" placeholder="e.g. A" className={inputClass} value={student.section} maxLength={30}
                              onChange={(e) => setStudent({ ...student, section: e.target.value })} required />
                          </div>
                        </div>
                        <div>
                          <label htmlFor="program" className={labelClass}>{student.department === SHS ? "Strand" : "Course"}</label>
                          <select id="program" className={inputClass} value={student.program} required
                            onChange={(e) => setStudent({ ...student, program: e.target.value })}>
                            <option value="" disabled>Choose…</option>
                            {(isShs(student.department) ? shsStrands : tertiaryCourses).map((p) => <option key={p.id} value={optionValue(p)}>{p.label}</option>)}
                          </select>
                        </div>
                      </>
                    )}
                    {signInAs !== "STUDENT" && (
                      <p className="text-xs text-slate-600 bg-butter-50 border border-butter-200 rounded-lg px-3 py-2">
                        New {signInAs === "FACULTY" ? "faculty" : "guidance office"} accounts are approved by the guidance office before they can be used.
                      </p>
                    )}
                    <p className="text-xs text-slate-500">Use the name on your school records so the guidance office can find you.</p>
                  </div>
                )}
                <ErrorLine error={error} />
                <NoticeLine message={roleNotice} />
                <button type="submit" disabled={isSubmitting} className={primaryButton}>
                  {isSubmitting ? <><Loader2 size={16} className="animate-spin" /> Checking</> : step === "code" ? "Sign in" : "Continue"}
                </button>
                {step === "code" && resendIn > 0 && <ResendTimer seconds={resendIn} />}
                {step === "code" && (
                  <div className="flex items-center justify-between text-[13px]">
                    <button type="button" onClick={() => go("email")} className={backButton}>
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

            {step === "parent" && (
              <form onSubmit={handleParentLogin} className="mt-7 space-y-5">
                <div>
                  <label htmlFor="phone" className={labelClass}>Mobile number</label>
                  <input id="phone" type="tel" inputMode="tel" autoComplete="tel" placeholder="09171234567" className={inputClass}
                    aria-describedby="phone-help" value={phone} onChange={(e) => setPhone(phoneChars(e.target.value))} required autoFocus />
                  <p id="phone-help" className="text-xs text-slate-500 mt-1">{PHONE_HELP}</p>
                </div>
                <div>
                  <label htmlFor="password" className={labelClass}>Password</label>
                  <input id="password" type="password" autoComplete="current-password" className={inputClass} value={password}
                    onChange={(e) => setPassword(e.target.value)} required />
                </div>
                <ErrorLine error={error} />
                <button type="submit" disabled={isSubmitting} className={primaryButton}>
                  {isSubmitting ? <><Loader2 size={16} className="animate-spin" /> Signing in</> : "Sign in"}
                </button>
                <p className="text-center text-[13px] text-slate-600">
                  No account yet?{" "}
                  <button type="button" onClick={() => go("register")} className="px-1 rounded text-blue-700 font-medium hover:underline underline-offset-4">
                    Create a parent account
                  </button>
                </p>
                <button type="button" onClick={() => go("who")} className={backButton}>
                  <ArrowLeft size={14} /> Back
                </button>
              </form>
            )}

            {step === "register" && (
              <form onSubmit={handleRegister} noValidate className="mt-7 space-y-4">
                {/* Bot trap: hidden from people and screen readers; only bots fill it. */}
                <div aria-hidden="true" className="absolute -left-[9999px] w-px h-px overflow-hidden">
                  <label htmlFor="r-website">Website</label>
                  <input id="r-website" type="text" tabIndex={-1} autoComplete="off" value={reg.website}
                    onChange={(e) => setReg({ ...reg, website: e.target.value })} />
                </div>
                {nameFields}
                <div>
                  <label htmlFor="r-phone" className={labelClass}>Mobile number</label>
                  <input id="r-phone" type="tel" inputMode="tel" autoComplete="tel" placeholder="09171234567" className={fieldClass(regErrors.phone)}
                    aria-invalid={regErrors.phone ? true : undefined}
                    aria-describedby={["r-phone-help", regErrors.phone && "r-phone-error"].filter(Boolean).join(" ")}
                    value={phone} onChange={(e) => { setPhone(phoneChars(e.target.value)); clearRegError("phone"); }} required />
                  <FieldError id="r-phone-error" message={regErrors.phone} />
                  <p id="r-phone-help" className="text-xs text-slate-500 mt-1">
                    {`${PHONE_HELP} You'll use this to sign in. The guidance office may call it to confirm.`}
                  </p>
                </div>
                <div>
                  <label htmlFor="r-email" className={labelClass}>
                    Email <span className="font-normal text-slate-500">(optional, for appointment notices)</span>
                  </label>
                  <input id="r-email" type="email" autoComplete="email" className={fieldClass(regErrors.email)}
                    aria-invalid={regErrors.email ? true : undefined} aria-describedby={regErrors.email ? "r-email-error" : undefined}
                    value={reg.email} onChange={(e) => { setReg({ ...reg, email: e.target.value }); clearRegError("email"); }} />
                  <FieldError id="r-email-error" message={regErrors.email} />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="r-password" className={labelClass}>Password</label>
                    <input id="r-password" type="password" autoComplete="new-password" minLength={8} className={fieldClass(regErrors.password)}
                      aria-invalid={regErrors.password ? true : undefined}
                      aria-describedby={["r-password-help", regErrors.password && "r-password-error"].filter(Boolean).join(" ")}
                      value={reg.password}
                      onChange={(e) => { setReg({ ...reg, password: e.target.value }); clearRegError("password"); clearRegError("confirm"); }} required />
                    <FieldError id="r-password-error" message={regErrors.password} />
                    <PasswordStrength password={reg.password} id="r-password-help" />
                  </div>
                  <div>
                    <label htmlFor="r-confirm" className={labelClass}>Repeat password</label>
                    <input id="r-confirm" type="password" autoComplete="new-password" minLength={8} className={fieldClass(regErrors.confirm)}
                      aria-invalid={regErrors.confirm ? true : undefined} aria-describedby={regErrors.confirm ? "r-confirm-error" : undefined}
                      value={reg.confirm} onChange={(e) => { setReg({ ...reg, confirm: e.target.value }); clearRegError("confirm"); }} required />
                    <FieldError id="r-confirm-error" message={regErrors.confirm} />
                  </div>
                </div>

                <fieldset className="border-t border-rule pt-4 space-y-4">
                  <legend className="text-[14px] font-semibold text-ink pr-2">Your child at STI</legend>
                  <div>
                    <label htmlFor="r-child" className={labelClass}>Child&apos;s full name</label>
                    <input id="r-child" type="text" className={fieldClass(regErrors.childName)} value={reg.childName} maxLength={120}
                      aria-invalid={regErrors.childName ? true : undefined} aria-describedby={regErrors.childName ? "r-childName-error" : undefined}
                      onChange={(e) => { setReg({ ...reg, childName: e.target.value }); clearRegError("childName"); }} required />
                    <FieldError id="r-childName-error" message={regErrors.childName} />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label htmlFor="r-childId" className={labelClass}>Child&apos;s student ID</label>
                      <input id="r-childId" type="text" inputMode="numeric" placeholder="02000123456" className={fieldClass(regErrors.childStudentId)} value={reg.childStudentId}
                        aria-invalid={regErrors.childStudentId ? true : undefined} aria-describedby={regErrors.childStudentId ? "r-childStudentId-error" : undefined}
                        onChange={(e) => { setReg({ ...reg, childStudentId: e.target.value.replace(/\D/g, "").slice(0, 11) }); clearRegError("childStudentId"); }} required />
                      <FieldError id="r-childStudentId-error" message={regErrors.childStudentId} />
                    </div>
                    <div>
                      <label htmlFor="r-rel" className={labelClass}>You are their</label>
                      <select id="r-rel" className={fieldClass(regErrors.relationship)} value={reg.relationship} required
                        aria-invalid={regErrors.relationship ? true : undefined} aria-describedby={regErrors.relationship ? "r-relationship-error" : undefined}
                        onChange={(e) => { setReg({ ...reg, relationship: e.target.value }); clearRegError("relationship"); }}>
                        <option value="" disabled>Choose…</option>
                        {relationships.map((r) => <option key={r.id} value={optionValue(r)}>{r.label}</option>)}
                      </select>
                      <FieldError id="r-relationship-error" message={regErrors.relationship} />
                    </div>
                  </div>
                </fieldset>

                <ErrorLine error={error} />
                <button type="submit" disabled={isSubmitting} className={primaryButton}>
                  {isSubmitting ? <><Loader2 size={16} className="animate-spin" /> Sending</> : "Create account"}
                </button>
                <button type="button" onClick={() => go("parent")} className={backButton}>
                  <ArrowLeft size={14} /> I already have an account
                </button>
              </form>
            )}

            {step === "waiting" && (
              <div className="mt-6">
                <button type="button" onClick={() => go("who")} className={primaryButton}>
                  Back to sign in
                </button>
              </div>
            )}

            {SHOW_DEMO && (step === "who" || step === "email") && (
              <div className="mt-8 pt-6 border-t border-rule">
                <p className="text-[13px] text-slate-500">Demo accounts</p>
                <ul className="mt-2 divide-y divide-rule">
                  {DEMO_ROLES.map(({ role, label }) => (
                    <li key={role}>
                      <button type="button" onClick={() => handleDemoAccess(role)} disabled={demoLoadingRole !== null}
                        className="group w-full flex items-center justify-between min-h-11 text-[14px] text-ink hover:text-blue-700 disabled:opacity-50 transition-colors">
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

      <footer className="px-6 sm:px-10 py-6 text-[12px] text-white/85 flex flex-wrap gap-x-6 gap-y-1 [text-shadow:0_1px_2px_rgb(0_0_0/0.4)]">
        <span>Guidance and Counseling Office</span>
      </footer>
    </main>
  );
};

function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null;
  return <p id={id} className="mt-1 text-[12px] text-red-700">{message}</p>;
}

// Countdown until another sign-in code can be requested: a draining bar plus the time left.
function ResendTimer({ seconds }: { seconds: number }) {
  const pct = Math.min(100, (seconds / RESEND_SECONDS) * 100);
  return (
    <div role="timer" aria-label={`You can request a new code in ${seconds} seconds`} className="space-y-1.5">
      <div className="flex items-center justify-between text-[13px] text-slate-600">
        <span>You can request a new code in</span>
        <span className="font-mono font-medium text-blue-700 tabular">0:{String(seconds).padStart(2, "0")}</span>
      </div>
      <div className="h-1.5 rounded-full bg-slate-200 overflow-hidden">
        <div className="h-full bg-blue-600 transition-[width] duration-1000 ease-linear" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function ErrorLine({ error }: { error: string | null }) {
  if (!error) return null;
  return (
    <p role="alert" className="text-[13px] text-red-700 border-l-2 border-red-500 pl-3">
      {error}
    </p>
  );
}

function NoticeLine({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <p role="status" className="text-[13px] text-emerald-700 border-l-2 border-emerald-500 pl-3">
      {message}
    </p>
  );
}

export default LoginPage;
