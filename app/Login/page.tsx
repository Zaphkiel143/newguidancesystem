"use client";

import React, { useState } from 'react';
import { ArrowRight, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { login, loginAsDemo } from '../action/auth';
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
      <header className="px-6 sm:px-10 pt-8">
        <span className="inline-flex items-center gap-3">
          <Image src="/sti-logo.jpg" alt="STI College Sta. Maria" width={48} height={48} className="rounded-lg shadow-sm" priority />
          <span className="font-serif text-2xl text-ink tracking-tight">E-Gabay</span>
        </span>
      </header>

      <div className="flex-1 w-full max-w-5xl mx-auto px-6 sm:px-10 py-12 grid lg:grid-cols-[1fr_400px] gap-14 lg:gap-24 items-center">
        {/* Office context */}
        <section className="relative overflow-hidden lg:bg-blue-50 lg:border lg:border-blue-100 lg:rounded-2xl lg:p-10 max-w-md lg:max-w-none">
          <div className="relative">
          <Image src="/sti-logo.jpg" alt="STI College Sta. Maria" width={88} height={88} className="hidden lg:block mb-6 rounded-2xl shadow-md" />
          <p className="text-sm text-slate-500">STI College Sta. Maria</p>
          <h1 className="font-serif text-[40px] sm:text-[52px] leading-[1.02] tracking-tight text-ink mt-3">
            Guidance &amp; <em className="italic text-blue-700 bg-linear-to-b from-transparent from-60% to-butter-200 to-60% px-1 -mx-1">Counseling</em> Office
          </h1>
          <p className="mt-5 text-[15px] leading-relaxed text-slate-600 max-w-[42ch]">
            Book a session with your counselor, send a referral, or follow up on a concern.
            Students can also talk to E-Gabay, our assistant, any time of day.
          </p>

          <p className="mt-10 pt-6 border-t border-blue-200 max-w-sm text-sm text-slate-600">
            For students, parents, faculty, and the guidance staff.
          </p>
          </div>
        </section>

        {/* Sign in */}
        <section className="bg-sheet border border-rule rounded-2xl shadow-lg p-7 sm:p-8 animate-rise-in">
          <h2 className="text-lg font-semibold text-ink">Sign in</h2>
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
              className="w-full inline-flex items-center justify-center gap-2 bg-blue-700 text-white font-medium py-2.5 rounded-md hover:bg-blue-800 transition-colors text-[15px] disabled:opacity-60"
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
