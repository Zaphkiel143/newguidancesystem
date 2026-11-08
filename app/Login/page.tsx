"use client";

import LevelPicker from "../../components/LevelPicker";
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, ChevronRight, KeyRound, Loader2, Mail, ShieldCheck, Smartphone } from 'lucide-react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { finishParentReset, getSignInOptions, login, loginAsDemo, registerParent, requestLoginCode, requestParentReset, verifyLoginCode, type SignInAs, type SignInOptions } from '../action/auth';
import { SCHOOL_EMAIL_DOMAIN, roleFromSchoolEmail, roleFromSignInId } from '../config/school';
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
  passwordProblem,
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

// One sign-in page for everyone: the account itself decides the role.
// Students and staff follow the STI eLMS / Microsoft Entra ID pattern:
// start → email → verify (choose a method) → password, code, authenticator or approval.
// Parents and guardians use their own mobile number + password form.
type Step =
  | "start" | "email" | "verify" | "password" | "code" | "setPassword" | "details"
  | "parent" | "register" | "waiting" | "totp" | "approve" | "forgot" | "reset";

// Shown when Microsoft sends someone back without signing them in.
const ENTRA_ERRORS: Record<string, string> = {
  off: "Microsoft sign-in isn't set up on this site yet. Choose another way to verify.",
  denied: "Microsoft sign-in was cancelled or isn't allowed for this app yet. Choose another way to verify.",
  expired: "That Microsoft sign-in took too long. Try again.",
  failed: "We couldn't finish the Microsoft sign-in. Try again, or choose another way to verify.",
  domain: `Use your STI school account (ending in @${SCHOOL_EMAIL_DOMAIN}) when Microsoft asks.`,
};

const RESEND_SECONDS = 30;

// Parents sign in with a mobile number; everyone else with a school email.
const looksLikePhone = (s: string) => roleFromSignInId(s) === "PARENT";

// How each role is named on the sign-in page ("Signing in as …").
const SIGN_IN_ROLE_LABEL: Record<UserRole, string> = {
  STUDENT: "Student",
  FACULTY: "Faculty or staff",
  COUNSELOR: "Guidance office",
  ADMIN: "Retired account",
  PARENT: "Parent or guardian",
};

