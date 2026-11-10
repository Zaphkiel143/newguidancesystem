"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowUp, Bot, ChevronLeft, ChevronRight, History, Loader2, RotateCcw, Trash2 } from "lucide-react";
import ConfirmDialog from "./ConfirmDialog";
import { censor } from "../lib/censor";
import {
  endMyAiConversation,
  forwardAiQuestion,
  getMyAiConversation,
  deleteMyAiConversation,
  getMyAiHistory,
  resumeMyAiConversation,
  sendAiMessage,
} from "../app/action/student";
import type { AiMessage } from "../lib/generated";
import type { NlpSuggestion } from "../lib/nlp";
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

type HistoryPage = Awaited<ReturnType<typeof getMyAiHistory>>;
type HistoryItem = HistoryPage["items"][number];

function when(d: Date | null) {
  if (!d) return "";
  return new Date(d).toLocaleString("en-PH", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit", timeZone: "Asia/Manila" });
}

// The E-Gabay conversation (students and faculty), on /ai_chat and /faculty_chat.
// The open chat stays open when the page is left, so coming back continues
// where they left off. "New chat" moves it to History; picking a chat in
// History continues that one. History keeps the 10 most recent chats; older
// ones are archived (10 per page). Chats can be deleted from History.
export default function AiChatThread({ compact = false }: { compact?: boolean }) {
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<AiMessage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [draft, setDraft] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<"chat" | "history">("chat");
  const [history, setHistory] = useState<HistoryPage | null>(null);
  // Recent (10 newest) or Archived (older, paged)
  const [archived, setArchived] = useState(false);
  const [page, setPage] = useState(1);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<HistoryItem | null>(null);
  const [busyDelete, setBusyDelete] = useState(false);
  // "Did you mean...?" choices for the latest reply E-Gabay wasn't sure about
  const [suggestions, setSuggestions] = useState<{ forId: string; items: NlpSuggestion[] } | null>(null);
  // Scroll only the message list, never the whole page.
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputId = compact ? "ai-draft-panel" : "ai-draft";

  const loadOpenChat = useCallback(async () => {
    setIsLoading(true);
    const conversation = await getMyAiConversation();
    setConversationId(conversation?.id ?? null);
    setMessages(conversation?.messages ?? []);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    let cancelled = false;
    getMyAiConversation().then((conversation) => {
      if (cancelled) return;
      setConversationId(conversation?.id ?? null);
      setMessages(conversation?.messages ?? []);
      setIsLoading(false);
    });
    // Leaving the page keeps the chat open, so it continues next time.
    return () => {
      cancelled = true;
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
    setSuggestions(null);
    setIsSending(true);

    const result = await sendAiMessage({ conversationId, content });
    setIsSending(false);

    if (result.success && result.message) {
      setMessages((prev) => [...prev, result.message!]);
      if (result.suggestions?.length) setSuggestions({ forId: result.message.id, items: result.suggestions });
    } else {
      setError(result.error || "Unknown error");
    }
  };

  const newChat = async () => {
    if (conversationId && messages.length > 0) await endMyAiConversation(conversationId);
    setError(null);
    setSuggestions(null);
    setView("chat");
    await loadOpenChat();
  };

  const loadHistory = async (nextArchived: boolean, nextPage: number) => {
    setArchived(nextArchived);
    setPage(nextPage);
    setHistory(null);
    setHistory(await getMyAiHistory({ archived: nextArchived, page: nextPage }));
  };

  const openHistory = async () => {
    setView("history");
    setHistoryError(null);
    await loadHistory(false, 1);
  };

  // Continue a past chat where it left off.
  const continueChat = async (item: HistoryItem) => {
    setHistoryError(null);
    const result = await resumeMyAiConversation(item.id);
    if (!result.success) return setHistoryError(result.error ?? "Couldn't open that chat.");
    setError(null);
    setSuggestions(null);
    setView("chat");
    await loadOpenChat();
  };

  const confirmDelete = async () => {
    if (!deleting) return;
    setBusyDelete(true);
    const result = await deleteMyAiConversation(deleting.id);
    setBusyDelete(false);
    setDeleting(null);
    if (!result.success) return setHistoryError(result.error ?? "Couldn't delete that chat.");
    // An archived page that just emptied falls back one page.
    const lastOnPage = archived && history?.items.length === 1 && page > 1;
    await loadHistory(archived, lastOnPage ? page - 1 : page);
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
          <p className={`max-w-[85%] bg-blue-100 text-ink rounded-2xl rounded-br-md px-3.5 py-2 ${text} leading-relaxed whitespace-pre-wrap [overflow-wrap:anywhere]`}>
            {censor(m.content)}
          </p>
        </div>
      ) : (
        <div key={m.id} className="max-w-[92%]">
          <p className="inline-flex items-center gap-1.5 text-[12px] font-medium text-blue-700 mb-0.5"><Bot size={13} aria-hidden /> E-Gabay Chatbot</p>
          <p className={`${text} leading-relaxed text-ink whitespace-pre-wrap [overflow-wrap:anywhere]`}>{censor(m.content)}</p>
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
          {live && suggestions?.forId === m.id && (
            <div className="mt-2">
              <p className="text-[12px] text-slate-500 mb-1.5">Did you mean:</p>
              <div className="flex flex-wrap gap-2">
                {suggestions.items.map((s) => (
                  <button key={s.intent} type="button" onClick={() => send(s.message)} disabled={isSending}
                    className="inline-flex items-center px-3 min-h-9 rounded-full bg-blue-50 border border-blue-200 text-[13px] text-blue-800 hover:bg-blue-100 disabled:opacity-50">
                    {s.label}
                  </button>
                ))}
              </div>
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
      <div className={`flex items-center gap-1 border-b border-rule bg-sheet shrink-0 ${compact ? "px-2 py-1.5" : "px-3 sm:px-6 lg:px-10 py-2"}`}>
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
          <>
            <button type="button" onClick={() => setView("chat")} className={toolButton}>
              <ArrowLeft size={14} /> Back to chat
            </button>
            <div role="tablist" aria-label="Chat history" className="ml-auto inline-flex rounded-full bg-slate-100 p-0.5">
              {([["Recent", false], ["Archived", true]] as const).map(([label, value]) => (
                <button key={label} type="button" role="tab" aria-selected={archived === value} onClick={() => loadHistory(value, 1)}
                  className={`px-3 min-h-8 rounded-full text-[13px] ${archived === value ? "bg-sheet text-ink shadow-sm" : "text-slate-600 hover:text-ink"}`}>
                  {label}
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      {view === "history" ? (
        <div className="flex-1 overflow-y-auto min-h-0">
          <div className={compact ? "px-4 py-4" : "w-full px-5 sm:px-8 lg:px-12 py-6"}>
            {historyError && <p role="alert" className="mb-3 text-[13px] text-red-700">{historyError}</p>}
            {history === null ? (
              <div className="py-12 flex justify-center text-slate-500"><Loader2 className="animate-spin" size={20} /></div>
            ) : history.items.length === 0 ? (
              <p className="text-sm text-slate-500">
                {archived
                  ? "Nothing archived yet. Once you have more than 10 past chats, the older ones move here."
                  : "No past chats yet. When you start a new chat, the one you were in is saved here."}
              </p>
            ) : (
              <>
                {!archived && <p className="mb-2 text-[12px] text-slate-500">Your 10 most recent chats. Pick one to continue it.</p>}
                <ul className="divide-y divide-rule border-y border-rule">
                  {history.items.map((h) => (
                    <li key={h.id} className="flex items-center gap-2">
                      <button type="button" onClick={() => continueChat(h)} className="flex-1 min-w-0 text-left py-3 hover:bg-blue-50 px-2 rounded-lg">
                        <span className={`block ${text} text-ink truncate`}>{censor(h.title)}</span>
                        <span className="block text-[12px] text-slate-500">
                          {when(h.endedAt)} · {h.messageCount} {h.messageCount === 1 ? "message" : "messages"}
                        </span>
                      </button>
                      <button type="button" onClick={() => setDeleting(h)} aria-label={`Delete chat: ${h.title}`} title="Delete chat"
                        className="shrink-0 w-10 h-10 grid place-items-center rounded-full text-slate-500 hover:text-red-700 hover:bg-red-50">
                        <Trash2 size={16} />
                      </button>
                    </li>
                  ))}
                </ul>
                {archived && history.archivedPages > 1 && (
                  <nav aria-label="Archived chat pages" className="mt-3 flex items-center justify-between gap-2">
                    <button type="button" onClick={() => loadHistory(true, page - 1)} disabled={page <= 1}
                      className="inline-flex items-center gap-1 min-h-10 px-4 rounded-full border border-slate-300 text-[13px] hover:bg-slate-50 disabled:opacity-40">
                      <ChevronLeft size={15} /> Previous
                    </button>
                    <span className="text-[13px] text-slate-600 tabular">Page {page} of {history.archivedPages}</span>
                    <button type="button" onClick={() => loadHistory(true, page + 1)} disabled={page >= history.archivedPages}
                      className="inline-flex items-center gap-1 min-h-10 px-4 rounded-full border border-slate-300 text-[13px] hover:bg-slate-50 disabled:opacity-40">
                      Next <ChevronRight size={15} />
                    </button>
                  </nav>
                )}
                {!archived && history.archivedTotal > 0 && (
                  <button type="button" onClick={() => loadHistory(true, 1)} className="mt-3 text-[13px] text-blue-700 hover:underline">
                    See {history.archivedTotal} archived {history.archivedTotal === 1 ? "chat" : "chats"}
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      ) : (
        <>
          <div ref={scrollRef} className="flex-1 overflow-y-auto min-h-0">
            <div className={compact ? "px-4 py-4 space-y-4" : "w-full px-5 sm:px-8 lg:px-12 py-8 space-y-6"}>
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

              {isSending && <ThinkingIndicator />}

              {error && (
                <p role="alert" className="text-[13px] text-red-700 border-l-2 border-red-500 pl-3">
                  E-Gabay couldn&apos;t reply right now. Try sending again in a moment.
                </p>
              )}
            </div>
          </div>

          <div className={`border-t border-rule bg-paper shrink-0 ${compact ? "px-3 py-3" : "px-5 sm:px-8 lg:px-12 py-4"}`}>
            {/* Suggested questions stay available after the chat has started. */}
            {messages.length > 0 && (
              <div className={compact ? "mb-2" : "w-full mb-3"}>
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
              className={`flex items-center gap-2 ${compact ? "" : "w-full"}`}
            >
              <label htmlFor={inputId} className="sr-only">Message the E-Gabay Chatbot</label>
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
              <p className={`mt-1.5 text-[12px] text-right ${compact ? "" : "w-full"} ${draft.length >= MAX_MESSAGE_LENGTH ? "text-red-700" : "text-slate-500"}`} aria-live="polite">
                {draft.length}/{MAX_MESSAGE_LENGTH} characters{draft.length >= MAX_MESSAGE_LENGTH ? " (limit reached)" : ""}
              </p>
            )}
          </div>
        </>
      )}
      <ConfirmDialog
        open={deleting !== null}
        title="Delete this chat?"
        message={deleting ? `"${deleting.title}" will be removed from your history.` : undefined}
        confirmLabel="Delete"
        cancelLabel="Keep it"
        danger
        busy={busyDelete}
        onCancel={() => setDeleting(null)}
        onConfirm={confirmDelete}
      />
    </div>
  );
}

// How long before the waiting message explains a slow first reply.
const SLOW_REPLY_MS = 5000;

// Shown while a reply is on its way. The chatbot service sleeps when nobody
// has used it for a while (free hosting), so the first reply can take up to a
// minute: after a few seconds the message says so, so the student keeps waiting.
function ThinkingIndicator() {
  const [slow, setSlow] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setSlow(true), SLOW_REPLY_MS);
    return () => clearTimeout(t);
  }, []);
  return (
    <div className="max-w-[85%] rounded-2xl rounded-bl-md bg-slate-100 px-3.5 py-2.5 text-[13px] text-slate-600" role="status" aria-live="polite">
      <p className="flex items-center gap-2">
        <span className="flex items-center gap-1" aria-hidden>
          <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-pulse" />
          <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-pulse [animation-delay:150ms]" />
          <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-pulse [animation-delay:300ms]" />
        </span>
        E-Gabay is thinking…
      </p>
      {slow && (
        <p className="mt-1 text-slate-500">
          Still thinking. The first reply can take up to a minute while E-Gabay wakes up. Please wait, your message is saved.
        </p>
      )}
    </div>
  );
}
