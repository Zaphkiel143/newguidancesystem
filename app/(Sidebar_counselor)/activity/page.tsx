"use client";

import React, { useEffect, useState } from "react";
import { History, Loader2, Search } from "lucide-react";
import { listActivity, getActivityFilterOptions } from "../../action/counselor";

type ActivityRow = Awaited<ReturnType<typeof listActivity>>["rows"][number];

export default function ActivityPage() {
  const [rows, setRows] = useState<ActivityRow[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [role, setRole] = useState("");
  const [model, setModel] = useState("");
  const [search, setSearch] = useState("");
  const [filterOptions, setFilterOptions] = useState<{ roles: string[]; models: string[] }>({ roles: [], models: [] });

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

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setIsLoading(true);
      const result = await listActivity({ role: role || undefined, model: model || undefined, search: search || undefined });
      if (cancelled) return;
      setRows(result.rows);
      setCursor(result.nextCursor);
      setIsLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [role, model, search]);

  const loadMore = async () => {
    if (!cursor) return;
    setIsLoadingMore(true);
    const result = await listActivity({ role: role || undefined, model: model || undefined, search: search || undefined, cursor });
    setRows((prev) => [...prev, ...result.rows]);
    setCursor(result.nextCursor);
    setIsLoadingMore(false);
  };

  return (
    <div className="px-5 sm:px-8 lg:px-12 pt-8 lg:pt-12 pb-16 max-w-5xl text-slate-800">
      <header>
        <h1 className="page-title flex items-center gap-2">
          <History size={24} className="text-slate-400" />
          Activity Log
        </h1>
        <p className="text-sm text-slate-500 font-medium mt-1">Everything happening across the system, most recent first.</p>
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

      {isLoading ? (
        <div className="flex justify-center py-20 text-slate-400">
          <Loader2 className="animate-spin" size={24} />
        </div>
      ) : rows.length === 0 ? (
        <div className="text-center py-20 text-slate-400 text-sm">No activity found.</div>
      ) : (
        <div className="mt-6 bg-white border border-slate-100 rounded-2xl shadow-sm divide-y divide-slate-100 overflow-hidden">
          {rows.map((row) => (
            <div key={row.id} className="px-5 py-3.5 flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="text-sm text-slate-800">
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

      {cursor && !isLoading && (
        <div className="flex justify-center mt-4">
          <button
            type="button"
            onClick={loadMore}
            disabled={isLoadingMore}
            className="px-5 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 rounded-full transition disabled:opacity-50"
          >
            {isLoadingMore ? "Loading..." : "Load more"}
          </button>
        </div>
      )}
    </div>
  );
}
