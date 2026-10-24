import { test } from "node:test";
import assert from "node:assert/strict";
import { deflateRawSync } from "node:zlib";
import { findColumns, parseCsv, readXlsx, splitChoices, suggestedGroupColumn, tallySheet } from "../lib/needsUpload.ts";
import { buildXlsx } from "../lib/xlsx.ts";

// A Google Forms responses export, trimmed.
const FORMS_CSV = [
  'Timestamp,Email Address,Full name,You are a,Which concerns would you like help with?,Anything else?',
  '2026/10/01 8:00:00 AM,a@x.ph,"Cruz, Ana",Student,"Stress and anxiety, Study habits and time management",I get nervous during exams',
  '2026/10/01 8:05:00 AM,b@x.ph,"Reyes, Ben",Student,Stress and anxiety,',
  '2026/10/01 8:10:00 AM,c@x.ph,"Lim, Cara",Parent,"Family concerns, Stress and anxiety",My child is always on the phone at night',
  '2026/10/01 8:20:00 AM,d@x.ph,"Tan, Dan",Faculty,"Study habits and time management, Family concerns",N/A',
].join("\r\n");

test("CSV fields keep quoted commas and line breaks", () => {
  assert.deepEqual(parseCsv('a,"b, c","say ""hi""\nthere"\r\n1,2,3'), [["a", "b, c", 'say "hi"\nthere'], ["1", "2", "3"]]);
});

test("checkbox answers split on commas, keeping lowercase continuations", () => {
  assert.deepEqual(splitChoices("Stress and anxiety, Friends, family, and school"), ["Stress and anxiety", "Friends, family, and school"]);
});

test("finds the topic question and the respondent group in a Google Forms export", () => {
  const sheet = parseCsv(FORMS_CSV);
  const { columns, respondents } = findColumns(sheet);
  assert.equal(respondents, 4);
  // Timestamp, email, name and the free-text question are left out.
  assert.deepEqual(columns.map((c) => c.header), ["You are a", "Which concerns would you like help with?"]);
  assert.equal(suggestedGroupColumn(columns), 3);

  const topics = columns.filter((c) => !c.isGroup);
  const result = tallySheet(sheet, topics, 3);
  assert.deepEqual(result.tally, [
    { topic: "Stress and anxiety", count: 3 },
    { topic: "Study habits and time management", count: 2 },
    { topic: "Family concerns", count: 2 },
  ]);
  assert.deepEqual(result.groups.map((g) => [g.group, g.respondents, g.tally[0].topic]), [["Student", 2, "Stress and anxiety"], ["Parent", 1, "Stress and anxiety"], ["Faculty", 1, "Study habits and time management"]]);
});

test("paper checklists typed into Excel: each topic a column, ticked or blank", async () => {
  const rows = [
    ["Name", "Grade level", "Bullying", "Self-esteem", "Online safety"],
    ["Ana", "Grade 11", "✓", "", "✓"],
    ["Ben", "Grade 12", "", "", "✓"],
    ["Cara", "Grade 11", "x", "", ""],
  ];
  const sheet = await readXlsx(await buildXlsx(rows).arrayBuffer());
  const { columns } = findColumns(sheet);
  // Self-esteem has no ticks, so it isn't offered as a topic.
  assert.deepEqual(columns.map((c) => [c.header, c.kind]), [["Grade level", "choice"], ["Bullying", "checkbox"], ["Online safety", "checkbox"]]);
  const { tally } = tallySheet(sheet, columns.filter((c) => !c.isGroup), null);
  assert.deepEqual(tally, [{ topic: "Bullying", count: 2 }, { topic: "Online safety", count: 2 }]);
});

test("reads compressed workbooks with shared strings, as Excel and Google Sheets save them", async () => {
  const files: Record<string, string> = {
    "xl/workbook.xml": '<workbook><sheets><sheet name="Responses" sheetId="1" r:id="rId3"/></sheets></workbook>',
    "xl/_rels/workbook.xml.rels": '<Relationships><Relationship Id="rId3" Target="worksheets/sheet2.xml"/></Relationships>',
    "xl/sharedStrings.xml": "<sst><si><t>Concern</t></si><si><r><t>Stress &amp; </t></r><r><t>anxiety</t></r></si></sst>",
    "xl/worksheets/sheet2.xml": '<worksheet><sheetData><row r="1"><c r="A1" t="s"><v>0</v></c><c r="C1" t="inlineStr"><is><t>Count</t></is></c></row><row r="2"><c r="A2" t="s"><v>1</v></c><c r="C2"><v>3</v></c></row></sheetData></worksheet>',
  };
  assert.deepEqual(await readXlsx(zipDeflated(files)), [["Concern", "", "Count"], ["Stress & anxiety", "", "3"]]);
});

function zipDeflated(files: Record<string, string>): ArrayBuffer {
  const chunks: Buffer[] = [];
  const central: Buffer[] = [];
  let offset = 0;
  for (const [name, text] of Object.entries(files)) {
    const nameBytes = Buffer.from(name);
    const raw = Buffer.from(text);
    const data = deflateRawSync(raw);
    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(8, 8);
    local.writeUInt32LE(data.length, 18);
    local.writeUInt32LE(raw.length, 22);
    local.writeUInt16LE(nameBytes.length, 26);
    const entry = Buffer.alloc(46);
    entry.writeUInt32LE(0x02014b50, 0);
    entry.writeUInt16LE(8, 10);
    entry.writeUInt32LE(data.length, 20);
    entry.writeUInt32LE(raw.length, 24);
    entry.writeUInt16LE(nameBytes.length, 28);
    entry.writeUInt32LE(offset, 42);
    chunks.push(local, nameBytes, data);
    central.push(entry, nameBytes);
    offset += 30 + nameBytes.length + data.length;
  }
  const cd = Buffer.concat(central);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(Object.keys(files).length, 8);
  end.writeUInt16LE(Object.keys(files).length, 10);
  end.writeUInt32LE(cd.length, 12);
  end.writeUInt32LE(offset, 16);
  const all = Buffer.concat([...chunks, cd, end]);
  return all.buffer.slice(all.byteOffset, all.byteOffset + all.length);
}
