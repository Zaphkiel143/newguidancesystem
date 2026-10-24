"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronRight, Eye, FileText, Folder, Loader2, Search, X } from "lucide-react";
import { listDocumentsForReview, reviewDocument } from "../../action/counselor";
import InlineError from "../../../components/InlineError";
import FilePreview from "../../../components/FilePreview";
import { useOptionList } from "../../../components/useOptionList";
import { optionValue } from "../../../lib/optionListDefaults";
import { isShs } from "../../config/studentLevels";

type Doc = Awaited<ReturnType<typeof listDocumentsForReview>>[number];
type Status = "PENDING" | "APPROVED" | "REJECTED";

const TABS: { value: Status; label: string }[] = [
  { value: "PENDING", label: "To review" },
  { value: "APPROVED", label: "Accepted" },
  { value: "REJECTED", label: "Not accepted" },
];

// Folder names for files that can't be placed under a level or a strand/course:
// faculty uploads and students without an inventory record, or a record with
// no strand/course filled in yet.
const UNSORTED = "No inventory record";
const NO_PROGRAM = "No strand or course set";
const NO_SECTION = "No section set";

function size(bytes: number) {
  return bytes >= 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

function levelOf(d: Doc) {
  return d.department ?? UNSORTED;
}

function programOf(d: Doc) {
  return d.program ?? NO_PROGRAM;
}

// College sections read "BSIT 1-101" (course code + year-section, built in
// listDocumentsForReview); senior high shows its "Grade 12 - STEM-A" label.
function sectionOf(d: Doc) {
  return d.section ?? NO_SECTION;
}

// Configured names first (in the counselor's order), then any extra names
// that only appear on older records, then the catch-all folder last.
function folderNames(configured: string[], fromDocs: string[], catchAll: string) {
  const names = [...configured];
  for (const n of fromDocs) if (n !== catchAll && !names.includes(n)) names.push(n);
  if (fromDocs.includes(catchAll)) names.push(catchAll);
  return names;
}

// Every file students and faculty upload is checked here before it counts:
// make sure it's the right document and appropriate, then accept it or send it
// back with a reason. The uploader gets a notification either way. Files are
// filed like folders: level (Senior High School, Tertiary, ...), then strand
// or course, then section, with a search across all of them for quick access.
export default function DocumentReviewPage() {
  const [tab, setTab] = useState<Status>("PENDING");
  const [docs, setDocs] = useState<Doc[] | null>(null);
  const [loadedTab, setLoadedTab] = useState<Status | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [busyId, setBusyId] = useState<string | null>(null);
  const [rowError, setRowError] = useState<{ id: string; message: string } | null>(null);
  const [level, setLevel] = useState<string | null>(null);
  const [program, setProgram] = useState<string | null>(null);
  const [section, setSection] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  // The file shown in the pop-up viewer, if any.
  const [preview, setPreview] = useState<Doc | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const [departments] = useOptionList("departments");
  const [shsStrands] = useOptionList("shsStrands");
  const [tertiaryCourses] = useOptionList("tertiaryCourses");

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

  useEffect(() => {
    if (searchOpen) searchRef.current?.focus();
  }, [searchOpen]);

  const decide = async (d: Doc, approve: boolean) => {
    setBusyId(d.id);
    setRowError(null);
    const result = await reviewDocument(d.id, approve, notes[d.id] ?? "");
    setBusyId(null);
    if (result.success) await load(tab);
    else setRowError({ id: d.id, message: result.error || "Couldn't save." });
  };

  const openFolder = (lvl: string | null, prog: string | null, sec: string | null = null) => {
    setLevel(lvl);
    setProgram(prog);
    setSection(sec);
    setQuery("");
    setSearchOpen(false);
  };

  const closeSearch = () => {
    setQuery("");
    setSearchOpen(false);
  };

  const ready = loadedTab === tab && docs !== null;
  const all = useMemo(() => (ready ? docs : []), [ready, docs]);

  const levelFolders = useMemo(() => {
    const names = folderNames(departments.map(optionValue), [...new Set(all.map(levelOf))], UNSORTED);
    const labels = new Map(departments.map((d) => [optionValue(d), d.label]));
    return names.map((n) => ({ name: n, label: labels.get(n) ?? n, count: all.filter((d) => levelOf(d) === n).length }));
  }, [departments, all]);

  const inLevel = useMemo(() => (level ? all.filter((d) => levelOf(d) === level) : []), [all, level]);

  const programFolders = useMemo(() => {
    if (!level || level === UNSORTED) return [];
    const configured = (isShs(level) ? shsStrands : tertiaryCourses).map(optionValue);
    const names = folderNames(configured, [...new Set(inLevel.map(programOf))], NO_PROGRAM);
    return names.map((n) => ({ name: n, count: inLevel.filter((d) => programOf(d) === n).length }));
  }, [level, inLevel, shsStrands, tertiaryCourses]);

  const inProgram = useMemo(() => (program ? inLevel.filter((d) => programOf(d) === program) : []), [inLevel, program]);

  // Sections aren't a configured list, so only sections that have files show,
  // in natural order ("1st Year - 101" before "2nd Year - 101", "102" before "110").
  const sectionFolders = useMemo(() => {
    const names = [...new Set(inProgram.map(sectionOf))]
      .filter((n) => n !== NO_SECTION)
      .sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" }));
    if (inProgram.some((d) => sectionOf(d) === NO_SECTION)) names.push(NO_SECTION);
    return names.map((n) => ({ name: n, count: inProgram.filter((d) => sectionOf(d) === n).length }));
  }, [inProgram]);

  const q = query.trim().toLowerCase();
  const searching = q.length > 0;
  const results = useMemo(() => {
    if (!searching) return [];
    return all.filter((d) =>
      [d.fileName, d.studentName, d.studentId, d.uploaderName, d.category, d.department, d.program, d.section]
        .some((v) => v?.toLowerCase().includes(q)),
    );
  }, [all, q, searching]);

  // Files sit at the bottom of the tree: inside a section folder, or directly
  // inside the catch-all level folder.
  const files = level === UNSORTED ? inLevel : program && section ? inProgram.filter((d) => sectionOf(d) === section) : null;

  const levelLabel = levelFolders.find((f) => f.name === level)?.label ?? level;
  const programWord = level && isShs(level) ? "strand" : "course";

  const crumbs: { label: string; onClick: () => void }[] = [{ label: "All documents", onClick: () => openFolder(null, null) }];
  if (level) crumbs.push({ label: levelLabel ?? level, onClick: () => openFolder(level, null) });
  if (level && program) crumbs.push({ label: program, onClick: () => openFolder(level, program) });
  if (level && program && section) crumbs.push({ label: section, onClick: () => openFolder(level, program, section) });

  const emptyText = tab === "PENDING" ? "Nothing to review here." : "Nothing here yet.";

  const renderDoc = (d: Doc, showPath: boolean) => (
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
            {showPath && (
              <button onClick={() => (levelOf(d) === UNSORTED ? openFolder(UNSORTED, null) : openFolder(levelOf(d), programOf(d), sectionOf(d)))}
                className="mt-1 inline-flex flex-wrap items-center gap-1 text-[12px] text-blue-700 hover:underline text-left">
                <Folder size={13} className="shrink-0" />
                {levelFolders.find((f) => f.name === levelOf(d))?.label ?? levelOf(d)}
                {levelOf(d) !== UNSORTED && (
                  <><ChevronRight size={12} className="shrink-0" />{programOf(d)}<ChevronRight size={12} className="shrink-0" />{sectionOf(d)}</>
                )}
              </button>
            )}
            {d.reviewNote && <p className="text-[13px] text-slate-700 mt-1">Note: {d.reviewNote}</p>}
          </div>
        </div>
        <button type="button" onClick={() => setPreview(d)}
          className="inline-flex items-center gap-1.5 border border-slate-300 hover:bg-slate-100 text-sm px-4 min-h-10 rounded-full">
          <Eye size={15} /> Open
        </button>
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
  );

  const renderFolder = (key: string, label: string, count: number, onOpen: () => void) => (
    <li key={key}>
      <button onClick={onOpen}
        className={`w-full flex items-center gap-3 bg-sheet border border-rule rounded-xl px-4 min-h-14 text-left hover:bg-blue-50 ${count === 0 ? "text-slate-500" : "text-ink"}`}>
        <Folder size={20} className={count === 0 ? "text-slate-300 shrink-0" : "text-amber-500 shrink-0"} fill="currentColor" fillOpacity={0.2} />
        <span className="flex-1 min-w-0 font-medium break-words">{label}</span>
        <span className="text-[13px] text-slate-500 shrink-0">{count} {count === 1 ? "file" : "files"}</span>
        <ChevronRight size={16} className="text-slate-400 shrink-0" />
      </button>
    </li>
  );

  return (
    <div className="px-5 sm:px-8 lg:px-12 pt-8 lg:pt-12 pb-16 max-w-5xl text-slate-800">
      <header>
        <h1 className="page-title">Document review</h1>
      </header>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
        <div role="tablist" aria-label="Review status" className="flex flex-wrap gap-1">
          {TABS.map((t) => (
            <button key={t.value} role="tab" aria-selected={tab === t.value} onClick={() => setTab(t.value)}
              className={`px-4 min-h-10 rounded-full text-sm ${tab === t.value ? "bg-butter-200 text-ink font-medium" : "text-slate-600 hover:bg-blue-100"}`}>
              {t.label}
            </button>
          ))}
        </div>

        {searchOpen ? (
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={17} />
            <input ref={searchRef} type="text" aria-label="Search documents" placeholder="Search file, student, ID, course..."
              value={query} onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Escape") closeSearch(); }}
              className="w-full bg-sheet border border-slate-300 rounded-full pl-10 pr-10 min-h-10 text-sm" />
            <button aria-label="Close search" onClick={closeSearch}
              className="absolute right-1 top-1/2 -translate-y-1/2 p-2 rounded-full text-slate-500 hover:bg-slate-100">
              <X size={15} />
            </button>
          </div>
        ) : (
          <button onClick={() => setSearchOpen(true)}
            className="inline-flex items-center gap-1.5 border border-slate-300 hover:bg-slate-100 text-sm px-4 min-h-10 rounded-full">
            <Search size={15} /> Search
          </button>
        )}
      </div>

      {!ready ? (
        <div className="py-20 flex justify-center text-slate-500"><Loader2 className="animate-spin" size={20} /></div>
      ) : searching ? (
        <section className="mt-6">
          <p className="text-sm text-slate-600">
            {results.length} {results.length === 1 ? "result" : "results"} for “{query.trim()}” in {TABS.find((t) => t.value === tab)?.label.toLowerCase()}
          </p>
          {results.length === 0 ? (
            <p className="mt-3 border-t border-rule pt-4 text-sm text-slate-500">No documents match. Try a student name, student ID, or file name.</p>
          ) : (
            <ul className="mt-3 space-y-3">{results.map((d) => renderDoc(d, true))}</ul>
          )}
        </section>
      ) : (
        <section className="mt-6">
          <nav aria-label="Folder path" className="flex flex-wrap items-center gap-1 text-sm">
            {crumbs.map((c, i) => (
              <React.Fragment key={i}>
                {i > 0 && <ChevronRight size={14} className="text-slate-400" />}
                {i === crumbs.length - 1 ? (
                  <span className="font-medium text-ink" aria-current="page">{c.label}</span>
                ) : (
                  <button onClick={c.onClick} className="text-blue-700 hover:underline">{c.label}</button>
                )}
              </React.Fragment>
            ))}
          </nav>

          {!level ? (
            <>
              {all.length === 0 && (
                <p className="mt-3 text-sm text-slate-500">
                  {tab === "PENDING" ? "Nothing to review. New uploads show up here and in your notifications." : "Nothing here yet."}
                </p>
              )}
              <ul className="mt-3 space-y-2">
                {levelFolders.map((f) => renderFolder(f.name, f.label, f.count, () => openFolder(f.name, null)))}
              </ul>
            </>
          ) : files ? (
            files.length === 0 ? (
              <p className="mt-3 border-t border-rule pt-4 text-sm text-slate-500">{emptyText}</p>
            ) : (
              <ul className="mt-3 space-y-3">{files.map((d) => renderDoc(d, false))}</ul>
            )
          ) : program ? (
            sectionFolders.length === 0 ? (
              <p className="mt-3 border-t border-rule pt-4 text-sm text-slate-500">{emptyText}</p>
            ) : (
              <ul className="mt-3 space-y-2">
                {sectionFolders.map((f) => renderFolder(f.name, f.name, f.count, () => openFolder(level, program, f.name)))}
              </ul>
            )
          ) : programFolders.length === 0 ? (
            <p className="mt-3 border-t border-rule pt-4 text-sm text-slate-500">No {programWord}s set up for this level yet.</p>
          ) : (
            <ul className="mt-3 space-y-2">
              {programFolders.map((f) => renderFolder(f.name, f.name, f.count, () => openFolder(level, f.name)))}
            </ul>
          )}
        </section>
      )}

      {preview && (
        <FilePreview url={`/api/files/document/${preview.id}`} fileName={preview.fileName} onClose={() => setPreview(null)} />
      )}
    </div>
  );
}
