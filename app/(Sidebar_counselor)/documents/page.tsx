"use client";

import React, { useCallback, useEffect, useState } from "react";
import { Check, ExternalLink, FileText, Loader2, X } from "lucide-react";
import { listDocumentsForReview, reviewDocument } from "../../action/counselor";
import InlineError from "../../../components/InlineError";

type Doc = Awaited<ReturnType<typeof listDocumentsForReview>>[number];
type Status = "PENDING" | "APPROVED" | "REJECTED";

const TABS: { value: Status; label: string }[] = [
  { value: "PENDING", label: "To review" },
  { value: "APPROVED", label: "Accepted" },
  { value: "REJECTED", label: "Not accepted" },
];

function size(bytes: number) {
  return bytes >= 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

// Every file students and faculty upload is checked here before it counts:
// make sure it's the right document and appropriate, then accept it or send it
// back with a reason. The uploader gets a notification either way.
export default function DocumentReviewPage() {
  const [tab, setTab] = useState<Status>("PENDING");
  const [docs, setDocs] = useState<Doc[] | null>(null);
  const [loadedTab, setLoadedTab] = useState<Status | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [busyId, setBusyId] = useState<string | null>(null);
  const [rowError, setRowError] = useState<{ id: string; message: string } | null>(null);

  const load = useCallback(async (t: Status) => {
    const data = await listDocumentsForReview(t);
    setDocs(data);
    setLoadedTab(t);
  }, []);

  useEffect(() => {
    let cancelled = false;
    listDocumentsForReview(tab).then((data) => {
      if (cancelled) return;
      setDocs(data);
      setLoadedTab(tab);
    });
    return () => {
      cancelled = true;
    };
  }, [tab]);

  const decide = async (d: Doc, approve: boolean) => {
    setBusyId(d.id);
    setRowError(null);
    const result = await reviewDocument(d.id, approve, notes[d.id] ?? "");
    setBusyId(null);
    if (result.success) await load(tab);
    else setRowError({ id: d.id, message: result.error || "Couldn't save." });
  };

  return (
    <div className="px-5 sm:px-8 lg:px-12 pt-8 lg:pt-12 pb-16 max-w-5xl text-slate-800">
      <header>
        <h1 className="page-title">Document review</h1>
        <p className="text-sm text-slate-500 mt-1 max-w-[70ch]">
          Open each upload and check that it&apos;s the right document and appropriate. Accept it, or send it back with a reason; the
          uploader is notified. Only PDF, Word (.docx) and photo files can be uploaded at all.
        </p>
      </header>

      <div role="tablist" aria-label="Review status" className="mt-6 flex flex-wrap gap-1">
        {TABS.map((t) => (
          <button key={t.value} role="tab" aria-selected={tab === t.value} onClick={() => setTab(t.value)}
            className={`px-4 min-h-10 rounded-full text-sm ${tab === t.value ? "bg-butter-200 text-ink font-medium" : "text-slate-600 hover:bg-blue-100"}`}>
            {t.label}
          </button>
        ))}
      </div>

      {loadedTab !== tab || !docs ? (
        <div className="py-20 flex justify-center text-slate-500"><Loader2 className="animate-spin" size={20} /></div>
      ) : docs.length === 0 ? (
        <p className="mt-6 border-t border-rule pt-4 text-sm text-slate-500">
          {tab === "PENDING" ? "Nothing to review. New uploads show up here and in your notifications." : "Nothing here yet."}
        </p>
      ) : (
        <ul className="mt-6 space-y-3">
          {docs.map((d) => (
            <li key={d.id} className="bg-sheet border border-rule rounded-xl p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex items-start gap-3 min-w-0">
                  <FileText size={20} className="text-slate-400 mt-0.5 shrink-0" />
                  <div className="min-w-0">
                    <p className="font-medium text-ink break-all">{d.fileName}</p>
                    <p className="text-[13px] text-slate-600">
                      {d.category ?? "Faculty upload"} · from {d.uploaderName} ({d.uploaderRole.toLowerCase()})
                      {d.studentName && d.studentName !== d.uploaderName && <> about {d.studentName}</>}
                    </p>
                    <p className="text-[12px] text-slate-500">
                      {size(d.fileSize)} ·{" "}
                      {new Date(d.createdAt).toLocaleString("en-PH", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit", timeZone: "Asia/Manila" })}
                    </p>
                    {d.reviewNote && <p className="text-[13px] text-slate-700 mt-1">Note: {d.reviewNote}</p>}
                  </div>
                </div>
                <a href={`/api/files/document/${d.id}`} target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 border border-slate-300 hover:bg-slate-100 text-sm px-4 min-h-10 rounded-full">
                  <ExternalLink size={15} /> Open
                </a>
              </div>

              {tab === "PENDING" && (
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <label htmlFor={`note-${d.id}`} className="sr-only">Note to the uploader</label>
                  <input id={`note-${d.id}`} placeholder="Note to the uploader (needed if not accepted)" maxLength={300}
                    value={notes[d.id] ?? ""} onChange={(e) => setNotes({ ...notes, [d.id]: e.target.value })}
                    className="flex-1 min-w-52 bg-sheet border border-slate-300 rounded-md px-3 py-2 text-sm" />
                  <button disabled={busyId === d.id} onClick={() => decide(d, true)}
                    className="inline-flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium px-4 min-h-10 rounded-full disabled:opacity-60">
                    <Check size={15} /> Accept
                  </button>
                  <button disabled={busyId === d.id} onClick={() => decide(d, false)}
                    className="inline-flex items-center gap-1.5 bg-red-50 hover:bg-red-100 text-red-700 text-sm font-medium px-4 min-h-10 rounded-full disabled:opacity-60">
                    <X size={15} /> Not accepted
                  </button>
                </div>
              )}
              <InlineError message={rowError?.id === d.id ? rowError.message : null} onDismiss={() => setRowError(null)} className="mt-2" />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
