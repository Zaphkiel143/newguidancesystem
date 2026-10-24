"use client";

import React, { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, RotateCcw } from "lucide-react";

// What people see when a page fails to load, instead of a blank or technical
// screen: a plain explanation, Try again, and a way back. The error itself
// goes to the browser console (and the server log) for whoever fixes it.
export default function ErrorScreen({
  error,
  retry,
  homePath = "/",
}: {
  error: Error & { digest?: string };
  retry: () => void;
  homePath?: string;
}) {
  useEffect(() => {
    console.error("[page error]", error);
  }, [error]);

  return (
    <div className="px-5 sm:px-8 lg:px-12 py-16 max-w-xl mx-auto text-center text-slate-800" role="alert">
      <span className="mx-auto w-14 h-14 rounded-full bg-orange-50 text-orange-700 grid place-items-center" aria-hidden>
        <AlertTriangle size={26} />
      </span>
      <h1 className="page-title mt-4">Something went wrong</h1>
      <p className="mt-2 text-[15px] text-slate-600">
        This page couldn&apos;t load. Check your internet connection and try again. If it keeps happening, tell the guidance office.
      </p>
      {error.digest && <p className="mt-2 text-[12px] text-slate-500 font-mono">Reference: {error.digest}</p>}
      <div className="mt-6 flex flex-col sm:flex-row justify-center gap-2">
        <button
          type="button"
          onClick={retry}
          className="min-h-11 px-6 rounded-full bg-blue-700 hover:bg-blue-800 text-white text-[14px] font-medium inline-flex items-center justify-center gap-2"
        >
          <RotateCcw size={15} /> Try again
        </button>
        <Link href={homePath} className="min-h-11 px-6 rounded-full border border-slate-300 text-[14px] hover:bg-slate-50 inline-flex items-center justify-center">
          Go to dashboard
        </Link>
      </div>
    </div>
  );
}
