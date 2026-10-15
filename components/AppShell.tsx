"use client";

import React, { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { LogOut, Menu, X } from "lucide-react";
import { navigationConfig, MenuItem } from "../app/config/navigation";
import { logout } from "../app/action/auth";
import { CurrentUserProvider } from "./CurrentUser";

type Role = "faculty" | "counselor" | "student" | "parent";

interface AppShellProps {
  role: Role;
  userName: string;
  children: React.ReactNode;
}

// Matches the labels stored on records (lib/session.ts ROLE_LABEL).
const RECORD_ROLE: Record<Role, string> = {
  counselor: "Counselor",
  student: "Student",
  faculty: "Faculty",
  parent: "Parent",
};

const ROLE_LABEL: Record<Role, string> = {
  counselor: "Guidance counselor",
  student: "Student",
  faculty: "Faculty",
  parent: "Parent / guardian",
};

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

function Wordmark() {
  return (
    <span className="leading-none flex items-center gap-3">
      <Image src="/sti-logo.jpg" alt="STI College Sta. Maria" width={44} height={44} className="rounded-lg shadow-sm shrink-0" priority />
      <span>
      <span className="block font-serif text-[22px] text-ink tracking-tight">E-Gabay</span>
      <span className="block text-xs text-slate-500 mt-1">STI College Sta. Maria</span>
      </span>
    </span>
  );
}

export function AppShell({ role, userName, children }: AppShellProps) {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const [lastPathname, setLastPathname] = useState(pathname);

  const menuItems = navigationConfig[role] || [];

  // Close the mobile menu automatically whenever the route changes
  if (pathname !== lastPathname) {
    setLastPathname(pathname);
    setIsOpen(false);
  }

  return (
    <div className="min-h-screen bg-paper">
      {/* Mobile bar */}
      <div className="md:hidden sticky top-0 z-40 h-(--topbar-h) bg-blue-50/95 backdrop-blur border-b border-blue-100 flex items-center gap-3 px-4">
        <button
          onClick={() => setIsOpen(true)}
          className="w-11 h-11 -ml-3 grid place-items-center text-slate-700 hover:bg-blue-100 rounded-md transition-colors"
          aria-label="Open menu"
          aria-expanded={isOpen}
        >
          <Menu size={20} />
        </button>
        <span className="inline-flex items-center gap-2">
          <Image src="/sti-logo.jpg" alt="" width={28} height={28} className="rounded-md" />
          <span className="font-serif text-lg text-ink">E-Gabay</span>
        </span>
      </div>

      {isOpen && (
        <div
          className="md:hidden fixed inset-0 bg-ink/30 z-50"
          onClick={() => setIsOpen(false)}
        />
      )}

      <aside
        className={`w-(--sidebar-w) h-screen bg-blue-50 border-r border-blue-100 flex flex-col fixed left-0 top-0 z-50 transition-transform duration-300 ease-out md:translate-x-0 ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="px-6 pt-7 pb-6 flex items-start justify-between">
          <Link href={menuItems[0]?.path ?? "/"}>
            <Wordmark />
          </Link>
          <button
            onClick={() => setIsOpen(false)}
            className="md:hidden w-11 h-11 -mr-3 -mt-2 grid place-items-center text-slate-500 hover:text-ink hover:bg-blue-100 rounded-md transition-colors"
            aria-label="Close menu"
          >
            <X size={18} />
          </button>
        </div>

        <nav className="flex-1 px-3 overflow-y-auto" aria-label="Main">
          <ul className="space-y-px">
            {menuItems.map((item: MenuItem) => {
              const Icon = item.icon;
              const isActive = pathname === item.path;

              return (
                <li key={item.path}>
                  <Link
                    href={item.path}
                    aria-current={isActive ? "page" : undefined}
                    className={`relative flex items-center gap-3 px-3 min-h-11 rounded-md text-[14px] transition-colors ${
                      isActive
                        ? "bg-butter-200 text-ink font-semibold shadow-sm"
                        : "text-slate-600 hover:text-ink hover:bg-blue-100"
                    }`}
                  >
                    <Icon
                      size={16}
                      strokeWidth={1.75}
                      className={isActive ? "text-ink" : "text-blue-500"}
                    />
                    <span>{item.name}</span>
                    {item.unreadCount && (
                      <span className="ml-auto text-xs font-semibold text-blue-700 tabular">
                        {item.unreadCount}
                      </span>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="px-6 py-5 border-t border-blue-100">
          <div className="flex items-center gap-3">
            <span className="w-9 h-9 rounded-full bg-butter-200 text-ink grid place-items-center text-xs font-semibold shrink-0">
              {initials(userName)}
            </span>
            <div className="min-w-0 flex-1 leading-tight">
              <p className="text-[13px] font-medium text-ink truncate">{userName}</p>
              <p className="text-[12px] text-slate-500 truncate">{ROLE_LABEL[role]}</p>
            </div>
          </div>
          <button
            onClick={() => logout()}
            className="mt-2 -ml-2 px-2 min-h-11 inline-flex items-center gap-2 text-[13px] text-slate-500 hover:text-red-700 hover:bg-blue-100 rounded-md transition-colors"
          >
            <LogOut size={14} strokeWidth={1.75} />
            Sign out
          </button>
        </div>
      </aside>

      <main className="md:pl-(--sidebar-w) min-w-0">
        <CurrentUserProvider user={{ name: userName, roleLabel: RECORD_ROLE[role] }}>{children}</CurrentUserProvider>
      </main>
    </div>
  );
}
