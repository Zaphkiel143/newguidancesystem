"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogOut, Menu, X } from "lucide-react";
import { navigationConfig, MenuItem } from "../app/config/navigation";
import SignOutButton from "./SignOutButton";
import SidebarMenu from "./SidebarMenu";
import AppFooter from "./AppFooter";
import { getDashboardStats } from "../app/action/counselor";
import { listStaffApprovals } from "../app/action/accounts";
import { CurrentUserProvider } from "./CurrentUser";
import { LogoMark } from "./Logo";
import { FloatingDock, NoticeBell, NoticesProvider, useUnreadMessages } from "./Notices";
import { LoginApprovalPrompt } from "./LoginApproval";
import PrivacyNotice from "./PrivacyNotice";
import ProfileMenu from "./ProfileMenu";
import ScrollToHash from "./ScrollToHash";

type Role = "faculty" | "counselor" | "student" | "parent" | "admin";

interface AppShellProps {
  role: Role;
  // The stored name, used to match records (e.g. "is this message mine").
  userName: string;
  // The name shown on screen when it differs (demo accounts show "Demo Account").
  displayName?: string;
  // Paths hidden from this user's menu (e.g. My Career Plan for tertiary students).
  hiddenPaths?: string[];
  // Profile photo URL, when the user has uploaded one.
  avatarUrl?: string | null;
  // True until the person agrees to the privacy notice.
  needsPrivacyConsent?: boolean;
  children: React.ReactNode;
}

// localStorage key for the desktop sidebar's hidden/shown choice.
const SIDEBAR_KEY = "egabay-sidebar";

// How often the counselor's menu badges re-check their counts.
const COUNTS_REFRESH_MS = 5_000;

// Each role's own account page (photo, details, sign-in settings).
const ACCOUNT_PATH: Record<Role, string> = {
  admin: "/admin_account",
  counselor: "/my_account",
  student: "/profile",
  faculty: "/faculty_account",
  parent: "/parent_profile",
};

// Each role's page listing all notifications (the bell's "See all").
const NOTIFICATIONS_PATH: Record<Role, string> = {
  admin: "/admin_notifications",
  counselor: "/notifications",
  student: "/my_notifications",
  faculty: "/faculty_notifications",
  parent: "/parent_notifications",
};

// Where the floating message button leads, per role (the Super Admin has no messages).
const MESSAGES_PATH: Partial<Record<Role, string>> = {
  counselor: "/message",
  student: "/my_messages",
  faculty: "/faculty_message",
  parent: "/parent_message",
};

// Matches the labels stored on records (lib/session.ts ROLE_LABEL).
const RECORD_ROLE: Record<Role, string> = {
  admin: "Admin",
  counselor: "Counselor",
  student: "Student",
  faculty: "Faculty",
  parent: "Parent",
};