const LoginPage = () => {
  const router = useRouter();
  const [departments] = useOptionList("departments");
  const [nameExtensions] = useOptionList("nameExtensions");
  const [relationships] = useOptionList("relationships");
  const [shsGrades] = useOptionList("shsGrades");
  const [tertiaryYears] = useOptionList("tertiaryYears");
  const [shsStrands] = useOptionList("shsStrands");
  const [tertiaryCourses] = useOptionList("tertiaryCourses");
  const [step, setStep] = useState<Step>("start");
  const [signInAs, setSignInAs] = useState<SignInAs>("STUDENT");
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [name, setName] = useState({ last: '', first: '', ext: '' });
  const [student, setStudent] = useState({ studentId: '', department: SHS as string, yearLevel: '', program: '', section: '' });
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [newPassword, setNewPassword] = useState({ password: '', confirm: '' });
  const [resetEmailed, setResetEmailed] = useState(false);
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
  // How this email's account can verify, from the server.
  const [options, setOptions] = useState<SignInOptions | null>(null);
  // True after "Forgot password?": the emailed code leads to choosing a new password.
  const [resetting, setResetting] = useState(false);

  // The account on file decides where each person lands.
  const finishLogin = useCallback((result: { redirectTo: string }) => router.push(result.redirectTo), [router]);

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
        setStep("verify");
        setError("The sign-in was denied on your other device.");
      } else if (r.state === "expired") {
        stopped = true;
        setApproval(null);
        setStep("verify");
        setError("The request expired. Try again, or choose another way to verify.");
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

  // Step 2 (like Microsoft's "Sign in" box): the school email, then the ways this account can verify.
  const continueWithEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    // A mobile number belongs to a parent or guardian account: on to its password.
    if (looksLikePhone(email)) {
      setPhone(phoneChars(email));
      setPassword('');
      go("parent");
      setTimeout(() => document.getElementById("password")?.focus(), 0);
      return;
    }
    const emailProblem = schoolEmailProblem(email);
    if (emailProblem) {
      setEmailError(emailProblem);
      document.getElementById("email")?.focus();
      return;
    }
    setIsSubmitting(true);
    setError(null);
    const result = await getSignInOptions(email).catch(() => ({ success: false as const, error: "Something went wrong. Please try again." }));
    setIsSubmitting(false);
    if (!result.success) return setError(result.error);
    setEmail(email.trim().toLowerCase());
    setOptions(result.options);
    setResetting(false);
    setPassword('');
    go("verify");
  };

  const continueWithMicrosoft = () => {
    window.location.href = `/api/auth/entra/start?email=${encodeURIComponent(email.trim().toLowerCase())}`;
  };

  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password) return setError("Enter your password.");
    setIsSubmitting(true);
    setError(null);
    const result = await login({ identifier: email, password });
    setIsSubmitting(false);
    if (result.success) finishLogin(result);
    else setError(result.error);
  };

  // School accounts reset a forgotten password with an emailed code.
  const forgotSchoolPassword = () => {
    setResetting(true);
    void sendCode();
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

  // Sends the emailed (or Microsoft) code, plus details and a password when the
  // server has asked for them; the reply says which step comes next.
  const verify = async (over: { email?: string; code?: string; details?: boolean; newPassword?: string } = {}) => {
    const forEmail = over.email ?? email;
    setIsSubmitting(true);
    setError(null);
    const result = await verifyLoginCode({
      email: forEmail,
      code: over.code ?? code,
      signInAs,
      fullName: over.details ? fullName() : undefined,
      student: over.details && signInAs === "STUDENT" ? student : undefined,
      newPassword: over.newPassword,
      resetPassword: resetting,
    });
    setIsSubmitting(false);
    if (result.success) {
      finishLogin(result);
    } else if ("needsDetails" in result) {
      // The email's format already says student or faculty.
      const fromEmail = roleFromSchoolEmail(forEmail);
      if (fromEmail) setSignInAs(fromEmail);
      setNewPassword({ password: '', confirm: '' });
      go("details");
    } else if ("needsPassword" in result) {
      setNewPassword({ password: '', confirm: '' });
      go("setPassword");
    } else if ("pending" in result) {
      setWaitingMessage(result.message);
      go("waiting");
    } else {
      setError(result.error);
    }
  };

  // Coming back from Microsoft: either an error to show, or a one-time code that
  // finishes a new account (details and password) or an account with no password yet.
  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    const entraError = q.get("entra_error");
    const entraEmail = q.get("entra_email");
    const ticket = q.get("entra_ticket");
    if (!entraError && !ticket) return;
    // The code mustn't stay in the address bar or history.
    window.history.replaceState(null, "", "/Login");
    const t = setTimeout(() => {
      if (entraEmail && ticket) {
        setEmail(entraEmail);
        setCode(ticket);
        void verify({ email: entraEmail, code: ticket });
      } else if (entraError) {
        setStep("email");
        setError(ENTRA_ERRORS[entraError] ?? ENTRA_ERRORS.failed);
      }
    });
    return () => clearTimeout(t);
    // Runs once, on arrival.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const checkCode = (e: React.FormEvent) => {
    e.preventDefault();
    if (code.length !== 6) return setError("Enter the 6-digit code from your email.");
    void verify();
  };

  // New accounts choose their password together with their details.
  const newPasswordProblem = () => {
    const weak = passwordProblem(newPassword.password);
    if (weak) return `Choose a stronger password. ${weak}`;
    if (newPassword.password !== newPassword.confirm) return "The two passwords don't match.";
    return null;
  };

  const submitDetails = (e: React.FormEvent) => {
    e.preventDefault();
    const problem = newPasswordProblem();
    if (problem) return setError(problem);
    void verify({ details: true, newPassword: newPassword.password });
  };

  const submitNewPassword = (e: React.FormEvent) => {
    e.preventDefault();
    const problem = newPasswordProblem();
    if (problem) return setError(problem);
    void verify({ newPassword: newPassword.password });
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
    if (!looksLikePhone(phone)) return setError("Enter the mobile number you signed up with.");
    if (!password) return setError("Enter your password.");
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

  const askReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    const result = await requestParentReset(phone);
    setIsSubmitting(false);
    if (!result.success) return setError(result.error);
    setResetEmailed(result.emailed);
    setCode('');
    setNewPassword({ password: '', confirm: '' });
    go("reset");
  };

  const finishReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (code.length !== 6) return setError("Enter the 6-digit code from your email.");
    if (newPassword.password.length < 8) return setError("Use a new password with at least 8 characters.");
    if (newPassword.password !== newPassword.confirm) return setError("The two passwords don't match.");
    setIsSubmitting(true);
    setError(null);
    const result = await finishParentReset({ phone, code, password: newPassword.password });
    setIsSubmitting(false);
    if (result.success) router.push(result.redirectTo);
    else setError(result.error);
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
    start: ["Log in", ""],
    email: ["Sign in", ""],
    verify: options?.exists === false
      ? ["Create your account", "No account uses this email yet."]
      : ["Verify your identity", ""],
    password: ["Enter password", ""],
    code: ["Enter code", `Sent to ${email}`],
    setPassword: resetting
      ? ["Choose a new password", "Your old password stops working, and other devices are signed out."]
      : ["Choose a password", ""],
    details: ["Welcome to E-Gabay", ""],
    parent: ["Parent or guardian", ""],
    forgot: ["Forgot your password?", ""],
    reset: ["Set a new password", resetEmailed ? "We sent a 6-digit code to the email on your account. Check Junk too." : "If this number has an account with an email on file, a code was sent to it. Otherwise the guidance office has been told and will contact you."],
    register: ["Create a parent account", "Confirmed by the guidance office before use."],
    waiting: ["Almost there", waitingMessage],
    approve: ["Check your phone", "Tap this number where you're signed in."],
    totp: ["Enter code", "From Microsoft Authenticator (E-Gabay STI)"],
  };

  // Steps that belong to one school email show it at the top, like Microsoft does.
  const showsIdentity = ["verify", "password", "code", "setPassword", "totp", "approve"].includes(step);

  const newPasswordFields = (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label htmlFor="n-password" className={labelClass}>{step === "details" ? "Password" : "New password"}</label>
          <input id="n-password" type="password" autoComplete="new-password" className={inputClass} value={newPassword.password}
            aria-describedby="n-password-help" onChange={(e) => setNewPassword({ ...newPassword, password: e.target.value })} />
        </div>
        <div>
          <label htmlFor="n-confirm" className={labelClass}>Repeat password</label>
          <input id="n-confirm" type="password" autoComplete="new-password" className={inputClass} value={newPassword.confirm}
            onChange={(e) => setNewPassword({ ...newPassword, confirm: e.target.value })} />
        </div>
      </div>
      <PasswordStrength password={newPassword.password} id="n-password-help" />
    </>
  );

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
              {heading[step][1] && <p className="text-sm text-slate-500 mt-1 break-words">{heading[step][1]}</p>}
            </div>

            {showsIdentity && (
              <button type="button" onClick={() => { setApproval(null); go(step === "verify" ? "email" : "verify"); }}
                className="mt-5 mx-auto flex max-w-full items-center gap-1.5 px-3 min-h-9 rounded-full border border-rule text-[13px] text-slate-700 hover:bg-slate-50"
                aria-label={step === "verify" ? "Use a different email" : "Choose another way to verify"}>
                <ArrowLeft size={14} className="shrink-0" /> <span className="truncate">{email}</span>
              </button>
            )}

            {step === "start" && (
              <div className="mt-7 space-y-3">
                <button type="button" onClick={() => go("email")} className={primaryButton}>
                  Sign in
                </button>
                <ErrorLine error={error} />
                <p className="text-xs text-center pt-1">
                  <Link href="/handover" className="text-slate-500 underline underline-offset-2 hover:text-blue-700">Guidance Associate handover</Link>
                </p>
              </div>
            )}

            {step === "email" && (
              <form onSubmit={continueWithEmail} noValidate className="mt-7 space-y-5">
                <div>
                  <label htmlFor="email" className={labelClass}>School email or mobile number</label>
                  <input id="email" type="text" autoComplete="username" inputMode={looksLikePhone(email) ? "tel" : "email"}
                    placeholder={`juan.delacruz@${SCHOOL_EMAIL_DOMAIN}`} className={fieldClass(emailError ?? undefined)} value={email} autoFocus
                    aria-invalid={emailError ? true : undefined} aria-describedby={emailError ? "email-error" : undefined}
                    onChange={(e) => { setEmail(e.target.value); setEmailError(null); setError(null); }}
                    onBlur={() => email.trim() && !looksLikePhone(email) && setEmailError(schoolEmailProblem(email))} />
                  <FieldError id="email-error" message={emailError ?? undefined} />
                  {!emailError && <RoleBadge role={roleFromSignInId(email)} guess />}
                </div>
                <ErrorLine error={error} />
                <div className="flex items-center justify-between gap-3">
                  <button type="button" onClick={() => go("start")} className={backButton}>
                    <ArrowLeft size={14} /> Back
                  </button>
                  <button type="submit" disabled={isSubmitting} className={`${primaryButton} w-auto! px-8`}>
                    {isSubmitting ? <><Loader2 size={16} className="animate-spin" /> Checking</> : "Next"}
                  </button>
                </div>
              </form>
            )}

            {step === "verify" && options && (
              <div className="mt-6 space-y-3">
                <RoleBadge role={options.role} />
                <ul className="divide-y divide-rule border border-rule rounded-xl overflow-hidden">
                  {options.approve && (
                    <MethodRow icon={<Smartphone size={18} />} title="Approve a request" detail="On a phone or computer where you're signed in to E-Gabay"
                      onClick={askApproval} disabled={isSubmitting} />
                  )}
                  {options.authenticator && (
                    <MethodRow icon={<ShieldCheck size={18} />} title="Use a verification code" detail="From Microsoft Authenticator (E-Gabay STI)"
                      onClick={() => { setCode(''); go("totp"); }} disabled={isSubmitting} />
                  )}
                  <MethodRow icon={<Mail size={18} />} title={`Email code to ${email}`}
                    detail={options.exists ? "A 6-digit code to your school inbox" : "A 6-digit code to set up your account"}
                    onClick={() => { setResetting(false); void sendCode(); }} disabled={isSubmitting || (resendIn > 0 && email === resendFor)} />
                  {options.password && (
                    <MethodRow icon={<KeyRound size={18} />} title="Use your password" detail="The password for your E-Gabay account"
                      onClick={() => { setPassword(''); go("password"); }} disabled={isSubmitting} />
                  )}
                  {options.microsoft && (
                    <MethodRow icon={<MicrosoftMark />} title="Continue with Microsoft" detail="Your STI Microsoft 365 account"
                      onClick={continueWithMicrosoft} disabled={isSubmitting} />
                  )}
                </ul>
                {options.exists && !options.password && (
                  <p className="text-xs text-slate-600 bg-butter-50 border border-butter-200 rounded-lg px-3 py-2">
                    No password set yet. You&apos;ll create one after the email code.
                  </p>
                )}
                {isSubmitting && <p className="inline-flex items-center gap-2 text-sm text-slate-600"><Loader2 size={15} className="animate-spin" /> One moment…</p>}
                <ErrorLine error={error} />
                {resendIn > 0 && email === resendFor && <ResendTimer seconds={resendIn} />}
              </div>
            )}

            {step === "password" && (
              <form onSubmit={handlePasswordLogin} className="mt-6 space-y-5">
                {/* Lets password managers save the email with the password. */}
                <input type="email" autoComplete="username" value={email} readOnly hidden />
                <div>
                  <div className="flex items-baseline justify-between gap-2">
                    <label htmlFor="s-password" className={labelClass}>Password</label>
                    <button type="button" onClick={forgotSchoolPassword} disabled={isSubmitting}
                      className="text-[13px] text-blue-700 font-medium hover:underline underline-offset-4">
                      Forgot password?
                    </button>
                  </div>
                  <input id="s-password" type="password" autoComplete="current-password" className={inputClass} value={password}
                    onChange={(e) => setPassword(e.target.value)} autoFocus />
                </div>
                <ErrorLine error={error} />
                <button type="submit" disabled={isSubmitting} className={primaryButton}>
                  {isSubmitting ? <><Loader2 size={16} className="animate-spin" /> Signing in</> : "Sign in"}
                </button>
                <button type="button" onClick={() => go("verify")} className={backButton}>
                  <ArrowLeft size={14} /> Other ways to sign in
                </button>
              </form>
            )}

            {step === "setPassword" && (
              <form onSubmit={submitNewPassword} noValidate className="mt-6 space-y-5">
                <input type="email" autoComplete="username" value={email} readOnly hidden />
                {newPasswordFields}
                <ErrorLine error={error} />
                <button type="submit" disabled={isSubmitting} className={primaryButton}>
                  {isSubmitting ? <><Loader2 size={16} className="animate-spin" /> Saving</> : "Save and sign in"}
                </button>
              </form>
            )}

            {step === "parent" && (
              <form onSubmit={handleParentLogin} noValidate className="mt-7 space-y-5">
                <div>
                  <label htmlFor="p-phone" className={labelClass}>Mobile number</label>
                  <input id="p-phone" type="tel" inputMode="tel" autoComplete="username" placeholder="09171234567" className={inputClass}
                    aria-describedby="p-phone-help" value={phone} onChange={(e) => { setPhone(phoneChars(e.target.value)); setError(null); }} autoFocus />
                  <p id="p-phone-help" className="text-xs text-slate-500 mt-1">{PHONE_HELP}</p>
                </div>
                <div>
                  <div className="flex items-baseline justify-between gap-2">
                    <label htmlFor="password" className={labelClass}>Password</label>
                    <button type="button" onClick={() => go("forgot")}
                      className="text-[13px] text-blue-700 font-medium hover:underline underline-offset-4">
                      Forgot password?
                    </button>
                  </div>
                  <input id="password" type="password" autoComplete="current-password" className={inputClass} value={password}
                    onChange={(e) => setPassword(e.target.value)} />
                </div>
                <ErrorLine error={error} />
                <button type="submit" disabled={isSubmitting} className={primaryButton}>
                  {isSubmitting ? <><Loader2 size={16} className="animate-spin" /> Signing in</> : "Sign in"}
                </button>
                <p className="text-center text-[13px] text-slate-600 border-t border-rule pt-4">
                  No account yet?{" "}
                  <button type="button" onClick={() => go("register")}
                    className="px-1 rounded text-blue-700 font-medium hover:underline underline-offset-4">
                    Create a parent account
                  </button>
                </p>
                <button type="button" onClick={() => go("email")} className={backButton}>
                  <ArrowLeft size={14} /> Back
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
                  Expires in 2 minutes.
                </p>
                <button type="button" onClick={() => { setApproval(null); go("verify"); }} className={backButton}>
                  <ArrowLeft size={14} /> Other ways to sign in
                </button>
              </div>
            )}

            {step === "totp" && (
              <form onSubmit={handleTotpLogin} className="mt-6 space-y-5">
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
                <button type="button" onClick={() => go("verify")} className={backButton}>
                  <ArrowLeft size={14} /> Other ways to sign in
                </button>
              </form>
            )}

            {(step === "code" || step === "details") && (
              <form onSubmit={step === "code" ? checkCode : submitDetails} noValidate={step === "details"} className="mt-6 space-y-5">
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
                    {roleFromSchoolEmail(email) === "STUDENT" ? (
                      <p className="text-[13px] text-slate-600 bg-blue-50 border border-blue-100 rounded-lg px-3 py-2">
                        Signing in as a student.
                      </p>
                    ) : (
                      <fieldset>
                        <legend className={labelClass}>I am</legend>
                        <div className={`grid gap-2 ${roleFromSchoolEmail(email) ? "grid-cols-2" : "grid-cols-3"}`}>
                          {(roleFromSchoolEmail(email) ? (["FACULTY", "COUNSELOR"] as const) : (["STUDENT", "FACULTY", "COUNSELOR"] as const)).map((r) => (
                            <label key={r} className={`flex items-center gap-2 rounded-lg border px-3 min-h-11 cursor-pointer text-[13px] ${signInAs === r ? "border-blue-600 bg-blue-50" : "border-slate-300"}`}>
                              <input type="radio" name="signInAsDetails" checked={signInAs === r} className="accent-blue-700"
                                onChange={() => setSignInAs(r)} />
                              {r === "STUDENT" ? "A student" : r === "FACULTY" ? "Faculty or staff" : "Guidance office"}
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
                          <LevelPicker name="department" departments={departments} value={student.department}
                            onChange={(department, sameTrack) => setStudent(sameTrack ? { ...student, department } : { ...student, department, yearLevel: '', program: '' })} />
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
                        Needs approval from the guidance office before first use.
                      </p>
                    )}
                    <fieldset className="border-t border-rule pt-4 space-y-2">
                      <legend className="text-[14px] font-semibold text-ink pr-2">Your password</legend>
                      {newPasswordFields}
                    </fieldset>
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
                    <button type="button" onClick={() => go("verify")} className={backButton}>
                      <ArrowLeft size={14} /> Other ways
                    </button>
                    <button type="button" onClick={() => sendCode()} disabled={resendIn > 0 || isSubmitting}
                      className="px-2 min-h-9 -mr-2 rounded-full text-blue-700 hover:bg-blue-50 disabled:text-slate-500 disabled:hover:bg-transparent">
                      {resendIn > 0 ? `Resend in ${resendIn}s` : "Resend code"}
                    </button>
                  </div>
                )}
              </form>
            )}

            {step === "forgot" && (
              <form onSubmit={askReset} className="mt-7 space-y-5">
                <div>
                  <label htmlFor="f-phone" className={labelClass}>Mobile number</label>
                  <input id="f-phone" type="tel" inputMode="tel" autoComplete="tel" placeholder="09171234567" className={inputClass}
                    value={phone} onChange={(e) => setPhone(phoneChars(e.target.value))} required autoFocus />
                </div>
                <ErrorLine error={error} />
                <button type="submit" disabled={isSubmitting} className={primaryButton}>
                  {isSubmitting ? <><Loader2 size={16} className="animate-spin" /> Sending</> : "Reset my password"}
                </button>
                <p className="text-xs text-slate-500">
                  Students, faculty and staff: go back, choose Microsoft Entra ID, and use &ldquo;Forgot password?&rdquo; after your email.
                </p>
                <button type="button" onClick={() => go("parent")} className={backButton}>
                  <ArrowLeft size={14} /> Back to sign in
                </button>
              </form>
            )}

            {step === "reset" && (
              <form onSubmit={finishReset} noValidate className="mt-7 space-y-5">
                <div>
                  <label htmlFor="r-code" className={labelClass}>6-digit code</label>
                  <input id="r-code" type="text" inputMode="numeric" autoComplete="one-time-code" maxLength={6} placeholder="000000"
                    className={`${inputClass} font-mono text-center text-xl tracking-[0.5em]`} value={code}
                    onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))} autoFocus />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="n-password" className={labelClass}>New password</label>
                    <input id="n-password" type="password" autoComplete="new-password" className={inputClass} value={newPassword.password}
                      onChange={(e) => setNewPassword({ ...newPassword, password: e.target.value })} />
                  </div>
                  <div>
                    <label htmlFor="n-confirm" className={labelClass}>Repeat password</label>
                    <input id="n-confirm" type="password" autoComplete="new-password" className={inputClass} value={newPassword.confirm}
                      onChange={(e) => setNewPassword({ ...newPassword, confirm: e.target.value })} />
                  </div>
                </div>
                <PasswordStrength password={newPassword.password} />
                <ErrorLine error={error} />
                <button type="submit" disabled={isSubmitting} className={primaryButton}>
                  {isSubmitting ? <><Loader2 size={16} className="animate-spin" /> Saving</> : "Save and sign in"}
                </button>
                <p className="text-xs text-slate-500">
                  No email on your account? The guidance office can give you a temporary password.
                </p>
                <button type="button" onClick={() => go("parent")} className={backButton}>
                  <ArrowLeft size={14} /> Back to sign in
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
                <button type="button" onClick={() => go("start")} className={primaryButton}>
                  Back to sign in
                </button>
              </div>
            )}

            {SHOW_DEMO && step === "start" && (
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
        <span>E-Gabay · Guidance and Counseling Office · STI College Sta. Maria</span>
        <span>
          Need help right now? NCMH Crisis Hotline{" "}
          <a href="tel:1553" className="font-semibold underline underline-offset-2">1553</a> · Emergency{" "}
          <a href="tel:911" className="font-semibold underline underline-offset-2">911</a>
        </span>
        <span className="sm:ml-auto">© {new Date().getFullYear()} STI College Sta. Maria</span>
      </footer>
    </main>
  );
};

