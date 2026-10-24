"use client";

import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell, MessageSquare, Sparkles, X } from "lucide-react";
import { getMyNotices, markNoticesRead } from "../app/action/notifications";
import type { Notification } from "../lib/generated";
import AiChatThread from "./AiChat";

type Notices = { items: Notification[]; unread: number; unreadMessages: number };
const EMPTY: Notices = { items: [], unread: 0, unreadMessages: 0 };
const POLL_MS = 30_000;

const NoticesContext = createContext<{ notices: Notices; refresh: () => void }>({ notices: EMPTY, refresh: () => {} });

// Loads the signed-in user's notifications and unread message count, and
// refreshes them every 30 seconds (and on every page change) while the tab is open.
export function NoticesProvider({ children }: { children: React.ReactNode }) {
  const [notices, setNotices] = useState<Notices>(EMPTY);
  const pathname = usePathname();

  const refresh = useCallback(() => {
    getMyNotices().then(setNotices).catch(() => {});
  }, []);

  useEffect(() => {
    refresh();
  }, [pathname, refresh]);

  useEffect(() => {
    const tick = () => {
      if (document.visibilityState === "visible") refresh();
    };
    const id = setInterval(tick, POLL_MS);
    document.addEventListener("visibilitychange", tick);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", tick);
    };
  }, [refresh]);

  return <NoticesContext.Provider value={{ notices, refresh }}>{children}</NoticesContext.Provider>;
}

function useNotices() {
  return useContext(NoticesContext);
}

