"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowUp, History, Loader2, RotateCcw } from "lucide-react";
import {
  endMyAiConversation,
  forwardAiQuestion,
  getMyAiConversation,
  getMyAiHistory,
  getMyAiHistoryChat,
  sendAiMessage,
} from "../app/action/student";
import type { AiMessage } from "../lib/generated";
import { CRISIS_HOTLINES } from "../app/config/hotlines";

// Matches the server-side limit in sendAiMessage (app/action/student.tsx).
const MAX_MESSAGE_LENGTH = 1000;

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

type HistoryItem = Awaited<ReturnType<typeof getMyAiHistory>>[number];

function when(d: Date | null) {
  if (!d) return "";
  return new Date(d).toLocaleString("en-PH", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit", timeZone: "Asia/Manila" });
}

// The E-Gabay conversation (students only). Used full-page on /ai_chat and in
// the floating chat panel. Each chat is saved: "New chat" (or closing the
// panel / leaving the page) ends it and moves it to History.
export default function AiChatThread({ compact = false }: { compact?: boolean }) {
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<AiMessage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [draft, setDraft] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<"chat" | "history">("chat");
  const [history, setHistory] = useState<HistoryItem[] | null>(null);
  const [viewing, setViewing] = useState<{ title: string; messages: AiMessage[] } | null>(null);
  // Scroll only the message list, never the whole page.
  const scrollRef = useRef<HTMLDivElement>(null);
  const openId = useRef<string | null>(null);
  const inputId = compact ? "ai-draft-panel" : "ai-draft";

  const loadOpenChat = useCallback(async () => {
    setIsLoading(true);
    const conversation = await getMyAiConversation();
    openId.current = conversation?.id ?? null;
    setConversationId(conversation?.id ?? null);
    setMessages(conversation?.messages ?? []);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    let cancelled = false;
    getMyAiConversation().then((conversation) => {
      if (cancelled) return;
      openId.current = conversation?.id ?? null;
      setConversationId(conversation?.id ?? null);
      setMessages(conversation?.messages ?? []);
      setIsLoading(false);
    });
    return () => {
      cancelled = true;
      // Closing the panel or leaving the page saves this chat to history.
      if (openId.current) void endMyAiConversation(openId.current);
    };
  }, []);

  useEffect(() => {
    const box = scrollRef.current;
    if (view === "chat" && box) box.scrollTo({ top: box.scrollHeight, behavior: "smooth" });
  }, [messages.length, isSending, error, view]);

  const send = async (raw: string) => {
    const content = raw.trim();
    if (!content || !conversationId || isSending) return;

    const optimistic: AiMessage = {
      id: `pending-${crypto.randomUUID()}`,
      conversationId,
      role: "user",
      intent: null,
      forwardedAt: null,
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

  const newChat = async () => {
    if (conversationId && messages.length > 0) await endMyAiConversation(conversationId);
    setError(null);
    setView("chat");
    setViewing(null);
    await loadOpenChat();
  };

  const openHistory = async () => {
    setView("history");
    setViewing(null);
    setHistory(null);
    setHistory(await getMyAiHistory());
  };

  const openPastChat = async (item: HistoryItem) => {
    const chat = await getMyAiHistoryChat(item.id);
    setViewing({ title: `${item.title} · ${when(item.endedAt)}`, messages: chat?.messages ?? [] });
  };

  const forward = async (m: AiMessage) => {
    const result = await forwardAiQuestion(m.id);
    if (result.success) {
      setMessages((prev) => prev.map((x) => (x.id === m.id ? { ...x, forwardedAt: new Date() } : x)));
    } else {
      setError(result.error ?? "Couldn't send it.");
    }
  };

  const text = compact ? "text-[14px]" : "text-[15px]";
  const toolButton = "inline-flex items-center gap-1.5 px-3 min-h-9 rounded-full text-[13px] text-slate-700 hover:bg-blue-50 hover:text-blue-700 disabled:opacity-50";

  const bubbles = (list: AiMessage[], live = false) =>
    list.map((m) =>
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
          {m.intent === "crisis" && (
            <div role="alert" className="mt-3 rounded-xl border border-red-200 bg-red-50 p-3 text-[13px] text-red-900 space-y-2">
              <p className="font-semibold">You don&apos;t have to go through this alone. Please reach out now:</p>
              {CRISIS_HOTLINES.map((h) => (
                <p key={h.name}>
                  <span className="font-medium">{h.name}: </span>
                  {h.numbers.map((n, i) => (
                    <span key={n.tel}>
                      {i > 0 && " · "}
                      <a href={`tel:${n.tel}`} className="underline underline-offset-2 font-semibold whitespace-nowrap">{n.label}</a>
                    </span>
                  ))}
                </p>
              ))}
              <p>The Guidance Associate has also been alerted and will reach out to you.</p>
            </div>
          )}
          {m.intent === "fallback" &&
            (m.forwardedAt ? (
              <p className="mt-1.5 text-[12px] text-emerald-700">Sent to the guidance office. They&apos;ll reply in My Messages.</p>
            ) : live ? (
              <button type="button" onClick={() => forward(m)}
                className="mt-2 inline-flex items-center px-3 min-h-9 rounded-full border border-blue-300 text-[13px] text-blue-700 hover:bg-blue-50">
                Send this question to the guidance office
              </button>
            ) : null)}
        </div>
      )
    );

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Chat tools */}
      <div className={`flex items-center gap-1 border-b border-rule bg-sheet shrink-0 ${compact ? "px-2 py-1.5" : "px-3 sm:px-6 py-2"}`}>
        {view === "chat" ? (
          <>
            <button type="button" onClick={newChat} disabled={isLoading || isSending} className={toolButton}
              title="Save this chat to history and start a new one">
              <RotateCcw size={14} /> New chat
            </button>
            <button type="button" onClick={openHistory} className={toolButton}>
              <History size={14} /> History
            </button>
          </>
        ) : (
          <button type="button" onClick={() => (viewing ? setViewing(null) : setView("chat"))} className={toolButton}>
            <ArrowLeft size={14} /> {viewing ? "Back to history" : "Back to chat"}
          </button>
        )}
      </div>

      {view === "history" ? (
        <div className="flex-1 overflow-y-auto min-h-0">
          <div className={compact ? "px-4 py-4" : "max-w-2xl mx-auto px-5 sm:px-8 py-6"}>
            {viewing ? (
              <>
                <p className="text-[13px] text-slate-500 mb-4 break-words">{viewing.title}</p>
                <div className="space-y-4">{bubbles(viewing.messages)}</div>
              </>
            ) : history === null ? (
              <div className="py-12 flex justify-center text-slate-500"><Loader2 className="animate-spin" size={20} /></div>
            ) : history.length === 0 ? (
              <p className="text-sm text-slate-500">No past chats yet. When you start a new chat or close the chat, it&apos;s saved here.</p>
            ) : (
              <ul className="divide-y divide-rule border-y border-rule">
                {history.map((h) => (
                  <li key={h.id}>
                    <button type="button" onClick={() => openPastChat(h)} className="w-full text-left py-3 hover:bg-blue-50 px-2 rounded-lg">
                      <span className={`block ${text} text-ink truncate`}>{h.title}</span>
                      <span className="block text-[12px] text-slate-500">
                        {when(h.endedAt)} · {h.messageCount} {h.messageCount === 1 ? "message" : "messages"}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      ) : (
        <>
          <div ref={scrollRef} className="flex-1 overflow-y-auto min-h-0">
            <div className={compact ? "px-4 py-4 space-y-4" : "max-w-2xl mx-auto px-5 sm:px-8 py-8 space-y-6"}>
              <p className="text-[12px] text-slate-500 border-l-2 border-rule pl-3">
                E-Gabay is not a replacement for your school&apos;s guidance associate. For anything urgent, reach out to your
                guidance associate, a teacher you trust, or a parent or guardian.
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
                bubbles(messages, true)
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
            </div>
          </div>

          <div className={`border-t border-rule bg-paper shrink-0 ${compact ? "px-3 py-3" : "px-5 sm:px-8 py-4"}`}>
            {/* Suggested questions stay available after the chat has started. */}
            {messages.length > 0 && (
              <div className={compact ? "mb-2" : "max-w-2xl mx-auto mb-3"}>
                <p className="text-[12px] text-slate-500 mb-1.5">Suggested questions</p>
                <ul className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1" aria-label="Suggested questions">
                  {STARTERS.map((starter) => (
                    <li key={starter} className="shrink-0">
                      <button
                        type="button"
                        onClick={() => send(starter)}
                        disabled={!conversationId || isSending}
                        className="px-3 min-h-9 rounded-full border border-blue-200 bg-white text-[13px] text-slate-700 hover:border-blue-400 hover:text-blue-700 disabled:opacity-50 whitespace-nowrap transition-colors"
                      >
                        {starter}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
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
                onChange={(e) => setDraft(e.target.value.slice(0, MAX_MESSAGE_LENGTH))}
                placeholder="Write a message"
                maxLength={MAX_MESSAGE_LENGTH}
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
            {draft.length >= MAX_MESSAGE_LENGTH - 200 && (
              <p className={`mt-1.5 text-[12px] text-right ${compact ? "" : "max-w-2xl mx-auto"} ${draft.length >= MAX_MESSAGE_LENGTH ? "text-red-700" : "text-slate-500"}`} aria-live="polite">
                {draft.length}/{MAX_MESSAGE_LENGTH} characters{draft.length >= MAX_MESSAGE_LENGTH ? " (limit reached)" : ""}
              </p>
            )}
          </div>
        </>
      )}
    </div>
  );
}
