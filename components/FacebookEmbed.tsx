import React from "react";
import Image from "next/image";
import { ExternalLink } from "lucide-react";

// Links out to the school's Facebook page and posts instead of embedding them.
// Facebook's Page/Post plugins only showed the page header (no posts) for this
// page, so plain links are the version that always works. They also load
// nothing from Facebook, so no Facebook scripts or cookies reach viewers.

function FacebookMark({ size = 18 }: { size?: number }) {
  return (
    <svg aria-hidden viewBox="0 0 24 24" width={size} height={size} className="shrink-0">
      <circle cx="12" cy="12" r="12" fill="#1877F2" />
      <path
        fill="#fff"
        d="M13.4 19.5v-6.1h2.1l.3-2.4h-2.4V9.5c0-.7.2-1.2 1.2-1.2h1.3V6.2c-.2 0-1-.1-1.9-.1-1.9 0-3.2 1.2-3.2 3.3v1.7H8.7v2.4h2.1v6.1z"
      />
    </svg>
  );
}

// Only real facebook.com / fb.watch https links are shown.
export function isFacebookUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && /(^|\.)facebook\.com$|(^|\.)fb\.watch$/.test(url.hostname);
  } catch {
    return false;
  }
}

export function FacebookPageCard({ pageUrl, pageName }: { pageUrl: string; pageName: string }) {
  return (
    <a
      href={pageUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="group block rounded-2xl border border-blue-100 bg-blue-50 p-4 hover:border-blue-200 hover:bg-blue-100/60 transition-colors"
    >
      <span className="flex items-center gap-3.5">
        <span className="relative shrink-0">
          <Image src="/sti-logo.jpg" alt="" width={52} height={52} className="rounded-xl shadow-sm" />
          <span className="absolute -bottom-1 -right-1 rounded-full ring-2 ring-blue-50">
            <FacebookMark size={20} />
          </span>
        </span>
        <span className="min-w-0">
          <span className="block font-semibold text-ink leading-snug">{pageName}</span>
          <span className="block text-[13px] text-slate-600 leading-snug mt-0.5">News, events, and announcements</span>
        </span>
      </span>
      <span className="mt-4 w-full inline-flex items-center justify-center gap-1.5 bg-blue-700 group-hover:bg-blue-800 text-white text-[13px] font-medium px-4 min-h-10 rounded-full transition-colors">
        See latest posts on Facebook <ExternalLink size={13} />
      </span>
    </a>
  );
}

export function FacebookPostLink({ postUrl }: { postUrl: string }) {
  if (!isFacebookUrl(postUrl)) return null;
  return (
    <a
      href={postUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="mt-3 inline-flex items-center gap-2 bg-sheet border border-slate-300 hover:bg-slate-100 text-[13px] font-medium text-ink px-4 min-h-10 rounded-full transition-colors"
    >
      <FacebookMark /> View on Facebook <ExternalLink size={13} className="text-slate-500" />
    </a>
  );
}
