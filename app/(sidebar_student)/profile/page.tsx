"use client";

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { User, Loader2, Upload, FileText } from 'lucide-react';
import { getMyProfile, submitStudentDocument } from '../../action/student';
import InlineError from '../../../components/InlineError';

type MyProfile = NonNullable<Awaited<ReturnType<typeof getMyProfile>>>;

// Kinds of documents students hand in to the guidance office (Chapter 1, Individual Inventory).
const DOCUMENT_CATEGORIES = [
  "Excuse letter",
  "Medical certificate",
  "Intent to wear gender-affirming clothing",
  "Exit interview form",
  "Other",
];

const MAX_BYTES = 5 * 1024 * 1024;

function readAsBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(",")[1] ?? "");
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

export const StudentProfile: React.FC = () => {
  const [data, setData] = useState<MyProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [category, setCategory] = useState(DOCUMENT_CATEGORIES[0]);
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
      setUploaded(`${file.name} was sent to the guidance office.`);
      setFile(null);
      if (fileInput.current) fileInput.current.value = "";
      await load();
    } else {
      setUploadError(`Couldn't submit the file: ${result.error || "unknown error"}.`);
    }
  };

  const p = data?.profile;

  return (
    <div className="px-5 sm:px-8 lg:px-12 pt-8 lg:pt-12 pb-16 max-w-5xl text-slate-800 space-y-8">
      <header>
        <h1 className="page-title">My Profile</h1>
        <p className="text-sm text-slate-500 mt-1">Your guidance record and the documents you&apos;ve submitted</p>
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
            <div className="px-6 py-6 flex items-center gap-5 border-b border-rule">
              <div className="w-14 h-14 rounded-md bg-slate-200 flex items-center justify-center text-slate-600 shrink-0">
                <User size={26} strokeWidth={1.5} />
              </div>
              <div>
                <h2 className="font-serif text-[28px] leading-tight text-ink">{data.name}</h2>
                <p className="font-mono text-[13px] text-slate-500 mt-0.5">
                  {p ? `Student ID ${p.studentId}` : data.email}
                </p>
              </div>
            </div>
            {p ? (
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
            ) : (
              <p className="p-6 text-sm text-slate-500">
                The guidance office hasn&apos;t set up your Individual Inventory record yet. Your details will appear here once they do.
              </p>
            )}
            <p className="px-6 pb-5 text-xs text-slate-500">Something wrong? Message the guidance office to have it corrected.</p>
          </section>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
            <section>
              <h2 className="font-serif text-[22px] text-ink mb-3">Submit a document</h2>
              <form onSubmit={handleUpload} className="border-t border-rule pt-4 space-y-4">
                <div>
                  <label htmlFor="doc-category" className="block text-[13px] font-medium text-slate-700 mb-1.5">Type of document</label>
                  <select
                    id="doc-category"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full bg-sheet border border-slate-300 rounded-md px-3 py-2.5 text-sm"
                  >
                    {DOCUMENT_CATEGORIES.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="doc-file" className="block text-[13px] font-medium text-slate-700 mb-1.5">File (PDF or image, up to 5 MB)</label>
                  <input
                    id="doc-file"
                    ref={fileInput}
                    type="file"
                    accept=".pdf,image/*,.doc,.docx"
                    onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                    className="block w-full text-sm text-slate-700 file:mr-3 file:rounded-md file:border-0 file:bg-slate-200 file:px-3 file:py-2 file:text-sm file:font-medium file:text-ink hover:file:bg-slate-300"
                  />
                </div>
                <InlineError message={uploadError} onDismiss={() => setUploadError(null)} />
                {uploaded && <p role="status" className="text-sm text-emerald-700 border-l-2 border-emerald-500 pl-3">{uploaded}</p>}
                <button
                  type="submit"
                  disabled={isUploading}
                  className="inline-flex items-center gap-2 bg-blue-700 hover:bg-blue-800 disabled:opacity-60 text-white text-sm font-medium px-4 min-h-11 rounded-md transition-colors"
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
                      <span className="min-w-0">
                        <span className="block text-sm text-ink truncate">{d.fileName}</span>
                        <span className="block text-xs text-slate-500">
                          {d.category} · {new Date(d.createdAt).toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" })}
                        </span>
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
