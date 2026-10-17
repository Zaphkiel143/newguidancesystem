"use client";

import React, { useEffect, useState } from "react";
import { Download, Loader2, Printer } from "lucide-react";
import { getMonthlyReport } from "../../action/reports";
import { manilaToday } from "../../../lib/time";

type Report = Awaited<ReturnType<typeof getMonthlyReport>>;
type Count = { label: string; count: number };

function monthLabel(month: string) {
  return new Date(`${month}-01T00:00:00Z`).toLocaleDateString("en-PH", { month: "long", year: "numeric", timeZone: "UTC" });
}

// Simple bar list: label, bar, number. Bars are relative to the largest value.
function Bars({ items, empty = "None this month." }: { items: Count[]; empty?: string }) {
  if (items.length === 0) return <p className="text-sm text-slate-500">{empty}</p>;
  const max = Math.max(...items.map((i) => i.count), 1);
  return (
    <ul className="space-y-2">
      {items.map((i) => (
        <li key={i.label} className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-3 text-sm">
          <span className="text-slate-700 break-words">{i.label}</span>
          <span className="font-semibold text-ink tabular text-right">{i.count}</span>
          <span className="col-span-2 h-2 rounded-full bg-blue-50 overflow-hidden" aria-hidden>
            <span className="block h-full rounded-full bg-blue-600 print:bg-slate-700" style={{ width: `${(i.count / max) * 100}%` }} />
          </span>
        </li>
      ))}
    </ul>
  );
}

function Figure({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="bg-blue-50 border border-blue-100 rounded-xl px-4 py-3 print:border-slate-300 print:bg-white">
      <p className="text-2xl font-bold text-ink tabular">{value}</p>
      <p className="text-[12px] text-slate-600 mt-0.5">{label}</p>
    </div>
  );
}

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="bg-sheet border border-rule rounded-2xl p-5 break-inside-avoid">
      <h2 className="font-semibold text-[17px] text-ink mb-4">{title}</h2>
      {children}
    </section>
  );
}

