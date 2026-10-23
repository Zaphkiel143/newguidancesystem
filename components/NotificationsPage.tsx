"use client";

import React, { useCallback, useEffect, useState } from "react";
import { Bell, CheckCheck, Loader2 } from "lucide-react";
import { getMyNoticePage, markNoticesRead } from "../app/action/notifications";
import type { Notification } from "../lib/generated";
import { NoticeDialog, timeAgo } from "./Notices";

type Filter = "all" | "unread";

// "Today", "Yesterday", or the date, in Philippine time.
function dayLabel(date: Date) {
  const key = (d: Date) => d.toLocaleDateString("en-CA", { timeZone: "Asia/Manila" });
  const today = new Date();
  const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
  if (key(date) === key(today)) return "Today";
  if (key(date) === key(yesterday)) return "Yesterday";
  return date.toLocaleDateString("en-PH", { weekday: "long", month: "long", day: "numeric", year: "numeric", timeZone: "Asia/Manila" });
}

// Every notification on one page, for when the bell's short list isn't
// enough (e.g. a Guidance Associate with many new requests). Shared by all
// roles; each role's section has its own address for it.
export default function NotificationsPage() {
  const [filter, setFilter] = useState<Filter>("all");
  const [items, setItems] = useState<Notification[] | null>(null);
  const [cursor, setCursor] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [viewing, setViewing] = useState<Notification | null>(null);

  const load = useCallback(async (f: Filter) => {
    const page = await getMyNoticePage({ unreadOnly: f === "unread" });
    setItems(page.items);
    setCursor(page.nextCursor);
  }, []);

  useEffect(() => {
    let cancelled = false;
    getMyNoticePage({ unreadOnly: filter === "unread" }).then((page) => {
      if (cancelled) return;
      setItems(page.items);
      setCursor(page.nextCursor);
    });
    return () => {
      cancelled = true;
    };
  }, [filter]);

  const loadMore = async () => {
    if (!cursor) return;
    setLoadingMore(true);
    const page = await getMyNoticePage({ cursor, unreadOnly: filter === "unread" });
    setItems((prev) => [...(prev ?? []), ...page.items]);
    setCursor(page.nextCursor);
    setLoadingMore(false);
  };

  const open = (n: Notification) => {
    if (!n.readAt) {
      void markNoticesRead([n.id]);
      setItems((prev) => prev?.map((x) => (x.id === n.id ? { ...x, readAt: new Date() } : x)) ?? null);
    }
    setViewing(n);
  };

  const markAll = async () => {
    await markNoticesRead();
    await load(filter);
  };

  const closeDialog = useCallback(() => setViewing(null), []);

  // Group by day, keeping newest-first order.
  const groups: { label: string; items: Notification[] }[] = [];
  for (const n of items ?? []) {
    const label = dayLabel(new Date(n.createdAt));
    const last = groups[groups.length - 1];
    if (last?.label === label) last.items.push(n);
    else groups.push({ label, items: [n] });
  }
  const unreadShown = (items ?? []).some((n) => !n.readAt);

  return (
    <div className="px-5 sm:px-8 lg:px-12 pt-8 lg:pt-12 pb-16 max-w-3xl text-slate-800">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <h1 className="page-title">Notifications</h1>
        {unreadShown && (
          <button type="button" onClick={markAll} className="inline-flex items-center gap-2 min-h-10 px-4 rounded-full border border-slate-300 text-[13px] hover:bg-slate-50">
            <CheckCheck size={15} /> Mark all as read
          </button>
        )}
      </header>

      <div role="tablist" aria-label="Show" className="mt-5 inline-flex rounded-full border border-slate-300 p-1 bg-sheet">
        {(["all", "unread"] as const).map((f) => (
          <button
            key={f}
            role="tab"
            aria-selected={filter === f}
            onClick={() => setFilter(f)}
            className={`min-h-9 px-4 rounded-full text-[13px] font-medium transition-colors ${filter === f ? "bg-blue-700 text-white" : "text-slate-600 hover:bg-slate-100"}`}
          >
            {f === "all" ? "All" : "Unread"}
          </button>
        ))}
      </div>

      {items === null ? (
        <div className="py-16 flex justify-center text-slate-500">
          <Loader2 className="animate-spin" size={20} />
        </div>
      ) : items.length === 0 ? (
        <div className="py-16 text-center text-slate-500">
          <Bell size={28} className="mx-auto text-slate-400" aria-hidden />
          <p className="mt-3 text-sm">{filter === "unread" ? "You're all caught up." : "No notifications yet."}</p>
        </div>
      ) : (
        <div className="mt-6 space-y-8">
          {groups.map((g) => (
            <section key={g.label} aria-label={g.label}>
              <h2 className="text-[13px] font-semibold uppercase tracking-wide text-slate-500 mb-2">{g.label}</h2>
              <ul className="bg-sheet border border-rule rounded-2xl divide-y divide-rule overflow-hidden">
                {g.items.map((n) => (
                  <li key={n.id}>
                    <button type="button" onClick={() => open(n)} className="w-full text-left px-4 sm:px-5 py-3.5 hover:bg-blue-50 transition-colors flex items-start gap-3">
                      <span
                        aria-label={n.readAt ? undefined : "Unread"}
                        className={`mt-1.5 w-2 h-2 rounded-full shrink-0 ${n.readAt ? "bg-transparent" : "bg-blue-600"}`}
                      />
                      <span className="min-w-0 flex-1">
                        <span className={`block text-[14px] ${n.readAt ? "text-slate-700" : "font-semibold text-ink"}`}>{n.title}</span>
                        {n.body && <span className="block text-[13px] text-slate-600 mt-0.5 break-words line-clamp-2">{n.body}</span>}
                      </span>
                      <span className="shrink-0 text-[12px] text-slate-500 mt-0.5">{timeAgo(n.createdAt)}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          ))}
          {cursor && (
            <div className="flex justify-center">
              <button
                type="button"
                onClick={loadMore}
                disabled={loadingMore}
                className="inline-flex items-center gap-2 min-h-11 px-5 rounded-full border border-slate-300 text-[14px] hover:bg-slate-50 disabled:opacity-60"
              >
                {loadingMore && <Loader2 size={15} className="animate-spin" />} Load more
              </button>
            </div>
          )}
        </div>
      )}

      <NoticeDialog notice={viewing} onClose={closeDialog} />
    </div>
  );
}
