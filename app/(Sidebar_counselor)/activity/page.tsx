"use client";

import React, { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, History, Loader2, Search } from "lucide-react";
import { listActivity, getActivityFilterOptions } from "../../action/counselor";

type ActivityRow = Awaited<ReturnType<typeof listActivity>>["rows"][number];

// Height of one log row (two lines) in pixels, used to work out how many fit on screen.
const ROW_PX = 68;
const MIN_ROWS = 5;
// Room needed below the list: the pager, kept clear of the round message
// button in the bottom corner, and the footer.
const BELOW_LIST_PX = 180;

// Rows that fit between the top of the list and the bottom of the window.
function rowsThatFit(listTop: number) {
  return Math.max(MIN_ROWS, Math.floor((window.innerHeight - listTop - BELOW_LIST_PX) / ROW_PX));
}

export default function ActivityPage() {
  const [rows, setRows] = useState<ActivityRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [role, setRole] = useState("");
  const [model, setModel] = useState("");
  const [search, setSearch] = useState("");
  const [filterOptions, setFilterOptions] = useState<{ roles: string[]; models: string[] }>({ roles: [], models: [] });
  const listTop = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const opts = await getActivityFilterOptions();
      if (!cancelled) setFilterOptions(opts);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Page size follows the window: as many rows as fit without scrolling.
  useEffect(() => {
    const measure = () => {
      const top = listTop.current?.getBoundingClientRect().top ?? 260;
      setPageSize(rowsThatFit(top + window.scrollY));
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, []);

  // A new filter or page size starts again from page 1.
  const filterKey = `${role}|${model}|${search}|${pageSize}`;
  const [lastFilterKey, setLastFilterKey] = useState(filterKey);
  if (filterKey !== lastFilterKey) {
    setLastFilterKey(filterKey);
    setPage(1);
  }

  useEffect(() => {
    if (pageSize === null) return;
    let cancelled = false;
    (async () => {
      setIsLoading(true);
      const result = await listActivity({ role: role || undefined, model: model || undefined, search: search || undefined, page, pageSize });
      if (cancelled) return;
      setRows(result.rows);
      setTotal(result.total);
      setIsLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [role, model, search, page, pageSize]);

  const pages = pageSize ? Math.max(1, Math.ceil(total / pageSize)) : 1;
  const first = total === 0 || !pageSize ? 0 : (page - 1) * pageSize + 1;
  const last = pageSize ? Math.min(page * pageSize, total) : 0;
  const pagerButton = "inline-flex items-center gap-1 min-h-10 px-4 rounded-full border border-slate-300 text-[13px] font-medium hover:bg-slate-50 disabled:opacity-40 disabled:hover:bg-transparent";

  return (
    <div className="px-5 sm:px-8 lg:px-12 pt-8 lg:pt-12 pb-6 max-w-5xl text-slate-800">
      <header>
        <h1 className="page-title flex items-center gap-2">
          <History size={24} className="text-slate-400" />
          Activity Log
        </h1>
      </header>

      <div className="flex flex-col sm:flex-row gap-3 mt-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <input
            type="text"
            placeholder="Search by name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2.5 bg-sheet border border-slate-300 rounded-md text-sm"
          />
        </div>
        <select value={role} onChange={(e) => setRole(e.target.value)} className="bg-sheet border border-slate-300 rounded-md px-3 py-2.5 text-sm">
          <option value="">All roles</option>
          {filterOptions.roles.map((r) => (
            <option key={r} value={r}>{r}</option>
          ))}
        </select>
        <select value={model} onChange={(e) => setModel(e.target.value)} className="bg-sheet border border-slate-300 rounded-md px-3 py-2.5 text-sm">
          <option value="">All types</option>
          {filterOptions.models.map((m) => (
            <option key={m} value={m}>{m}</option>
          ))}
        </select>
      </div>

      <div ref={listTop} className="mt-6">
        {isLoading && rows.length === 0 ? (
          <div className="flex justify-center py-20 text-slate-400">
            <Loader2 className="animate-spin" size={24} />
          </div>
        ) : rows.length === 0 ? (
          <div className="text-center py-20 text-slate-400 text-sm">No activity found.</div>
        ) : (
          <div className={`bg-white border border-slate-100 rounded-2xl shadow-sm divide-y divide-slate-100 overflow-hidden transition-opacity ${isLoading ? "opacity-60" : ""}`}>
            {rows.map((row) => (
              <div key={row.id} className="px-5 py-3.5 flex items-start justify-between gap-4" style={{ minHeight: ROW_PX }}>
                <div className="min-w-0">
                  <p className="text-sm text-slate-800 truncate">
                    <span className="font-semibold">{row.actorName}</span>
                    <span className="text-slate-400"> ({row.actorRole}) </span>
                    {row.action}
                  </p>
                  {row.detail && <p className="text-xs text-slate-500 mt-0.5 truncate">{row.detail}</p>}
                </div>
                <span className="text-xs text-slate-400 font-mono shrink-0 whitespace-nowrap">
                  {new Date(row.createdAt).toLocaleString("en-PH", { dateStyle: "medium", timeStyle: "short" })}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {total > 0 && (
        <nav aria-label="Activity log pages" className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <p className="text-[13px] text-slate-500 tabular" aria-live="polite">
            Showing {first}–{last} of {total}
          </p>
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => setPage((p) => p - 1)} disabled={page <= 1 || isLoading} className={pagerButton}>
              <ChevronLeft size={15} /> Previous
            </button>
            <span className="text-[13px] text-slate-600 tabular px-1">
              Page {page} of {pages}
            </span>
            <button type="button" onClick={() => setPage((p) => p + 1)} disabled={page >= pages || isLoading} className={pagerButton}>
              Next <ChevronRight size={15} />
            </button>
          </div>
        </nav>
      )}
    </div>
  );
}
