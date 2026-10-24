"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown, LogOut, Settings, UserRound } from "lucide-react";
import SignOutButton from "./SignOutButton";

// Name and photo in the top bar; opens My account, Settings and Sign out.
export default function ProfileMenu({
  userName,
  roleLabel,
  avatar,
  accountPath,
}: {
  userName: string;
  roleLabel: string;
  avatar: React.ReactNode;
  accountPath: string;
}) {
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  const pathname = usePathname();
  const [lastPath, setLastPath] = useState(pathname);
  if (pathname !== lastPath) {
    setLastPath(pathname);
    setOpen(false);
  }

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (box.current && !box.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const item = "flex items-center gap-3 w-full px-4 min-h-11 text-[14px] text-ink hover:bg-blue-50 text-left";

  return (
    <div ref={box} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`Account menu for ${userName}`}
        className="flex items-center gap-2 sm:gap-3 rounded-full pl-1 sm:pl-3 pr-1 py-1 hover:bg-white/10 transition-colors"
      >
        <span className="hidden md:block text-right leading-tight">
          <span className="block text-[13px] font-medium">{userName}</span>
          <span className="block text-xs text-white/75">{roleLabel}</span>
        </span>
        {avatar}
        <ChevronDown size={15} className={`hidden sm:block text-white/80 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div role="menu" className="absolute right-0 mt-2 w-64 bg-sheet text-ink rounded-2xl shadow-2xl border border-rule overflow-hidden z-50">
          <div className="px-4 py-3 border-b border-rule">
            <p className="text-[14px] font-semibold truncate">{userName}</p>
            <p className="text-[12px] text-slate-500">{roleLabel}</p>
          </div>
          <Link role="menuitem" href={accountPath} className={item} onClick={() => setOpen(false)}>
            <UserRound size={17} className="text-blue-700" /> My account
          </Link>
          <Link role="menuitem" href={`${accountPath}#settings`} className={item} onClick={() => setOpen(false)}>
            <Settings size={17} className="text-blue-700" /> Settings
          </Link>
          <SignOutButton role="menuitem" className={`${item} border-t border-rule text-red-700 hover:bg-red-50`}>
            <LogOut size={17} /> Sign out
          </SignOutButton>
        </div>
      )}
    </div>
  );
}
