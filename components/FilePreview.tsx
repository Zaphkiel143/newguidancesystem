"use client";

import React, { useEffect, useState } from "react";
import { Download, ExternalLink, Loader2, X } from "lucide-react";

// Shows an uploaded file in a pop-up over the page instead of downloading it.
// The file is fetched here and shown from a blob URL, so the server's
// download header never reaches the browser: PDFs open in the browser's own
// viewer, images are shown as they are, and anything else (a .docx) offers a
// download since browsers can't display it.
export default function FilePreview({ url, fileName, onClose }: { url: string; fileName: string; onClose: () => void }) {
  const [file, setFile] = useState<{ src: string; type: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let src: string | null = null;
    let cancelled = false;
    fetch(url)
      .then(async (res) => {
        if (!res.ok) throw new Error(res.status === 404 ? "This file is no longer available." : "Couldn't open this file.");
        const blob = await res.blob();
        if (cancelled) return;
        src = URL.createObjectURL(blob);
        setFile({ src, type: blob.type });
      })
      .catch((e: Error) => !cancelled && setError(e.message || "Couldn't open this file."));
    return () => {
      cancelled = true;
      if (src) URL.revokeObjectURL(src);
    };
  }, [url]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const isPdf = file?.type === "application/pdf";
  const isImage = file?.type.startsWith("image/");
  const iconButton = "w-10 h-10 grid place-items-center rounded-full hover:bg-slate-100";

  return (
    <div className="fixed inset-0 z-50 bg-black/50 grid place-items-center p-2 sm:p-6" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="file-preview-title"
        className="w-full max-w-5xl h-[92vh] flex flex-col bg-sheet text-ink rounded-2xl shadow-xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 pl-5 pr-2 py-2 border-b border-rule">
          <h2 id="file-preview-title" className="flex-1 min-w-0 font-semibold truncate">{fileName}</h2>
          {file && (
            <>
              <a href={file.src} target="_blank" rel="noopener noreferrer" aria-label="Open in a new tab" title="Open in a new tab" className={iconButton}>
                <ExternalLink size={17} />
              </a>
              <a href={file.src} download={fileName} aria-label="Download" title="Download" className={iconButton}>
                <Download size={17} />
              </a>
            </>
          )}
          <button type="button" onClick={onClose} aria-label="Close" className={iconButton} autoFocus>
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 min-h-0 bg-slate-100 grid place-items-center">
          {error ? (
            <p className="text-sm text-red-700 px-4 text-center">{error}</p>
          ) : !file ? (
            <Loader2 size={24} className="animate-spin text-slate-500" aria-label="Loading" />
          ) : isPdf ? (
            <iframe src={file.src} title={fileName} className="w-full h-full border-0 bg-white" />
          ) : isImage ? (
            // eslint-disable-next-line @next/next/no-img-element -- a local blob, not an optimisable image
            <img src={file.src} alt={fileName} className="max-w-full max-h-full object-contain" />
          ) : (
            <div className="text-center px-4 space-y-3">
              <p className="text-sm text-slate-700">This file can&apos;t be shown here (Word documents need to be downloaded).</p>
              <a href={file.src} download={fileName}
                className="inline-flex items-center gap-1.5 bg-blue-700 hover:bg-blue-800 text-white text-sm font-medium px-4 min-h-10 rounded-full">
                <Download size={15} /> Download
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
