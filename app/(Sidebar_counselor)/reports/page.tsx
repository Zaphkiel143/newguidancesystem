"use client";

import React, { useEffect, useState } from "react";
import { Download, Loader2, Printer } from "lucide-react";
import { getMonthlyReport } from "../../action/reports";
import { manilaToday } from "../../../lib/time";
import { useOptionList } from "../../../components/useOptionList";
import { buildXlsx, type XlsxRow } from "../../../lib/xlsx";
import { APPOINTMENT_PURPOSES, OTHER, SHS_GRADES, TERTIARY_YEARS } from "../../config/studentLevels";

type Report = Awaited<ReturnType<typeof getMonthlyReport>>;
type Log = Report["logs"][number];
type Count = { label: string; count: number };

const ALL = "All";
const STAFF = "Faculty/Staff";

// One color per chart, echoing the office's spreadsheet dashboard
const COLOR = {
  program: "#c8344f",
  level: "#e08a1e",
  nature: "#7c4dcc",
  contact: "#2b8fcc",
  status: "#c99a06",
};

const STATUS_LABEL: Record<string, string> = { PENDING: "For scheduling", CONFIRMED: "Confirmed", COMPLETED: "Terminated" };
const CONTACT_LABEL: Record<string, string> = {
  Student: "Student-initiated",
  Faculty: "Faculty/Staff-initiated",
  Parent: "Parent-initiated",
  "Guidance office": "Guidance office (walk-in)",
};

function monthLabel(month: string) {
  return new Date(`${month}-01T00:00:00Z`).toLocaleDateString("en-PH", { month: "long", year: "numeric", timeZone: "UTC" });
}

function tally(values: string[]): Count[] {
  const map = new Map<string, number>();
  for (const v of values) map.set(v, (map.get(v) ?? 0) + 1);
  return [...map.entries()].map(([label, count]) => ({ label, count })).sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
}

// "BS Information Technology" -> "BSIT", as on the office's own sheets
function shortProgram(p: string) {
  const m = p.match(/^(BS|Bachelor of)\s+(.+)$/i);
  if (!m) return p;
  const initials = m[2].split(/\s+/).filter((w) => /^[A-Z]/.test(w)).map((w) => w[0]).join("");
  return (m[1].toUpperCase() === "BS" ? "BS" : "B") + initials;
}

// Configured options first, then anything older records still carry
function withExtras(base: readonly string[], seen: string[]) {
  return [...base, ...[...new Set(seen)].filter((v) => !base.includes(v)).sort()];
}

// Horizontal bars: label, bar from a shared baseline, value at the tip
function HBars({ items, color, short = (s: string) => s }: { items: Count[]; color: string; short?: (s: string) => string }) {
  if (items.length === 0) return <Empty />;
  const max = Math.max(...items.map((i) => i.count));
  const total = items.reduce((n, i) => n + i.count, 0);
  return (
    <ul className="grid grid-cols-[auto_minmax(0,1fr)] gap-y-1">
      {items.map((i) => (
        <li key={i.label} title={`${i.label}: ${i.count} (${Math.round((i.count / total) * 100)}%)`}
          className="col-span-2 grid grid-cols-subgrid items-center gap-x-2 rounded px-1 py-0.5 hover:bg-slate-100">
          <span className="text-[12px] text-slate-600 text-right truncate max-w-[7rem]">{short(i.label)}</span>
          <span className="flex items-center gap-1.5 min-w-0">
            <span className="h-4 rounded-r shrink-0 print:[print-color-adjust:exact]" style={{ width: `calc((100% - 2.5rem) * ${i.count / max})`, minWidth: 2, background: color }} />
            <span className="text-[12px] font-semibold text-ink tabular">{i.count}</span>
          </span>
        </li>
      ))}
    </ul>
  );
}

