"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogOut, Menu, X } from "lucide-react";
import { navigationConfig, MenuItem } from "../app/config/navigation";
import { logout } from "../app/action/auth";
import { CurrentUserProvider } from "./CurrentUser";
import { LogoMark } from "./Logo";
import { FloatingDock, NoticeBell, NoticesProvider } from "./Notices";

type Role = "faculty" | "counselor" | "student" | "parent";

interface AppShellProps {
  role: Role;
  userName: string;
  // Paths hidden from this user's menu (e.g. My Career Plan for tertiary students).
  hiddenPaths?: string[];
  // Profile photo URL, when the user has uploaded one.
  avatarUrl?: string | null;
  children: React.ReactNode;
}

// Where the floating message button leads, per role.
const MESSAGES_PATH: Record<Role, string> = {
  counselor: "/message",
  student: "/my_messages",
  faculty: "/faculty_message",
  parent: "/parent_message",
};

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

export function AppShell({ role, userName, hiddenPaths = [], avatarUrl, children }: AppShellProps) {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const [lastPathname, setLastPathname] = useState(pathname);

  const menuItems = (navigationConfig[role] || []).filter((item) => !hiddenPaths.includes(item.path));

  // Close the mobile menu automatically whenever the route changes
  if (pathname !== lastPathname) {
    setLastPathname(pathname);
    setIsOpen(false);
  }

  const avatar = (
    <span className="w-9 h-9 rounded-full bg-sti-yellow text-blue-900 grid place-items-center text-xs font-bold shrink-0 overflow-hidden">
      {avatarUrl ? (
        // eslint-disable-next-line @next/next/no-img-element -- served by our own authenticated route
        <img src={avatarUrl} alt="" className="w-full h-full object-cover" />
      ) : (
        initials(userName)
      )}
    </span>
  );

  return (
    <NoticesProvider>
    <div className="min-h-screen bg-paper">
      {/* STI top bar: navy with the yellow stripe, as on One STI */}
      <header className="sticky top-0 z-40 h-(--topbar-h) bg-blue-700 text-white border-t-4 border-sti-yellow flex items-center gap-3 px-3 md:px-5 shadow-md">
        <button
          onClick={() => setIsOpen(true)}
          className="md:hidden w-11 h-11 grid place-items-center rounded-full hover:bg-white/10 transition-colors"
          aria-label="Open menu"
          aria-expanded={isOpen}
        >
          <Menu size={20} />
        </button>

        <Link href={menuItems[0]?.path ?? "/"} className="flex items-center gap-3 min-w-0">
          <LogoMark size={36} tone="light" className="shrink-0" />
          <span className="font-semibold text-[17px] tracking-tight">E-Gabay</span>
          <span aria-hidden className="hidden sm:block w-px h-5 bg-white/30" />
          <span className="hidden sm:block text-[13px] text-white/80 truncate">Guidance and Counseling Office · STI College Sta. Maria</span>
        </Link>

        <div className="ml-auto flex items-center gap-1 sm:gap-3">
          <NoticeBell />
          <span className="hidden md:block text-right leading-tight">
            <span className="block text-[13px] font-medium">{userName}</span>
            <span className="block text-xs text-white/75">{ROLE_LABEL[role]}</span>
          </span>
          {avatar}
        </div>
      </header>

      {isOpen && (
        <div
          className="md:hidden fixed inset-0 bg-ink/30 z-50"
          onClick={() => setIsOpen(false)}
        />
      )}

      <aside
        className={`w-(--sidebar-w) bg-blue-50 border-r border-blue-100 flex flex-col fixed left-0 z-50 md:z-30 top-0 h-screen md:top-(--topbar-h) md:h-[calc(100vh-var(--topbar-h))] transition-transform duration-300 ease-out md:translate-x-0 ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Drawer header, phones only (the top bar carries the brand on wider screens) */}
        <div className="md:hidden px-5 pt-5 pb-4 flex items-center justify-between">
          <span className="inline-flex items-center gap-2.5">
            <LogoMark size={32} />
            <span className="font-semibold text-ink">E-Gabay</span>
          </span>
          <button
            onClick={() => setIsOpen(false)}
            className="w-11 h-11 -mr-2 grid place-items-center text-slate-500 hover:text-ink hover:bg-blue-100 rounded-full transition-colors"
            aria-label="Close menu"
          >
            <X size={18} />
          </button>
        </div>

        <nav className="flex-1 px-3 pt-2 md:pt-5 overflow-y-auto" aria-label="Main">
          <p className="px-3 mb-2 text-xs font-medium text-slate-500">Menu</p>
          <ul className="space-y-0.5">
            {menuItems.map((item: MenuItem) => {
              const Icon = item.icon;
              const isActive = pathname === item.path;

              return (
                <li key={item.path}>
                  <Link
                    href={item.path}
                    aria-current={isActive ? "page" : undefined}
                    className={`relative flex items-center gap-3 px-4 min-h-11 rounded-full text-[14px] transition-colors ${
                      isActive
                        ? "bg-butter-200 text-ink font-semibold shadow-sm"
                        : "text-slate-600 hover:text-ink hover:bg-blue-100"
                    }`}
                  >
                    <Icon
                      size={17}
                      strokeWidth={1.9}
                      className={isActive ? "text-blue-700" : "text-blue-500"}
                    />
                    <span>{item.name}</span>
                    {!!item.unreadCount && (
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

        <div className="px-5 py-4 border-t border-blue-100">
          <div className="md:hidden flex items-center gap-3 mb-2">
            {avatar}
            <div className="min-w-0 flex-1 leading-tight">
              <p className="text-[13px] font-medium text-ink truncate">{userName}</p>
              <p className="text-[12px] text-slate-500 truncate">{ROLE_LABEL[role]}</p>
            </div>
          </div>
          <button
            onClick={() => logout()}
            className="w-full px-4 min-h-11 inline-flex items-center gap-2 text-[14px] text-slate-600 hover:text-red-700 hover:bg-red-50 rounded-full transition-colors"
          >
            <LogOut size={16} strokeWidth={1.9} />
            Sign out
          </button>
        </div>
      </aside>

      <main className="md:pl-(--sidebar-w) min-w-0 pb-20">
        <CurrentUserProvider user={{ name: userName, roleLabel: RECORD_ROLE[role] }}>{children}</CurrentUserProvider>
      </main>

      <FloatingDock messagesPath={MESSAGES_PATH[role]} withChatbot={role === "student"} />
    </div>
    </NoticesProvider>
  );
}
