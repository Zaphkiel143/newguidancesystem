// Reads a needs assessment answered outside E-Gabay (a Google Forms responses
// sheet, or paper forms typed into Excel) and tallies its topics, so results
// from every stakeholder (students, faculty, parents) end up in Group Guidance.
// Runs in the browser; kept free of Node/React so it can be unit tested.

export type Sheet = string[][];

export type TopicCount = { topic: string; count: number };
export type GroupTally = { group: string; respondents: number; tally: TopicCount[] };

export type Column = {
  index: number;
  header: string;
  // "choice": answers are the topics (a Google Forms checkbox or multiple-choice question).
  // "checkbox": the question itself is the topic, ticked or not (a paper checklist typed in, a yes/no item).
  kind: "choice" | "checkbox";
  topics: string[];
  // Looks like "who answered" (role, grade, course...) rather than a need.
  isGroup: boolean;
};

// ---- Reading files ----

// CSV as Google Forms and Excel save it: quoted fields, "" escapes, CRLF or LF.
export function parseCsv(text: string): Sheet {
  const rows: Sheet = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  const src = text.replace(/^﻿/, "");
  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    if (quoted) {
      if (ch === '"' && src[i + 1] === '"') { field += '"'; i++; }
      else if (ch === '"') quoted = false;
      else field += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ",") { row.push(field); field = ""; }
    else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && src[i + 1] === "\n") i++;
      row.push(field); rows.push(row); row = []; field = "";
    } else field += ch;
  }
  if (field || row.length) { row.push(field); rows.push(row); }
  return rows;
}

const u16 = (b: Uint8Array, at: number) => b[at] | (b[at + 1] << 8);
const u32 = (b: Uint8Array, at: number) => (b[at] | (b[at + 1] << 8) | (b[at + 2] << 16) | (b[at + 3] << 24)) >>> 0;

// The files inside a zip (an .xlsx is one), by name.
async function unzip(data: ArrayBuffer): Promise<Map<string, string>> {
  const b = new Uint8Array(data);
  let end = -1;
  for (let i = b.length - 22; i >= Math.max(0, b.length - 65557); i--) {
    if (u32(b, i) === 0x06054b50) { end = i; break; }
  }
  if (end < 0) throw new Error("not a zip");
  const files = new Map<string, string>();
  let at = u32(b, end + 16);
  const count = u16(b, end + 10);
  for (let n = 0; n < count && u32(b, at) === 0x02014b50; n++) {
    const method = u16(b, at + 10);
    const size = u32(b, at + 20);
    const nameLen = u16(b, at + 28);
    const skip = nameLen + u16(b, at + 30) + u16(b, at + 32);
    const name = new TextDecoder().decode(b.subarray(at + 46, at + 46 + nameLen));
    const local = u32(b, at + 42);
    at += 46 + skip;
    if (!/^xl\/(workbook\.xml|_rels\/workbook\.xml\.rels|sharedStrings\.xml|worksheets\/[^/]+\.xml)$/.test(name)) continue;
    const start = local + 30 + u16(b, local + 26) + u16(b, local + 28);
    const raw = b.slice(start, start + size);
    let bytes: Uint8Array = raw;
    if (method === 8) {
      const stream = new Blob([raw]).stream().pipeThrough(new DecompressionStream("deflate-raw"));
      bytes = new Uint8Array(await new Response(stream).arrayBuffer());
    } else if (method !== 0) continue;
    files.set(name, new TextDecoder().decode(bytes));
  }
  return files;
}

const unescapeXml = (s: string) =>
  s.replace(/&(lt|gt|quot|apos|amp|#x[0-9a-f]+|#\d+);/gi, (_, e: string) => {
    const k = e.toLowerCase();
    if (k === "lt") return "<";
    if (k === "gt") return ">";
    if (k === "quot") return '"';
    if (k === "apos") return "'";
    if (k === "amp") return "&";
    return String.fromCodePoint(k.startsWith("#x") ? parseInt(k.slice(2), 16) : parseInt(k.slice(1), 10));
  });

// Text of an element's <t> runs (rich text has several; phonetic hints are skipped).
const runsText = (xml: string) =>
  unescapeXml((xml.replace(/<rPh\b[\s\S]*?<\/rPh>/g, "").match(/<t\b[^>]*>[\s\S]*?<\/t>/g) ?? []).map((t) => t.replace(/<[^>]+>/g, "")).join(""));

