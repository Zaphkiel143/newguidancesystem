"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogOut, Menu, X } from "lucide-react";
import { navigationConfig, MenuItem } from "../app/config/navigation";
import { logout } from "../app/action/auth";

type Role = "faculty" | "counselor" | "student" | "parent";

interface AppShellProps {
  role: Role;
  userName: string;
  children: React.ReactNode;
}

const ROLE_META: Record<Role, { label: string; chip: string }> = {
  counselor: { label: "Guidance Counselor", chip: "bg-blue-100 text-blue-700" },
  student: { label: "Student", chip: "bg-emerald-100 text-emerald-700" },
  faculty: { label: "Faculty", chip: "bg-violet-100 text-violet-700" },
  parent: { label: "Parent / Guardian", chip: "bg-orange-100 text-orange-700" },
};

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

export function AppShell({ role, userName, children }: AppShellProps) {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const [lastPathname, setLastPathname] = useState(pathname);

  const menuItems = navigationConfig[role] || [];
  const activeItem = menuItems.find((item) => item.path === pathname);
  const meta = ROLE_META[role];

  // Close the mobile menu automatically whenever the route changes
  if (pathname !== lastPathname) {
    setLastPathname(pathname);
    setIsOpen(false);
  }

  const today = new Date().toLocaleDateString("en-PH", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="min-h-screen bg-canvas">
      {/* Backdrop, mobile only, closes the menu on click */}
      {isOpen && (
        <div
          className="md:hidden fixed inset-0 bg-navy/50 backdrop-blur-sm z-50"
          onClick={() => setIsOpen(false)}
        />
      )}

      <aside
        className={`w-(--sidebar-w) h-screen bg-navy text-white flex flex-col fixed left-0 top-0 z-50 transition-transform duration-300 ease-out md:translate-x-0 ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Decorative glow behind the brand mark */}
        <div className="pointer-events-none absolute -top-24 -left-16 w-72 h-72 rounded-full bg-blue-600/30 blur-3xl" />

        {/* Brand */}
        <div className="relative h-(--topbar-h) px-5 flex items-center justify-between gap-3 shrink-0">
          <Link href={menuItems[0]?.path ?? "/"} className="flex items-center gap-3">
            <span className="w-9 h-9 rounded-xl bg-gold-400 text-navy grid place-items-center font-extrabold text-[11px] tracking-wide shadow-[0_6px_16px_-4px_rgb(255_200_31/0.55)]">
              STI
            </span>
            <span className="leading-tight">
              <span className="block font-extrabold text-[15px] tracking-tight">E-Gabay</span>
              <span className="block text-[11px] text-white/50 font-medium">Guidance Office</span>
            </span>
          </Link>
          <button
            onClick={() => setIsOpen(false)}
            className="md:hidden p-1.5 text-white/60 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
            aria-label="Close menu"
          >
            <X size={20} />
          </button>
        </div>

        {/* Navigation */}
        <nav className="relative flex-1 px-3 pt-4 pb-4 overflow-y-auto nav-scroll">
          <p className="px-3 mb-2 text-[10px] font-bold uppercase tracking-[0.14em] text-white/35">
            Menu
          </p>
          <ul className="space-y-0.5">
            {menuItems.map((item: MenuItem) => {
              const Icon = item.icon;
              const isActive = pathname === item.path;

              return (
                <li key={item.path}>
                  <Link
                    href={item.path}
                    aria-current={isActive ? "page" : undefined}
                    className={`relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13.5px] transition-colors group ${
                      isActive
                        ? "bg-white/10 text-white font-semibold"
                        : "text-white/65 hover:bg-white/5 hover:text-white"
                    }`}
                  >
                    {isActive && (
                      <span className="absolute left-0 top-2 bottom-2 w-[3px] rounded-r-full bg-gold-400" />
                    )}
                    <Icon
                      size={18}
                      className={isActive ? "text-gold-400" : "text-white/45 group-hover:text-white/80"}
                    />
                    <span>{item.name}</span>

                    {item.unreadCount && (
                      <span className="ml-auto bg-gold-400 text-navy text-[11px] font-bold px-1.5 py-0.5 rounded-full">
                        {item.unreadCount}
                      </span>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Account */}
        <div className="relative p-3 border-t border-white/10 shrink-0">
          <div className="flex items-center gap-3 px-2 py-2">
            <span className="w-9 h-9 rounded-full bg-white/10 grid place-items-center text-xs font-bold">
              {initials(userName)}
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[13px] font-semibold truncate">{userName}</p>
              <p className="text-[11px] text-white/45 truncate">{meta.label}</p>
            </div>
            <button
              onClick={() => logout()}
              title="Log out"
              aria-label="Log out"
              className="p-2 rounded-lg text-white/50 hover:text-rose-300 hover:bg-white/5 transition-colors"
            >
              <LogOut size={17} />
            </button>
          </div>
        </div>
      </aside>

      <div className="md:pl-(--sidebar-w) flex flex-col min-h-screen">
        {/* Top bar */}
        <header className="sticky top-0 z-40 h-(--topbar-h) bg-white/80 backdrop-blur-md border-b border-slate-200/70 flex items-center gap-3 px-4 md:px-8">
          <button
            onClick={() => setIsOpen(true)}
            className="md:hidden p-2 -ml-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
            aria-label="Open menu"
          >
            <Menu size={22} />
          </button>

          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400 leading-none">
              {meta.label}
            </p>
            <p className="text-[15px] font-bold text-slate-900 truncate mt-1 leading-none">
              {activeItem?.name ?? "E-Gabay"}
            </p>
          </div>

          <div className="ml-auto flex items-center gap-4">
            <span className="hidden lg:inline text-xs font-medium text-slate-500 bg-slate-100 px-3 py-1.5 rounded-full">
              {today}
            </span>
            <div className="flex items-center gap-2.5">
              <span className={`w-9 h-9 rounded-full grid place-items-center text-xs font-bold ${meta.chip}`}>
                {initials(userName)}
              </span>
              <span className="hidden sm:block leading-tight">
                <span className="block text-[13px] font-semibold text-slate-800">{userName}</span>
                <span className="block text-[11px] text-slate-400">{meta.label}</span>
              </span>
            </div>
          </div>
        </header>

        <main className="flex-1 min-w-0">{children}</main>
      </div>
    </div>
  );
}
