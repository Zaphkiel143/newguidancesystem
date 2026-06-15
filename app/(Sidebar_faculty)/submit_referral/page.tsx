"use client";

import React, { useState, ChangeEvent, DragEvent } from 'react';
import { UploadCloud, FileText, CheckCircle2, AlertCircle, Trash2 } from 'lucide-react';

interface UploadedFile {
  id: string;
  name: string;
  size: string;
  status: 'Uploading' | 'Success' | 'Error';
  progress?: number;
}

export const UploadDocuments: React.FC = () => {
  const [isDragging, setIsDragging] = useState(false);
  
  // State populated with the exact mock rows shown in image_860ddb.png
  const [files, setFiles] = useState<UploadedFile[]>([
    {
      id: 'file-1',
      name: 'Incident_Report_Form.pdf',
      size: '245 KB',
      status: 'Success',
    },
    {
      id: 'file-2',
      name: 'Student_Behavior_Log.xlsx',
      size: '1.2 MB',
      status: 'Uploading',
      progress: 45,
    },
  ]);

  // Handle file selection logic
  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      processFiles(e.target.files);
    }
  };

  // Drag and drop event handlers
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
    if (e.dataTransfer.files) {
      processFiles(e.dataTransfer.files);
    }
  };

  const processFiles = (fileList: FileList) => {
    const newFiles: UploadedFile[] = Array.from(fileList).map((file, index) => ({
      id: `new-file-${Date.now()}-${index}`,
      name: file.name,
      size: `${(file.size / (1024 * 1024)).toFixed(1)} MB`,
      status: 'Success', // Mock completion automatically
    }));
    setFiles((prev) => [...prev, ...newFiles]);
  };

  const removeFile = (id: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== id));
  };

  return (
    <div className="max-w-4xl mx-auto font-sans antialiased text-slate-800 space-y-6">
      
      {/* 1. Header Section */}
      <div>
        <h1 className="text-3xl font-bold text-blue-900 tracking-tight">Upload Documents</h1>
        <p className="text-sm text-slate-500 font-medium mt-1">
          Share files, forms, and reports securely with the Guidance Office
        </p>
      </div>

      <div className="space-y-6">
        
        {/* 2. Drag & Drop Zone Area (from image_860dbf.png) */}
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

          <div className="bg-blue-50 p-4 rounded-full text-[#1d63ff] mb-4 shadow-sm">
            <UploadCloud size={32} className="stroke-[2]" />
          </div>

          <h3 className="font-bold text-slate-800 text-base">
            Drag and drop files here, or <span className="text-[#1d63ff] hover:underline">browse</span>
          </h3>
          
          <p className="text-xs text-slate-400 font-medium mt-2 max-w-sm leading-relaxed">
            Supports PDF, Word, Excel, and Images up to 10MB
          </p>
        </div>

        {/* 3. Render Upload Queue List Panel (from image_860ddb.png) */}
        {files.length > 0 && (
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-50 bg-slate-50/30">
              <h4 className="font-bold text-slate-800 text-sm">Uploaded Documents</h4>
            </div>

            <div className="p-4 space-y-3">
              {files.map((file) => (
                <div 
                  key={file.id} 
                  className="border border-slate-200/80 rounded-xl p-4 bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all hover:border-slate-300"
                >
                  {/* File Metadata Cluster */}
                  <div className="flex items-start gap-3.5 min-w-0 flex-1">
                    <div className="p-2.5 bg-slate-50 text-slate-400 rounded-xl shrink-0 mt-0.5">
                      <FileText size={20} />
                    </div>
                    
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline gap-2 flex-wrap">
                        <span className="font-bold text-slate-800 text-sm truncate max-w-[280px] sm:max-w-md">
                          {file.name}
                        </span>
                        <span className="text-xs text-slate-400 font-mono font-medium">
                          ({file.size})
                        </span>
                      </div>

                      {/* Render active horizontal slider path if loading */}
                      {file.status === 'Uploading' && (
                        <div className="mt-2 w-full max-w-xs space-y-1">
                          <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                            <div 
                              className="bg-[#1d63ff] h-full rounded-full transition-all duration-300"
                              style={{ width: `${file.progress}%` }}
                            />
                          </div>
                          <span className="text-[10px] text-slate-400 font-bold font-mono">
                            Uploading... {file.progress}%
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Status Indicator & Action Triggers Column */}
                  <div className="flex items-center justify-between sm:justify-end gap-4 shrink-0 border-t border-slate-50 pt-2 sm:pt-0 sm:border-0">
                    <div className="text-xs">
                      {file.status === 'Success' && (
                        <span className="inline-flex items-center gap-1.5 bg-[#e8fbf0] text-[#00c853] font-bold px-2.5 py-1 rounded-full border border-[#bbf7d0]">
                          <CheckCircle2 size={13} className="stroke-[2.5]" />
                          Success
                        </span>
                      )}
                      {file.status === 'Error' && (
                        <span className="inline-flex items-center gap-1.5 bg-red-50 text-red-600 font-bold px-2.5 py-1 rounded-full border border-red-100">
                          <AlertCircle size={13} className="stroke-[2.5]" />
                          Failed
                        </span>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => removeFile(file.id)}
                      className="text-slate-400 hover:text-red-500 p-1.5 rounded-lg hover:bg-slate-50 transition-colors"
                      title="Delete document"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>

                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default UploadDocuments;