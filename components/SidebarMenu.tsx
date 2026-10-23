"use client";

import React, { useState } from "react";
import Link from "next/link";
import { ChevronDown } from "lucide-react";
import type { MenuItem } from "../app/config/navigation";

// The sidebar's list of pages. An item with children shows them indented
// under it (e.g. Referrals under Appointments); its arrow opens and folds
// them. A group starts folded unless a page inside it has a count waiting
// (e.g. 2 referrals), and always opens when the current page is inside it.
// An item without a path (e.g. Manage) is only a heading: clicking it opens
// or closes the group.
export default function SidebarMenu({
  items,
  pathname,
  badgeFor,
}: {
  items: MenuItem[];
  pathname: string;
  badgeFor: (item: MenuItem) => number | undefined;
}) {
  // Groups the person opened or folded themselves; the rest follow their counts.
  const [chosen, setChosen] = useState<Record<string, boolean>>({});
  const toggle = (name: string, open: boolean) => setChosen((prev) => ({ ...prev, [name]: !open }));

  return (
    <ul className="space-y-0.5">
      {items.map((item) => {
        const children = item.children ?? [];
        const childActive = children.some((c) => c.path === pathname);
        const childHasCount = children.some((c) => !!badgeFor(c));
        const open = children.length > 0 && (childActive || (chosen[item.name] ?? childHasCount));
        const groupId = `menu-group-${item.name.replace(/\W+/g, "-").toLowerCase()}`;
        return (
          <li key={item.name}>
            <div className="relative flex items-center">
              <Row item={item} active={item.path === pathname} badge={badgeFor(item)} onHeadingClick={() => toggle(item.name, open)} expanded={children.length ? open : undefined} controls={groupId} />
              {children.length > 0 && item.path && (
                <button
                  type="button"
                  onClick={() => toggle(item.name, open)}
                  aria-expanded={open}
                  aria-controls={groupId}
                  aria-label={`${open ? "Hide" : "Show"} pages under ${item.name}`}
                  className="absolute right-1 w-9 h-9 grid place-items-center rounded-full text-slate-500 hover:bg-blue-100 hover:text-ink"
                >
                  <ChevronDown size={16} className={`transition-transform ${open ? "" : "-rotate-90"}`} />
                </button>
              )}
            </div>
            {children.length > 0 && open && (
              <ul id={groupId} className="mt-0.5 ml-6 pl-3 border-l border-blue-200 space-y-0.5">
                {children.map((child) => (
                  <li key={child.name}>
                    <Row item={child} active={child.path === pathname} badge={badgeFor(child)} nested />
                  </li>
                ))}
              </ul>
            )}
          </li>
        );
      })}
    </ul>
  );
}

function Row({
  item,
  active,
  badge,
  nested = false,
  expanded,
  controls,
  onHeadingClick,
}: {
  item: MenuItem;
  active: boolean;
  badge?: number;
  nested?: boolean;
  expanded?: boolean;
  controls?: string;
  onHeadingClick?: () => void;
}) {
  const Icon = item.icon;
  // Groups with a page leave room on the right for their fold arrow.
  const hasArrow = expanded !== undefined;
  const className = `relative flex w-full items-center gap-3 ${nested ? "px-3 min-h-10 text-[13.5px]" : "px-4 min-h-11 text-[14px]"} ${
    hasArrow ? "pr-11" : ""
  } rounded-full text-left transition-colors ${active ? "bg-butter-200 text-ink font-semibold shadow-sm" : "text-slate-600 hover:text-ink hover:bg-blue-100"}`;
  const content = (
    <>
      <Icon size={nested ? 16 : 17} strokeWidth={1.9} className={active ? "text-blue-700" : "text-blue-500"} />
      <span className="flex-1 min-w-0">{item.name}</span>
      {!!badge && (
        <span aria-label={`${badge} items`} className="min-w-5 h-5 px-1.5 inline-flex items-center justify-center rounded-full bg-blue-700 text-[11px] leading-none font-semibold text-white tabular">
          {badge}
        </span>
      )}
      {/* A heading without its own page carries the arrow inside the row. */}
      {!item.path && hasArrow && (
        <ChevronDown size={16} className={`absolute right-4 text-slate-500 transition-transform ${expanded ? "" : "-rotate-90"}`} aria-hidden />
      )}
    </>
  );

  if (!item.path) {
    return (
      <button type="button" onClick={onHeadingClick} aria-expanded={expanded} aria-controls={controls} className={className}>
        {content}
      </button>
    );
  }
  return (
    <Link href={item.path} aria-current={active ? "page" : undefined} className={className}>
      {content}
    </Link>
  );
}
