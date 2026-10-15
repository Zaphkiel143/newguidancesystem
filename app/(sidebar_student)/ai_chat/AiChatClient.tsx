"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowUp, Loader2 } from "lucide-react";
import { getMyAiConversation, sendAiMessage } from "../../action/student";
import type { AiMessage } from "../../../lib/generated";

const STARTERS = [
  "I'm stressed about exams",
  "Paano mag-book ng appointment?",
  "I can't decide on a course",
  "I just want to talk",
];

export default function AiChatClient() {
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<AiMessage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [draft, setDraft] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const conversation = await getMyAiConversation();
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
  }, [messages.length, isSending, error]);

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
    setError(null);
    setIsSending(true);

    const result = await sendAiMessage({ conversationId, content });
    setIsSending(false);

    if (result.success && result.message) {
      setMessages((prev) => [...prev, result.message!]);
    } else {
      setError(result.error || "Unknown error");
    }
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    await send(draft);
  };

  return (
    <div className="flex flex-col h-[calc(100dvh-var(--topbar-h))] text-slate-800">
      <header className="px-5 sm:px-8 lg:px-12 pt-8 pb-5 border-b border-rule flex items-end justify-between gap-4 flex-wrap">
        <div>
          <h1 className="page-title">E-Gabay</h1>
          <p className="text-[14px] text-slate-500 mt-1">An assistant you can talk to in English or Filipino.</p>
        </div>
        <Link
          href="/my_messages"
          className="text-[13px] text-slate-600 hover:text-blue-700 underline underline-offset-4 decoration-slate-300 hover:decoration-blue-600 transition-colors"
        >
          Talk to your counselor instead
        </Link>
      </header>

      <div className="flex-1 overflow-y-auto min-h-0">
        <div className="max-w-2xl mx-auto px-5 sm:px-8 py-8 space-y-6">
          <p className="text-[13px] text-slate-500 border-l-2 border-rule pl-3">
            E-Gabay is not a replacement for your school counselor. For anything urgent, reach out to
            your counselor, a teacher you trust, or a parent or guardian.
          </p>

          {isLoading ? (
            <div className="py-20 flex justify-center text-slate-500">
              <Loader2 className="animate-spin" size={20} />
            </div>
          ) : messages.length === 0 ? (
            <div className="pt-8 animate-rise-in">
              <p className="font-serif text-[26px] leading-snug text-ink">
                Hi, I&apos;m E-Gabay. What&apos;s on your mind today?
              </p>
              <p className="text-[14px] text-slate-500 mt-2">You can start with one of these, or write your own.</p>
              <ul className="mt-5 divide-y divide-rule border-y border-rule">
                {STARTERS.map((starter) => (
                  <li key={starter}>
                    <button
                      onClick={() => send(starter)}
                      disabled={!conversationId || isSending}
                      className="w-full text-left py-3 text-[15px] text-slate-700 hover:text-blue-700 disabled:opacity-50 transition-colors"
                    >
                      {starter}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            messages.map((m) => {
              const isMine = m.role === "user";
              return isMine ? (
                <div key={m.id} className="flex justify-end">
                  <p className="max-w-[80%] bg-blue-700 text-white rounded-lg rounded-br-sm px-4 py-2.5 text-[15px] leading-relaxed whitespace-pre-wrap">
                    {m.content}
                  </p>
                </div>
              ) : (
                <div key={m.id} className="max-w-[90%]">
                  <p className="font-serif italic text-[13px] text-slate-500 mb-1">E-Gabay</p>
                  <p className="text-[15px] leading-relaxed text-ink whitespace-pre-wrap">{m.content}</p>
                </div>
              );
            })
          )}

          {isSending && (
            <div>
              <p className="font-serif italic text-[13px] text-slate-500 mb-1">E-Gabay</p>
              <p className="text-[15px] text-slate-500 flex items-center gap-1" aria-label="E-Gabay is typing">
                <span className="w-1 h-1 rounded-full bg-slate-400 animate-pulse" />
                <span className="w-1 h-1 rounded-full bg-slate-400 animate-pulse [animation-delay:150ms]" />
                <span className="w-1 h-1 rounded-full bg-slate-400 animate-pulse [animation-delay:300ms]" />
              </p>
            </div>
          )}

          {error && (
            <p role="alert" className="text-[13px] text-red-700 border-l-2 border-red-500 pl-3">
              E-Gabay couldn&apos;t reply ({error}). Try sending again in a moment.
            </p>
          )}
          <div ref={bottomRef} />
        </div>
      </div>

      <div className="border-t border-rule bg-paper px-5 sm:px-8 py-4 shrink-0">
        <form onSubmit={handleSend} className="max-w-2xl mx-auto flex items-center gap-2">
          <label htmlFor="ai-draft" className="sr-only">Message E-Gabay</label>
          <input
            id="ai-draft"
            type="text"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Write a message"
            disabled={isSending || !conversationId}
            className="flex-1 bg-sheet border border-slate-300 rounded-md px-4 py-2.5 text-[15px] placeholder:text-slate-400 disabled:opacity-60"
          />
          <button
            type="submit"
            disabled={isSending || !draft.trim() || !conversationId}
            aria-label="Send message"
            className="bg-blue-700 hover:bg-blue-800 disabled:bg-slate-200 disabled:text-slate-400 text-white w-11 h-11 grid place-items-center rounded-md transition-colors shrink-0"
          >
            {isSending ? <Loader2 size={17} className="animate-spin" /> : <ArrowUp size={18} />}
          </button>
        </form>
      </div>
    </div>
  );
}
