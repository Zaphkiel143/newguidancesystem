"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Sparkles, Send, Loader2, MessageSquare, ShieldCheck } from "lucide-react";
import { getMyAiConversation, sendAiMessage } from "../../action/student";
import type { AiMessage } from "../../../lib/generated";

const STUDENT_NAME = "Nhel Belarmino";

const STARTERS = [
  "I'm feeling stressed about exams",
  "Paano ako makakapag-book ng appointment?",
  "I don't know what course to take",
  "I just want to talk",
];

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

  const send = async (raw: string) => {
    const content = raw.trim();
    if (!content || !conversationId) return;

    const optimisticUserMessage: AiMessage = {
      id: `pending-${crypto.randomUUID()}`,
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

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    await send(draft);
  };

  return (
    <div className="flex flex-col h-[calc(100dvh-var(--topbar-h))] text-slate-800">
      {/* Chat header */}
      <header className="px-4 sm:px-8 py-4 bg-white border-b border-slate-200/70 flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <span className="relative w-11 h-11 rounded-2xl bg-navy grid place-items-center shadow-md">
            <Sparkles className="text-gold-400" size={20} />
            <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-emerald-400 ring-2 ring-white" />
          </span>
          <div>
            <h1 className="text-lg font-extrabold tracking-tight text-slate-900 leading-tight">E-Gabay</h1>
            <p className="text-xs text-slate-500">Your AI guidance companion · English &amp; Filipino</p>
          </div>
        </div>
        <Link
          href="/my_messages"
          className="text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 px-3 py-2 rounded-lg flex items-center gap-1.5 shrink-0 transition-colors"
        >
          <MessageSquare size={14} />
          Talk to your counselor instead
        </Link>
      </header>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto min-h-0">
        <div className="max-w-3xl mx-auto px-4 sm:px-8 py-6 space-y-4">
          <p className="text-xs text-slate-500 bg-white border border-slate-200/70 rounded-xl px-4 py-3 flex gap-2.5 items-start">
            <ShieldCheck size={16} className="text-emerald-500 shrink-0 mt-px" />
            <span>
              E-Gabay is an AI assistant, not a replacement for your school counselor. For urgent
              concerns, please reach out to your counselor, a trusted teacher, or a parent/guardian.
            </span>
          </p>

          {isLoading ? (
            <div className="py-24 flex items-center justify-center text-slate-400">
              <Loader2 className="animate-spin" size={22} />
            </div>
          ) : messages.length === 0 ? (
            <div className="py-12 text-center animate-rise-in">
              <span className="mx-auto w-16 h-16 rounded-3xl bg-navy grid place-items-center shadow-lg">
                <Sparkles className="text-gold-400" size={28} />
              </span>
              <h2 className="text-xl font-extrabold tracking-tight text-slate-900 mt-5">Hi, I&apos;m E-Gabay 👋</h2>
              <p className="text-sm text-slate-500 mt-1.5 max-w-sm mx-auto">
                Talk to me about anything on your mind — school, stress, or just to check in.
              </p>
              <div className="mt-6 flex flex-wrap justify-center gap-2">
                {STARTERS.map((starter) => (
                  <button
                    key={starter}
                    onClick={() => send(starter)}
                    disabled={!conversationId || isSending}
                    className="text-[13px] font-medium text-slate-700 bg-white border border-slate-200 hover:border-blue-300 hover:text-blue-700 rounded-full px-4 py-2 transition-colors disabled:opacity-50"
                  >
                    {starter}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            messages.map((m) => {
              const isMine = m.role === "user";
              return (
                <div key={m.id} className={`flex items-end gap-2.5 ${isMine ? "justify-end" : "justify-start"}`}>
                  {!isMine && (
                    <span className="w-8 h-8 rounded-xl bg-navy grid place-items-center shrink-0">
                      <Sparkles className="text-gold-400" size={14} />
                    </span>
                  )}
                  <div
                    className={`max-w-[78%] sm:max-w-[70%] rounded-2xl px-4 py-2.5 text-[14px] ${
                      isMine
                        ? "bg-blue-600 text-white rounded-br-md shadow-[0_6px_16px_-8px_rgb(35_72_216/0.7)]"
                        : "bg-white text-slate-800 rounded-bl-md border border-slate-200/70 shadow-sm"
                    }`}
                  >
                    <p className="leading-relaxed whitespace-pre-wrap">{m.content}</p>
                  </div>
                </div>
              );
            })
          )}
          {isSending && (
            <div className="flex items-end gap-2.5">
              <span className="w-8 h-8 rounded-xl bg-navy grid place-items-center shrink-0">
                <Sparkles className="text-gold-400" size={14} />
              </span>
              <div className="bg-white border border-slate-200/70 rounded-2xl rounded-bl-md px-4 py-3 flex items-center gap-1" aria-label="E-Gabay is typing">
                <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce [animation-delay:-0.3s]" />
                <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce [animation-delay:-0.15s]" />
                <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce" />
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>
      </div>

      {/* Composer */}
      <div className="px-4 sm:px-8 pb-4 sm:pb-6 pt-2 shrink-0">
        <form
          onSubmit={handleSend}
          className="max-w-3xl mx-auto flex items-center gap-2 bg-white border border-slate-200 rounded-2xl p-1.5 pl-4 shadow-md focus-within:border-blue-400 focus-within:ring-4 focus-within:ring-blue-500/10 transition"
        >
          <input
            type="text"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Type a message…"
            disabled={isSending || !conversationId}
            className="flex-1 bg-transparent text-sm py-2 outline-none! shadow-none! border-0 disabled:opacity-60"
          />
          <button
            type="submit"
            disabled={isSending || !draft.trim() || !conversationId}
            aria-label="Send message"
            className="bg-blue-600 hover:bg-blue-700 disabled:bg-slate-200 disabled:text-slate-400 text-white w-10 h-10 grid place-items-center rounded-xl transition-colors shrink-0"
          >
            {isSending ? <Loader2 size={17} className="animate-spin" /> : <Send size={17} />}
          </button>
        </form>
      </div>
    </div>
  );
}
