"use client";

import React, { useEffect, useState, ChangeEvent, DragEvent } from 'react';
import { UploadCloud, FileText, CheckCircle2, Trash2, Loader2 } from 'lucide-react';
import { uploadDocument, getMyDocuments, deleteDocument } from '../../action/faculty';
import InlineError from '../../../components/InlineError';

const MAX_FILE_BYTES = 5 * 1024 * 1024; // 5MB

interface DocumentMeta {
  id: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  createdAt: Date;
}

function formatSize(bytes: number): string {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result.split(",")[1] ?? "");
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

export const UploadDocuments: React.FC = () => {
  const [isDragging, setIsDragging] = useState(false);
  const [documents, setDocuments] = useState<DocumentMeta[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const refresh = async () => {
    const data = await getMyDocuments();
    setDocuments(data);
  };

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const data = await getMyDocuments();
      if (!cancelled) setDocuments(data);
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const processFiles = async (fileList: FileList) => {
    setError(null);

    for (const file of Array.from(fileList)) {
      if (file.size > MAX_FILE_BYTES) {
        setError(`"${file.name}" is larger than 5MB and was skipped.`);
        continue;
      }

      setIsUploading(true);
      const dataBase64 = await fileToBase64(file);
      const result = await uploadDocument({
        fileName: file.name,
        fileType: file.type || "application/octet-stream",
        fileSize: file.size,
        dataBase64,
      });
      setIsUploading(false);

      if (!result.success) {
        setError(`Failed to upload "${file.name}": ${result.error || "Unknown error"}`);
      }
    }

    await refresh();
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) processFiles(e.target.files);
    e.target.value = "";
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files) processFiles(e.dataTransfer.files);
  };

  const removeFile = async (id: string) => {
    setDeletingId(id);
    setDeleteError(null);
    const result = await deleteDocument(id);
    setDeletingId(null);
    if (result.success) {
      await refresh();
    } else {
      const name = documents.find((d) => d.id === id)?.fileName ?? "this document";
      setDeleteError(`Couldn't delete ${name}: ${result.error || "unknown error"}.`);
    }
  };

  return (
    <div className="px-5 sm:px-8 lg:px-12 pt-8 lg:pt-12 pb-16 max-w-4xl font-sans antialiased text-slate-800 space-y-6">

      {/* 1. Header Section */}
      <div>
        <h1 className="page-title">Upload Documents</h1>
        <p className="text-sm text-slate-500 font-medium mt-1">
          Share files, forms, and reports securely with the Guidance Office
        </p>
      </div>

      <div className="space-y-6">

        {/* 2. Drag & Drop Zone Area */}
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`border-2 border-dashed rounded-2xl p-8 text-center bg-white transition-all duration-200 flex flex-col items-center justify-center min-h-[260px] cursor-pointer relative
            ${isDragging
              ? 'border-blue-500 bg-blue-50/30'
              : 'border-slate-200 hover:border-slate-300'
            }
          `}
        >
          {/* Hidden Core File Input Trigger */}
          <input
            type="file"
            multiple
            onChange={handleFileChange}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          />

          <div className="bg-blue-50 p-4 rounded-full text-blue-600 mb-4 shadow-sm">
            {isUploading ? <Loader2 size={32} className="animate-spin" /> : <UploadCloud size={32} className="stroke-[2]" />}
          </div>

          <h3 className="font-semibold text-slate-800 text-base">
            {isUploading ? "Uploading..." : (
              <>Drag and drop files here, or <span className="text-blue-600 hover:underline">browse</span></>
            )}
          </h3>

          <p className="text-xs text-slate-500 font-medium mt-2 max-w-sm leading-relaxed">
            Supports PDF, Word, Excel, and Images up to 5MB
          </p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-100 text-red-600 p-4 rounded-xl text-sm font-medium">
            {error}
          </div>
        )}

        {/* 3. Render Upload Queue List Panel */}
        {documents.length > 0 && (
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-50 bg-slate-50/30">
              <h4 className="font-semibold text-slate-800 text-sm">Uploaded Documents</h4>
            </div>

            <div className="p-4 space-y-3">
              {documents.map((file) => (
                <div
                  key={file.id}
                  className="border border-slate-200/80 rounded-xl p-4 bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all hover:border-slate-300"
                >
                  {/* File Metadata Cluster */}
                  <div className="flex items-start gap-3.5 min-w-0 flex-1">
                    <div className="p-2.5 bg-slate-50 text-slate-500 rounded-xl shrink-0 mt-0.5">
                      <FileText size={20} />
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline gap-2 flex-wrap">
                        <span className="font-semibold text-slate-800 text-sm truncate max-w-[280px] sm:max-w-md">
                          {file.fileName}
                        </span>
                        <span className="text-xs text-slate-500 font-mono font-medium">
                          ({formatSize(file.fileSize)})
                        </span>
                      </div>
                      <span className="text-xs text-slate-500 font-mono">
                        {new Date(file.createdAt).toLocaleString()}
                      </span>
                    </div>
                  </div>

                  {/* Status Indicator & Action Triggers Column */}
                  <div className="flex items-center justify-between sm:justify-end gap-4 shrink-0 border-t border-slate-50 pt-2 sm:pt-0 sm:border-0">
                    <div className="text-xs">
                      <span className="inline-flex items-center gap-1.5 bg-emerald-50 text-emerald-600 font-semibold px-2.5 py-1 rounded-full border border-emerald-200">
                        <CheckCircle2 size={13} className="stroke-[2.5]" />
                        Uploaded
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => removeFile(file.id)}
                      disabled={deletingId === file.id}
                      className="text-slate-500 hover:text-red-500 p-1.5 rounded-full hover:bg-slate-50 transition-colors disabled:opacity-50"
                      title="Delete document"
                      aria-label={`Delete ${file.fileName}`}
                    >
                      {deletingId === file.id ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                    </button>
                  </div>

                </div>
              ))}
            </div>
            <InlineError message={deleteError} onDismiss={() => setDeleteError(null)} className="mt-3" />
          </div>
        )}

      </div>
    </div>
  );
};

export default UploadDocuments;
