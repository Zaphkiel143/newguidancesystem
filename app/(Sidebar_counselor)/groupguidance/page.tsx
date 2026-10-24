"use client";

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { BookOpen, CalendarPlus, ExternalLink, FileText, Loader2, Plus, Trash2, Upload, X, Users } from 'lucide-react';
import { useOptionList } from '../../../components/useOptionList';
import { optionValue } from '../../../lib/optionListDefaults';
import {
  getGroupGuidancePrograms,
  addGroupGuidanceProgram,
  recordGroupSession,
  listNeedsAssessments,
  createNeedsAssessment,
  setNeedsAssessmentOpen,
  listNeedsUploads,
  saveNeedsUpload,
  deleteNeedsUpload,
  listReadingMaterials,
  saveReadingMaterial,
  deleteReadingMaterial,
} from '../../action/counselor';
import InlineError from '../../../components/InlineError';
import ConfirmDialog from '../../../components/ConfirmDialog';
import { listAttachments } from '../../action/attachments';
import AttachmentStrip, { type AttachmentMeta } from '../../../components/AttachmentStrip';
import { findColumns, parseCsv, readXlsx, suggestedGroupColumn, tallySheet, type Column, type Sheet, type TopicCount } from '../../../lib/needsUpload';
import type { GroupGuidanceProgram } from '../../../lib/generated';

type Assessment = Awaited<ReturnType<typeof listNeedsAssessments>>[number];
type NeedsUpload = Awaited<ReturnType<typeof listNeedsUploads>>[number];
type Material = Awaited<ReturnType<typeof listReadingMaterials>>[number];

// Local (not UTC) YYYY-MM-DD — avoids comparisons rolling back a day near midnight in timezones behind UTC
function toDateString(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function getMinSelectableDate(): string {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  return toDateString(tomorrow);
}

const DEFAULT_TOPICS = [
  "Study habits and time management",
  "Stress and anxiety",
  "Friendships and peer pressure",
  "Family concerns",
  "Bullying",
  "Self-esteem",
  "Choosing a course or career",
  "Online safety",
].join("\n");

const STAKEHOLDERS = ["Students", "Faculty", "Staff", "Parents"];
const STAKEHOLDER_WORDS: Record<string, string> = { Students: "student|mag-aaral", Faculty: "faculty|teacher|instructor|guro", Staff: "staff|employee|personnel", Parents: "parent|guardian|magulang" };
// Orientation activities are often for groups that aren't a grade level.
const EXTRA_AUDIENCES = ["All students", "New students", "Parents", "Faculty and staff"];
const READING_AUDIENCES: [string, string][] = [["All", "Everyone"], ["Students", "Students"], ["Faculty", "Faculty"], ["Parents", "Parents"]];
// How many of the most-needed topics get the "plan" shortcuts.
const TOP_NEEDS = 3;

const inputClass = "w-full bg-paper border border-slate-300 rounded-md px-3 py-2.5 text-sm";

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(",")[1] ?? "");
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

type UploadDraft = {
  title: string;
  stakeholders: string[];
  fileName: string;
  sheet: Sheet | null;
  columns: Column[];
  topicColumns: number[];
  groupColumn: number | null;
};

const emptyUpload = (): UploadDraft => ({ title: "", stakeholders: ["Students"], fileName: "", sheet: null, columns: [], topicColumns: [], groupColumn: null });
const emptyReading = { title: "", topic: "", audience: "Students", link: "", description: "" };