// The first sheet of an Excel workbook, as text.
export async function readXlsx(data: ArrayBuffer): Promise<Sheet> {
  const files = await unzip(data);
  let path = "xl/worksheets/sheet1.xml";
  const firstId = files.get("xl/workbook.xml")?.match(/<sheet\b[^>]*\br:id="([^"]+)"/)?.[1];
  const rels = files.get("xl/_rels/workbook.xml.rels") ?? "";
  for (const rel of rels.match(/<Relationship\b[^>]*>/g) ?? []) {
    if (rel.includes(`Id="${firstId}"`)) {
      const target = rel.match(/Target="([^"]+)"/)?.[1] ?? "";
      path = target.startsWith("/") ? target.slice(1) : `xl/${target}`;
    }
  }
  const sheet = files.get(path) ?? [...files.entries()].find(([k]) => k.startsWith("xl/worksheets/"))?.[1];
  if (!sheet) throw new Error("no worksheet");

  const shared = (files.get("xl/sharedStrings.xml")?.match(/<si>[\s\S]*?<\/si>/g) ?? []).map(runsText);
  const rows: Sheet = [];
  for (const rowXml of sheet.match(/<row\b[^>]*>[\s\S]*?<\/row>|<row\b[^>]*\/>/g) ?? []) {
    const r = Number(rowXml.match(/^<row\b[^>]*\br="(\d+)"/)?.[1] ?? rows.length + 1) - 1;
    const row: string[] = [];
    for (const cell of rowXml.match(/<c\b[^>]*?(?:\/>|>[\s\S]*?<\/c>)/g) ?? []) {
      const ref = cell.match(/\br="([A-Z]+)\d+"/)?.[1] ?? "";
      const col = ref ? [...ref].reduce((n, ch) => n * 26 + ch.charCodeAt(0) - 64, 0) - 1 : row.length;
      const type = cell.match(/\bt="(\w+)"/)?.[1];
      const v = cell.match(/<v>([\s\S]*?)<\/v>/)?.[1];
      let text = "";
      if (type === "s") text = shared[Number(v)] ?? "";
      else if (type === "inlineStr") text = runsText(cell);
      else if (type === "b") text = v === "1" ? "TRUE" : "FALSE";
      else if (v !== undefined) text = unescapeXml(v);
      row[col] = text;
    }
    rows[r] = Array.from(row, (c) => c ?? "");
  }
  return Array.from(rows, (r) => r ?? []);
}

// ---- Finding the topics ----

const clean = (s: string | undefined) => (s ?? "").replace(/\s+/g, " ").trim();
const key = (s: string) => s.toLowerCase();

// Answers meaning "yes, I need this" and "no", for checklist-style columns.
const YES = new Set(["yes", "y", "oo", "✓", "✔", "x", "/", "1", "true", "checked", "agree", "strongly agree", "often", "always", "very often", "needed", "very much"]);
const NO = new Set(["no", "n", "hindi", "0", "false", "unchecked", "disagree", "strongly disagree", "neutral", "undecided", "never", "rarely", "sometimes", "not needed"]);
const BLANKISH = new Set(["n/a", "na", "-", "--", "none", "wala", "no answer"]);

// Columns that identify the person or the form, never needs.
const IDENTITY = /time ?stamp|e-?mail|\bname\b|pangalan|student (no|number|id)|\bid (no|number)\b|\bdate\b|contact|phone|mobile|address|signature|\bscore\b/i;
// Open-ended questions ("Anything else?"), read by people rather than counted.
const OPEN_ENDED = /anything else|comment|suggestion|explain|specify|\bwhy\b|\bother concerns?\b|ano pa/i;
// Columns that say who answered: used to split the results, not as topics.
const GROUP = /\b(you are|i am|ikaw ay|role|respondent|stakeholder|position|designation|grade|year|level|strand|course|program|department|section|gender|sex|age)\b/i;
const ROLE_GROUP = /\b(you are|i am|ikaw ay|role|respondent|stakeholder|position|designation)\b/i;

// A Google Forms checkbox answer joins the picks with ", ". A piece starting in
// lowercase continues the previous pick ("Friends, family, and school").
export function splitChoices(value: string): string[] {
  const parts: string[] = [];
  for (const piece of value.split(/,\s+/)) {
    const p = piece.trim();
    if (!p) continue;
    if (parts.length && /^[a-z]/.test(p)) parts[parts.length - 1] += `, ${p}`;
    else parts.push(p);
  }
  return parts;
}

// "Which concerns apply to you? [Stress and anxiety]" (a Google Forms grid row) -> "Stress and anxiety".
const topicFromHeader = (header: string) => header.match(/\[([^\]]+)\]\s*$/)?.[1].trim() ?? header;

function headerRowIndex(sheet: Sheet) {
  const i = sheet.findIndex((r) => r.filter((c) => clean(c)).length >= 2);
  return i < 0 ? 0 : i;
}

