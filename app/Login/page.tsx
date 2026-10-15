"use client";

import React, { useState } from 'react';
import { ArrowRight, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { login, loginAsDemo } from '../action/auth';
import { LogoMark } from '../../components/Logo';
import type { UserRole } from '../../lib/generated';

const DEMO_ROLES: { role: UserRole; label: string }[] = [
  { role: "COUNSELOR", label: "Counselor" },
  { role: "STUDENT", label: "Student" },
  { role: "FACULTY", label: "Faculty" },
  { role: "PARENT", label: "Parent" },
];

const LoginPage = () => {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [demoLoadingRole, setDemoLoadingRole] = useState<UserRole | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
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
          <h1 className="mt-4 text-2xl font-bold tracking-tight text-ink">Sign in</h1>
          <p className="text-sm text-slate-500 mt-1">Use your STI email address.</p>

          <form onSubmit={handleLogin} className="mt-7 space-y-5" noValidate={false}>
            <div>
              <label htmlFor="email" className="block text-[13px] font-medium text-slate-700 mb-1.5">
                Email
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                placeholder="juan.delacruz@sti.edu"
                className="w-full px-3.5 py-2.5 bg-sheet border border-slate-300 rounded-md text-[15px] placeholder:text-slate-400 transition-colors"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-[13px] font-medium text-slate-700 mb-1.5">
                Password
              </label>
              <input
                id="password"
                type="password"
                autoComplete="current-password"
                className="w-full px-3.5 py-2.5 bg-sheet border border-slate-300 rounded-md text-[15px] transition-colors"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            {error && (
              <p role="alert" className="text-[13px] text-red-700 border-l-2 border-red-500 pl-3">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full inline-flex items-center justify-center gap-2 bg-blue-700 text-white font-medium py-2.5 rounded-full hover:bg-blue-800 transition-colors text-[15px] disabled:opacity-60"
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={16} className="animate-spin" /> Signing in
                </>
              ) : (
                "Sign in"
              )}
            </button>
          </form>

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

export default LoginPage;