function toCsv(r: Report) {
  const rows: (string | number)[][] = [["E-Gabay monthly report", monthLabel(r.month)], []];
  const add = (section: string, items: Count[]) => {
    rows.push([section]);
    for (const i of items) rows.push([i.label, i.count]);
    rows.push([]);
  };
  rows.push(["Sessions held", r.sessions.total], ["Confirmed", r.sessions.confirmed], ["Pending", r.sessions.pending], ["Cancelled", r.sessions.cancelled], ["Students seen", r.sessions.uniqueStudents], []);
  add("Sessions by purpose", r.sessions.byPurpose);
  add("Sessions by who booked", r.sessions.byBooker);
  rows.push(["Referrals received", r.referrals.total], ["High priority", r.referrals.highPriority], []);
  add("Referrals by concern type", r.referrals.byConcern);
  add("Referrals by status", r.referrals.byStatus);
  add("Referrals by source", r.referrals.bySource);
  rows.push(["Needs assessment responses", r.needsAssessment.responses], []);
  add("Top needs-assessment topics", r.needsAssessment.topTopics);
  rows.push(["Group guidance sessions", r.groupGuidance.sessions], ["Group guidance participants", r.groupGuidance.participants], []);
  rows.push(["Documents submitted", r.documents.submitted], ["Accepted", r.documents.accepted], ["Not accepted", r.documents.notAccepted], ["Waiting", r.documents.waiting], []);
  rows.push(["New student records", r.newStudents], []);
  rows.push(["Chatbot replies", r.chatbot.replies], ["Understood (%)", r.chatbot.understoodRate ?? "-"], ["Sent to guidance office", r.chatbot.forwarded], ["Crisis messages", r.chatbot.crisis], []);
  add("Chatbot topics", r.chatbot.topTopics);
  return rows.map((row) => row.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\r\n");
}

export default function MonthlyReportPage() {
  const [month, setMonth] = useState(() => manilaToday().slice(0, 7));
  const [report, setReport] = useState<Report | null>(null);
  const [loadedMonth, setLoadedMonth] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    getMonthlyReport(month)
      .then((r) => {
        if (cancelled) return;
        setReport(r);
        setError(null);
        setLoadedMonth(month);
      })
      .catch(() => {
        if (cancelled) return;
        setError("Couldn't load this report.");
        setLoadedMonth(month);
      });
    return () => {
      cancelled = true;
    };
  }, [month]);

  const download = () => {
    if (!report) return;
    const blob = new Blob(["﻿" + toCsv(report)], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `E-Gabay report ${report.month}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const r = loadedMonth === month ? report : null;

  return (
    <div className="px-5 sm:px-8 lg:px-12 pt-8 lg:pt-12 pb-16 max-w-6xl text-slate-800">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="page-title">Monthly report</h1>
          <p className="text-sm text-slate-500 mt-1">Guidance and Counseling Office · STI College Sta. Maria · {monthLabel(month)}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2 print:hidden">
          <label htmlFor="report-month" className="sr-only">Month</label>
          <input id="report-month" type="month" value={month} max={manilaToday().slice(0, 7)} onChange={(e) => e.target.value && setMonth(e.target.value)}
            className="bg-sheet border border-slate-300 rounded-lg px-3 min-h-11 text-sm" />
          <button onClick={() => window.print()} className="inline-flex items-center gap-2 border border-slate-300 hover:bg-slate-100 text-sm px-4 min-h-11 rounded-full">
            <Printer size={16} /> Print
          </button>
          <button onClick={download} disabled={!r} className="inline-flex items-center gap-2 bg-blue-700 hover:bg-blue-800 text-white text-sm px-4 min-h-11 rounded-full disabled:opacity-50">
            <Download size={16} /> Download (Excel/CSV)
          </button>
        </div>
      </header>

      {error ? (
        <p className="mt-8 text-sm text-red-700">{error}</p>
      ) : !r ? (
        <div className="py-20 flex justify-center text-slate-500"><Loader2 className="animate-spin" size={20} /></div>
      ) : (
        <div className="mt-8 space-y-6">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <Figure label="Sessions held" value={r.sessions.total} />
            <Figure label="Students seen" value={r.sessions.uniqueStudents} />
            <Figure label="Referrals received" value={r.referrals.total} />
            <Figure label="Needs-assessment responses" value={r.needsAssessment.responses} />
            <Figure label="Group sessions" value={r.groupGuidance.sessions} />
            <Figure label="Documents submitted" value={r.documents.submitted} />
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <Block title="Consultation sessions">
              <p className="text-sm text-slate-600 mb-4">
                {r.sessions.confirmed} confirmed · {r.sessions.pending} pending · {r.sessions.cancelled} cancelled
              </p>
              <h3 className="text-[13px] font-semibold text-slate-500 mb-2">By purpose</h3>
              <Bars items={r.sessions.byPurpose} />
              <h3 className="text-[13px] font-semibold text-slate-500 mt-5 mb-2">By who booked</h3>
              <Bars items={r.sessions.byBooker} />
            </Block>

            <Block title="Referrals">
              <p className="text-sm text-slate-600 mb-4">{r.referrals.highPriority} high priority</p>
              <h3 className="text-[13px] font-semibold text-slate-500 mb-2">By concern type</h3>
              <Bars items={r.referrals.byConcern} />
              <h3 className="text-[13px] font-semibold text-slate-500 mt-5 mb-2">By status now</h3>
              <Bars items={r.referrals.byStatus} />
              <h3 className="text-[13px] font-semibold text-slate-500 mt-5 mb-2">Referred by</h3>
              <Bars items={r.referrals.bySource} />
            </Block>

            <Block title="Needs assessment: most requested topics">
              <Bars items={r.needsAssessment.topTopics} empty="No responses this month." />
            </Block>

            <Block title="Group guidance">
              <p className="text-sm text-slate-600 mb-4">{r.groupGuidance.participants} participants in total</p>
              <Bars items={r.groupGuidance.list} empty="No group sessions this month." />
            </Block>

            <Block title="Documents">
              <div className="grid grid-cols-3 gap-3">
                <Figure label="Accepted" value={r.documents.accepted} />
                <Figure label="Not accepted" value={r.documents.notAccepted} />
                <Figure label="Waiting" value={r.documents.waiting} />
              </div>
              <p className="text-sm text-slate-600 mt-4">{r.newStudents} new student records this month.</p>
            </Block>

            <Block title="E-Gabay chatbot">
              <div className="grid grid-cols-3 gap-3 mb-4">
                <Figure label="Replies" value={r.chatbot.replies} />
                <Figure label="Understood" value={r.chatbot.understoodRate === null ? "–" : `${r.chatbot.understoodRate}%`} />
                <Figure label="Sent to the office" value={r.chatbot.forwarded} />
              </div>
              {r.chatbot.crisis > 0 && (
                <p className="text-sm text-red-700 font-medium mb-3">{r.chatbot.crisis} crisis message{r.chatbot.crisis === 1 ? "" : "s"} this month.</p>
              )}
              <h3 className="text-[13px] font-semibold text-slate-500 mb-2">What students asked about</h3>
              <Bars items={r.chatbot.topTopics} empty="No chatbot use this month." />
            </Block>
          </div>
          <p className="text-xs text-slate-500">
            Generated {new Date().toLocaleString("en-PH", { timeZone: "Asia/Manila" })}. Counts include only records in E-Gabay.
          </p>
        </div>
      )}
    </div>
  );
}
