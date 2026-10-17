"use client";

import React, { useRef, useState } from "react";
import { Camera, FileText, Loader2, X } from "lucide-react";
import { addAttachment, deleteAttachment } from "../app/action/attachments";
import InlineError from "./InlineError";

export type AttachmentMeta = { id: string; refId: string; fileName: string; fileType: string };

function readAsBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(",")[1] ?? "");
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

// Thumbnails of the photos attached to one record, with "Add photo" (which opens
// the camera on phones) and remove. Counselor pages only.
export default function AttachmentStrip({
  kind,
  refId,
  items,
  onChange,
  addLabel = "Add photo",
}: {
  kind: "DAILY_LOG" | "GROUP_ATTENDANCE";
  refId: string;
  items: AttachmentMeta[];
  onChange: () => void;
  addLabel?: string;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputId = `att-${kind}-${refId}`;

  const upload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setBusy(true);
    setError(null);
    for (const file of Array.from(files)) {
      if (file.size > 5 * 1024 * 1024) {
        setError(`${file.name} is over 5 MB.`);
        continue;
      }
      const result = await addAttachment({ kind, refId, fileName: file.name, dataBase64: await readAsBase64(file) });
      if (!result.success) setError(result.error ?? "Couldn't save the photo.");
    }
    setBusy(false);
    if (input.current) input.current.value = "";
    onChange();
  };

  const remove = async (id: string) => {
    if (!window.confirm("Remove this photo?")) return;
    const result = await deleteAttachment(id);
    if (!result.success) setError(result.error ?? "Couldn't remove it.");
    onChange();
  };

  return (
    <div className="print:hidden">
      <div className="flex flex-wrap items-center gap-2">
        {items.map((a) => (
          <div key={a.id} className="relative group">
            <a href={`/api/files/attachment/${a.id}`} target="_blank" rel="noopener noreferrer" title={a.fileName}
              className="block w-16 h-16 rounded-lg border border-rule overflow-hidden bg-slate-50">
              {a.fileType.startsWith("image/") ? (
                // eslint-disable-next-line @next/next/no-img-element -- private, counselor-only route
                <img src={`/api/files/attachment/${a.id}`} alt={a.fileName} className="w-full h-full object-cover" loading="lazy" />
              ) : (
                <span className="w-full h-full grid place-items-center text-slate-500"><FileText size={20} /></span>
              )}
            </a>
            <button type="button" onClick={() => remove(a.id)} aria-label={`Remove ${a.fileName}`}
              className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-white border border-slate-300 text-slate-600 hover:text-red-700 grid place-items-center shadow-sm">
              <X size={13} />
            </button>
          </div>
        ))}
        <input ref={input} id={inputId} type="file" accept="image/jpeg,image/png,image/webp,.pdf" multiple className="sr-only"
          onChange={(e) => upload(e.target.files)} />
        <label htmlFor={inputId}
          className={`inline-flex items-center gap-1.5 border border-dashed border-slate-300 hover:border-blue-400 hover:bg-blue-50 text-[13px] text-slate-700 px-3 min-h-10 rounded-lg cursor-pointer ${busy ? "opacity-60 pointer-events-none" : ""}`}>
          {busy ? <Loader2 size={14} className="animate-spin" /> : <Camera size={14} />}
          {addLabel}
        </label>
      </div>
      <InlineError message={error} onDismiss={() => setError(null)} className="mt-2" />
    </div>
  );
}
