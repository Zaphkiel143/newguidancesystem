"use client";

import React, { useState } from 'react';
import { Mail, Lock } from 'lucide-react';
import Link from 'next/link';

const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    console.log("Login attempt:", { email, password });
  };
  return (
    

    <main>
    <div className="min-h-screen flex items-center justify-center bg-[#2563EB] p-4 font-sans">
      {/* Main Card */}
      <div className="bg-white w-full max-w-100 rounded-2xl shadow-2xl p-8 flex flex-col items-center">
        
        {/* STI Logo Box */}
        <div className="bg-[#2563EB] w-14 h-14 rounded-xl flex items-center justify-center mb-4 shadow-md">
          <span className="text-white font-bold text-lg">STI</span>
        </div>

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
          <nav className="flex items-center justify-between text-xs text-slate-500">
            <button
              type="submit"
              className="w-full bg-[#2563EB] text-white font-semibold py-2.5 rounded-lg hover:bg-blue-700 active:scale-[0.98] transition-all shadow-md mt-4 text-sm"
            >
              Login
            </button>
          </nav>

        </form>

        <div className="w-full mt-10 pt-6 border-t border-slate-100">
          <p className="text-[10px] uppercase font-bold text-slate-400 text-center mb-4 tracking-widest">
            Quick Demo Access:
          </p>
          <div className="grid grid-cols-2 gap-3">
            <Link 
              href="/dashboard" 
              className="bg-blue-50 text-blue-600 font-bold p-3 rounded-lg text-center block"
            >
              Counselor
            </Link>

            <Link 
              href="/dashboard" 
              className="bg-green-50 text-green-600 font-bold p-3 rounded-lg text-center block"
            >
              Student
            </Link>
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

/* Helper Component for Demo Buttons */
interface DemoButtonProps {
  label: string;
  textColor: string;
  bgColor: string;
}

const DemoButton = ({ label, textColor, bgColor }: DemoButtonProps) => (
  <button className={`w-full py-2 rounded-lg ${bgColor} ${textColor} text-xs font-bold hover:opacity-80 transition-opacity border border-transparent`}>
    {label}
  </button>
);

export default LoginPage;