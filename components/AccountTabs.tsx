"use client";

import React, { useEffect, useRef } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { Settings, UserRound } from "lucide-react";

// Splits an account page into "Profile" and "Settings" tabs. The open tab is
// in the address (?tab=settings), so the top-bar menu's "My account" and
// "Settings" items each open their own tab. Both panels stay mounted (only
// hidden), so switching tabs doesn't lose a half-filled form.
const TABS = [
  { id: "profile", label: "Profile", icon: UserRound },
  { id: "settings", label: "Settings", icon: Settings },
] as const;
type TabId = (typeof TABS)[number]["id"];

export default function AccountTabs({ profile, settings }: { profile: React.ReactNode; settings: React.ReactNode }) {
  const pathname = usePathname();
  const params = useSearchParams();
  const active: TabId = params.get("tab") === "settings" ? "settings" : "profile";
  const buttons = useRef<Record<TabId, HTMLButtonElement | null>>({ profile: null, settings: null });

  // Older links point at "#settings" (the section these tabs replaced), both
  // when the page opens and when it's already open.
  useEffect(() => {
    const fromHash = () => {
      if (window.location.hash === "#settings") window.history.replaceState(null, "", `${pathname}?tab=settings`);
    };
    fromHash();
    window.addEventListener("hashchange", fromHash);
    return () => window.removeEventListener("hashchange", fromHash);
  }, [pathname]);

  // history.replaceState keeps useSearchParams in sync without a page load.
  const open = (id: TabId, focus = false) => {
    window.history.replaceState(null, "", id === "settings" ? `${pathname}?tab=settings` : pathname);
    if (focus) buttons.current[id]?.focus();
  };

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key !== "ArrowRight" && e.key !== "ArrowLeft" && e.key !== "Home" && e.key !== "End") return;
    e.preventDefault();
    const i = TABS.findIndex((t) => t.id === active);
    const next = e.key === "Home" ? 0 : e.key === "End" ? TABS.length - 1 : (i + (e.key === "ArrowRight" ? 1 : -1) + TABS.length) % TABS.length;
    open(TABS[next].id, true);
  };

  return (
    <div>
      <div role="tablist" aria-label="Account" onKeyDown={onKey} className="flex gap-1 border-b border-rule">
        {TABS.map(({ id, label, icon: Icon }) => {
          const selected = id === active;
          return (
            <button
              key={id}
              ref={(el) => { buttons.current[id] = el; }}
              type="button"
              role="tab"
              id={`account-tab-${id}`}
              aria-selected={selected}
              aria-controls={`account-panel-${id}`}
              tabIndex={selected ? 0 : -1}
              onClick={() => open(id)}
              className={`inline-flex items-center gap-2 px-4 min-h-11 -mb-px border-b-2 text-[14px] font-medium transition-colors ${
                selected ? "border-blue-700 text-blue-700" : "border-transparent text-slate-500 hover:text-ink"
              }`}
            >
              <Icon size={16} /> {label}
            </button>
          );
        })}
      </div>
      {TABS.map(({ id }) => (
        <div
          key={id}
          role="tabpanel"
          id={`account-panel-${id}`}
          aria-labelledby={`account-tab-${id}`}
          hidden={id !== active}
          className="pt-6"
        >
          {id === "profile" ? profile : settings}
        </div>
      ))}
    </div>
  );
}
