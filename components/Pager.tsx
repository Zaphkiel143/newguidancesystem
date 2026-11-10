"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

/**
 * Splits a list into pages. A page past the end (after the list shrinks)
 * falls back to the last page.
 */
export function usePaged<T>(items: T[], pageSize = 10) {
  const [page, setPage] = useState(1);
  const pages = Math.max(1, Math.ceil(items.length / pageSize));
  const current = Math.min(page, pages);
  const start = (current - 1) * pageSize;
  return {
    rows: items.slice(start, start + pageSize),
    page: current,
    pages,
    first: items.length === 0 ? 0 : start + 1,
    last: Math.min(start + pageSize, items.length),
    total: items.length,
    setPage,
  };
}

const pagerButton =
  "inline-flex items-center gap-1 min-h-10 px-4 rounded-full border border-slate-300 text-[13px] font-medium hover:bg-slate-50 disabled:opacity-40 disabled:hover:bg-transparent";

/** "Showing 1–10 of 23" plus Previous / Next, matching the Accounts page. */
export default function Pager({
  label,
  paged,
  className = "",
}: {
  label: string;
  paged: ReturnType<typeof usePaged<unknown>>;
  className?: string;
}) {
  const { page, pages, first, last, total, setPage } = paged;
  if (total === 0) return null;
  return (
    <nav aria-label={label} className={`flex flex-wrap items-center justify-between gap-3 ${className}`}>
      <p className="text-[13px] text-slate-500 tabular" aria-live="polite">
        Showing {first}–{last} of {total}
      </p>
      {pages > 1 && (
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => setPage(page - 1)} disabled={page <= 1} className={pagerButton}>
            <ChevronLeft size={15} /> Previous
          </button>
          <span className="text-[13px] text-slate-600 tabular px-1">
            Page {page} of {pages}
          </span>
          <button type="button" onClick={() => setPage(page + 1)} disabled={page >= pages} className={pagerButton}>
            Next <ChevronRight size={15} />
          </button>
        </div>
      )}
    </nav>
  );
}
