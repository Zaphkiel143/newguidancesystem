"use client";

import React, { useCallback, useEffect, useState } from 'react';
import { Search, X, Loader2, Plus, Download } from 'lucide-react';
import { listStudentProfiles, getStudentProfile, saveStudentProfile, type StudentProfileInput } from '../../action/counselor';
import { DEPARTMENTS, IRREGULAR, SHS, TERTIARY, normalizeDepartment, programsFor, yearLevelsFor } from '../../config/studentLevels';
import { formatPhone } from '../../../lib/phone';
import { CAREER_STEPS } from '../../config/careerSteps';
import InlineError from '../../../components/InlineError';

type Row = Awaited<ReturnType<typeof listStudentProfiles>>[number];
type Detail = Awaited<ReturnType<typeof getStudentProfile>>;

const EMPTY: StudentProfileInput = {
  studentId: "", name: "", department: SHS, yearLevel: "", section: "", strandOrProgram: "", email: "", phone: "",
  birthDate: "", address: "", guardianName: "", guardianContact: "", familyBackground: "",
  educationalHistory: "", counselorNotes: "",
};

function toInput(row: Row): StudentProfileInput {
  return {
    id: row.id,
    studentId: row.studentId,
    name: row.name,
    department: normalizeDepartment(row.department) ?? SHS,
    // Older records only have the combined label ("Grade 12 - STEM-A").
    yearLevel: row.yearLevel ?? row.gradeSection.split(" - ")[0] ?? "",
    section: row.section ?? row.gradeSection.split(" - ").slice(1).join(" - "),
    strandOrProgram: row.strandOrProgram ?? "",
    email: row.email ?? "",
    phone: row.phone ?? "",
    birthDate: row.birthDate ?? "",
    address: row.address ?? "",
    guardianName: row.guardianName ?? "",
    guardianContact: row.guardianContact ?? "",
    familyBackground: row.familyBackground ?? "",
    educationalHistory: row.educationalHistory ?? "",
    counselorNotes: row.counselorNotes ?? "",
  };
}

