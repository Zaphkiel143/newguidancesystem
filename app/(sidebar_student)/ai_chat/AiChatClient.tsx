"use client";

import Link from "next/link";
import { Bot } from "lucide-react";
import AiChatThread from "../../../components/AiChat";

export default function AiChatClient() {
  return (
    <div className="flex flex-col h-[calc(100dvh-var(--topbar-h))] text-slate-800">
      <header className="px-5 sm:px-8 lg:px-12 pt-8 pb-5 border-b border-rule flex items-end justify-between gap-4 flex-wrap">
        <div>
          <h1 className="page-title inline-flex items-center gap-2.5"><Bot size={28} className="text-blue-700" aria-hidden /> E-Gabay Chatbot</h1>
          <p className="text-[13px] text-slate-500 mt-1">An automated helper that answers common questions. It is not a person.</p>
        </div>
        <Link
          href="/my_messages"
          className="text-[13px] text-slate-600 hover:text-blue-700 underline underline-offset-4 decoration-slate-300 hover:decoration-blue-600 transition-colors"
        >
          Talk to your guidance associate instead
        </Link>
      </header>
      <div className="flex-1 min-h-0">
        <AiChatThread />
      </div>
    </div>
  );
}
