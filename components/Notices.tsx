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

// Loads the signed-in user's notifications and unread message count
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

// Bell in the top bar with a dropdown of recent notifications
export function NoticeBell() {
  const { notices, refresh } = useNotices();
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
                        {n.body && <span className="block text-[13px] text-slate-600 mt-0.5 break-words">{n.body}</span>}
                        <span className="block text-[12px] text-slate-500 mt-1">{timeAgo(n.createdAt)}</span>
                      </span>
                    </span>
                  </>
                );
                const onOpen = () => {
                  if (!n.readAt) markNoticesRead([n.id]).then(refresh);
                };
                return (
                  <li key={n.id}>
                    {n.href ? (
                      <Link href={n.href} onClick={onOpen} className="block px-4 py-3 hover:bg-blue-50 transition-colors">
                        {content}
                      </Link>
                    ) : (
                      <button onClick={onOpen} className="w-full text-left px-4 py-3 hover:bg-blue-50 transition-colors">
                        {content}
                      </button>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

// Floating button (bottom right, every page)
export function FloatingDock({ messagesPath, withChatbot }: { messagesPath: string; withChatbot: boolean }) {
  const { notices } = useNotices();
  const [open, setOpen] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const pathname = usePathname();

  // Not needed on the pages it would open
  const onMessagesPage = pathname === messagesPath;
  const onChatPage = pathname === "/ai_chat";
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
              <Sparkles size={16} /> E-Gabay
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