export default function GroupGuidance() {
  const minSelectableDate = getMinSelectableDate();
  const [gradeLevels] = useOptionList("gradeLevels");
  const [programs, setPrograms] = useState<GroupGuidanceProgram[] | null>(null);
  const [assessments, setAssessments] = useState<Assessment[] | null>(null);
  const [uploads, setUploads] = useState<NeedsUpload[]>([]);
  const [materials, setMaterials] = useState<Material[] | null>(null);

  // New program
  const [isProgramOpen, setIsProgramOpen] = useState(false);
  const blankProgram = { title: "", kind: "Group session", gradeLevel: "Grade 11", dateString: minSelectableDate, time: "", announce: false };
  const [program, setProgram] = useState(blankProgram);
  const [programError, setProgramError] = useState<string | null>(null);
  const [isSavingProgram, setIsSavingProgram] = useState(false);

  // Record attendance + outcomes
  const [recording, setRecording] = useState<{ id: string; title: string; attendees: string; outcomes: string; headcount: string } | null>(null);
  const [sheets, setSheets] = useState<AttachmentMeta[]>([]);
  const [recordError, setRecordError] = useState<string | null>(null);
  const [isSavingRecord, setIsSavingRecord] = useState(false);

  // New needs assessment
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [form, setForm] = useState({ title: "", gradeLevel: "All", topics: DEFAULT_TOPICS });
  const [formError, setFormError] = useState<string | null>(null);
  const [isSavingForm, setIsSavingForm] = useState(false);
  const [toggleError, setToggleError] = useState<{ id: string; message: string } | null>(null);

  // Upload results of a needs assessment given outside E-Gabay
  const [upload, setUpload] = useState<UploadDraft | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isReadingFile, setIsReadingFile] = useState(false);
  const [isSavingUpload, setIsSavingUpload] = useState(false);
  const [removingUpload, setRemovingUpload] = useState<NeedsUpload | null>(null);
  const [isRemoving, setIsRemoving] = useState(false);

  // Supplementary reading materials
  const [reading, setReading] = useState<typeof emptyReading | null>(null);
  const [readingFile, setReadingFile] = useState<File | null>(null);
  const [readingError, setReadingError] = useState<string | null>(null);
  const [isSavingReading, setIsSavingReading] = useState(false);
  const [removingMaterial, setRemovingMaterial] = useState<Material | null>(null);

  const loadPrograms = useCallback(async () => {
    const data = await getGroupGuidancePrograms();
    setPrograms(data);
    setSheets(await listAttachments("GROUP_ATTENDANCE", data.map((p) => p.id)));
  }, []);
  const loadSheets = useCallback(async () => {
    setSheets(await listAttachments("GROUP_ATTENDANCE", (programs ?? []).map((p) => p.id)));
  }, [programs]);
  const loadAssessments = useCallback(async () => setAssessments(await listNeedsAssessments()), []);
  const loadUploads = useCallback(async () => setUploads(await listNeedsUploads()), []);
  const loadMaterials = useCallback(async () => setMaterials(await listReadingMaterials()), []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [p, a, u, m] = await Promise.all([getGroupGuidancePrograms(), listNeedsAssessments(), listNeedsUploads(), listReadingMaterials()]);
      if (cancelled) return;
      setPrograms(p);
      setAssessments(a);
      setUploads(u);
      setMaterials(m);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Every topic people have named, for suggesting a reading material's topic.
  const knownTopics = useMemo(() => {
    const all = [...(assessments ?? []).flatMap((a) => a.tally), ...uploads.flatMap((u) => u.tally)].filter((t) => t.count > 0).map((t) => t.topic);
    return Array.from(new Set(all));
  }, [assessments, uploads]);

  // In-app forms and uploaded results together, newest first.
  const results = useMemo(() => {
    if (assessments === null) return null;
    return [
      ...assessments.map((a) => ({ kind: "form" as const, createdAt: new Date(a.createdAt).getTime(), a })),
      ...uploads.map((u) => ({ kind: "upload" as const, createdAt: new Date(u.createdAt).getTime(), u })),
    ].sort((x, y) => y.createdAt - x.createdAt);
  }, [assessments, uploads]);

  const openProgram = (preset: Partial<typeof blankProgram> = {}) => {
    setProgram({ ...blankProgram, ...preset });
    setProgramError(null);
    setIsProgramOpen(true);
  };

  const openReading = (topic = "") => {
    setReading({ ...emptyReading, topic });
    setReadingFile(null);
    setReadingError(null);
  };

  const saveProgram = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingProgram(true);
    setProgramError(null);
    const result = await addGroupGuidanceProgram(program);
    setIsSavingProgram(false);
    if (result.success) {
      setIsProgramOpen(false);
      await loadPrograms();
    } else {
      setProgramError(`Couldn't save this: ${result.error || "unknown error"}.`);
    }
  };

  const saveRecord = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!recording) return;
    setIsSavingRecord(true);
    setRecordError(null);
    const result = await recordGroupSession(recording.id, { attendees: recording.attendees.split("\n"), outcomes: recording.outcomes, headcount: Number(recording.headcount) || 0 });
    setIsSavingRecord(false);
    if (result.success) {
      setRecording(null);
      await loadPrograms();
    } else {
      setRecordError(`Couldn't save the session record: ${result.error || "unknown error"}.`);
    }
  };

  const saveForm = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingForm(true);
    setFormError(null);
    const result = await createNeedsAssessment({ title: form.title, gradeLevel: form.gradeLevel, topics: form.topics.split("\n") });
    setIsSavingForm(false);
    if (result.success) {
      setIsFormOpen(false);
      setForm({ title: "", gradeLevel: "All", topics: DEFAULT_TOPICS });
      await loadAssessments();
    } else {
      setFormError(result.error || "Couldn't create the form.");
    }
  };

  const toggleOpen = async (a: Assessment) => {
    setToggleError(null);
    const result = await setNeedsAssessmentOpen(a.id, !a.isOpen);
    if (result.success) await loadAssessments();
    else setToggleError({ id: a.id, message: "Couldn't change this form. Try again." });
  };

  // Reads the chosen file in the browser and finds its checklist questions.
  const chooseResultsFile = async (file: File | undefined) => {
    if (!file || !upload) return;
    setUploadError(null);
    if (file.size > 10 * 1024 * 1024) {
      setUploadError("That file is over 10 MB. Download the responses only, as .xlsx or .csv.");
      return;
    }
    setIsReadingFile(true);
    try {
      const isCsv = /\.csv$/i.test(file.name) || file.type === "text/csv";
      const sheet = isCsv ? parseCsv(await file.text()) : await readXlsx(await file.arrayBuffer());
      const { columns, respondents } = findColumns(sheet);
      if (respondents === 0 || columns.length === 0) {
        setUploadError("Couldn't find checklist answers in this file. Use the responses sheet: one row per person, one column per question.");
        setUpload({ ...upload, fileName: file.name, sheet: null, columns: [] });
      } else {
        const groupColumn = suggestedGroupColumn(columns);
        // "Who answered" from a "You are a..." question's answers, when there is one.
        const groups = (columns.find((c) => c.index === groupColumn)?.topics ?? []).join(" ");
        const named = STAKEHOLDERS.filter((s) => new RegExp(STAKEHOLDER_WORDS[s], "i").test(groups));
        setUpload({
          ...upload,
          title: upload.title || file.name.replace(/\.[^.]+$/, "").replace(/\s*\(responses\)\s*$/i, ""),
          stakeholders: named.length ? named : upload.stakeholders,
          fileName: file.name,
          sheet,
          columns,
          topicColumns: columns.filter((c) => !c.isGroup).map((c) => c.index),
          groupColumn,
        });
      }
    } catch {
      setUploadError("Couldn't read this file. Use an Excel (.xlsx) or CSV file, like Google Forms' “Download responses”.");
    } finally {
      setIsReadingFile(false);
    }
  };

  const uploadPreview = useMemo(() => {
    if (!upload?.sheet) return null;
    const chosen = upload.columns.filter((c) => upload.topicColumns.includes(c.index));
    return tallySheet(upload.sheet, chosen, upload.groupColumn);
  }, [upload]);

  const saveUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!upload || !uploadPreview) return;
    setIsSavingUpload(true);
    setUploadError(null);
    const result = await saveNeedsUpload({ title: upload.title, stakeholders: upload.stakeholders, fileName: upload.fileName, ...uploadPreview });
    setIsSavingUpload(false);
    if (result.success) {
      setUpload(null);
      await loadUploads();
    } else {
      setUploadError(result.error || "Couldn't save the results.");
    }
  };

  const removeUpload = async () => {
    if (!removingUpload) return;
    setIsRemoving(true);
    const result = await deleteNeedsUpload(removingUpload.id);
    setIsRemoving(false);
    setRemovingUpload(null);
    if (result.success) await loadUploads();
  };

  const saveReading = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reading) return;
    setReadingError(null);
    if (readingFile && readingFile.size > 5 * 1024 * 1024) {
      setReadingError("Files must be 5 MB or smaller.");
      return;
    }
    setIsSavingReading(true);
    const result = await saveReadingMaterial({
      ...reading,
      fileName: readingFile?.name,
      dataBase64: readingFile ? await fileToBase64(readingFile) : undefined,
    });
    setIsSavingReading(false);
    if (result.success) {
      setReading(null);
      await loadMaterials();
    } else {
      setReadingError(result.error || "Couldn't save the material.");
    }
  };

  const removeMaterial = async () => {
    if (!removingMaterial) return;
    setIsRemoving(true);
    const result = await deleteReadingMaterial(removingMaterial.id);
    setIsRemoving(false);
    setRemovingMaterial(null);
    if (result.success) await loadMaterials();
  };

  const today = toDateString(new Date());
  const planActions = {
    onSession: (topic: string) => openProgram({ title: topic }),
    onReading: (topic: string) => openReading(topic),
  };

  return (
    <div className="px-5 sm:px-8 lg:px-12 pt-8 lg:pt-12 pb-16 max-w-6xl text-slate-800">
      <header>
        <h1 className="page-title">Group Guidance</h1>
        <p className="text-sm text-slate-500 mt-1 max-w-[70ch]">
          Topics tailored to the results of the needs assessment: group sessions, orientation activities, and supplementary reading materials.
        </p>
      </header>

      {/* ---- Needs assessment ---- */}
      <section className="mt-10">
        <div className="flex flex-wrap items-baseline justify-between gap-3 mb-3">
          <h2 className="font-serif text-[22px] text-ink">Needs assessment</h2>
          <div className="flex flex-wrap gap-2">
            <button onClick={() => { setUploadError(null); setUpload(emptyUpload()); }}
              className="inline-flex items-center gap-2 border border-slate-300 hover:bg-slate-100 text-sm font-medium px-4 min-h-11 rounded-full transition-colors">
              <Upload size={16} /> Upload results
            </button>
            <button onClick={() => { setFormError(null); setIsFormOpen(true); }}
              className="inline-flex items-center gap-2 bg-blue-700 hover:bg-blue-800 text-white text-sm font-medium px-4 min-h-11 rounded-full transition-colors">
              <Plus size={16} /> New form
            </button>
          </div>
        </div>
        <p className="text-sm text-slate-500 max-w-[70ch]">
          Send a form that students answer in E-Gabay, or upload the results of one given to students, faculty, or parents on paper or Google Forms.
          Answers are tallied automatically, most-needed topics first.
        </p>

        {results === null ? (
          <div className="py-12 flex justify-center text-slate-500"><Loader2 className="animate-spin" size={20} /></div>
        ) : results.length === 0 ? (
          <p className="mt-4 border-t border-rule pt-4 text-sm text-slate-500">No needs assessments yet. Create a form or upload results to see which topics people need.</p>
        ) : (
          <div className="mt-4 space-y-8">
            {results.map((r) =>
              r.kind === "upload" ? (
                <UploadResult key={r.u.id} u={r.u} onRemove={() => setRemovingUpload(r.u)} {...planActions} />
              ) : (
                <article key={r.a.id} className="border-t border-rule pt-5">
                  <div className="flex flex-wrap items-baseline justify-between gap-3">
                    <div>
                      <h3 className="font-medium text-ink">{r.a.title}</h3>
                      <p className="text-[13px] text-slate-500">
                        Answered in E-Gabay · {r.a.gradeLevel === "All" ? "All students" : r.a.gradeLevel} · {r.a.responseCount} {r.a.responseCount === 1 ? "response" : "responses"} ·{" "}
                        <span className={r.a.isOpen ? "text-emerald-700" : ""}>{r.a.isOpen ? "Open" : "Closed"}</span>
                      </p>
                    </div>
                    <button onClick={() => toggleOpen(r.a)} className="px-3 min-h-9 rounded-full text-[13px] text-slate-600 hover:bg-slate-100">
                      {r.a.isOpen ? "Close form" : "Reopen form"}
                    </button>
                  </div>
                  <InlineError message={toggleError?.id === r.a.id ? toggleError.message : null} onDismiss={() => setToggleError(null)} className="mt-2" />

                  <TallyTable title={r.a.title} tally={r.a.tally} {...planActions} />

                  {r.a.comments.length > 0 && (
                    <details className="mt-3 text-sm">
                      <summary className="cursor-pointer text-blue-700 min-h-9 inline-flex items-center">Student comments ({r.a.comments.length})</summary>
                      <ul className="mt-2 divide-y divide-rule border-y border-rule">
                        {r.a.comments.map((c, i) => (
                          <li key={i} className="py-2.5">
                            <p className="text-ink whitespace-pre-wrap">{c.comment}</p>
                            <p className="text-xs text-slate-500 mt-0.5">{c.studentName}</p>
                          </li>
                        ))}
                      </ul>
                    </details>
                  )}
                </article>
              )
            )}
          </div>
        )}
      </section>

      {/* ---- Programs ---- */}
      <section className="mt-14">
        <div className="flex flex-wrap items-baseline justify-between gap-3 mb-3">
          <h2 className="font-serif text-[22px] text-ink">Group sessions &amp; orientation</h2>
          <div className="flex flex-wrap gap-2">
            <button onClick={() => openProgram({ kind: "Orientation", gradeLevel: "New students", announce: true })}
              className="inline-flex items-center gap-2 border border-slate-300 hover:bg-slate-100 text-sm font-medium px-4 min-h-11 rounded-full transition-colors">
              <Plus size={16} /> Orientation activity
            </button>
            <button onClick={() => openProgram()}
              className="inline-flex items-center gap-2 border border-slate-300 hover:bg-slate-100 text-sm font-medium px-4 min-h-11 rounded-full transition-colors">
              <Plus size={16} /> Group session
            </button>
          </div>
        </div>

        {programs === null ? (
          <div className="py-12 flex justify-center text-slate-500"><Loader2 className="animate-spin" size={20} /></div>
        ) : programs.length === 0 ? (
          <p className="border-t border-rule pt-4 text-sm text-slate-500">Nothing scheduled yet.</p>
        ) : (
          <ul className="divide-y divide-rule border-y border-rule">
            {programs.map((p) => {
              const d = new Date(p.date).toISOString().slice(0, 10); // calendar day, stored as UTC midnight
              const isPast = d < today;
              return (
                <li key={p.id} className="py-4 grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-x-6 gap-y-2">
                  <div>
                    <p className="font-medium text-ink">
                      {p.kind === "Orientation" && <span className="mr-2 align-middle text-[11px] font-semibold uppercase tracking-wide text-blue-700 bg-blue-50 rounded px-1.5 py-0.5">Orientation</span>}
                      {p.title}
                    </p>
                    <p className="text-[13px] text-slate-500">
                      {p.gradeLevel} · <span className="font-mono">{new Date(p.date).toLocaleDateString("en-PH", { timeZone: "UTC", month: "short", day: "numeric", year: "numeric" })} · {p.time}</span>
                    </p>
                    {p.outcomes && <p className="text-sm text-slate-700 mt-1.5 whitespace-pre-wrap">{p.outcomes}</p>}
                  </div>
                  <div className="flex items-center gap-3 sm:justify-end">
                    <span className="inline-flex items-center gap-1.5 text-[13px] text-slate-600"><Users size={14} /> {p.participants} attended</span>
                    {sheets.some((s) => s.refId === p.id) && <span className="text-[12px] text-slate-500">· sheet attached</span>}
                    <span className={`text-xs ${isPast ? "text-slate-500" : "text-blue-700"}`}>{isPast ? "Held" : "Upcoming"}</span>
                    <button onClick={() => { setRecordError(null); setRecording({ id: p.id, title: p.title, attendees: p.attendees.join("\n"), outcomes: p.outcomes ?? "", headcount: p.attendees.length ? "" : String(p.participants || "") }); }}
                      className="px-3 min-h-9 rounded-full text-[13px] text-blue-700 hover:bg-blue-50">
                      {p.attendees.length || p.outcomes ? "Edit record" : "Record attendance"}
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {/* ---- Reading materials ---- */}
      <section className="mt-14">
        <div className="flex flex-wrap items-baseline justify-between gap-3 mb-3">
          <h2 className="font-serif text-[22px] text-ink">Supplementary reading materials</h2>
          <button onClick={() => openReading()}
            className="inline-flex items-center gap-2 border border-slate-300 hover:bg-slate-100 text-sm font-medium px-4 min-h-11 rounded-full transition-colors">
            <Plus size={16} /> Add material
          </button>
        </div>
        <p className="text-sm text-slate-500 max-w-[70ch]">Handouts and links on the topics people need. They appear under Announcements &amp; Events for the audience you choose.</p>

        {materials === null ? (
          <div className="py-12 flex justify-center text-slate-500"><Loader2 className="animate-spin" size={20} /></div>
        ) : materials.length === 0 ? (
          <p className="mt-4 border-t border-rule pt-4 text-sm text-slate-500">No reading materials yet.</p>
        ) : (
          <ul className="mt-4 divide-y divide-rule border-y border-rule">
            {materials.map((m) => (
              <li key={m.id} className="py-4 flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-medium text-ink inline-flex items-center gap-2"><BookOpen size={15} className="text-slate-500 shrink-0" /> {m.title}</p>
                  <p className="text-[13px] text-slate-500">
                    {m.audience === "All" ? "Everyone" : m.audience}{m.topic ? ` · ${m.topic}` : ""}
                  </p>
                  {m.description && <p className="text-sm text-slate-700 mt-1 whitespace-pre-wrap">{m.description}</p>}
                  <p className="mt-1 flex flex-wrap gap-x-4 text-[13px]">
                    {m.fileName && <a href={`/api/reading/${m.id}`} target="_blank" rel="noopener" className="inline-flex items-center gap-1 text-blue-700 hover:underline min-h-9"><FileText size={13} /> {m.fileName}</a>}
                    {m.link && <a href={m.link} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-blue-700 hover:underline min-h-9"><ExternalLink size={13} /> Link</a>}
                  </p>
                </div>
                <button onClick={() => setRemovingMaterial(m)} aria-label={`Remove ${m.title}`}
                  className="w-10 h-10 grid place-items-center rounded-full text-slate-500 hover:text-red-700 hover:bg-red-50">
                  <Trash2 size={16} />
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Upload results */}
      {upload && (
        <Dialog title="Upload needs assessment results" onClose={() => setUpload(null)}>
          <form onSubmit={saveUpload} className="space-y-4">
            <div>
              <label htmlFor="up-file" className="block text-[13px] font-medium text-slate-700 mb-1.5">Responses file</label>
              <p className="text-xs text-slate-500 mb-2">
                From Google Forms: Responses → Download responses (.csv), or Open in Sheets → File → Download → .xlsx. Paper forms: type them into Excel, one row per person,
                one column per question (put ✓ or Yes under each topic they ticked).
              </p>
              <input id="up-file" type="file" accept=".xlsx,.csv,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                onChange={(e) => chooseResultsFile(e.target.files?.[0])}
                className="block w-full text-sm file:mr-3 file:px-4 file:min-h-10 file:rounded-full file:border-0 file:bg-blue-50 file:text-blue-800 file:font-medium" />
              {isReadingFile && <p className="mt-2 text-[13px] text-slate-500 inline-flex items-center gap-2"><Loader2 size={14} className="animate-spin" /> Reading the file…</p>}
            </div>

            {upload.sheet && uploadPreview && (
              <>
                <Field id="up-title" label="Title">
                  <input id="up-title" value={upload.title} onChange={(e) => setUpload({ ...upload, title: e.target.value })} required maxLength={150}
                    placeholder="e.g. 2nd semester needs assessment" className={inputClass} />
                </Field>

                <fieldset>
                  <legend className="text-[13px] font-medium text-slate-700 mb-1.5">Who answered</legend>
                  <div className="flex flex-wrap gap-x-5 gap-y-1">
                    {STAKEHOLDERS.map((s) => (
                      <label key={s} className="inline-flex items-center gap-2 text-sm min-h-9">
                        <input type="checkbox" checked={upload.stakeholders.includes(s)}
                          onChange={(e) => setUpload({ ...upload, stakeholders: e.target.checked ? [...upload.stakeholders, s] : upload.stakeholders.filter((x) => x !== s) })} />
                        {s}
                      </label>
                    ))}
                  </div>
                </fieldset>

                <fieldset>
                  <legend className="text-[13px] font-medium text-slate-700 mb-1">Questions to count as topics</legend>
                  <p className="text-xs text-slate-500 mb-2">{uploadPreview.respondents} {uploadPreview.respondents === 1 ? "response" : "responses"} found. Names, emails and written answers are left out.</p>
                  <ul className="space-y-2">
                    {upload.columns.map((c) => (
                      <li key={c.index}>
                        <label className="flex items-start gap-2 text-sm">
                          <input type="checkbox" className="mt-1" checked={upload.topicColumns.includes(c.index)}
                            onChange={(e) => setUpload({ ...upload, topicColumns: e.target.checked ? [...upload.topicColumns, c.index] : upload.topicColumns.filter((i) => i !== c.index) })} />
                          <span className="min-w-0">
                            <span className="text-ink">{c.header}</span>
                            <span className="block text-xs text-slate-500 truncate">
                              {c.kind === "checkbox" ? "Ticked or not" : `${c.topics.slice(0, 4).join(" · ")}${c.topics.length > 4 ? ` · +${c.topics.length - 4} more` : ""}`}
                            </span>
                          </span>
                        </label>
                      </li>
                    ))}
                  </ul>
                </fieldset>

                <Field id="up-group" label="Split results by (optional)">
                  <select id="up-group" value={upload.groupColumn ?? ""} onChange={(e) => setUpload({ ...upload, groupColumn: e.target.value === "" ? null : Number(e.target.value) })} className={inputClass}>
                    <option value="">Don&apos;t split</option>
                    {upload.columns.filter((c) => c.kind === "choice" && !upload.topicColumns.includes(c.index)).map((c) => (
                      <option key={c.index} value={c.index}>{c.header}</option>
                    ))}
                  </select>
                </Field>

                <div>
                  <p className="text-[13px] font-medium text-slate-700 mb-1">Most needed</p>
                  {uploadPreview.tally.length === 0 ? (
                    <p className="text-sm text-slate-500">Tick at least one question above.</p>
                  ) : (
                    <ol className="text-sm space-y-0.5">
                      {uploadPreview.tally.slice(0, 5).map((t) => (
                        <li key={t.topic} className="flex justify-between gap-3"><span className="text-ink">{t.topic}</span><span className="font-mono text-slate-600 tabular">{t.count}</span></li>
                      ))}
                    </ol>
                  )}
                </div>
              </>
            )}

            <InlineError message={uploadError} onDismiss={() => setUploadError(null)} />
            <DialogButtons onCancel={() => setUpload(null)} isSaving={isSavingUpload} label="Save results" disabled={!uploadPreview || uploadPreview.tally.length === 0} />
          </form>
        </Dialog>
      )}

      {/* New needs assessment */}
      {isFormOpen && (
        <Dialog title="New needs assessment form" onClose={() => setIsFormOpen(false)}>
          <form onSubmit={saveForm} className="space-y-4">
            <Field id="na-title" label="Title">
              <input id="na-title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required placeholder="e.g. 2nd semester needs assessment"
                className={inputClass} />
            </Field>
            <Field id="na-grade" label="Who should answer">
              <select id="na-grade" value={form.gradeLevel} onChange={(e) => setForm({ ...form, gradeLevel: e.target.value })}
                className={inputClass}>
                <option value="All">All students</option>
                {gradeLevels.map((g) => <option key={g.id} value={optionValue(g)}>{g.label}</option>)}
              </select>
            </Field>
            <Field id="na-topics" label="Topics students can choose (one per line)">
              <textarea id="na-topics" rows={8} value={form.topics} onChange={(e) => setForm({ ...form, topics: e.target.value })}
                className={`${inputClass} resize-y`} />
            </Field>
            <InlineError message={formError} onDismiss={() => setFormError(null)} />
            <DialogButtons onCancel={() => setIsFormOpen(false)} isSaving={isSavingForm} label="Send to students" />
          </form>
        </Dialog>
      )}

      {/* New program */}
      {isProgramOpen && (
        <Dialog title={program.kind === "Orientation" ? "Schedule an orientation activity" : "Schedule a group session"} onClose={() => setIsProgramOpen(false)}>
          <form onSubmit={saveProgram} className="space-y-4">
            <Field id="gp-kind" label="Type">
              <select id="gp-kind" value={program.kind} onChange={(e) => setProgram({ ...program, kind: e.target.value })} className={inputClass}>
                <option>Group session</option>
                <option>Orientation</option>
              </select>
            </Field>
            <Field id="gp-title" label="Title or topic">
              <input id="gp-title" value={program.title} onChange={(e) => setProgram({ ...program, title: e.target.value })} required
                placeholder={program.kind === "Orientation" ? "e.g. Guidance services orientation for freshmen" : "e.g. Managing stress before exams"}
                className={inputClass} />
            </Field>
            <Field id="gp-grade" label="For">
              <select id="gp-grade" value={program.gradeLevel} onChange={(e) => setProgram({ ...program, gradeLevel: e.target.value })}
                className={inputClass}>
                {EXTRA_AUDIENCES.map((a) => <option key={a}>{a}</option>)}
                {gradeLevels.map((g) => <option key={g.id} value={optionValue(g)}>{g.label}</option>)}
              </select>
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field id="gp-date" label="Date">
                <input id="gp-date" type="date" min={minSelectableDate} value={program.dateString} onChange={(e) => setProgram({ ...program, dateString: e.target.value })} required
                  className={inputClass} />
              </Field>
              <Field id="gp-time" label="Time">
                <input id="gp-time" value={program.time} onChange={(e) => setProgram({ ...program, time: e.target.value })} required placeholder="e.g. 10:00 AM"
                  className={inputClass} />
              </Field>
            </div>
            <label className="flex items-start gap-2 text-sm">
              <input type="checkbox" className="mt-1" checked={program.announce} onChange={(e) => setProgram({ ...program, announce: e.target.checked })} />
              <span>Also post it under Upcoming events in Announcements &amp; Events, so people know about it</span>
            </label>
            <InlineError message={programError} onDismiss={() => setProgramError(null)} />
            <DialogButtons onCancel={() => setIsProgramOpen(false)} isSaving={isSavingProgram} label="Schedule" />
          </form>
        </Dialog>
      )}

      {/* New reading material */}
      {reading && (
        <Dialog title="Add a reading material" onClose={() => setReading(null)}>
          <form onSubmit={saveReading} className="space-y-4">
            <Field id="rm-title" label="Title">
              <input id="rm-title" value={reading.title} onChange={(e) => setReading({ ...reading, title: e.target.value })} required maxLength={150}
                placeholder="e.g. 10 ways to handle exam stress" className={inputClass} />
            </Field>
            <Field id="rm-topic" label="Topic">
              <input id="rm-topic" list="rm-topics" value={reading.topic} onChange={(e) => setReading({ ...reading, topic: e.target.value })} maxLength={200}
                placeholder="A need from the assessment" className={inputClass} />
              <datalist id="rm-topics">{knownTopics.map((t) => <option key={t} value={t} />)}</datalist>
            </Field>
            <Field id="rm-aud" label="Who it's for">
              <select id="rm-aud" value={reading.audience} onChange={(e) => setReading({ ...reading, audience: e.target.value })} className={inputClass}>
                {READING_AUDIENCES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </Field>
            <Field id="rm-file" label="File (PDF, Word, or photo, up to 5 MB)">
              <input id="rm-file" type="file" accept=".pdf,.docx,image/jpeg,image/png,image/webp" onChange={(e) => setReadingFile(e.target.files?.[0] ?? null)}
                className="block w-full text-sm file:mr-3 file:px-4 file:min-h-10 file:rounded-full file:border-0 file:bg-blue-50 file:text-blue-800 file:font-medium" />
            </Field>
            <Field id="rm-link" label="Or a link">
              <input id="rm-link" type="url" inputMode="url" value={reading.link} onChange={(e) => setReading({ ...reading, link: e.target.value })}
                placeholder="https://" className={inputClass} />
            </Field>
            <Field id="rm-desc" label="Short description (optional)">
              <textarea id="rm-desc" rows={3} value={reading.description} onChange={(e) => setReading({ ...reading, description: e.target.value })} maxLength={2000}
                className={`${inputClass} resize-y`} />
            </Field>
            <InlineError message={readingError} onDismiss={() => setReadingError(null)} />
            <DialogButtons onCancel={() => setReading(null)} isSaving={isSavingReading} label="Share" />
          </form>
        </Dialog>
      )}

      {/* Attendance + outcomes */}
      {recording && (
        <Dialog title={`Session record: ${recording.title}`} onClose={() => setRecording(null)}>
          <form onSubmit={saveRecord} className="space-y-4">
            <div>
              <p className="text-[13px] font-medium text-slate-700 mb-1.5">Attendance sheet</p>
              <p className="text-xs text-slate-500 mb-2">Attach a photo of the signed attendance form, type the names below, or both.</p>
              <AttachmentStrip kind="GROUP_ATTENDANCE" refId={recording.id} items={sheets.filter((s) => s.refId === recording.id)}
                onChange={loadSheets} addLabel="Attach photo of sheet" />
            </div>
            <Field id="rec-count" label="Number who attended (if you didn't type the names)">
              <input id="rec-count" type="number" min={0} max={2000} inputMode="numeric" value={recording.headcount}
                onChange={(e) => setRecording({ ...recording, headcount: e.target.value })}
                className="w-40 bg-paper border border-slate-300 rounded-md px-3 py-2.5 text-sm" />
            </Field>
            <Field id="rec-att" label="Attendees (one name per line, optional)">
              <textarea id="rec-att" rows={8} value={recording.attendees} onChange={(e) => setRecording({ ...recording, attendees: e.target.value })}
                className={`${inputClass} resize-y`} />
            </Field>
            <Field id="rec-out" label="Session outcomes">
              <textarea id="rec-out" rows={4} value={recording.outcomes} onChange={(e) => setRecording({ ...recording, outcomes: e.target.value })}
                placeholder="What was covered, how students responded, follow-ups needed"
                className={`${inputClass} resize-y`} />
            </Field>
            <InlineError message={recordError} onDismiss={() => setRecordError(null)} />
            <DialogButtons onCancel={() => setRecording(null)} isSaving={isSavingRecord} label="Save record" />
          </form>
        </Dialog>
      )}

      <ConfirmDialog open={removingUpload !== null} title="Remove these results?" danger busy={isRemoving}
        message={`“${removingUpload?.title}” and its tallies will be removed from Group Guidance.`}
        confirmLabel="Remove" onConfirm={removeUpload} onCancel={() => setRemovingUpload(null)} />
      <ConfirmDialog open={removingMaterial !== null} title="Remove this reading material?" danger busy={isRemoving}
        message={`“${removingMaterial?.title}” will no longer appear under Announcements & Events.`}
        confirmLabel="Remove" onConfirm={removeMaterial} onCancel={() => setRemovingMaterial(null)} />
    </div>
  );
}

type PlanActions = { onSession: (topic: string) => void; onReading: (topic: string) => void };

// Topics with how many picked each. The top needs get shortcuts to plan a
// group session or share a reading on that topic.
function TallyTable({ title, tally, onSession, onReading }: { title: string; tally: TopicCount[] } & PlanActions) {
  const max = Math.max(1, ...tally.map((t) => t.count));
  return (
    <table className="mt-4 w-full text-sm">
      <caption className="sr-only">Responses per topic for {title}</caption>
      <tbody>
        {tally.map((t, i) => (
          <tr key={t.topic} className="align-middle">
            <th scope="row" className="py-1.5 pr-4 text-left font-normal text-ink w-1/2">
              {i === 0 && t.count > 0 && <span className="text-xs text-blue-700 mr-2">Top</span>}
              {t.topic}
            </th>
            <td className="py-1.5 pr-3">
              <div className="h-2 bg-blue-100 rounded-full overflow-hidden">
                <div className="h-full bg-blue-500 rounded-full" style={{ width: `${(t.count / max) * 100}%` }} />
              </div>
            </td>
            <td className="py-1.5 w-10 text-right font-mono text-[13px] text-slate-600 tabular">{t.count}</td>
            <td className="py-1 pl-2 w-[84px] whitespace-nowrap text-right">
              {i < TOP_NEEDS && t.count > 0 && (
                <>
                  <button onClick={() => onSession(t.topic)} title={`Schedule a session on ${t.topic}`} aria-label={`Schedule a session on ${t.topic}`}
                    className="w-9 h-9 inline-grid place-items-center rounded-full text-blue-700 hover:bg-blue-50"><CalendarPlus size={16} /></button>
                  <button onClick={() => onReading(t.topic)} title={`Share a reading on ${t.topic}`} aria-label={`Share a reading on ${t.topic}`}
                    className="w-9 h-9 inline-grid place-items-center rounded-full text-blue-700 hover:bg-blue-50"><BookOpen size={16} /></button>
                </>
              )}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

// Uploaded results, with the option to see one group (e.g. only parents).
function UploadResult({ u, onRemove, ...plan }: { u: NeedsUpload; onRemove: () => void } & PlanActions) {
  const [group, setGroup] = useState<string | null>(null);
  const shown = u.groups.find((g) => g.group === group);
  return (
    <article className="border-t border-rule pt-5">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <div>
          <h3 className="font-medium text-ink">{u.title}</h3>
          <p className="text-[13px] text-slate-500">
            Uploaded · {u.stakeholders.length ? u.stakeholders.join(", ") : "Respondents"} · {u.respondents} {u.respondents === 1 ? "response" : "responses"} ·{" "}
            <span className="break-all">{u.fileName}</span>
          </p>
        </div>
        <button onClick={onRemove} className="px-3 min-h-9 rounded-full text-[13px] text-slate-600 hover:bg-red-50 hover:text-red-700">Remove</button>
      </div>
      {u.groups.length > 1 && (
        <div role="group" aria-label="Show results for" className="mt-3 flex flex-wrap gap-1">
          {[null, ...u.groups.map((g) => g.group)].map((g) => (
            <button key={g ?? "all"} onClick={() => setGroup(g)} aria-pressed={group === g}
              className={`px-3 min-h-9 rounded-full text-[13px] transition-colors ${group === g ? "bg-butter-200 text-ink font-medium" : "text-slate-600 hover:bg-blue-100"}`}>
              {g === null ? `Everyone (${u.respondents})` : `${g} (${u.groups.find((x) => x.group === g)?.respondents ?? 0})`}
            </button>
          ))}
        </div>
      )}
      <TallyTable title={u.title} tally={shown?.tally ?? u.tally} {...plan} />
    </article>
  );
}

function Dialog({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4" onClick={onClose}>
      <div role="dialog" aria-modal="true" aria-label={title} onClick={(e) => e.stopPropagation()}
        className="bg-sheet w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-xl border border-rule shadow-xl p-6">
        <div className="flex items-start justify-between gap-4 mb-4">
          <h2 className="font-medium text-ink">{title}</h2>
          <button type="button" onClick={onClose} aria-label="Close" className="w-11 h-11 -m-2 grid place-items-center text-slate-500 hover:text-ink hover:bg-slate-100 rounded-full"><X size={18} /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

function Field({ id, label, children }: { id: string; label: string; children: React.ReactNode }) {
  return (
    <div>
      <label htmlFor={id} className="block text-[13px] font-medium text-slate-700 mb-1.5">{label}</label>
      {children}
    </div>
  );
}

function DialogButtons({ onCancel, isSaving, label, disabled = false }: { onCancel: () => void; isSaving: boolean; label: string; disabled?: boolean }) {
  return (
    <div className="flex justify-end gap-2 pt-2 border-t border-rule">
      <button type="button" onClick={onCancel} className="px-4 min-h-11 rounded-full text-sm text-slate-600 hover:bg-slate-100">Cancel</button>
      <button type="submit" disabled={isSaving || disabled}
        className="inline-flex items-center gap-2 bg-blue-700 hover:bg-blue-800 disabled:opacity-60 text-white text-sm font-medium px-4 min-h-11 rounded-full">
        {isSaving && <Loader2 size={16} className="animate-spin" />} {label}
      </button>
    </div>
  );
}
