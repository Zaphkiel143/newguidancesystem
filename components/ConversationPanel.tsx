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

  return (
    <div className="flex-1 flex flex-col bg-white h-full min-h-0">
      <div className="px-6 py-4 border-b border-slate-100 shrink-0">
        <h3 className="font-bold text-slate-900 text-sm">{title}</h3>
        {subtitle && <p className="text-xs text-slate-400">{subtitle}</p>}
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3 min-h-0">
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
                  className={`max-w-[70%] rounded-2xl px-4 py-2.5 text-sm ${
                    isMine ? "bg-[#1d63ff] text-white rounded-br-sm" : "bg-slate-100 text-slate-800 rounded-bl-sm"
                  }`}
                >
                  {!isMine && <p className="text-[10px] font-bold opacity-60 mb-0.5">{m.senderName}</p>}
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

      <form onSubmit={handleSend} className="p-4 border-t border-slate-100 flex items-center gap-2 shrink-0">
        <input
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Type a message..."
          className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button
          type="submit"
          disabled={isSending || !draft.trim()}
          className="bg-[#1d63ff] hover:bg-blue-700 disabled:opacity-50 text-white p-2.5 rounded-xl transition-colors shrink-0"
        >
          <Send size={18} />
        </button>
      </form>
    </div>
  );
}
