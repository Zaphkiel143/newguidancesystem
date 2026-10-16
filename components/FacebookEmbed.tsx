"use client";

import React, { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { ExternalLink } from "lucide-react";

// Facebook's Page Plugin (whole feed) only shows this page's header, so the
// page itself is a link card. Single public posts DO render without logging in
// through the Post Plugin, so posts attached to announcements are embedded,
// with a "View on Facebook" link as a fallback.

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

// Facebook's post widget doesn't resize itself; a photo post at 500px wide is
// about 600px tall, so size the frame to the available width at that ratio.
export function FacebookPost({ postUrl }: { postUrl: string }) {
  const box = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState<number | null>(null);

  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const measure = () => setWidth(Math.max(320, Math.min(500, Math.floor(el.clientWidth))));
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  if (!isFacebookUrl(postUrl)) return null;

  const src = width
    ? "https://www.facebook.com/plugins/post.php?" + new URLSearchParams({ href: postUrl, width: String(width), show_text: "true" }).toString()
    : null;

  return (
    <div className="mt-3 max-w-[500px]">
      <div ref={box} className="w-full">
        {src && (
          <iframe
            key={width}
            title="Post from STI College Sta. Maria on Facebook"
            src={src}
            width={width!}
            height={Math.round(width! * 1.2)}
            className="max-w-full rounded-xl border border-rule bg-sheet"
            style={{ overflow: "hidden" }}
            allow="encrypted-media; clipboard-write; picture-in-picture; web-share"
            loading="lazy"
          />
        )}
      </div>
      <FacebookPostLink postUrl={postUrl} />
    </div>
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
