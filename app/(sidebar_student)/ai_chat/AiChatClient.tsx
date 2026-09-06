"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Sparkles, Send, Loader2, MessageSquare } from "lucide-react";
import { getMyAiConversation, sendAiMessage } from "../../action/student";
import type { AiMessage } from "../../../lib/generated";

const STUDENT_NAME = "Nhel Belarmino";

export default function AiChatClient() {
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<AiMessage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [draft, setDraft] = useState("");
  const [isSending, setIsSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const conversation = await getMyAiConversation(STUDENT_NAME);
      if (cancelled) return;
      setConversationId(conversation?.id ?? null);
      setMessages(conversation?.messages ?? []);
      setIsLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length, isSending]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    const content = draft.trim();
    if (!content || !conversationId) return;

    const optimisticUserMessage: AiMessage = {
      id: `pending-${Date.now()}`,
      conversationId,
      role: "user",
      content,
      createdAt: new Date(),
    };
    setMessages((prev) => [...prev, optimisticUserMessage]);
    setDraft("");
    setIsSending(true);

    const result = await sendAiMessage({ conversationId, content });
    setIsSending(false);

    if (result.success && result.message) {
      setMessages((prev) => [...prev, result.message!]);
    } else {
      alert(`E-Gabay couldn't respond: ${result.error || "Unknown error"}`);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-white font-sans antialiased text-slate-800">
      <header className="px-8 pt-6 pb-4 border-b border-slate-100">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-3xl font-bold text-[#0d2343] flex items-center gap-2">
              <Sparkles className="text-[#ff7d00]" size={26} />
              Chat with E-Gabay
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Your AI guidance companion — here to listen and help
            </p>
          </div>
          <Link
            href="/my_messages"
            className="text-xs font-semibold text-[#1d63ff] hover:underline flex items-center gap-1.5 shrink-0"
          >
            <MessageSquare size={14} />
            Talk to your counselor instead
          </Link>
        </div>
        <p className="text-xs text-slate-400 mt-3 bg-slate-50 border border-slate-100 rounded-lg px-3 py-2">
          E-Gabay is an AI assistant, not a replacement for your school counselor. For urgent
          concerns, please reach out to your counselor, a trusted teacher, or a parent/guardian.
        </p>
      </header>

      <div className="flex-1 overflow-y-auto px-8 py-6 space-y-3 min-h-0">
        {isLoading ? (
          <div className="h-full flex items-center justify-center text-slate-400">
            <Loader2 className="animate-spin" size={22} />
          </div>
        ) : messages.length === 0 ? (
          <div className="h-full flex items-center justify-center text-sm text-slate-400 text-center max-w-sm mx-auto">
            Hi, I&apos;m E-Gabay 👋 Feel free to talk to me about anything on your mind — school,
            stress, or just to check in.
          </div>
        ) : (
          messages.map((m) => {
            const isMine = m.role === "user";
            return (
              <div key={m.id} className={`flex ${isMine ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[70%] rounded-2xl px-4 py-2.5 text-sm ${
                    isMine
                      ? "bg-[#1d63ff] text-white rounded-br-sm"
                      : "bg-slate-100 text-slate-800 rounded-bl-sm"
                  }`}
                >
                  {!isMine && <p className="text-[10px] font-bold opacity-60 mb-0.5">E-Gabay</p>}
                  <p className="leading-relaxed whitespace-pre-wrap">{m.content}</p>
                </div>
              </div>
            );
          })
        )}
        {isSending && (
          <div className="flex justify-start">
            <div className="bg-slate-100 text-slate-400 rounded-2xl rounded-bl-sm px-4 py-2.5 text-sm flex items-center gap-1.5">
              <Loader2 className="animate-spin" size={14} />
              E-Gabay is typing...
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <form onSubmit={handleSend} className="p-4 border-t border-slate-100 flex items-center gap-2 shrink-0">
        <input
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Type a message..."
          disabled={isSending || !conversationId}
          className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-60"
        />
        <button
          type="submit"
          disabled={isSending || !draft.trim() || !conversationId}
          className="bg-[#1d63ff] hover:bg-blue-700 disabled:opacity-50 text-white p-2.5 rounded-xl transition-colors shrink-0"
        >
          <Send size={18} />
        </button>
      </form>
    </div>
  );
}
