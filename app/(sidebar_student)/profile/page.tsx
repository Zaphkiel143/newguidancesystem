"use client";

import LevelPicker from "../../../components/LevelPicker";
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Loader2, Upload, FileText, Pencil } from 'lucide-react';
import { getMyProfile, saveMyStudentInfo, submitStudentDocument, type MyStudentInfo } from '../../action/student';
import InlineError from '../../../components/InlineError';
import PhotoPicker from '../../../components/PhotoPicker';
import AuthenticatorSetup from '../../../components/AuthenticatorSetup';
import ThemeSetting from '../../../components/ThemeSetting';
import { PushToggle } from '../../../components/LoginApproval';
import { ACCEPTED_FILE_TYPES } from '../../config/documents';
import { SECTION_PROGRAMS, SHS, STUDENT_ID_DIGITS, isShs, normalizeDepartment, splitCollegeSection, yearSectionsFor } from '../../config/studentLevels';
import { capitalizeName, phoneChars } from '../../config/collegeCareerForm';
import { optionValue } from '../../../lib/optionListDefaults';
import { useOptionList } from '../../../components/useOptionList';

type MyProfile = NonNullable<Awaited<ReturnType<typeof getMyProfile>>>;
type Profile = NonNullable<MyProfile["profile"]>;

const REVIEW: Record<string, { label: string; className: string }> = {
  PENDING: { label: "Waiting for review", className: "text-orange-700 bg-orange-50" },
  APPROVED: { label: "Accepted", className: "text-emerald-700 bg-emerald-50" },
  REJECTED: { label: "Not accepted", className: "text-red-700 bg-red-50" },
};

const MAX_BYTES = 5 * 1024 * 1024;
const inputClass = "w-full bg-sheet border border-slate-300 rounded-md px-3 py-2.5 text-sm";
const labelClass = "block text-[13px] font-medium text-slate-700 mb-1.5";

function readAsBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(",")[1] ?? "");
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

// The edit form's starting values: what's on file, or blanks for a new record.
// Older records only have the combined "Grade 12 - STEM-A" label and phone
// numbers with spaces or dashes, so those are split and cleaned here.
function formFrom(p: Profile | null | undefined) {
  const [labelYear, ...labelSection] = (p?.gradeSection ?? '').split(' - ');
  const section = p?.section ?? (labelSection.join(' - ') || '');
  const college = splitCollegeSection(section);
  return {
    studentId: p?.studentId ?? '',
    department: (normalizeDepartment(p?.department) ?? SHS) as string,
    yearLevel: p?.yearLevel ?? (labelSection.length ? labelYear : ''),
    program: p?.strandOrProgram ?? '',
    section: college ? '' : section,
    sectionCode: college?.code ?? '',
    yearSection: college?.yearSection ?? '',
    phone: phoneChars(p?.phone ?? ''),
    birthDate: p?.birthDate ?? '',
    address: p?.address ?? '',
    guardianName: p?.guardianName ?? '',
    guardianContact: phoneChars(p?.guardianContact ?? ''),
  };
}