function answerRows(sheet: Sheet) {
  return sheet.slice(headerRowIndex(sheet) + 1).filter((r) => r.some((c) => clean(c)));
}

export function findColumns(sheet: Sheet): { columns: Column[]; respondents: number } {
  const headers = sheet[headerRowIndex(sheet)] ?? [];
  const rows = answerRows(sheet);
  const width = Math.max(headers.length, ...rows.map((r) => r.length));
  const columns: Column[] = [];

  for (let i = 0; i < width; i++) {
    const header = clean(headers[i]) || `Column ${i + 1}`;
    if (IDENTITY.test(header) || OPEN_ENDED.test(header)) continue;
    const values = rows.map((r) => clean(r[i])).filter((v) => v && !BLANKISH.has(key(v)));
    if (!values.length) continue;

    if (values.every((v) => YES.has(key(v)) || NO.has(key(v)))) {
      if (values.some((v) => YES.has(key(v)))) columns.push({ index: i, header, kind: "checkbox", topics: [topicFromHeader(header)], isGroup: false });
      continue;
    }

    // Count each pick, keeping the first spelling of each.
    const counts = new Map<string, { topic: string; count: number }>();
    for (const v of values) {
      for (const p of splitChoices(v)) {
        const k = key(p);
        const c = counts.get(k);
        if (c) c.count++;
        else counts.set(k, { topic: p, count: 1 });
      }
    }
    const picks = [...counts.values()];
    const recurring = picks.filter((p) => p.count >= 2).length;
    const isGroup = GROUP.test(header) && values.every((v) => splitChoices(v).length === 1);
    // Free-text answers are long and rarely repeat; choices are short and do.
    // A "You are a..." question counts even when few answered.
    const looksLikeChoices =
      picks.length <= 30 && picks.every((p) => p.topic.length <= 90) && (isGroup || recurring >= Math.ceil(picks.length / 2));
    if (!looksLikeChoices) continue;

    columns.push({ index: i, header, kind: "choice", topics: picks.sort((a, b) => b.count - a.count).map((p) => p.topic), isGroup });
  }
  return { columns, respondents: rows.length };
}

// The column to split results by: a "You are a..." question first, then grade/course.
export function suggestedGroupColumn(columns: Column[]): number | null {
  const groups = columns.filter((c) => c.isGroup);
  return (groups.find((c) => ROLE_GROUP.test(c.header)) ?? groups[0])?.index ?? null;
}

// ---- Tallying ----

// How many respondents picked each topic (a person counts once per topic even
// if two questions list it), overall and per group.
export function tallySheet(sheet: Sheet, topicColumns: Column[], groupIndex: number | null): { respondents: number; tally: TopicCount[]; groups: GroupTally[] } {
  const rows = answerRows(sheet);
  const canonical = new Map<string, string>();
  for (const c of topicColumns) for (const t of c.topics) if (!canonical.has(key(t))) canonical.set(key(t), t);

  const overall = new Map<string, number>();
  const byGroup = new Map<string, { respondents: number; counts: Map<string, number> }>();
  const groupNames = new Map<string, string>();

  for (const row of rows) {
    const picked = new Set<string>();
    for (const c of topicColumns) {
      const v = clean(row[c.index]);
      if (!v) continue;
      if (c.kind === "checkbox") {
        if (YES.has(key(v))) picked.add(canonical.get(key(c.topics[0]))!);
      } else {
        for (const p of splitChoices(v)) {
          const t = canonical.get(key(p));
          if (t) picked.add(t);
        }
      }
    }
    for (const t of picked) overall.set(t, (overall.get(t) ?? 0) + 1);

    if (groupIndex !== null) {
      const raw = clean(row[groupIndex]);
      const g = raw ? (groupNames.get(key(raw)) ?? raw) : "Not stated";
      groupNames.set(key(g), g);
      const entry = byGroup.get(g) ?? { respondents: 0, counts: new Map<string, number>() };
      entry.respondents++;
      for (const t of picked) entry.counts.set(t, (entry.counts.get(t) ?? 0) + 1);
      byGroup.set(g, entry);
    }
  }

  const sorted = (counts: Map<string, number>) =>
    [...canonical.values()].map((topic) => ({ topic, count: counts.get(topic) ?? 0 })).sort((a, b) => b.count - a.count);

  return {
    respondents: rows.length,
    tally: sorted(overall),
    groups: [...byGroup.entries()]
      .map(([group, e]) => ({ group, respondents: e.respondents, tally: sorted(e.counts) }))
      .sort((a, b) => b.respondents - a.respondents),
  };
}