export default function StudentInventory() {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [query, setQuery] = useState("");
  const [department, setDepartment] = useState("All");
  const [viewing, setViewing] = useState<Row | null>(null);
  const [detail, setDetail] = useState<Detail | null>(null);
  const [form, setForm] = useState<StudentProfileInput | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [downloadError, setDownloadError] = useState<string | null>(null);

  const load = useCallback(async () => setRows(await listStudentProfiles()), []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const data = await listStudentProfiles();
      if (cancelled) return;
      setRows(data);
      // Opened from the dashboard search: /inventory?student=<record id>
      const wanted = new URLSearchParams(window.location.search).get("student");
      const row = wanted ? data.find((r) => r.id === wanted) : undefined;
      if (row) setViewing(row);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Load the details whenever a student is opened (from the list or a link).
  useEffect(() => {
    if (!viewing) return;
    let cancelled = false;
    getStudentProfile(viewing.name).then((d) => {
      if (!cancelled) setDetail(d);
    });
    return () => {
      cancelled = true;
    };
  }, [viewing]);

  const q = query.trim().toLowerCase();
  const filtered = (rows ?? []).filter(
    (r) =>
      (department === "All" || normalizeDepartment(r.department) === department) &&
      (!q || r.name.toLowerCase().includes(q) || r.studentId.toLowerCase().includes(q) || r.gradeSection.toLowerCase().includes(q))
  );

  const openStudent = (row: Row) => {
    setDetail(null);
    setDownloadError(null);
    setViewing(row);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form) return;
    setIsSaving(true);
    setFormError(null);
    const result = await saveStudentProfile(form);
    setIsSaving(false);
    if (result.success) {
      setForm(null);
      await load();
      if (viewing) {
        setViewing(null);
        setDetail(null);
      }
    } else {
      setFormError(result.error || "Couldn't save this record.");
    }
  };

  // Opens the file in a new tab (PDFs and photos) or downloads it (Word files).
  const download = (id: string) => {
    setDownloadError(null);
    window.open(`/api/files/document/${id}`, "_blank", "noopener");
  };

  return (
    <div className="px-5 sm:px-8 lg:px-12 pt-8 lg:pt-12 pb-16 max-w-7xl text-slate-800">
      <header className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1 className="page-title">Individual Inventory</h1>
          <p className="text-sm text-slate-500 mt-1">One record per student: profile, family background, sessions, career plan, referrals, and documents</p>
        </div>
        <button onClick={() => { setForm({ ...EMPTY }); setFormError(null); }}
          className="self-start sm:self-auto inline-flex items-center gap-2 bg-blue-700 hover:bg-blue-800 text-white text-sm font-medium px-4 min-h-11 rounded-full transition-colors">
          <Plus size={16} /> Add student
        </button>
      </header>

      <div className="mt-8 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={17} />
          <input type="text" aria-label="Search by name, student ID, or section" placeholder="Search by name, student ID, or section"
            value={query} onChange={(e) => setQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-sheet border border-slate-300 rounded-md text-sm" />
        </div>
        <select aria-label="Filter by department" value={department} onChange={(e) => setDepartment(e.target.value)}
          className="bg-sheet border border-slate-300 rounded-md px-3 py-2.5 text-sm">
          <option value="All">All departments</option>
          <option value={SHS}>Senior High School</option>
          <option value={TERTIARY}>Tertiary</option>
          <option value={IRREGULAR}>Irregular</option>
        </select>
      </div>

      {rows === null ? (
        <div className="py-20 flex justify-center text-slate-500"><Loader2 className="animate-spin" size={20} /></div>
      ) : (
        <div className="mt-6 overflow-x-auto border-y border-rule">
          <table className="w-full text-sm text-left">
            <thead className="text-[13px] text-slate-500">
              <tr className="border-b border-rule">
                <th className="py-3 pr-4 font-medium hidden sm:table-cell">Student ID</th>
                <th className="py-3 pr-4 font-medium">Name</th>
                <th className="py-3 pr-4 font-medium hidden sm:table-cell">Grade & section</th>
                <th className="py-3 pr-4 font-medium hidden md:table-cell">Last session</th>
                <th className="py-3 font-medium"><span className="sr-only">Actions</span></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-rule">
              {filtered.length === 0 ? (
                <tr><td colSpan={5} className="py-6 text-slate-500">{rows.length === 0 ? "No student records yet. Add one to get started." : "No students match your search."}</td></tr>
              ) : (
                filtered.map((r) => (
                  <tr key={r.id}>
                    <td className="py-3 pr-4 font-mono text-[13px] text-slate-600 hidden sm:table-cell">{r.studentId}</td>
                    <td className="py-3 pr-4 font-medium text-ink">
                      {r.name}
                      <span className="sm:hidden block text-[12px] font-normal text-slate-500">
                        <span className="font-mono">{r.studentId}</span> · {r.gradeSection}
                      </span>
                    </td>
                    <td className="py-3 pr-4 text-slate-600 hidden sm:table-cell">{r.gradeSection}</td>
                    <td className="py-3 pr-4 font-mono text-[13px] text-slate-600 hidden md:table-cell">
                      {r.lastSession ? new Date(r.lastSession).toLocaleDateString("en-PH", { timeZone: "UTC", month: "short", day: "numeric", year: "numeric" }) : "—"}
                    </td>
                    <td className="py-2 text-right whitespace-nowrap">
                      <button onClick={() => openStudent(r)} className="px-3 min-h-9 rounded-full text-blue-700 hover:bg-blue-50">Open</button>
                      <button onClick={() => { setForm(toInput(r)); setFormError(null); }} className="px-3 min-h-9 rounded-full text-slate-600 hover:bg-slate-100">Edit</button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Student record panel */}
      {viewing && (
        <div className="fixed inset-0 z-50 flex justify-end bg-ink/30" onClick={() => setViewing(null)}>
          <aside role="dialog" aria-modal="true" aria-labelledby="student-title" onClick={(e) => e.stopPropagation()}
            className="w-full max-w-2xl h-full overflow-y-auto bg-paper border-l border-rule shadow-xl">
            <div className="sticky top-0 bg-paper border-b border-rule px-6 py-5 flex items-start justify-between gap-4">
              <div>
                <h2 id="student-title" className="font-serif text-[26px] leading-tight text-ink">{viewing.name}</h2>
                <p className="font-mono text-[13px] text-slate-500 mt-0.5">{viewing.studentId} · {viewing.gradeSection}</p>
              </div>
              <div className="flex gap-1">
                <button onClick={() => { setForm(toInput(viewing)); setFormError(null); }} className="px-3 min-h-11 rounded-full text-sm text-slate-700 hover:bg-slate-100">Edit</button>
                <button onClick={() => setViewing(null)} aria-label="Close" className="w-11 h-11 grid place-items-center text-slate-500 hover:text-ink hover:bg-slate-100 rounded-full"><X size={18} /></button>
              </div>
            </div>

            {!detail ? (
              <div className="py-20 flex justify-center text-slate-500"><Loader2 className="animate-spin" size={20} /></div>
            ) : (
              <div className="px-6 py-6 space-y-9">
                <Section title="Personal & family">
                  <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4 text-sm">
                    <Field label="Department" value={detail.profile?.department} />
                    <Field label="Strand / program" value={detail.profile?.strandOrProgram} />
                    <Field label="Email" value={detail.profile?.email} />
                    <Field label="Phone" value={detail.profile?.phone} />
                    <Field label="Date of birth" value={detail.profile?.birthDate} />
                    <Field label="Address" value={detail.profile?.address} />
                    <Field label="Guardian" value={detail.profile?.guardianName} />
                    <Field label="Guardian contact" value={detail.profile?.guardianContact} />
                    <Field label="Linked parent accounts" value={
                      detail.parents.length ? detail.parents.map((p) => `${p.parent.name} (${p.relationship.toLowerCase()}${p.parent.phone ? `, ${formatPhone(p.parent.phone)}` : ""})`).join("; ") : null
                    } />
                  </dl>
                  <LongField label="Family background" value={detail.profile?.familyBackground} />
                  <LongField label="Educational history" value={detail.profile?.educationalHistory} />
                  <LongField label="Associate notes (only you can see these)" value={detail.profile?.counselorNotes} />
                </Section>

                <Section title={`Sessions (${detail.appointments.length})`}>
                  {detail.appointments.length === 0 ? <Empty>No sessions yet.</Empty> : (
                    <ul className="divide-y divide-rule border-t border-rule">
                      {detail.appointments.map((a) => (
                        <li key={a.id} className="py-3 text-sm">
                          <p className="flex justify-between gap-3">
                            <span className="text-ink font-medium">{a.appointmentType || "General consultation"}</span>
                            <span className="font-mono text-[13px] text-slate-500">{new Date(a.date).toLocaleDateString("en-PH", { timeZone: "UTC", month: "short", day: "numeric", year: "numeric" })} · {a.time}</span>
                          </p>
                          {a.notes && <p className="text-slate-600 mt-1 whitespace-pre-wrap">{a.notes}</p>}
                        </li>
                      ))}
                    </ul>
                  )}
                </Section>

                <Section title="Career Planning Program">
                  {!detail.careerPlan ? <Empty>Not in the Career Planning Program.</Empty> : (
                    <ol className="divide-y divide-rule border-t border-rule text-sm">
                      {CAREER_STEPS.map((step, i) => (
                        <li key={step} className="py-2.5 flex justify-between gap-3">
                          <span className={detail.careerPlan!.stepDates[i] ? "text-ink" : "text-slate-500"}>{i + 1}. {step}</span>
                          <span className="text-xs text-slate-500">{detail.careerPlan!.stepDates[i] || "Not yet"}</span>
                        </li>
                      ))}
                    </ol>
                  )}
                </Section>

                <Section title={`Referrals (${detail.referrals.length})`}>
                  {detail.referrals.length === 0 ? <Empty>No referrals.</Empty> : (
                    <ul className="divide-y divide-rule border-t border-rule text-sm">
                      {detail.referrals.map((r) => (
                        <li key={r.id} className="py-3">
                          <p className="text-ink font-medium">{r.concernType} <span className="text-slate-500 font-normal">· {r.status.replace("_", " ").toLowerCase()}</span></p>
                          <p className="text-[13px] text-slate-500">From {r.referrerName} ({r.referrerRole}) · {new Date(r.createdAt).toLocaleDateString("en-PH", { month: "short", day: "numeric" })}</p>
                        </li>
                      ))}
                    </ul>
                  )}
                </Section>

                <Section title={`Documents (${detail.documents.length})`}>
                  {detail.documents.length === 0 ? <Empty>No documents submitted.</Empty> : (
                    <ul className="divide-y divide-rule border-t border-rule text-sm">
                      {detail.documents.map((d) => (
                        <li key={d.id} className="py-2.5 flex items-center justify-between gap-3">
                          <span className="min-w-0">
                            <span className="block text-ink truncate">{d.fileName}</span>
                            <span className="block text-xs text-slate-500">{d.category ?? "Document"} · {new Date(d.createdAt).toLocaleDateString("en-PH", { month: "short", day: "numeric" })}</span>
                          </span>
                          <button onClick={() => download(d.id)} aria-label={`Download ${d.fileName}`}
                            className="w-11 h-11 shrink-0 grid place-items-center rounded-full text-slate-600 hover:bg-slate-100"><Download size={16} /></button>
                        </li>
                      ))}
                    </ul>
                  )}
                  <InlineError message={downloadError} onDismiss={() => setDownloadError(null)} className="mt-2" />
                </Section>

                <Section title="Who opened this record">
                  {detail.accessLog.length === 0 ? <Empty>No one has opened it yet.</Empty> : (
                    <ul className="divide-y divide-rule border-t border-rule">
                      {detail.accessLog.map((a) => (
                        <li key={a.id} className="py-2.5 text-sm flex flex-wrap justify-between gap-x-4 gap-y-0.5">
                          <span className="text-ink">
                            {a.viewerName} <span className="text-slate-500">({a.viewerRole.toLowerCase()})</span>
                            <span className="block text-[13px] text-slate-600">{a.action}</span>
                          </span>
                          <span className="font-mono text-[12px] text-slate-500 shrink-0">
                            {new Date(a.createdAt).toLocaleString("en-PH", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit", timeZone: "Asia/Manila" })}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                  <p className="mt-2 text-xs text-slate-500">Kept for confidentiality (Data Privacy Act, RA 10173). Shows the 30 most recent.</p>
                </Section>
              </div>
            )}
          </aside>
        </div>
      )}

      {/* Add / edit form */}
      {form && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-ink/40 p-4" onClick={() => setForm(null)}>
          <form role="dialog" aria-modal="true" aria-labelledby="form-title" onSubmit={handleSave} onClick={(e) => e.stopPropagation()}
            className="bg-sheet w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-xl border border-rule shadow-xl">
            <div className="sticky top-0 bg-sheet border-b border-rule px-6 py-4 flex items-center justify-between">
              <h2 id="form-title" className="font-medium text-ink">{form.id ? `Edit ${form.name}` : "Add a student"}</h2>
              <button type="button" onClick={() => setForm(null)} aria-label="Close" className="w-11 h-11 -m-2 grid place-items-center text-slate-500 hover:text-ink hover:bg-slate-100 rounded-full"><X size={18} /></button>
            </div>
            <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input label="Student ID *" value={form.studentId} onChange={(v) => setForm({ ...form, studentId: v })} required />
              <Input label="Full name *" value={form.name} onChange={(v) => setForm({ ...form, name: v })} required
                hint={form.id ? "Renaming also updates this student's appointments, referrals and account." : undefined} />
              <fieldset className="sm:col-span-2">
                <legend className="block text-[13px] font-medium text-slate-700 mb-1.5">Level *</legend>
                <div className="grid grid-cols-3 gap-2 max-w-md">
                  {DEPARTMENTS.map((d) => (
                    <label key={d} className={`flex items-center gap-2 rounded-md border px-3 min-h-11 cursor-pointer text-sm ${form.department === d ? "border-blue-600 bg-blue-50" : "border-slate-300"}`}>
                      <input type="radio" name="f-dept" className="accent-blue-700" checked={form.department === d}
                        onChange={() => setForm({ ...form, department: d, yearLevel: "", strandOrProgram: "" })} />
                      {d === SHS ? "Senior High School" : d}
                    </label>
                  ))}
                </div>
              </fieldset>
              <div>
                <label htmlFor="f-year" className="block text-[13px] font-medium text-slate-700 mb-1.5">{form.department === SHS ? "Grade *" : "Year level *"}</label>
                <select id="f-year" value={form.yearLevel} required onChange={(e) => setForm({ ...form, yearLevel: e.target.value })}
                  className="w-full bg-paper border border-slate-300 rounded-md px-3 py-2.5 text-sm">
                  <option value="" disabled>Choose…</option>
                  {yearLevelsFor(form.department).map((y) => <option key={y} value={y}>{y}</option>)}
                </select>
              </div>
              <div>
                <label htmlFor="f-program" className="block text-[13px] font-medium text-slate-700 mb-1.5">{form.department === SHS ? "Strand" : "Course"}</label>
                <select id="f-program" value={form.strandOrProgram} onChange={(e) => setForm({ ...form, strandOrProgram: e.target.value })}
                  className="w-full bg-paper border border-slate-300 rounded-md px-3 py-2.5 text-sm">
                  <option value="">Not set</option>
                  {form.strandOrProgram && !programsFor(form.department).includes(form.strandOrProgram) && (
                    <option value={form.strandOrProgram}>{form.strandOrProgram} (older record)</option>
                  )}
                  {programsFor(form.department).map((p) => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
              <Input label="Section" placeholder="e.g. A" value={form.section} onChange={(v) => setForm({ ...form, section: v })} />
              <Input label="School email" type="email" value={form.email} onChange={(v) => setForm({ ...form, email: v })} />
              <Input label="Phone" value={form.phone} onChange={(v) => setForm({ ...form, phone: v })} />
              <Input label="Date of birth" type="date" value={form.birthDate} onChange={(v) => setForm({ ...form, birthDate: v })} />
              <div className="sm:col-span-2"><Input label="Address" value={form.address} onChange={(v) => setForm({ ...form, address: v })} /></div>
              <Input label="Guardian name" value={form.guardianName} onChange={(v) => setForm({ ...form, guardianName: v })} />
              <Input label="Guardian contact" value={form.guardianContact} onChange={(v) => setForm({ ...form, guardianContact: v })} />
              <p className="sm:col-span-2 text-xs text-slate-500">
                Parents link themselves with this student&apos;s ID; you confirm them under Accounts &amp; approvals.
              </p>
              <TextArea label="Family background" value={form.familyBackground} onChange={(v) => setForm({ ...form, familyBackground: v })} />
              <TextArea label="Educational history" value={form.educationalHistory} onChange={(v) => setForm({ ...form, educationalHistory: v })} />
              <div className="sm:col-span-2">
                <TextArea label="Associate notes (confidential)" value={form.counselorNotes} onChange={(v) => setForm({ ...form, counselorNotes: v })} />
              </div>
            </div>
            <div className="sticky bottom-0 bg-sheet border-t border-rule px-6 py-4 space-y-3">
              <InlineError message={formError} onDismiss={() => setFormError(null)} />
              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => setForm(null)} className="px-4 min-h-11 rounded-full text-sm text-slate-600 hover:bg-slate-100">Cancel</button>
                <button type="submit" disabled={isSaving}
                  className="inline-flex items-center gap-2 bg-blue-700 hover:bg-blue-800 disabled:opacity-60 text-white text-sm font-medium px-4 min-h-11 rounded-full transition-colors">
                  {isSaving && <Loader2 size={16} className="animate-spin" />} Save record
                </button>
              </div>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h3 className="font-serif text-xl text-ink mb-3">{title}</h3>
      <div className="space-y-4">{children}</div>
    </section>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <p className="border-t border-rule pt-3 text-sm text-slate-500">{children}</p>;
}

function Field({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div>
      <dt className="text-xs text-slate-500">{label}</dt>
      <dd className="text-ink mt-0.5">{value || "—"}</dd>
    </div>
  );
}

function LongField({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div className="text-sm">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="text-ink mt-0.5 whitespace-pre-wrap">{value || "—"}</p>
    </div>
  );
}

function Input({ label, value, onChange, type = "text", required, placeholder, hint }: {
  label: string; value: string; onChange: (v: string) => void; type?: string; required?: boolean; placeholder?: string; hint?: string;
}) {
  const id = `f-${label.replace(/\W+/g, "-").toLowerCase()}`;
  return (
    <div>
      <label htmlFor={id} className="block text-[13px] font-medium text-slate-700 mb-1.5">{label}</label>
      <input id={id} type={type} value={value} required={required} placeholder={placeholder} onChange={(e) => onChange(e.target.value)}
        className="w-full bg-paper border border-slate-300 rounded-md px-3 py-2.5 text-sm" />
      {hint && <p className="text-xs text-slate-500 mt-1">{hint}</p>}
    </div>
  );
}

function TextArea({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  const id = `f-${label.replace(/\W+/g, "-").toLowerCase()}`;
  return (
    <div>
      <label htmlFor={id} className="block text-[13px] font-medium text-slate-700 mb-1.5">{label}</label>
      <textarea id={id} rows={3} value={value} onChange={(e) => onChange(e.target.value)}
        className="w-full bg-paper border border-slate-300 rounded-md px-3 py-2.5 text-sm resize-y" />
    </div>
  );
}
