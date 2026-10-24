"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Loader2, Search } from "lucide-react";
import { searchStudents } from "../app/action/counselor";

type Result = Awaited<ReturnType<typeof searchStudents>>[number];

// Type a name or student ID to jump straight to that student's record
export default function StudentQuickSearch() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Result[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) return;
    let cancelled = false;
    // Wait for typing to pause before searching
    const t = setTimeout(async () => {
      setLoading(true);
      const data = await searchStudents(q);
      if (cancelled) return;
      setResults(data);
      setLoading(false);
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [query]);

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (box.current && !box.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  const showList = open && query.trim().length >= 2;

  return (
    <div ref={box} className="relative max-w-xl">
      <label htmlFor="student-search" className="sr-only">Find a student by name or student ID</label>
      <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
      <input
        id="student-search"
        type="search"
        autoComplete="off"
        placeholder="Find a student by name or student ID"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={(e) => e.key === "Escape" && setOpen(false)}
        className="w-full pl-11 pr-10 min-h-12 bg-sheet border border-slate-300 rounded-full text-[15px] shadow-sm focus:border-blue-500"
      />
      {loading && <Loader2 size={16} className="absolute right-4 top-1/2 -translate-y-1/2 animate-spin text-slate-400" />}

      {showList && results && (
        <ul className="absolute z-30 mt-2 w-full bg-sheet border border-rule rounded-2xl shadow-xl overflow-hidden divide-y divide-rule">
          {results.length === 0 ? (
            <li className="px-4 py-4 text-sm text-slate-500">
              No student matches “{query.trim()}”. <Link href="/inventory" className="text-blue-700 underline underline-offset-4">Add one in Individual Inventory</Link>
            </li>
          ) : (
            results.map((r) => (
              <li key={r.id}>
                <Link href={`/inventory?student=${encodeURIComponent(r.id)}`} className="block px-4 py-3 hover:bg-blue-50">
                  <span className="block font-medium text-ink">{r.name}</span>
                  <span className="block text-[13px] text-slate-500">
                    <span className="font-mono">{r.studentId}</span> · {r.gradeSection}
                    {r.strandOrProgram && ` · ${r.strandOrProgram}`}
                  </span>
                </Link>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}
