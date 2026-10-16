"use client";

import React, { useState } from "react";
import { ExternalLink } from "lucide-react";

// Facebook's official Page and Post plugins, loaded only when the viewer asks.
// Until then nothing is requested from Facebook, so no Facebook scripts or
// cookies reach students who don't choose to see the posts (RA 10173).

function FacebookMark() {
  return (
    <svg aria-hidden viewBox="0 0 24 24" width="18" height="18" className="shrink-0">
      <circle cx="12" cy="12" r="12" fill="#1877F2" />
      <path
        fill="#fff"
        d="M13.4 19.5v-6.1h2.1l.3-2.4h-2.4V9.5c0-.7.2-1.2 1.2-1.2h1.3V6.2c-.2 0-1-.1-1.9-.1-1.9 0-3.2 1.2-3.2 3.3v1.7H8.7v2.4h2.1v6.1z"
      />
    </svg>
  );
}

// Only real facebook.com / fb.watch https links are embedded.
export function isFacebookUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && /(^|\.)facebook\.com$|(^|\.)fb\.watch$/.test(url.hostname);
  } catch {
    return false;
  }
}

export function FacebookPageFeed({ pageUrl, pageName }: { pageUrl: string; pageName: string }) {
  const [show, setShow] = useState(false);

  const src =
    "https://www.facebook.com/plugins/page.php?" +
    new URLSearchParams({
      href: pageUrl,
      tabs: "timeline",
      width: "500",
      height: "720",
      small_header: "true",
      adapt_container_width: "true",
      hide_cover: "false",
      show_facepile: "false",
    }).toString();

  return (
    <div>
      {show ? (
        <iframe
          title={`Latest posts from ${pageName} on Facebook`}
          src={src}
          width="500"
          height="720"
          className="w-full max-w-[500px] rounded-xl border border-rule bg-sheet"
          style={{ border: "none", overflow: "hidden" }}
          allow="encrypted-media; clipboard-write; picture-in-picture; web-share"
          loading="lazy"
        />
      ) : (
        <div className="rounded-xl border border-blue-100 bg-blue-50 p-5 max-w-[500px]">
          <p className="text-sm text-slate-600">
            See the latest posts from <span className="font-medium text-ink">{pageName}</span> here. This loads content from Facebook.
          </p>
          <button
            type="button"
            onClick={() => setShow(true)}
            className="mt-3 inline-flex items-center gap-2 bg-sheet border border-slate-300 hover:bg-slate-100 text-sm font-medium px-4 min-h-11 rounded-full transition-colors"
          >
            <FacebookMark /> Show Facebook posts
          </button>
        </div>
      )}
      <a
        href={pageUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-2 inline-flex items-center gap-1.5 px-2 min-h-9 -ml-2 rounded-full text-[13px] text-blue-700 hover:bg-blue-50"
      >
        Open the page on Facebook <ExternalLink size={13} />
      </a>
    </div>
  );
}

export function FacebookPost({ postUrl }: { postUrl: string }) {
  const [show, setShow] = useState(false);
  if (!isFacebookUrl(postUrl)) return null;

  const src =
    "https://www.facebook.com/plugins/post.php?" +
    new URLSearchParams({ href: postUrl, width: "500", show_text: "true" }).toString();

  return (
    <div className="mt-3">
      {show ? (
        <iframe
          title="Facebook post"
          src={src}
          width="500"
          height="600"
          className="w-full max-w-[500px] rounded-xl border border-rule bg-sheet"
          style={{ border: "none", overflow: "hidden" }}
          allow="encrypted-media; clipboard-write; picture-in-picture; web-share"
          loading="lazy"
        />
      ) : (
        <button
          type="button"
          onClick={() => setShow(true)}
          className="inline-flex items-center gap-2 bg-sheet border border-slate-300 hover:bg-slate-100 text-[13px] font-medium px-3.5 min-h-10 rounded-full transition-colors"
        >
          <FacebookMark /> Show the Facebook post
        </button>
      )}
      <a
        href={postUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="ml-1 inline-flex items-center gap-1.5 px-2 min-h-9 rounded-full text-[13px] text-blue-700 hover:bg-blue-50"
      >
        Open on Facebook <ExternalLink size={13} />
      </a>
    </div>
  );
}
