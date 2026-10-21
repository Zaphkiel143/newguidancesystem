"use client";

import Link from "next/link";
import AiChatThread from "../../../components/AiChat";

export default function AiChatClient() {
  return (
    <div className="flex flex-col h-[calc(100dvh-var(--topbar-h))] text-slate-800">
      <header className="px-5 sm:px-8 lg:px-12 pt-8 pb-5 border-b border-rule flex items-end justify-between gap-4 flex-wrap">
        <div>
          <h1 className="page-title">E-Gabay</h1>
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