const StudentProfile: React.FC = () => {
  const [departments] = useOptionList("departments");
  const [documentCategories] = useOptionList("documentCategories");
  const [shsStrands] = useOptionList("shsStrands");
  const [tertiaryCourses] = useOptionList("tertiaryCourses");
  const [shsGrades] = useOptionList("shsGrades");
  const [tertiaryYears] = useOptionList("tertiaryYears");
  const [data, setData] = useState<MyProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [category, setCategory] = useState<string>("Excuse letter");
  const [editing, setEditing] = useState(false);
  const [info, setInfo] = useState(() => formFrom(null));
  const [infoState, setInfoState] = useState<{ busy: boolean; error: string | null; saved: boolean }>({ busy: false, error: null, saved: false });
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploaded, setUploaded] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    const result = await getMyProfile();
    setData(result);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const result = await getMyProfile();
      if (cancelled) return;
      setData(result);
      setInfo(formFrom(result?.profile));
      setIsLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    setUploadError(null);
    setUploaded(null);
    if (!file) return setUploadError("Choose a file to submit.");
    if (file.size > MAX_BYTES) return setUploadError("Files must be 5 MB or smaller.");

    setIsUploading(true);
    const result = await submitStudentDocument({
      category,
      fileName: file.name,
      fileType: file.type || "application/octet-stream",
      fileSize: file.size,
      dataBase64: await readAsBase64(file),
    });
    setIsUploading(false);

    if (result.success) {
      setUploaded(`${file.name} was sent. The guidance office will check it; you'll get a notification.`);
      setFile(null);
      if (fileInput.current) fileInput.current.value = "";
      await load();
    } else {
      setUploadError(result.error || "Couldn't submit the file.");
    }
  };

  const infoIsShs = isShs(info.department);

  const saveInfo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!infoIsShs && (!info.sectionCode || !info.yearSection)) {
      return setInfoState({ busy: false, saved: false, error: "Choose your section's program and year-section." });
    }
    setInfoState({ busy: true, error: null, saved: false });
    const payload: MyStudentInfo = {
      studentId: info.studentId,
      department: info.department,
      yearLevel: info.yearLevel,
      program: info.program,
      section: infoIsShs ? info.section : `${info.sectionCode} ${info.yearSection}`,
      phone: info.phone,
      birthDate: info.birthDate,
      address: info.address,
      guardianName: info.guardianName,
      guardianContact: info.guardianContact,
    };
    const hadProfile = Boolean(data?.profile);
    const result = await saveMyStudentInfo(payload);
    if (!result.success) return setInfoState({ busy: false, saved: false, error: result.error ?? "Couldn't save." });
    // A new record (or a new level) changes the menu, e.g. My Career Plan for senior high.
    if (!hadProfile || data?.profile?.department !== info.department) return window.location.reload();
    await load();
    setEditing(false);
    setInfoState({ busy: false, error: null, saved: true });
  };

  const p = data?.profile;
  const showForm = !p || editing;

  return (
    <div className="px-5 sm:px-8 lg:px-12 pt-8 lg:pt-12 pb-16 max-w-5xl text-slate-800 space-y-8">
      <header>
        <h1 className="page-title">My Profile</h1>
      </header>

      {isLoading ? (
        <div className="py-20 flex justify-center text-slate-500">
          <Loader2 className="animate-spin" size={20} />
        </div>
      ) : !data ? (
        <p className="text-sm text-red-700">Couldn&apos;t load your profile. Try refreshing the page.</p>
      ) : (
        <>
          <section className="bg-white border border-rule rounded-xl overflow-hidden">
            <div className="px-6 py-6 flex flex-wrap items-center gap-5 border-b border-rule">
              <PhotoPicker name={data.name} hasPhoto={data.hasPhoto} compact />
              <div className="min-w-0 flex-1">
                <h2 className="font-serif text-[28px] leading-tight text-ink">{data.name}</h2>
                <p className="font-mono text-[13px] text-slate-500 mt-0.5">
                  {p ? `Student ID ${p.studentId}` : data.email}
                </p>
              </div>
              {p && !editing && (
                <button
                  type="button"
                  onClick={() => {
                    setInfo(formFrom(p));
                    setInfoState({ busy: false, error: null, saved: false });
                    setEditing(true);
                  }}
                  className="inline-flex items-center gap-2 border border-slate-300 hover:bg-slate-100 text-sm px-4 min-h-10 rounded-full"
                >
                  <Pencil size={15} /> Edit details
                </button>
              )}
            </div>
            {!showForm ? (
              <>
                <dl className="p-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-5 text-sm">
                  <Field label="Department" value={p.department} />
                  <Field label="Grade & section" value={p.gradeSection} />
                  <Field label="Strand / program" value={p.strandOrProgram} />
                  <Field label="School email" value={p.email} />
                  <Field label="Phone" value={p.phone} />
                  <Field label="Date of birth" value={p.birthDate} />
                  <Field label="Address" value={p.address} />
                  <Field label="Guardian" value={p.guardianName} />
                  <Field label="Guardian contact" value={p.guardianContact} />
                </dl>
                {infoState.saved && (
                  <p role="status" className="px-6 pb-5 text-sm text-emerald-700">Your details were saved.</p>
                )}
              </>
            ) : (
              <form onSubmit={saveInfo} className="p-6 space-y-5">
                {!p && (
                  <p className="text-sm text-slate-700">
                    <strong className="font-semibold">Add your school details</strong> so the guidance office can find your records.
                    You can change them here later.
                  </p>
                )}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="si-id" className={labelClass}>Student ID number</label>
                    <input id="si-id" className={inputClass} value={info.studentId} inputMode="numeric" required placeholder="02000123456"
                      aria-describedby="si-id-hint" onChange={(e) => setInfo({ ...info, studentId: e.target.value.replace(/\D/g, '').slice(0, STUDENT_ID_DIGITS) })} />
                    <p id="si-id-hint" className="text-[12px] text-slate-500 mt-1">Numbers only, {STUDENT_ID_DIGITS} digits.</p>
                  </div>
                  <div>
                    <label htmlFor="si-email" className={labelClass}>School email</label>
                    <input id="si-email" className={`${inputClass} text-slate-500`} value={data.email ?? ''} readOnly aria-describedby="si-email-hint" />
                    <p id="si-email-hint" className="text-[12px] text-slate-500 mt-1">You sign in with this, so it can&apos;t be changed here.</p>
                  </div>
                </div>
                <fieldset>
                  <legend className={labelClass}>Level</legend>
                  <LevelPicker name="si-dept" departments={departments} value={info.department} columns="grid-cols-2 sm:grid-cols-4"
                    onChange={(department, sameTrack) => setInfo(sameTrack ? { ...info, department } : { ...info, department, yearLevel: '', program: '', section: '', sectionCode: '', yearSection: '' })} />
                </fieldset>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label htmlFor="si-year" className={labelClass}>{infoIsShs ? "Grade" : "Year level"}</label>
                    <select id="si-year" className={inputClass} value={info.yearLevel} required
                      onChange={(e) => setInfo({ ...info, yearLevel: e.target.value, yearSection: '' })}>
                      <option value="" disabled>Choose…</option>
                      {(infoIsShs ? shsGrades : tertiaryYears).map((y) => <option key={y.id} value={optionValue(y)}>{y.label}</option>)}
                    </select>
                  </div>
                  <div>
                    <label htmlFor="si-program" className={labelClass}>{infoIsShs ? "Strand" : "Course"}</label>
                    <select id="si-program" className={inputClass} value={info.program} required
                      onChange={(e) => setInfo({ ...info, program: e.target.value })}>
                      <option value="" disabled>Choose…</option>
                      {(infoIsShs ? shsStrands : tertiaryCourses).map((x) => <option key={x.id} value={optionValue(x)}>{x.label}</option>)}
                    </select>
                  </div>
                  <div>
                    <label htmlFor="si-section" className={labelClass}>Section</label>
                    {infoIsShs ? (
                      <input id="si-section" className={inputClass} value={info.section} maxLength={30} required placeholder="e.g. STEM-A"
                        onChange={(e) => setInfo({ ...info, section: e.target.value })} />
                    ) : (
                      <div className="grid grid-cols-2 gap-2">
                        <select id="si-section" aria-label="Section program" className={inputClass} value={info.sectionCode} required
                          onChange={(e) => setInfo({ ...info, sectionCode: e.target.value })}>
                          <option value="">Program</option>
                          {SECTION_PROGRAMS.map((s) => <option key={s} value={s}>{s}</option>)}
                        </select>
                        <select aria-label="Year and section" className={inputClass} value={info.yearSection} required disabled={!info.yearLevel}
                          onChange={(e) => setInfo({ ...info, yearSection: e.target.value })}>
                          <option value="">{info.yearLevel ? "Section" : "Year first"}</option>
                          {yearSectionsFor(info.yearLevel).map((s) => <option key={s} value={s}>{s}</option>)}
                        </select>
                      </div>
                    )}
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="si-phone" className={labelClass}>Phone <span className="font-normal text-slate-500">(optional)</span></label>
                    <input id="si-phone" type="tel" inputMode="tel" className={inputClass} value={info.phone} placeholder="09171234567"
                      onChange={(e) => setInfo({ ...info, phone: phoneChars(e.target.value) })} />
                    <p className="text-[12px] text-slate-500 mt-1">Numbers only: 09XXXXXXXXX or +639XXXXXXXXX.</p>
                  </div>
                  <div>
                    <label htmlFor="si-birth" className={labelClass}>Date of birth <span className="font-normal text-slate-500">(optional)</span></label>
                    <input id="si-birth" type="date" className={inputClass} value={info.birthDate} max={new Date().toISOString().slice(0, 10)}
                      onChange={(e) => setInfo({ ...info, birthDate: e.target.value })} />
                  </div>
                </div>
                <div>
                  <label htmlFor="si-address" className={labelClass}>Address <span className="font-normal text-slate-500">(optional)</span></label>
                  <input id="si-address" className={inputClass} value={info.address} maxLength={300} placeholder="House no., street, barangay, city / municipality, province"
                    onChange={(e) => setInfo({ ...info, address: e.target.value })} />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="si-guardian" className={labelClass}>Guardian <span className="font-normal text-slate-500">(optional)</span></label>
                    <input id="si-guardian" className={inputClass} value={info.guardianName} maxLength={120} placeholder="e.g. Rosa Dela Cruz"
                      onChange={(e) => setInfo({ ...info, guardianName: capitalizeName(e.target.value) })} />
                  </div>
                  <div>
                    <label htmlFor="si-gcontact" className={labelClass}>Guardian contact <span className="font-normal text-slate-500">(optional)</span></label>
                    <input id="si-gcontact" type="tel" inputMode="tel" className={inputClass} value={info.guardianContact} placeholder="09171234567"
                      onChange={(e) => setInfo({ ...info, guardianContact: phoneChars(e.target.value) })} />
                  </div>
                </div>
                <InlineError message={infoState.error} onDismiss={() => setInfoState({ ...infoState, error: null })} />
                <div className="flex flex-wrap gap-2">
                  <button type="submit" disabled={infoState.busy}
                    className="inline-flex items-center gap-2 bg-blue-700 hover:bg-blue-800 disabled:opacity-60 text-white text-sm font-medium px-5 min-h-11 rounded-full">
                    {infoState.busy && <Loader2 size={15} className="animate-spin" />} {p ? "Save changes" : "Save my details"}
                  </button>
                  {p && (
                    <button type="button" onClick={() => setEditing(false)} disabled={infoState.busy}
                      className="px-5 min-h-11 rounded-full border border-slate-300 text-sm hover:bg-slate-50 disabled:opacity-60">
                      Cancel
                    </button>
                  )}
                </div>
              </form>
            )}
          </section>

          <div id="settings" className="scroll-mt-24 space-y-8">
            <ThemeSetting />
            <PushToggle />
            <AuthenticatorSetup />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
            <section>
              <h2 className="font-serif text-[22px] text-ink mb-3">Submit a document</h2>
              <form onSubmit={handleUpload} className="border-t border-rule pt-4 space-y-4">
                <div>
                  <label htmlFor="doc-category" className={labelClass}>Type of document</label>
                  <select
                    id="doc-category"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className={inputClass}
                  >
                    {documentCategories.map((c) => (
                      <option key={c.id} value={optionValue(c)}>{c.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="doc-file" className={labelClass}>File (PDF, Word .docx, or a photo; up to 5 MB)</label>
                  <input
                    id="doc-file"
                    ref={fileInput}
                    type="file"
                    accept={ACCEPTED_FILE_TYPES}
                    onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                    className="block w-full text-sm text-slate-700 file:mr-3 file:rounded-md file:border-0 file:bg-slate-200 file:px-3 file:py-2 file:text-sm file:font-medium file:text-ink hover:file:bg-slate-300"
                  />
                </div>
                <InlineError message={uploadError} onDismiss={() => setUploadError(null)} />
                {uploaded && <p role="status" className="text-sm text-emerald-700 border-l-2 border-emerald-500 pl-3">{uploaded}</p>}
                <button
                  type="submit"
                  disabled={isUploading}
                  className="inline-flex items-center gap-2 bg-blue-700 hover:bg-blue-800 disabled:opacity-60 text-white text-sm font-medium px-4 min-h-11 rounded-full transition-colors"
                >
                  {isUploading ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
                  {isUploading ? "Submitting" : "Submit to guidance office"}
                </button>
              </form>
            </section>

            <section>
              <h2 className="font-serif text-[22px] text-ink mb-3">Submitted documents</h2>
              {data.documents.length === 0 ? (
                <p className="border-t border-rule pt-4 text-sm text-slate-500">Nothing submitted yet.</p>
              ) : (
                <ul className="divide-y divide-rule border-t border-rule">
                  {data.documents.map((d) => (
                    <li key={d.id} className="py-3 flex items-start gap-3">
                      <FileText size={16} className="text-slate-400 mt-0.5 shrink-0" />
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm text-ink truncate">{d.fileName}</span>
                        <span className="block text-xs text-slate-500">
                          {d.category} · {new Date(d.createdAt).toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric", timeZone: "Asia/Manila" })}
                        </span>
                        {d.reviewStatus === "REJECTED" && d.reviewNote && (
                          <span className="block text-xs text-red-700 mt-0.5">Reason: {d.reviewNote}</span>
                        )}
                      </span>
                      <span className={`shrink-0 text-[11px] font-medium px-2 py-0.5 rounded-full ${REVIEW[d.reviewStatus]?.className ?? ""}`}>
                        {REVIEW[d.reviewStatus]?.label ?? d.reviewStatus}
                      </span>
                    </li>
                  ))}
                </ul>
              )}

              <h2 className="font-serif text-[22px] text-ink mt-10 mb-3">Recent sessions</h2>
              {data.appointments.length === 0 ? (
                <p className="border-t border-rule pt-4 text-sm text-slate-500">No sessions yet.</p>
              ) : (
                <ul className="divide-y divide-rule border-t border-rule">
                  {data.appointments.map((a) => (
                    <li key={a.id} className="py-3 flex items-baseline justify-between gap-4 text-sm">
                      <span className="text-ink">{a.appointmentType || "General consultation"}</span>
                      <span className="font-mono text-[13px] text-slate-500 shrink-0">
                        {new Date(a.date).toLocaleDateString("en-PH", { timeZone: "UTC", month: "short", day: "numeric" })}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>
        </>
      )}
    </div>
  );
};

function Field({ label, value }: { label: string; value: string | null }) {
  return (
    <div>
      <dt className="text-xs text-slate-500">{label}</dt>
      <dd className="text-ink mt-0.5">{value || "—"}</dd>
    </div>
  );
}

export default StudentProfile;