// "Signing in as Student" etc. A guess comes from what was typed
// (roleFromSignInId); without guess, it's the account's role on file.
function RoleBadge({ role, guess }: { role: UserRole | null; guess?: boolean }) {
  if (!role) return null;
  return (
    <p role="status" className="mt-2 inline-flex items-center gap-1.5 text-[13px] text-slate-600">
      {guess ? "Looks like you're signing in as" : "Signing in as"}
      <span className="rounded-full bg-blue-50 text-blue-800 font-medium px-2.5 py-0.5">{SIGN_IN_ROLE_LABEL[role]}</span>
    </p>
  );
}

// One way to verify on the "Verify your identity" list.
function MethodRow({ icon, title, detail, onClick, disabled }: { icon: React.ReactNode; title: string; detail: string; onClick: () => void; disabled?: boolean }) {
  return (
    <li>
      <button type="button" onClick={onClick} disabled={disabled}
        className="group w-full flex items-center gap-3 px-4 min-h-16 py-3 text-left hover:bg-blue-50 disabled:opacity-50 disabled:hover:bg-transparent transition-colors">
        <span className="shrink-0 grid place-items-center size-9 rounded-full bg-blue-50 text-blue-700 group-hover:bg-white">{icon}</span>
        <span className="min-w-0 flex-1">
          <span className="block text-[14px] font-medium text-ink break-words">{title}</span>
          <span className="block text-xs text-slate-500">{detail}</span>
        </span>
        <ChevronRight size={16} className="shrink-0 text-slate-400 group-hover:text-blue-700" />
      </button>
    </li>
  );
}

// The four-square Microsoft logo used on "Sign in with Microsoft" buttons.
function MicrosoftMark() {
  return (
    <svg aria-hidden width="16" height="16" viewBox="0 0 21 21" className="shrink-0">
      <rect x="1" y="1" width="9" height="9" fill="#f25022" />
      <rect x="11" y="1" width="9" height="9" fill="#7fba00" />
      <rect x="1" y="11" width="9" height="9" fill="#00a4ef" />
      <rect x="11" y="11" width="9" height="9" fill="#ffb900" />
    </svg>
  );
}

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
