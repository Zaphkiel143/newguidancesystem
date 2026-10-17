"use client";

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Loader2, Printer } from 'lucide-react';
import { getDailyLog } from '../../action/counselor';
import type { Appointment } from '../../../lib/generated';
import { listAttachments } from '../../action/attachments';
import AttachmentStrip, { type AttachmentMeta } from '../../../components/AttachmentStrip';

function toDateInput(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

// GCO Daily Log: built from the session entries the Guidance Associate already
// writes in the appointment form, so nothing is logged twice.
export default function DailyLogPage() {
  const today = new Date();
  const weekAgo = new Date(today);
  weekAgo.setDate(today.getDate() - 7);

  const [from, setFrom] = useState(toDateInput(weekAgo));
  const [to, setTo] = useState(toDateInput(today));
  const [rows, setRows] = useState<Appointment[] | null>(null);
  const [loadedRange, setLoadedRange] = useState("");
  const [photos, setPhotos] = useState<AttachmentMeta[]>([]);

  const loadPhotos = useCallback(async (ids: string[]) => {
    setPhotos(await listAttachments("DAILY_LOG", ids));
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const data = await getDailyLog(from, to);
      if (cancelled) return;
      setRows(data);
      setLoadedRange(`${from}|${to}`);
      const attached = await listAttachments("DAILY_LOG", data.map((r) => r.id));
      if (!cancelled) setPhotos(attached);
    })();
    return () => {
      cancelled = true;
    };
  }, [from, to]);

  const isLoading = loadedRange !== `${from}|${to}`;
  const byDay = new Map<string, Appointment[]>();
  for (const r of rows ?? []) {
    const key = new Date(r.date).toISOString().slice(0, 10); // calendar day, stored as UTC midnight
    byDay.set(key, [...(byDay.get(key) ?? []), r]);
  }

  return (
    <div className="px-5 sm:px-8 lg:px-12 pt-8 lg:pt-12 pb-16 max-w-5xl text-slate-800">
      <header className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1 className="page-title">GCO Daily Log</h1>
          <p className="text-sm text-slate-500 mt-1 max-w-[60ch]">
            Every session you record in{" "}
            <Link href="/appointment" className="text-blue-700 underline underline-offset-4 decoration-blue-200">Appointments</Link>{" "}
            appears here and on the student&apos;s profile. No second entry needed.
          </p>
        </div>
        <button onClick={() => window.print()}
          className="self-start sm:self-auto inline-flex items-center gap-2 border border-slate-300 hover:bg-slate-100 text-sm px-4 min-h-11 rounded-full transition-colors print:hidden">
          <Printer size={16} /> Print
        </button>
      </header>

      <div className="mt-8 flex flex-wrap items-end gap-3 print:hidden">
        <div>
          <label htmlFor="log-from" className="block text-[13px] font-medium text-slate-700 mb-1.5">From</label>
          <input id="log-from" type="date" value={from} max={to} onChange={(e) => e.target.value && setFrom(e.target.value)}
            className="bg-sheet border border-slate-300 rounded-md px-3 py-2.5 text-sm" />
        </div>
        <div>
          <label htmlFor="log-to" className="block text-[13px] font-medium text-slate-700 mb-1.5">To</label>
          <input id="log-to" type="date" value={to} min={from} onChange={(e) => e.target.value && setTo(e.target.value)}
            className="bg-sheet border border-slate-300 rounded-md px-3 py-2.5 text-sm" />
        </div>
      </div>

      {isLoading ? (
        <div className="py-20 flex justify-center text-slate-500"><Loader2 className="animate-spin" size={20} /></div>
      ) : byDay.size === 0 ? (
        <p className="mt-10 border-t border-rule pt-4 text-sm text-slate-500">No sessions in this period.</p>
      ) : (
        <div className="mt-10 space-y-10">
          {[...byDay.entries()].map(([day, entries]) => (
            <section key={day}>
              <h2 className="font-serif text-[22px] text-ink mb-3">
                {new Date(`${day}T00:00:00Z`).toLocaleDateString("en-PH", { weekday: "long", month: "long", day: "numeric", year: "numeric", timeZone: "UTC" })}
              </h2>
              <table className="w-full text-sm border-t border-rule">
                <thead className="sr-only">
                  <tr><th>Time</th><th>Student</th><th>Type and notes</th><th>Status</th></tr>
                </thead>
                <tbody className="divide-y divide-rule">
                  {entries.map((a) => (
                    <tr key={a.id} className="align-top">
                      <td className="py-3 pr-4 font-mono text-[13px] text-slate-500 w-24">{a.time}</td>
                      <td className="py-3 pr-4 w-48">
                        <span className="text-ink font-medium">{a.studentName}</span>
                        {a.bookedByRole && a.bookedByRole !== "Student" && (
                          <span className="block text-xs text-slate-500">booked by {a.bookedByRole.toLowerCase()}</span>
                        )}
                      </td>
                      <td className="py-3 pr-4">
                        <span className="text-ink">{a.appointmentType || "General consultation"}</span>
                        {a.notes ? (
                          <span className="block text-slate-600 mt-1 whitespace-pre-wrap">{a.notes}</span>
                        ) : (
                          <span className="block text-xs text-slate-500 mt-1">No session notes yet</span>
                        )}
                        <span className="block mt-2">
                          <AttachmentStrip kind="DAILY_LOG" refId={a.id} items={photos.filter((p) => p.refId === a.id)}
                            onChange={() => loadPhotos((rows ?? []).map((r) => r.id))} addLabel="Add photo of a document" />
                        </span>
                      </td>
                      <td className={`py-3 text-xs text-right w-24 ${a.status === "CONFIRMED" ? "text-emerald-700" : "text-orange-700"}`}>
                        {a.status === "CONFIRMED" ? "Confirmed" : "Pending"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