// Vertical bars; switches to horizontal bars when there are many categories
function VBars({ items, color }: { items: Count[]; color: string }) {
  if (items.length === 0) return <Empty />;
  if (items.length > 8) return <HBars items={items} color={color} />;
  const max = Math.max(...items.map((i) => i.count));
  return (
    <div className="flex items-end gap-1 sm:gap-2 border-b border-slate-300">
      {items.map((i) => (
        <div key={i.label} title={`${i.label}: ${i.count}`} className="flex-1 min-w-0 flex flex-col items-center justify-end h-40 rounded-t hover:bg-slate-100">
          <span className="text-[12px] font-semibold text-ink tabular">{i.count}</span>
          <span className="w-full max-w-6 rounded-t print:[print-color-adjust:exact]" style={{ height: `${(i.count / max) * 112}px`, minHeight: 2, background: color }} />
        </div>
      ))}
    </div>
  );
}

function VLabels({ items }: { items: Count[] }) {
  if (items.length === 0 || items.length > 8) return null;
  return (
    <div className="flex gap-1 sm:gap-2 mt-1.5">
      {items.map((i) => (
        <span key={i.label} className="flex-1 min-w-0 text-[11px] leading-tight text-slate-600 text-center break-words">{i.label}</span>
      ))}
    </div>
  );
}

function Empty() {
  return <p className="text-sm text-slate-500 py-4">No logs match.</p>;
}

function Panel({ title, className = "", children }: { title: string; className?: string; children: React.ReactNode }) {
  return (
    <section className={`bg-sheet border border-rule rounded-xl overflow-hidden break-inside-avoid ${className}`}>
      <h2 className="bg-blue-900 text-white text-[13px] font-semibold tracking-wide text-center px-3 py-1.5 print:[print-color-adjust:exact]">{title}</h2>
      <div className="p-3 sm:p-4 print:p-2">{children}</div>
    </section>
  );
}

function Tile({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-sheet border border-rule rounded-xl overflow-hidden text-center">
      <p className="bg-blue-900 text-white text-[12px] font-semibold px-2 py-1 print:[print-color-adjust:exact]">{label}</p>
      <p className="text-3xl font-semibold text-ink py-2">{value.toLocaleString("en-PH")}</p>
    </div>
  );
}

function Filter({ id, label, value, options, onChange, format = (s: string) => s }: {
  id: string; label: string; value: string; options: string[]; onChange: (v: string) => void; format?: (s: string) => string;
}) {
  return (
    <div className="min-w-0">
      <label htmlFor={id} className="block text-[12px] font-semibold text-slate-600 mb-1">{label}</label>
      <select id={id} value={value} onChange={(e) => onChange(e.target.value)}
        className="w-full bg-sheet border border-slate-300 rounded-lg px-3 min-h-11 text-sm">
        <option value={ALL}>All</option>
        {options.map((o) => <option key={o} value={o}>{format(o)}</option>)}
      </select>
    </div>
  );
}

// Older report blocks, kept below the dashboard (screen only)
function Bars({ items, empty = "None this month." }: { items: Count[]; empty?: string }) {
  if (items.length === 0) return <p className="text-sm text-slate-500">{empty}</p>;
  const max = Math.max(...items.map((i) => i.count), 1);
  return (
    <ul className="space-y-2">
      {items.map((i) => (
        <li key={i.label} className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-3 text-sm">
          <span className="text-slate-700 break-words">{i.label}</span>
          <span className="font-semibold text-ink tabular text-right">{i.count}</span>
          <span className="col-span-2 h-2 rounded-full bg-blue-50 overflow-hidden" aria-hidden>
            <span className="block h-full rounded-full bg-blue-600" style={{ width: `${(i.count / max) * 100}%` }} />
          </span>
        </li>
      ))}
    </ul>
  );
}

function Figure({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="bg-blue-50 border border-blue-100 rounded-xl px-4 py-3">
      <p className="text-2xl font-bold text-ink tabular">{value}</p>
      <p className="text-[12px] text-slate-600 mt-0.5">{label}</p>
    </div>
  );
}

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="bg-sheet border border-rule rounded-2xl p-5 break-inside-avoid">
      <h2 className="font-semibold text-[17px] text-ink mb-4">{title}</h2>
      {children}
    </section>
  );
}

type Charts = { tiles: Count[]; program: Count[]; level: Count[]; nature: Count[]; contact: Count[]; status: Count[] };

