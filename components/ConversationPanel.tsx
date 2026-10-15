"use client";

import React, { useEffect, useRef, useState } from "react";
import { ArrowUp, Loader2 } from "lucide-react";
import type { Message as DbMessage } from "../lib/generated";

interface ConversationPanelProps {
  conversationId: string;
  viewerRole: string;
  viewerName: string;
  title: string;
  subtitle?: string;
  onMessageSent?: () => void;
  getMessages: (conversationId: string) => Promise<DbMessage[]>;
  markConversationRead: (conversationId: string) => Promise<{ success: boolean }>;
  sendMessage: (formData: {
    conversationId: string;
    senderName: string;
    content: string;
  }) => Promise<{ success: boolean; error?: string }>;
}

const POLL_INTERVAL_MS = 4000;

export default function ConversationPanel({
  conversationId,
  viewerRole,
  viewerName,
  title,
  subtitle,
  onMessageSent,
  getMessages,
  markConversationRead,
  sendMessage,
}: ConversationPanelProps) {
  const [messages, setMessages] = useState<DbMessage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [draft, setDraft] = useState("");
  const [isSending, setIsSending] = useState(false);
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

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    const content = draft.trim();
    if (!content) return;

    setIsSending(true);
    setDraft("");
    const result = await sendMessage({ conversationId, senderName: viewerName, content });
    setIsSending(false);

    if (result.success) {
      const data = await getMessages(conversationId);
      setMessages(data);
      onMessageSent?.();
    } else {
      alert(`Failed to send message: ${result.error || "Unknown error"}`);
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
      <div className="px-6 py-4 border-b border-rule shrink-0 flex items-center gap-3">
        <span className="w-9 h-9 rounded-md bg-slate-200 text-slate-700 grid place-items-center text-xs font-semibold">
          {initials}
        </span>
        <div className="leading-tight">
          <h3 className="font-medium text-ink text-[15px]">{title}</h3>
          {subtitle && <p className="text-[12px] text-slate-500 mt-0.5">{subtitle}</p>}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-6 space-y-4 min-h-0">
        {isLoading ? (
          <div className="h-full flex items-center justify-center text-slate-500">
            <Loader2 className="animate-spin" size={20} />
          </div>
        ) : messages.length === 0 ? (
          <div className="h-full flex items-center justify-center text-[14px] text-slate-500">
            No messages yet.
          </div>
        ) : (
          messages.map((m) => {
            const isMine = m.senderRole === viewerRole && m.senderName === viewerName;
            const time = new Date(m.createdAt).toLocaleString("en-PH", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
            return isMine ? (
              <div key={m.id} className="flex flex-col items-end">
                <p className="max-w-[75%] bg-blue-700 text-white rounded-lg rounded-br-sm px-4 py-2.5 text-[15px] leading-relaxed whitespace-pre-wrap">
                  {m.content}
                </p>
                <span className="text-xs text-slate-500 mt-1">{time}</span>
              </div>
            ) : (
              <div key={m.id} className="max-w-[75%]">
                <p className="text-[12px] text-slate-500 mb-1">
                  <span className="font-medium text-slate-700">{m.senderName}</span> · {time}
                </p>
                <p className="bg-sheet border border-rule rounded-lg rounded-tl-sm px-4 py-2.5 text-[15px] leading-relaxed text-ink whitespace-pre-wrap">
                  {m.content}
                </p>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      <div className="border-t border-rule px-4 py-3 shrink-0">
        <form onSubmit={handleSend} className="flex items-center gap-2">
          <label htmlFor={`draft-${conversationId}`} className="sr-only">Write a message</label>
          <input
            id={`draft-${conversationId}`}
            type="text"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Write a message"
            className="flex-1 bg-sheet border border-slate-300 rounded-md px-4 py-2.5 text-[15px] placeholder:text-slate-400"
          />
          <button
            type="submit"
            disabled={isSending || !draft.trim()}
            aria-label="Send message"
            className="bg-blue-700 hover:bg-blue-800 disabled:bg-slate-200 disabled:text-slate-400 text-white w-11 h-11 grid place-items-center rounded-md transition-colors shrink-0"
          >
            <ArrowUp size={18} />
          </button>
        </form>
      </div>
    </div>
  );
}