const ROLE_LABEL: Record<Role, string> = {
  admin: "Super Admin",
  counselor: "Guidance associate",
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

export function AppShell({ role, userName, displayName = userName, hiddenPaths = [], avatarUrl, needsPrivacyConsent = false, children }: AppShellProps) {
  const pathname = usePathname();
  // isOpen: the phone drawer. collapsed: the sidebar hidden on wider screens
  // (the burger button toggles it; remembered on this device). The hiding
  // itself is CSS keyed on <html data-sidebar="collapsed">, which the script
  // in app/layout.tsx sets before the page paints, so it never flashes open.
  const [isOpen, setIsOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [lastPathname, setLastPathname] = useState(pathname);

  useEffect(() => {
    try {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- syncing from browser storage once
      if (document.documentElement.dataset.sidebar === "collapsed") setCollapsed(true);
    } catch {
      // Storage blocked: the sidebar just starts open.
    }
  }, []);

  const toggleMenu = () => {
    if (!window.matchMedia("(min-width: 768px)").matches) return setIsOpen(true);
    const next = !collapsed;
    setCollapsed(next);
    document.documentElement.dataset.sidebarAnim = "";
    if (next) document.documentElement.dataset.sidebar = "collapsed";
    else delete document.documentElement.dataset.sidebar;
    try {
      localStorage.setItem(SIDEBAR_KEY, next ? "collapsed" : "open");
    } catch {
      // Storage blocked: the choice lasts until the page reloads.
    }
  };
  const [counselorCounts, setCounselorCounts] = useState<{
    pendingAppointments: number;
    pendingReferrals: number;
    documentsToReview: number;
    approvalsWaiting: number;
  } | null>(null);

  // Pages this person can't use (hiddenPaths) are left out, including inside groups.
  const visible = (item: MenuItem) => !item.path || !hiddenPaths.includes(item.path);
  const menuItems = (navigationConfig[role] || [])
    .filter(visible)
    .map((item) => (item.children ? { ...item, children: item.children.filter(visible) } : item));

  useEffect(() => {
    if (role !== "counselor") return;
    let active = true;
    const refreshCounts = async () => {
      const stats = await getDashboardStats();
      if (active) {
        setCounselorCounts({
          pendingAppointments: stats.pendingAppointments,
          pendingReferrals: stats.pendingReferrals,
          documentsToReview: stats.documentsToReview,
          approvalsWaiting: stats.approvalsWaiting,
        });
      }
    };
    void refreshCounts();
    // Every few seconds while the tab is in view, and straight away when the
    // person comes back to it, so a change shows without reloading.
    const interval = window.setInterval(() => {
      if (document.visibilityState === "visible") void refreshCounts();
    }, COUNTS_REFRESH_MS);
    const onVisible = () => {
      if (document.visibilityState === "visible") void refreshCounts();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      active = false;
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisible);
    };
    // Also on every page change, so a badge catches up as soon as you move on.
  }, [role, pathname]);

  // Staff accounts waiting for the Super Admin
  const [adminWaiting, setAdminWaiting] = useState<number | null>(null);
  useEffect(() => {
    if (role !== "admin") return;
    let active = true;
    const refresh = async () => {
      const waiting = await listStaffApprovals();
      if (active) setAdminWaiting(waiting.length);
    };
    void refresh();
    const interval = window.setInterval(() => {
      if (document.visibilityState === "visible") void refresh();
    }, COUNTS_REFRESH_MS);
    return () => {
      active = false;
      window.clearInterval(interval);
    };
  }, [role, pathname]);

  // Close the mobile menu automatically whenever the route changes
  if (pathname !== lastPathname) {
    setLastPathname(pathname);
    setIsOpen(false);
  }

  const badgeFor = (item: MenuItem) => {
    const counselorCount =
      item.path === "/appointment"
        ? counselorCounts?.pendingAppointments
        : item.path === "/referral"
          ? counselorCounts?.pendingReferrals
          : item.path === "/documents"
            ? counselorCounts?.documentsToReview
            : item.path === "/accounts"
              ? counselorCounts?.approvalsWaiting
              : item.path === "/admin_accounts"
                ? adminWaiting || undefined
                : undefined;
    return counselorCount ?? item.unreadCount;
  };

  const avatar = (
    <span className="w-9 h-9 rounded-full bg-sti-yellow text-blue-900 grid place-items-center text-xs font-bold shrink-0 overflow-hidden">
      {avatarUrl ? (
        // eslint-disable-next-line @next/next/no-img-element -- served by our own authenticated route
        <img src={avatarUrl} alt="" className="w-full h-full object-cover" />
      ) : (
        initials(displayName)
      )}
    </span>
  );

  return (
    <NoticesProvider>
    <div className="min-h-screen bg-paper">
      {/* STI top bar: navy with the yellow stripe, as on One STI */}
      <header className="sticky top-0 z-40 h-(--topbar-h) bg-blue-700 text-white border-t-4 border-sti-yellow flex items-center gap-3 px-3 md:px-5 shadow-md">
        <button
          onClick={toggleMenu}
          className="w-11 h-11 shrink-0 grid place-items-center rounded-full hover:bg-white/10 transition-colors"
          aria-label={collapsed ? "Show menu" : "Menu"}
          aria-expanded={isOpen || undefined}
          aria-controls="main-menu"
        >
          <Menu size={20} />
        </button>

        <Link href={menuItems.find((i) => i.path)?.path ?? "/"} className="flex items-center gap-3 min-w-0">
          <LogoMark size={36} tone="light" className="shrink-0" />
          <span className="min-w-0 leading-tight">
            <span className="block font-semibold text-[17px] tracking-tight">E-Gabay</span>
            {/* Phones: the school's name sits under E-Gabay */}
            <span className="block sm:hidden text-[11px] text-white/80 truncate">STI College Sta. Maria</span>
          </span>
          <span aria-hidden className="hidden sm:block w-px h-5 bg-white/30" />
          <span className="hidden sm:block text-[13px] text-white/85 truncate">
            Guidance and Counseling Office · <span className="font-medium text-white">STI College Sta. Maria</span>
          </span>
        </Link>

        <div className="ml-auto flex items-center gap-1 sm:gap-3">
          <NoticeBell allPath={NOTIFICATIONS_PATH[role]} />
          <ProfileMenu userName={displayName} roleLabel={ROLE_LABEL[role]} avatar={avatar} accountPath={ACCOUNT_PATH[role]} />
        </div>
      </header>

      {isOpen && (
        <div
          className="md:hidden fixed inset-0 bg-ink/30 z-50"
          onClick={() => setIsOpen(false)}
        />
      )}

      <aside
        id="main-menu"
        className={`w-(--sidebar-w) bg-blue-50 border-r border-blue-100 flex flex-col fixed left-0 z-50 md:z-30 top-0 h-screen md:top-(--topbar-h) md:h-[calc(100vh-var(--topbar-h))] transition-[translate,visibility] duration-300 ease-out ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        } md:translate-x-0 md:visible`}
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
          <MenuWithMessages items={menuItems} pathname={pathname} badgeFor={badgeFor} />
        </nav>

        <div className="md:hidden px-5 py-4 border-t border-blue-100">
          <div className="md:hidden flex items-center gap-3 mb-2">
            {avatar}
            <div className="min-w-0 flex-1 leading-tight">
              <p className="text-[13px] font-medium text-ink truncate">{displayName}</p>
              <p className="text-[12px] text-slate-500 truncate">{ROLE_LABEL[role]}</p>
            </div>
          </div>
          <SignOutButton className="w-full px-4 min-h-11 inline-flex items-center gap-2 text-[14px] text-slate-600 hover:text-red-700 hover:bg-red-50 rounded-full transition-colors">
            <LogOut size={16} strokeWidth={1.9} />
            Sign out
          </SignOutButton>
        </div>
      </aside>

      <main className={`app-main md:pl-(--sidebar-w) min-w-0 pb-[calc(var(--footer-h)+5rem)] transition-[padding] duration-300 ease-out`}>
        {/* With the sidebar hidden, pages sit centred in the wider space (see .page-area in globals.css). */}
        <div className="page-area">
          <CurrentUserProvider user={{ name: userName, displayName, roleLabel: RECORD_ROLE[role] }}>{children}</CurrentUserProvider>
        </div>
        <AppFooter showHotlines={role !== "counselor" && role !== "admin"} />
      </main>

      {MESSAGES_PATH[role] && <FloatingDock messagesPath={MESSAGES_PATH[role]} withChatbot={role === "student" || role === "faculty"} />}
      <LoginApprovalPrompt />
      <ScrollToHash />
      {needsPrivacyConsent && <PrivacyNotice />}
    </div>
    </NoticesProvider>
  );
}

const MESSAGE_PATHS = new Set(["/message", "/faculty_message", "/parent_message", "/my_messages"]);

// The sidebar, with the unread message count on Messages (it sits inside
// NoticesProvider, which keeps that count).
function MenuWithMessages({ badgeFor, ...props }: React.ComponentProps<typeof SidebarMenu>) {
  const unreadMessages = useUnreadMessages();
  return (
    <SidebarMenu
      {...props}
      badgeFor={(item) => (item.path && MESSAGE_PATHS.has(item.path) ? unreadMessages || undefined : badgeFor(item))}
    />
  );
}
