"use client";

import React, { useState } from 'react';
import { Mail, Lock, ArrowRight, CalendarCheck, MessageCircleHeart, Compass, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { login, loginAsDemo } from '../action/auth';
import type { UserRole } from '../../lib/generated';

const DEMO_ROLES: { role: UserRole; label: string; hint: string; tone: string }[] = [
  { role: "COUNSELOR", label: "Counselor", hint: "Manage cases & schedules", tone: "bg-blue-50 text-blue-700 ring-blue-100 hover:bg-blue-100" },
  { role: "STUDENT", label: "Student", hint: "Book & chat", tone: "bg-emerald-50 text-emerald-700 ring-emerald-100 hover:bg-emerald-100" },
  { role: "FACULTY", label: "Faculty", hint: "Refer students", tone: "bg-violet-50 text-violet-700 ring-violet-100 hover:bg-violet-100" },
  { role: "PARENT", label: "Parent", hint: "Follow your child", tone: "bg-orange-50 text-orange-700 ring-orange-100 hover:bg-orange-100" },
];

const HIGHLIGHTS = [
  { icon: CalendarCheck, title: "Book counseling sessions", body: "See open slots and confirm in seconds." },
  { icon: MessageCircleHeart, title: "Talk to E-Gabay anytime", body: "A bilingual AI companion that listens, day or night." },
  { icon: Compass, title: "Plan your next steps", body: "Career guidance and referrals in one place." },
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
    <main className="min-h-screen grid lg:grid-cols-[1.05fr_1fr] bg-white">
      {/* Brand panel */}
      <section className="relative hidden lg:flex flex-col justify-between overflow-hidden bg-navy text-white p-12 xl:p-16">
        <div className="pointer-events-none absolute -top-40 -left-32 w-[520px] h-[520px] rounded-full bg-blue-600/40 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-48 -right-24 w-[460px] h-[460px] rounded-full bg-gold-400/15 blur-3xl" />
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage: "radial-gradient(circle at 1px 1px, white 1px, transparent 0)",
            backgroundSize: "28px 28px",
          }}
        />

        <div className="relative flex items-center gap-3">
          <span className="w-11 h-11 rounded-xl bg-gold-400 text-navy grid place-items-center font-extrabold text-sm shadow-[0_8px_24px_-6px_rgb(255_200_31/0.6)]">
            STI
          </span>
          <span className="leading-tight">
            <span className="block font-extrabold text-lg tracking-tight">E-Gabay</span>
            <span className="block text-xs text-white/55">STI College Sta. Maria</span>
          </span>
        </div>

        <div className="relative max-w-md">
          <p className="inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.16em] text-gold-300 bg-white/5 ring-1 ring-white/10 rounded-full px-3 py-1.5 mb-6">
            Guidance &amp; Counseling Office
          </p>
          <h1 className="text-4xl xl:text-[44px] font-extrabold leading-[1.08] tracking-tight">
            Guidance that&apos;s there <span className="text-gold-400">when you need it.</span>
          </h1>
          <p className="mt-4 text-white/65 leading-relaxed">
            One place for students, parents, faculty, and counselors to connect, plan, and look out for each other.
          </p>

          <ul className="mt-10 space-y-5">
            {HIGHLIGHTS.map(({ icon: Icon, title, body }) => (
              <li key={title} className="flex gap-4">
                <span className="w-10 h-10 shrink-0 rounded-xl bg-white/[0.08] ring-1 ring-white/10 grid place-items-center">
                  <Icon size={18} className="text-gold-300" />
                </span>
                <span>
                  <span className="block font-semibold text-[15px]">{title}</span>
                  <span className="block text-sm text-white/55">{body}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>

        <p className="relative text-xs text-white/40">
          Integrated Guidance Management System
        </p>
      </section>

      {/* Sign-in panel */}
      <section className="flex items-center justify-center p-6 sm:p-10 bg-canvas lg:bg-white">
        <div className="w-full max-w-[400px] animate-rise-in">
          {/* Compact brand for small screens */}
          <div className="lg:hidden flex items-center gap-3 mb-10">
            <span className="w-11 h-11 rounded-xl bg-navy text-gold-400 grid place-items-center font-extrabold text-sm">
              STI
            </span>
            <span className="leading-tight">
              <span className="block font-extrabold text-lg tracking-tight text-slate-900">E-Gabay</span>
              <span className="block text-xs text-slate-500">Integrated Guidance Management System</span>
            </span>
          </div>

          <h2 className="text-[28px] font-extrabold tracking-tight text-slate-900">Welcome back</h2>
          <p className="text-sm text-slate-500 mt-1.5 mb-8">Sign in with your STI account to continue.</p>

          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-1.5">
              <label htmlFor="email" className="text-xs font-semibold text-slate-700">
                Email address
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={17} />
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  placeholder="your.email@sti.edu"
                  className="w-full pl-11 pr-4 py-3 bg-white border border-slate-200 rounded-xl text-sm transition-all placeholder:text-slate-400"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="password" className="text-xs font-semibold text-slate-700">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={17} />
                <input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  placeholder="Enter your password"
                  className="w-full pl-11 pr-4 py-3 bg-white border border-slate-200 rounded-xl text-sm transition-all placeholder:text-slate-400"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
            </div>

            {error && (
              <p role="alert" className="text-xs font-semibold text-rose-700 bg-rose-50 border border-rose-100 rounded-xl px-3.5 py-2.5">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="group w-full inline-flex items-center justify-center gap-2 bg-blue-600 text-white font-semibold py-3 rounded-xl hover:bg-blue-700 active:scale-[0.99] transition-all shadow-[0_10px_24px_-10px_rgb(35_72_216/0.8)] text-sm disabled:opacity-60 mt-2"
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={16} className="animate-spin" /> Signing in…
                </>
              ) : (
                <>
                  Sign in
                  <ArrowRight size={16} className="transition-transform group-hover:translate-x-0.5" />
                </>
              )}
            </button>
          </form>

          <div className="mt-10">
            <div className="flex items-center gap-3 mb-4">
              <span className="h-px flex-1 bg-slate-200" />
              <p className="text-[10px] uppercase font-bold text-slate-400 tracking-[0.16em]">
                Quick demo access
              </p>
              <span className="h-px flex-1 bg-slate-200" />
            </div>
            <div className="grid grid-cols-2 gap-2.5">
              {DEMO_ROLES.map(({ role, label, hint, tone }) => (
                <button
                  key={role}
                  type="button"
                  onClick={() => handleDemoAccess(role)}
                  disabled={demoLoadingRole !== null}
                  className={`text-left px-4 py-3 rounded-xl ring-1 transition-colors disabled:opacity-60 ${tone}`}
                >
                  <span className="block text-sm font-bold">
                    {demoLoadingRole === role ? "Signing in…" : label}
                  </span>
                  <span className="block text-[11px] opacity-70 font-medium">{hint}</span>
                </button>
              ))}
            </div>
          </div>

          <p className="mt-10 text-center text-[11px] text-slate-400">
            STI College Sta. Maria • Guidance and Counseling Office
          </p>
        </div>
      </section>
    </main>
  );
};

export default LoginPage;