function timeAgo(date: Date) {
  const s = Math.max(0, (Date.now() - new Date(date).getTime()) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)} min ago`;
  if (s < 86400) return `${Math.floor(s / 3600)} h ago`;
  return new Date(date).toLocaleDateString("en-PH", { month: "short", day: "numeric", timeZone: "Asia/Manila" });
}

function Badge({ count }: { count: number }) {
  if (count <= 0) return null;
  return (
    <span className="absolute -top-1 -right-1 min-w-5 h-5 px-1 rounded-full bg-red-600 text-white text-[11px] font-bold grid place-items-center tabular ring-2 ring-blue-700">
      {count > 99 ? "99+" : count}
    </span>
  );
}

// Bell in the top bar with a dropdown of recent notifications.
export function NoticeBell() {
  const { notices, refresh } = useNotices();
  const [open, setOpen] = useState(false);
  const [viewing, setViewing] = useState<Notification | null>(null);
  const box = useRef<HTMLDivElement>(null);
  const pathname = usePathname();
  const [lastPath, setLastPath] = useState(pathname);
  if (pathname !== lastPath) {
    setLastPath(pathname);
    setOpen(false);
  }

  useEffect(() => {
    if (!viewing) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setViewing(null);
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [viewing]);

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

  const markAll = async () => {
    await markNoticesRead();
    refresh();
  };

  return (
    <div ref={box} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="relative w-11 h-11 grid place-items-center rounded-full hover:bg-white/10 transition-colors"
        aria-label={notices.unread > 0 ? `Notifications, ${notices.unread} unread` : "Notifications"}
        aria-expanded={open}
      >
        <Bell size={19} />
        <Badge count={notices.unread} />
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-[min(22rem,calc(100vw-1.5rem))] bg-sheet text-ink rounded-2xl shadow-2xl border border-rule overflow-hidden z-50">
          <div className="flex items-center justify-between px-4 py-3 border-b border-rule">
            <p className="font-semibold text-[15px]">Notifications</p>
            {notices.unread > 0 && (
              <button onClick={markAll} className="text-[13px] text-blue-700 hover:underline underline-offset-4 px-1 min-h-9">
                Mark all as read
              </button>
            )}
          </div>
          {notices.items.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-slate-500">No notifications yet.</p>
          ) : (
            <ul className="max-h-[60vh] overflow-y-auto divide-y divide-rule">
              {notices.items.map((n) => {
                const content = (
                  <>
                    <span className="flex items-start gap-2">
                      {!n.readAt && <span aria-label="Unread" className="mt-1.5 w-2 h-2 rounded-full bg-blue-600 shrink-0" />}
                      <span className="min-w-0">
                        <span className={`block text-[14px] ${n.readAt ? "text-slate-700" : "font-semibold text-ink"}`}>{n.title}</span>
                        {n.body && <span className="block text-[13px] text-slate-600 mt-0.5 break-words line-clamp-2">{n.body}</span>}
                        <span className="block text-[12px] text-slate-500 mt-1">{timeAgo(n.createdAt)}</span>
                      </span>
                    </span>
                  </>
                );
                // Opens the notification in a pop-up, where the whole message is easy to read.
                const onOpen = () => {
                  if (!n.readAt) markNoticesRead([n.id]).then(refresh);
                  setViewing(n);
                  setOpen(false);
                };
                return (
                  <li key={n.id}>
                    <button onClick={onOpen} className="w-full text-left px-4 py-3 hover:bg-blue-50 transition-colors">
                      {content}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}

      {viewing && (
        <div className="fixed inset-0 z-[60] bg-black/40 grid place-items-center p-4" onClick={() => setViewing(null)}>
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="notice-title"
            className="w-full max-w-md bg-sheet text-ink rounded-2xl p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start gap-3">
              <span className="w-10 h-10 rounded-full bg-blue-50 text-blue-700 grid place-items-center shrink-0" aria-hidden>
                <Bell size={18} />
              </span>
              <div className="min-w-0 flex-1">
                <h2 id="notice-title" className="text-[17px] font-semibold">
                  {viewing.title}
                </h2>
                <p className="text-[12px] text-slate-500 mt-0.5">{timeAgo(viewing.createdAt)}</p>
              </div>
              <button type="button" onClick={() => setViewing(null)} aria-label="Close" className="w-10 h-10 -m-2 grid place-items-center rounded-full hover:bg-slate-100">
                <X size={18} />
              </button>
            </div>
            {viewing.body && <p className="mt-4 text-[14px] text-slate-700 whitespace-pre-line break-words">{viewing.body}</p>}
            <div className="mt-6 flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
              <button type="button" autoFocus onClick={() => setViewing(null)} className="min-h-11 px-5 rounded-full border border-slate-300 text-[14px] hover:bg-slate-50">
                Close
              </button>
              {viewing.href && (
                <Link
                  href={viewing.href}
                  onClick={() => setViewing(null)}
                  className="min-h-11 px-5 rounded-full bg-blue-700 hover:bg-blue-800 text-white text-[14px] font-medium inline-flex items-center justify-center"
                >
                  Open
                </Link>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Floating button (bottom right, every page): messages with the guidance
// office, with an unread badge; students can also open E-Gabay from here.
export function FloatingDock({ messagesPath, withChatbot }: { messagesPath: string; withChatbot: boolean }) {
  const { notices } = useNotices();
  const [open, setOpen] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const pathname = usePathname();

  // Not needed on the pages it would open.
  const onMessagesPage = pathname === messagesPath;
  const onChatPage = pathname === "/ai_chat" || pathname === "/faculty_chat";
  if (onMessagesPage || onChatPage) return null;

  return (
    <div className="fixed right-4 bottom-4 sm:right-6 sm:bottom-6 z-40 flex flex-col items-end gap-3 print:hidden">
      {chatOpen && withChatbot && (
        <section
          aria-label="Chat with E-Gabay"
          className="w-[min(24rem,calc(100vw-2rem))] h-[min(34rem,calc(100dvh-8rem))] bg-sheet rounded-2xl shadow-2xl border border-rule flex flex-col overflow-hidden"
        >
          <header className="flex items-center justify-between px-4 py-3 bg-blue-700 text-white">
            <p className="font-semibold inline-flex items-center gap-2">
              <Sparkles size={16} /> E-Gabay Chatbot
            </p>
            <button onClick={() => setChatOpen(false)} aria-label="Close chat" className="w-9 h-9 grid place-items-center rounded-full hover:bg-white/10">
              <X size={17} />
            </button>
          </header>
          <div className="flex-1 min-h-0">
            <AiChatThread compact />
          </div>
        </section>
      )}

      {open && !chatOpen && (
        <div className="bg-sheet rounded-2xl shadow-2xl border border-rule p-2 w-60">
          <Link href={messagesPath} className="flex items-center gap-3 px-3 min-h-11 rounded-xl hover:bg-blue-50 text-[14px] text-ink">
            <MessageSquare size={17} className="text-blue-700" />
            <span className="flex-1">Message guidance office</span>
            {notices.unreadMessages > 0 && (
              <span className="text-[12px] font-bold text-white bg-red-600 rounded-full px-1.5 min-w-5 text-center tabular">
                {notices.unreadMessages}
              </span>
            )}
          </Link>
          {withChatbot && (
            <button
              onClick={() => {
                setChatOpen(true);
                setOpen(false);
              }}
              className="w-full flex items-center gap-3 px-3 min-h-11 rounded-xl hover:bg-blue-50 text-[14px] text-ink text-left"
            >
              <Sparkles size={17} className="text-blue-700" />
              Ask E-Gabay (chatbot)
            </button>
          )}
        </div>
      )}

      <button
        onClick={() => {
          if (chatOpen) setChatOpen(false);
          else setOpen((o) => !o);
        }}
        aria-label={chatOpen ? "Close chat" : notices.unreadMessages > 0 ? `Messages, ${notices.unreadMessages} unread` : "Messages"}
        aria-expanded={open || chatOpen}
        className="relative w-14 h-14 rounded-full bg-blue-700 hover:bg-blue-800 text-white shadow-xl grid place-items-center transition-colors ring-4 ring-white"
      >
        {chatOpen || open ? <X size={22} /> : <MessageSquare size={22} />}
        {!open && !chatOpen && <Badge count={notices.unreadMessages} />}
      </button>
    </div>
  );
}
