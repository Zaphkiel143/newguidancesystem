"use client";

import React, { useEffect, useRef, useState } from "react";
import { Send, Loader2 } from "lucide-react";
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
    <div className="flex-1 flex flex-col bg-slate-50/60 h-full min-h-0">
      <div className="px-6 py-3.5 bg-white border-b border-slate-200/70 shrink-0 flex items-center gap-3">
        <span className="w-10 h-10 rounded-full bg-blue-100 text-blue-700 grid place-items-center text-xs font-bold">
          {initials}
        </span>
        <div>
          <h3 className="font-bold text-slate-900 text-sm">{title}</h3>
          {subtitle && <p className="text-xs text-slate-500">{subtitle}</p>}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-5 space-y-3 min-h-0">
        {isLoading ? (
          <div className="h-full flex items-center justify-center text-slate-400">
            <Loader2 className="animate-spin" size={22} />
          </div>
        ) : messages.length === 0 ? (
          <div className="h-full flex items-center justify-center text-sm text-slate-400">
            No messages yet — say hello.
          </div>
        ) : (
          messages.map((m) => {
            const isMine = m.senderRole === viewerRole && m.senderName === viewerName;
            return (
              <div key={m.id} className={`flex ${isMine ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[75%] rounded-2xl px-4 py-2.5 text-[14px] ${
                    isMine
                      ? "bg-blue-600 text-white rounded-br-md shadow-[0_6px_16px_-8px_rgb(35_72_216/0.7)]"
                      : "bg-white text-slate-800 rounded-bl-md border border-slate-200/70 shadow-sm"
                  }`}
                >
                  {!isMine && <p className="text-[11px] font-bold text-blue-700 mb-0.5">{m.senderName}</p>}
                  <p className="leading-relaxed whitespace-pre-wrap">{m.content}</p>
                  <p className={`text-[10px] mt-1 ${isMine ? "text-blue-100" : "text-slate-400"}`}>
                    {new Date(m.createdAt).toLocaleString()}
                  </p>
                </div>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      <div className="p-4 shrink-0">
        <form
          onSubmit={handleSend}
          className="flex items-center gap-2 bg-white border border-slate-200 rounded-2xl p-1.5 pl-4 shadow-sm focus-within:border-blue-400 focus-within:ring-4 focus-within:ring-blue-500/10 transition"
        >
          <input
            type="text"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Type a message…"
            className="flex-1 bg-transparent text-sm py-2 outline-none! shadow-none! border-0"
          />
          <button
            type="submit"
            disabled={isSending || !draft.trim()}
            aria-label="Send message"
            className="bg-blue-600 hover:bg-blue-700 disabled:bg-slate-200 disabled:text-slate-400 text-white w-10 h-10 grid place-items-center rounded-xl transition-colors shrink-0"
          >
            <Send size={17} />
          </button>
        </form>
      </div>
    </div>
  );
}