// Workbook rows for the Excel download
function toRows(r: Report, filters: [string, string][], charts: Charts): XlsxRow[] {
  const bold = (value: string | number) => ({ value, style: "bold" as const });
  const rows: XlsxRow[] = [[{ value: `GCO Services Daily Log Report — ${monthLabel(r.month)}`, style: "title" }]];
  for (const [label, value] of filters) rows.push([label, value]);
  rows.push(["Generated", new Date().toLocaleString("en-PH", { timeZone: "Asia/Manila" })], []);
  const add = (section: string, items: Count[], header = "Label") => {
    rows.push([bold(section)], [bold(header), bold("Count")]);
    if (items.length === 0) rows.push(["None"]);
    for (const i of items) rows.push([i.label, i.count]);
    rows.push([]);
  };
  add("Summary", charts.tiles, "Item");
  add("Program Breakdown", charts.program, "Program");
  add("Level Distribution", charts.level, "Level");
  add("Nature of Concern", charts.nature, "Nature of concern");
  add("Contact Type", charts.contact, "Contact type");
  add("Case Status", charts.status, "Status");
  rows.push([{ value: "Other office activity (whole month, not filtered)", style: "title" }], []);
  add("Sessions", [{ label: "Cancelled (not counted above)", count: r.sessions.cancelled }, { label: "Students seen", count: r.sessions.uniqueStudents }], "Item");
  add("Referrals", [{ label: "Received", count: r.referrals.total }, { label: "High priority", count: r.referrals.highPriority }], "Item");
  add("Referrals by concern type", r.referrals.byConcern, "Concern type");
  add("Referrals by status", r.referrals.byStatus, "Status");
  add("Referrals by source", r.referrals.bySource, "Referred by");
  add("Needs assessment", [{ label: "Responses", count: r.needsAssessment.responses }, ...r.needsAssessment.topTopics], "Topic");
  add("Group guidance", [{ label: "Sessions", count: r.groupGuidance.sessions }, { label: "Participants", count: r.groupGuidance.participants }], "Item");
  add("Documents", [
    { label: "Submitted", count: r.documents.submitted },
    { label: "Accepted", count: r.documents.accepted },
    { label: "Not accepted", count: r.documents.notAccepted },
    { label: "Waiting", count: r.documents.waiting },
    { label: "New student records", count: r.newStudents },
  ], "Item");
  add("E-Gabay chatbot", [
    { label: "Replies", count: r.chatbot.replies },
    ...(r.chatbot.understoodRate === null ? [] : [{ label: "Understood (%)", count: r.chatbot.understoodRate }]),
    { label: "Sent to the guidance office", count: r.chatbot.forwarded },
    { label: "Crisis messages", count: r.chatbot.crisis },
  ], "Item");
  add("Chatbot topics", r.chatbot.topTopics, "Topic");
  return rows;
}

// Print only the report, on one landscape page
const PRINT_CSS = `
@media print {
  @page { size: landscape; margin: 8mm; }
  body * { visibility: hidden; }
  #gco-report, #gco-report * { visibility: visible; }
  #gco-report { position: absolute; inset: 0 auto auto 0; width: 100%; max-width: none; padding: 0; }
}`;

