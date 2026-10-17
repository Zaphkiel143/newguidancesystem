"use client";

import React, { useEffect, useRef, useState } from "react";
import { ArrowUp, Loader2 } from "lucide-react";
import { getMyAiConversation, sendAiMessage } from "../app/action/student";
import type { AiMessage } from "../lib/generated";

// Questions E-Gabay is trained to answer (nlp_service/intents.json), starting
// with the Guidance Office FAQ.
const STARTERS = [
  "What are the GCO consultation hours?",
  "Paano mag-book ng appointment?",
  "Can I walk in for consultation?",
  "Will I get a record if I visit the GCO?",
  "I'm worried about a classmate",
  "I'm stressed about exams",
];

// The E-Gabay conversation (students only). Used full-page on /ai_chat and
// in the floating chat panel, so both show the same conversation.
export default function AiChatThread({ compact = false }: { compact?: boolean }) {
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<AiMessage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [draft, setDraft] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputId = compact ? "ai-draft-panel" : "ai-draft";

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
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [messages.length, isSending, error]);

  const send = async (raw: string) => {
    const content = raw.trim();
    if (!content || !conversationId || isSending) return;

    const optimistic: AiMessage = {
      id: `pending-${crypto.randomUUID()}`,
      conversationId,
      role: "user",
      content,
      createdAt: new Date(),
    };
    setMessages((prev) => [...prev, optimistic]);
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

  const text = compact ? "text-[14px]" : "text-[15px]";

  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="flex-1 overflow-y-auto min-h-0">
        <div className={compact ? "px-4 py-4 space-y-4" : "max-w-2xl mx-auto px-5 sm:px-8 py-8 space-y-6"}>
          <p className="text-[12px] text-slate-500 border-l-2 border-rule pl-3">
            E-Gabay is not a replacement for your school counselor. For anything urgent, reach out to your counselor, a
            teacher you trust, or a parent or guardian.
          </p>

          {isLoading ? (
            <div className="py-12 flex justify-center text-slate-500">
              <Loader2 className="animate-spin" size={20} />
            </div>
          ) : messages.length === 0 ? (
            <div className="pt-2">
              <p className={compact ? "font-semibold text-ink" : "font-serif text-[26px] leading-snug text-ink"}>
                Hi, I&apos;m E-Gabay. What&apos;s on your mind today?
              </p>
              <p className="text-[13px] text-slate-500 mt-1">Start with one of these, or write your own.</p>
              <ul className="mt-3 divide-y divide-rule border-y border-rule">
                {STARTERS.map((starter) => (
                  <li key={starter}>
                    <button
                      onClick={() => send(starter)}
                      disabled={!conversationId || isSending}
                      className={`w-full text-left py-2.5 ${text} text-slate-700 hover:text-blue-700 disabled:opacity-50 transition-colors`}
                    >
                      {starter}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            messages.map((m) =>
              m.role === "user" ? (
                <div key={m.id} className="flex justify-end">
                  <p className={`max-w-[85%] bg-blue-100 text-ink rounded-2xl rounded-br-md px-3.5 py-2 ${text} leading-relaxed whitespace-pre-wrap break-words`}>
                    {m.content}
                  </p>
                </div>
              ) : (
                <div key={m.id} className="max-w-[92%]">
                  <p className="font-serif italic text-[12px] text-slate-500 mb-0.5">E-Gabay</p>
                  <p className={`${text} leading-relaxed text-ink whitespace-pre-wrap break-words`}>{m.content}</p>
                </div>
              )
            )
          )}

          {isSending && (
            <p className="text-slate-500 flex items-center gap-1" aria-label="E-Gabay is typing">
              <span className="w-1 h-1 rounded-full bg-slate-400 animate-pulse" />
              <span className="w-1 h-1 rounded-full bg-slate-400 animate-pulse [animation-delay:150ms]" />
              <span className="w-1 h-1 rounded-full bg-slate-400 animate-pulse [animation-delay:300ms]" />
            </p>
          )}

          {error && (
            <p role="alert" className="text-[13px] text-red-700 border-l-2 border-red-500 pl-3">
              E-Gabay couldn&apos;t reply right now. Try sending again in a moment.
            </p>
          )}
          <div ref={bottomRef} />
        </div>
      </div>

      <div className={`border-t border-rule bg-paper shrink-0 ${compact ? "px-3 py-3" : "px-5 sm:px-8 py-4"}`}>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            send(draft);
          }}
          className={`flex items-center gap-2 ${compact ? "" : "max-w-2xl mx-auto"}`}
        >
          <label htmlFor={inputId} className="sr-only">Message E-Gabay</label>
          <input
            id={inputId}
            type="text"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Write a message"
            maxLength={1000}
            disabled={isSending || !conversationId}
            className={`flex-1 min-w-0 bg-sheet border border-blue-200 rounded-full px-4 py-2.5 ${text} placeholder:text-slate-400 disabled:opacity-60`}
          />
          <button
            type="submit"
            disabled={isSending || !draft.trim() || !conversationId}
            aria-label="Send message"
            className="bg-blue-700 hover:bg-blue-800 disabled:bg-slate-200 disabled:text-slate-400 text-white w-11 h-11 grid place-items-center rounded-full transition-colors shrink-0"
          >
            {isSending ? <Loader2 size={17} className="animate-spin" /> : <ArrowUp size={18} />}
          </button>
        </form>
      </div>
    </div>
  );
}
