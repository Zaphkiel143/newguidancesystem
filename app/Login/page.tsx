"use client";

import React, { useState } from 'react';
import { Mail, Lock } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { login, loginAsDemo } from '../action/auth';
import type { UserRole } from '../../lib/generated';
import { LogoMark } from '../../components/Logo';

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


    <main>
    <div className="min-h-screen flex items-center justify-center bg-[#2563EB] p-4 font-sans">
      {/* Main Card */}
      <div className="bg-white w-full max-w-100 rounded-2xl shadow-2xl p-8 flex flex-col items-center">

        {/* E-Gabay Logo */}
        <LogoMark size={64} className="mb-4 drop-shadow-md" />

        {/* Typography */}
        <h1 className="text-2xl font-bold text-slate-800">E-Gabay STI</h1>
        <p className="text-slate-500 text-sm mb-8 text-center leading-tight">
          Integrated Guidance Management System
        </p>

        {/* Login Form */}
        <form onSubmit={handleLogin} className="w-full space-y-4">
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-slate-600 ml-1">
              Email Address
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input
                type="email"
                placeholder="your.email@sti.edu"
                className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm transition-all"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[11px] font-bold text-slate-600 ml-1">
              Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input
                type="password"
                placeholder="Enter your password"
                className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm transition-all"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
          </div>

          {error && (
            <p className="text-xs font-semibold text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          <nav className="flex items-center justify-between text-xs text-slate-500">
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-[#2563EB] text-white font-semibold py-2.5 rounded-lg hover:bg-blue-700 active:scale-[0.98] transition-all shadow-md mt-4 text-sm disabled:opacity-60"
            >
              {isSubmitting ? "Signing in..." : "Login"}
            </button>
          </nav>

        </form>

        <div className="w-full mt-10 pt-6 border-t border-slate-100">
          <p className="text-[10px] uppercase font-bold text-slate-400 text-center mb-4 tracking-widest">
            Quick Demo Access:
          </p>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => handleDemoAccess("COUNSELOR")}
              disabled={demoLoadingRole !== null}
              className="bg-blue-50 text-[#1d63ff] font-bold p-3 rounded-xl text-center block transition-colors hover:bg-blue-100 disabled:opacity-60"
            >
              {demoLoadingRole === "COUNSELOR" ? "Signing in..." : "Counselor"}
            </button>

            <button
              type="button"
              onClick={() => handleDemoAccess("STUDENT")}
              disabled={demoLoadingRole !== null}
              className="bg-green-50 text-[#00c853] font-bold p-3 rounded-xl text-center block transition-colors hover:bg-green-100 disabled:opacity-60"
            >
              {demoLoadingRole === "STUDENT" ? "Signing in..." : "Student"}
            </button>

            <button
              type="button"
              onClick={() => handleDemoAccess("FACULTY")}
              disabled={demoLoadingRole !== null}
              className="bg-purple-50 text-[#9333ea] font-bold p-3 rounded-xl text-center block transition-colors hover:bg-purple-100 disabled:opacity-60"
            >
              {demoLoadingRole === "FACULTY" ? "Signing in..." : "Faculty"}
            </button>

            <button
              type="button"
              onClick={() => handleDemoAccess("PARENT")}
              disabled={demoLoadingRole !== null}
              className="bg-orange-50 text-[#ea580c] font-bold p-3 rounded-xl text-center block transition-colors hover:bg-orange-100 disabled:opacity-60"
            >
              {demoLoadingRole === "PARENT" ? "Signing in..." : "Parent"}
            </button>
          </div>
          <footer className="mt-8 text-center">
            <p className="text-[9px] text-slate-400">
              STI College Sta. Maria • Guidance and Counseling Office
            </p>
          </footer>
        </div>
      </div>
    </div>
    </main>
  );
};

export default LoginPage;