export default function MonthlyReportPage() {
  const [month, setMonth] = useState(() => manilaToday().slice(0, 7));
  const [report, setReport] = useState<Report | null>(null);
  const [loadedMonth, setLoadedMonth] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [nature, setNature] = useState(ALL);
  const [program, setProgram] = useState(ALL);
  const [level, setLevel] = useState(ALL);
  const [shsStrands] = useOptionList("shsStrands");
  const [tertiaryCourses] = useOptionList("tertiaryCourses");

  useEffect(() => {
    let cancelled = false;
    getMonthlyReport(month)
      .then((r) => {
        if (cancelled) return;
        setReport(r);
        setError(null);
        setLoadedMonth(month);
      })
      .catch(() => {
        if (cancelled) return;
        setError("Couldn't load this report.");
        setLoadedMonth(month);
      });
    return () => {
      cancelled = true;
    };
  }, [month]);

  const r = loadedMonth === month ? report : null;
  const logs: Log[] = r?.logs ?? [];
  const shown = logs.filter((l) => (nature === ALL || l.nature === nature) && (program === ALL || l.program === program) && (level === ALL || l.level === level));
  const count = (s: string) => shown.filter((l) => l.status === s).length;
  const charts: Charts = {
    tiles: [
      { label: "Total Logs", count: shown.length },
      { label: "For Scheduling", count: count("PENDING") },
      { label: "Confirmed", count: count("CONFIRMED") },
      { label: "Terminated", count: count("COMPLETED") },
    ],
    program: tally(shown.map((l) => l.program)),
    level: tally(shown.map((l) => l.level)),
    nature: tally(shown.map((l) => l.nature)),
    contact: tally(shown.map((l) => CONTACT_LABEL[l.contact] ?? l.contact)),
    status: tally(shown.map((l) => l.status)).map((s) => ({ ...s, label: STATUS_LABEL[s.label] ?? s.label })),
  };

  const download = () => {
    if (!r) return;
    const filters: [string, string][] = [["Nature of Concern", nature], ["Program", program], ["Level", level]];
    const a = document.createElement("a");
    a.href = URL.createObjectURL(buildXlsx(toRows(r, filters, charts), monthLabel(r.month)));
    a.download = `GCO Daily Log Report ${r.month}.xlsx`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const natureOptions = withExtras([...APPOINTMENT_PURPOSES, OTHER], logs.map((l) => l.nature));
  const programOptions = withExtras([...shsStrands, ...tertiaryCourses].map((i) => i.itemKey ?? i.label).concat(STAFF), logs.map((l) => l.program));
  const levelOptions = withExtras([...SHS_GRADES, ...TERTIARY_YEARS, STAFF], logs.map((l) => l.level));
  const filtered = nature !== ALL || program !== ALL || level !== ALL;

  return (
    <div id="gco-report" className="px-5 sm:px-8 lg:px-12 pt-8 lg:pt-12 pb-16 max-w-7xl text-slate-800">
      <style>{PRINT_CSS}</style>
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="page-title">GCO Services Daily Log Report</h1>
          <p className="text-sm text-slate-600 mt-1">{monthLabel(month)}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2 print:hidden">
          <label htmlFor="report-month" className="sr-only">Month</label>
          <input id="report-month" type="month" value={month} max={manilaToday().slice(0, 7)} onChange={(e) => e.target.value && setMonth(e.target.value)}
            className="bg-sheet border border-slate-300 rounded-lg px-3 min-h-11 text-sm" />
          <button onClick={() => window.print()} className="inline-flex items-center gap-2 border border-slate-300 hover:bg-slate-100 text-sm px-4 min-h-11 rounded-full">
            <Printer size={16} /> Print
          </button>
          <button onClick={download} disabled={!r} className="inline-flex items-center gap-2 bg-blue-700 hover:bg-blue-800 text-white text-sm px-4 min-h-11 rounded-full disabled:opacity-50">
            <Download size={16} /> Download (Excel)
          </button>
        </div>
      </header>

      {error ? (
        <p className="mt-8 text-sm text-red-700">{error}</p>
      ) : !r ? (
        <div className="py-20 flex justify-center text-slate-500"><Loader2 className="animate-spin" size={20} /></div>
      ) : (
        <>
          <div className="mt-6 grid gap-3 sm:grid-cols-3 lg:grid-cols-[repeat(3,minmax(0,1fr))_auto] items-end print:grid-cols-3! print:mt-3">
            <Filter id="f-nature" label="Nature of Concern" value={nature} options={natureOptions} onChange={setNature} />
            <Filter id="f-program" label="Program" value={program} options={programOptions} onChange={setProgram} />
            <Filter id="f-level" label="Level" value={level} options={levelOptions} onChange={setLevel} />
            {filtered && (
              <button onClick={() => { setNature(ALL); setProgram(ALL); setLevel(ALL); }}
                className="justify-self-start border border-slate-300 hover:bg-slate-100 text-sm px-4 min-h-11 rounded-full print:hidden">
                Clear filters
              </button>
            )}
          </div>

          <div className="mt-4 grid grid-cols-2 lg:grid-cols-4 gap-3 print:grid-cols-4!">
            {charts.tiles.map((t) => <Tile key={t.label} label={t.label} value={t.count} />)}
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-12 print:grid-cols-12!">
            <Panel title="Program Breakdown" className="xl:col-span-4 print:col-span-4!">
              <HBars items={charts.program} color={COLOR.program} short={shortProgram} />
            </Panel>
            <Panel title="Level Distribution" className="xl:col-span-3 print:col-span-3!">
              <HBars items={charts.level} color={COLOR.level} />
            </Panel>
            <Panel title="Nature of Concern" className="md:col-span-2 xl:col-span-5 print:col-span-5!">
              <VBars items={charts.nature} color={COLOR.nature} />
              <VLabels items={charts.nature} />
            </Panel>
            <Panel title="Contact Type" className="xl:col-span-4 print:col-span-4!">
              <HBars items={charts.contact} color={COLOR.contact} />
            </Panel>
            <Panel title="Case Status" className="xl:col-span-3 print:col-span-3!">
              <HBars items={charts.status} color={COLOR.status} />
            </Panel>
            <Panel title="Specific Concern · Service Availed" className="md:col-span-2 xl:col-span-5 print:col-span-5!">
              <p className="text-sm text-slate-600">
                Not recorded yet. Daily Log entries don&apos;t store a specific concern or the service availed, so these charts will appear once those are captured.
              </p>
            </Panel>
          </div>
          <p className="mt-3 text-xs text-slate-500">
            {`${r.sessions.cancelled} cancelled session${r.sessions.cancelled === 1 ? "" : "s"} not counted.`}{" "}Program and level come from each student&apos;s record.
            Generated {new Date().toLocaleString("en-PH", { timeZone: "Asia/Manila" })}.
          </p>

          <div className="mt-12 print:hidden">
            <h2 className="font-semibold text-[20px] text-ink mb-4">Other office activity</h2>
            <div className="grid gap-6 lg:grid-cols-2">
              <Block title="Referrals">
                <p className="text-sm text-slate-600 mb-4">{r.referrals.total} received · {r.referrals.highPriority} high priority</p>
                <h3 className="text-[13px] font-semibold text-slate-500 mb-2">By concern type</h3>
                <Bars items={r.referrals.byConcern} />
                <h3 className="text-[13px] font-semibold text-slate-500 mt-5 mb-2">By status now</h3>
                <Bars items={r.referrals.byStatus} />
                <h3 className="text-[13px] font-semibold text-slate-500 mt-5 mb-2">Referred by</h3>
                <Bars items={r.referrals.bySource} />
              </Block>

              <Block title="Needs assessment: most requested topics">
                <p className="text-sm text-slate-600 mb-4">{r.needsAssessment.responses} responses</p>
                <Bars items={r.needsAssessment.topTopics} empty="No responses this month." />
              </Block>

              <Block title="Group guidance">
                <p className="text-sm text-slate-600 mb-4">{r.groupGuidance.sessions} sessions · {r.groupGuidance.participants} participants in total</p>
                <Bars items={r.groupGuidance.list} empty="No group sessions this month." />
              </Block>

              <Block title="Documents">
                <div className="grid grid-cols-3 gap-3">
                  <Figure label="Accepted" value={r.documents.accepted} />
                  <Figure label="Not accepted" value={r.documents.notAccepted} />
                  <Figure label="Waiting" value={r.documents.waiting} />
                </div>
                <p className="text-sm text-slate-600 mt-4">{r.documents.submitted} submitted · {r.newStudents} new student records this month.</p>
              </Block>

              <Block title="E-Gabay chatbot">
                <div className="grid grid-cols-3 gap-3 mb-4">
                  <Figure label="Replies" value={r.chatbot.replies} />
                  <Figure label="Understood" value={r.chatbot.understoodRate === null ? "–" : `${r.chatbot.understoodRate}%`} />
                  <Figure label="Sent to the office" value={r.chatbot.forwarded} />
                </div>
                {r.chatbot.crisis > 0 && (
                  <p className="text-sm text-red-700 font-medium mb-3">{r.chatbot.crisis} crisis message{r.chatbot.crisis === 1 ? "" : "s"} this month.</p>
                )}
                <h3 className="text-[13px] font-semibold text-slate-500 mb-2">What students asked about</h3>
                <Bars items={r.chatbot.topTopics} empty="No chatbot use this month." />
              </Block>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
