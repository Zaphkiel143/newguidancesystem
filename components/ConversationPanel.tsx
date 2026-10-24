"use client";

import React, { useEffect, useRef, useState } from "react";
import { ArrowUp, Loader2 } from "lucide-react";
import type { Message as DbMessage } from "../lib/generated";
import Link from "next/link";
import InlineError from "./InlineError";

interface ConversationPanelProps {
  conversationId: string;
  viewerRole: string;
  viewerName: string;
  title: string;
  subtitle?: string;
  // The other person's profile photo; their initials show without one.
  avatarUrl?: string | null;
  // Where clicking their name or photo leads (a student's Individual Inventory record).
  profileHref?: string | null;
  onMessageSent?: () => void;
  getMessages: (conversationId: string) => Promise<DbMessage[]>;
  markConversationRead: (conversationId: string) => Promise<{ success: boolean }>;
  // The server takes the sender from the session; viewerName/viewerRole are only for display.
  sendMessage: (formData: { conversationId: string; content: string }) => Promise<{ success: boolean; error?: string }>;
  // Extra buttons for the header (e.g. Archive).
  headerActions?: React.ReactNode;
}

const POLL_INTERVAL_MS = 4000;

export default function ConversationPanel({
  conversationId,
  viewerRole,
  viewerName,
  title,
  subtitle,
  avatarUrl,
  profileHref,
  onMessageSent,
  getMessages,
  markConversationRead,
  sendMessage,
  headerActions,
}: ConversationPanelProps) {
  const [messages, setMessages] = useState<DbMessage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [draft, setDraft] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;

    const refresh = async () => {
      const data = await getMessages(conversationId);
      if (!cancelled) setMessages(data);
    };

    (async () => {
      await Promise.all([refresh(), markConversationRead(conversationId)]);
      if (!cancelled) setIsLoading(false);
    })();

    const interval = setInterval(() => {
      refresh();
      markConversationRead(conversationId);
    }, POLL_INTERVAL_MS);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [conversationId, getMessages, markConversationRead]);

  // Opens at the latest message straight away; new messages after that glide in.
  const hasScrolled = useRef(false);
  useEffect(() => {
    if (messages.length === 0) return;
    bottomRef.current?.scrollIntoView({ behavior: hasScrolled.current ? "smooth" : "auto", block: "end" });
    hasScrolled.current = true;
  }, [messages.length]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    const content = draft.trim();
    if (!content) return;

    setIsSending(true);
    setSendError(null);
    setDraft("");
    const result = await sendMessage({ conversationId, content });
    setIsSending(false);

    if (result.success) {
      const data = await getMessages(conversationId);
      setMessages(data);
      onMessageSent?.();
    } else {
      setSendError(`Message not sent: ${result.error || "unknown error"}. Your text is back in the box — try again.`);
      setDraft(content);
    }
  };


  const initials = title
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");

  return (
    <div className="flex-1 flex flex-col bg-paper h-full min-h-0">
      <div className="px-6 py-4 border-b border-rule shrink-0">
        <div className="flex items-center gap-3">
        {(() => {
          const who = (
            <>
              {avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element -- private, session-checked photo route
                <img src={avatarUrl} alt="" className="w-9 h-9 rounded-full object-cover bg-slate-200 shrink-0" />
              ) : (
                <span className="w-9 h-9 rounded-full bg-blue-100 text-blue-800 grid place-items-center text-xs font-semibold shrink-0">
                  {initials}
                </span>
              )}
              <span className="leading-tight min-w-0">
                <span className={`block font-medium text-ink text-[15px] ${profileHref ? "group-hover:underline underline-offset-2" : ""}`}>{title}</span>
                {subtitle && <span className="block text-[12px] text-slate-500 mt-0.5">{subtitle}</span>}
              </span>
            </>
          );
          return profileHref ? (
            <div className="flex-1 min-w-0">
              <Link href={profileHref} title={`Open ${title}'s profile in Individual Inventory`} className="group inline-flex items-center gap-3 max-w-full rounded-lg -m-1 p-1 hover:bg-slate-100">
                {who}
              </Link>
            </div>
          ) : (
            <div className="flex-1 min-w-0 flex items-center gap-3">{who}</div>
          );
        })()}
        {headerActions}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-6 flex flex-col min-h-0">
        <div className="flex-1 w-full max-w-3xl mx-auto flex flex-col gap-4">
        {/* Pushes a short conversation down to the reply box, like a chat app. */}
        <div aria-hidden className="mt-auto" />
        {isLoading ? (
          <div className="flex-1 flex items-center justify-center text-slate-500">
            <Loader2 className="animate-spin" size={20} />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex-1 flex items-center justify-center text-[14px] text-slate-500">
            No messages yet.
          </div>
        ) : (
          messages.map((m) => {
            const isMine = m.senderRole === viewerRole && m.senderName === viewerName;
            const time = new Date(m.createdAt).toLocaleString("en-PH", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
            return isMine ? (
              <div key={m.id} className="flex flex-col items-end">
                <p className="max-w-[75%] bg-blue-100 text-ink rounded-2xl rounded-br-md px-4 py-2.5 text-[15px] leading-relaxed whitespace-pre-wrap">
                  {m.content}
                </p>
                <span className="text-xs text-slate-500 mt-1">{time}</span>
              </div>
            ) : (
              <div key={m.id} className="max-w-[75%]">
                <p className="text-[12px] text-slate-500 mb-1">
                  <span className="font-medium text-slate-700">{m.senderName}</span> · {time}
                </p>
                <p className="bg-sheet border border-rule rounded-2xl rounded-tl-md px-4 py-2.5 text-[15px] leading-relaxed text-ink whitespace-pre-wrap">
                  {m.content}
                </p>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
        </div>
      </div>

      <div className="border-t border-rule px-4 py-3 shrink-0">
        <InlineError message={sendError} onDismiss={() => setSendError(null)} className="mb-2 max-w-3xl mx-auto" />
        <form onSubmit={handleSend} className="max-w-3xl mx-auto flex items-center gap-2">
          <label htmlFor={`draft-${conversationId}`} className="sr-only">Write a message</label>
          <input
            id={`draft-${conversationId}`}
            type="text"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Write a message"
            className="flex-1 bg-sheet border border-blue-200 rounded-full px-5 py-2.5 text-[15px] placeholder:text-slate-400"
          />
          <button
            type="submit"
            disabled={isSending || !draft.trim()}
            aria-label="Send message"
            className="bg-blue-700 hover:bg-blue-800 disabled:bg-slate-200 disabled:text-slate-400 text-white w-11 h-11 grid place-items-center rounded-full transition-colors shrink-0"
          >
            <ArrowUp size={18} />
          </button>
        </form>
      </div>
    </div>
  );
}
