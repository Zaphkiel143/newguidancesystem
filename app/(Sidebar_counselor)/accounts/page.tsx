"use client";

import React, { useCallback, useEffect, useState } from 'react';
import { Check, Loader2, Search, X } from 'lucide-react';
import { decideParentLink, decideStaffAccount, listAccounts, listApprovals, setAccountActive, setAccountRole } from '../../action/accounts';
import InlineError from '../../../components/InlineError';
import { SCHOOL_EMAIL_DOMAIN } from '../../config/school';
import { formatPhone } from '../../../lib/phone';

type Account = Awaited<ReturnType<typeof listAccounts>>[number];
type Approvals = Awaited<ReturnType<typeof listApprovals>>;
type Role = Account["role"];

const ROLE_LABEL: Record<Role, string> = {
  STUDENT: "Student",
  FACULTY: "Faculty / staff",
  COUNSELOR: "Guidance Associate",
  PARENT: "Parent / guardian",
};
const SCHOOL_ROLES: Role[] = ["STUDENT", "FACULTY", "COUNSELOR"];

function sameDigits(a: string | null | undefined, b: string | null | undefined) {
  const d = (s: string | null | undefined) => (s ?? "").replace(/\D/g, "").slice(-10);
  return d(a).length === 10 && d(a) === d(b);
}

export default function AccountsPage() {
  const [accounts, setAccounts] = useState<Account[] | null>(null);
  const [approvals, setApprovals] = useState<Approvals | null>(null);
  const [query, setQuery] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [rowError, setRowError] = useState<{ id: string; message: string } | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    const [a, b] = await Promise.all([listAccounts(), listApprovals()]);
    setAccounts(a);
    setApprovals(b);
  }, []);

  useEffect(() => {
    let cancelled = false;
    Promise.all([listAccounts(), listApprovals()]).then(([a, b]) => {
      if (cancelled) return;
      setAccounts(a);
      setApprovals(b);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const run = async (id: string, action: () => Promise<{ success: boolean; error?: string }>) => {
    setBusyId(id);
    setRowError(null);
    const result = await action();
    setBusyId(null);
    if (result.success) await load();
    else setRowError({ id, message: result.error || "Something went wrong." });
  };

  const q = query.trim().toLowerCase();
  const shown = (accounts ?? []).filter(
    (a) => !q || a.name.toLowerCase().includes(q) || (a.email ?? "").toLowerCase().includes(q) || (a.phone ?? "").includes(q.replace(/\D/g, "") || "—")
  );
  const waiting = (approvals?.pendingStaff.length ?? 0) + (approvals?.parentRequests.length ?? 0);

  return (
    <div className="px-5 sm:px-8 lg:px-12 pt-8 lg:pt-12 pb-16 max-w-5xl text-slate-800">
      <header>
        <h1 className="page-title">Accounts &amp; approvals</h1>
        <p className="text-sm text-slate-500 mt-1 max-w-[70ch]">
          Students with an @{SCHOOL_EMAIL_DOMAIN} email get in right away. New faculty, guidance staff and parent accounts wait here
          for you to approve them.
        </p>
      </header>

      {/* Waiting for approval */}
      <section className="mt-8" aria-labelledby="waiting-heading">
        <h2 id="waiting-heading" className="font-serif text-[22px] text-ink">
          Waiting for approval {waiting > 0 && <span className="ml-1 text-base text-red-700 tabular">({waiting})</span>}
        </h2>

        {!approvals ? (
          <div className="py-10 flex justify-center text-slate-500"><Loader2 className="animate-spin" size={20} /></div>
        ) : waiting === 0 ? (
          <p className="mt-3 border-t border-rule pt-4 text-sm text-slate-500">Nothing waiting. New requests show up here and in your notifications.</p>
        ) : (
          <ul className="mt-3 space-y-3">
            {approvals.pendingStaff.map((u) => (
              <li key={u.id} className="bg-sheet border border-rule rounded-xl p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-semibold text-ink">{u.name}</p>
                    <p className="text-[13px] text-slate-600 break-all">{u.email}</p>
                    <p className="text-[13px] text-slate-500 mt-0.5">
                      Signed up as <strong className="font-medium text-ink">{ROLE_LABEL[u.role]}</strong> ·{" "}
                      {new Date(u.createdAt).toLocaleDateString("en-PH", { month: "short", day: "numeric", timeZone: "Asia/Manila" })}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button disabled={busyId === u.id} onClick={() => run(u.id, () => decideStaffAccount(u.id, true))}
                      className="inline-flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium px-4 min-h-10 rounded-full disabled:opacity-60">
                      <Check size={15} /> Approve
                    </button>
                    <button disabled={busyId === u.id} onClick={() => run(u.id, () => decideStaffAccount(u.id, false))}
                      className="inline-flex items-center gap-1.5 bg-red-50 hover:bg-red-100 text-red-700 text-sm font-medium px-4 min-h-10 rounded-full disabled:opacity-60">
                      <X size={15} /> Decline
                    </button>
                  </div>
                </div>
                <InlineError message={rowError?.id === u.id ? rowError.message : null} onDismiss={() => setRowError(null)} className="mt-2" />
              </li>
            ))}

            {approvals.parentRequests.map((r) => {
              const nameMatches = r.match && r.match.name.toLowerCase() === r.childName.toLowerCase();
              const phoneMatches = r.match && sameDigits(r.match.guardianContact, r.parent.phone);
              return (
                <li key={r.id} className="bg-sheet border border-rule rounded-xl p-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-slate-500">Parent request</p>
                      <p className="font-semibold text-ink mt-0.5">{r.parent.name}</p>
                      <p className="text-[13px] text-slate-600">
                        {formatPhone(r.parent.phone)}
                        {r.parent.email && <span className="break-all"> · {r.parent.email}</span>}
                      </p>
                      <p className="text-[13px] text-slate-700 mt-1">
                        Says they are the <strong className="font-medium">{r.relationship.toLowerCase()}</strong> of{" "}
                        <strong className="font-medium">{r.childName}</strong>, student ID <span className="font-mono">{r.studentIdNumber}</span>.
                      </p>
                      {r.parent.status === "ACTIVE" && <p className="text-xs text-slate-500 mt-1">Existing parent adding another child.</p>}
                    </div>
                    <div className="min-w-0 rounded-lg bg-slate-50 border border-rule p-3">
                      <p className="text-xs font-medium text-slate-500">Individual Inventory record for this ID</p>
                      {r.match ? (
                        <>
                          <p className="font-semibold text-ink mt-0.5">{r.match.name}</p>
                          <p className="text-[13px] text-slate-600">{r.match.gradeSection}</p>
                          <p className="text-[13px] text-slate-600">
                            Guardian on file: {r.match.guardianName || "—"} {r.match.guardianContact && `· ${r.match.guardianContact}`}
                          </p>
                          <ul className="mt-2 text-[12px] space-y-0.5">
                            <li className={nameMatches ? "text-emerald-700" : "text-orange-700"}>
                              {nameMatches ? "✓ Child's name matches" : "! Child's name doesn't match the record"}
                            </li>
                            <li className={phoneMatches ? "text-emerald-700" : "text-slate-500"}>
                              {phoneMatches ? "✓ Mobile number matches the guardian contact" : "Mobile number isn't the guardian contact on file. Consider calling to confirm."}
                            </li>
                          </ul>
                        </>
                      ) : (
                        <p className="text-[13px] text-orange-700 mt-1">
                          No student with this ID yet. Add the record in Individual Inventory first, or decline.
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <label htmlFor={`note-${r.id}`} className="sr-only">Note to the parent (optional)</label>
                    <input id={`note-${r.id}`} type="text" placeholder="Note to the parent (optional)" maxLength={200}
                      value={notes[r.id] ?? ""} onChange={(e) => setNotes({ ...notes, [r.id]: e.target.value })}
                      className="flex-1 min-w-48 bg-sheet border border-slate-300 rounded-md px-3 py-2 text-sm" />
                    <button disabled={busyId === r.id || !r.match} onClick={() => run(r.id, () => decideParentLink(r.id, true, notes[r.id]))}
                      className="inline-flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium px-4 min-h-10 rounded-full disabled:opacity-50">
                      <Check size={15} /> Approve
                    </button>
                    <button disabled={busyId === r.id} onClick={() => run(r.id, () => decideParentLink(r.id, false, notes[r.id]))}
                      className="inline-flex items-center gap-1.5 bg-red-50 hover:bg-red-100 text-red-700 text-sm font-medium px-4 min-h-10 rounded-full disabled:opacity-60">
                      <X size={15} /> Decline
                    </button>
                  </div>
                  <InlineError message={rowError?.id === r.id ? rowError.message : null} onDismiss={() => setRowError(null)} className="mt-2" />
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {/* All accounts */}
      <section className="mt-12" aria-labelledby="all-heading">
        <h2 id="all-heading" className="font-serif text-[22px] text-ink">All accounts</h2>
        <div className="relative mt-3 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={17} />
          <input type="text" aria-label="Search by name, email or mobile number" placeholder="Search by name, email or mobile number" value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-sheet border border-slate-300 rounded-md text-sm" />
        </div>

        {accounts === null ? (
          <div className="py-20 flex justify-center text-slate-500"><Loader2 className="animate-spin" size={20} /></div>
        ) : (
          <div className="mt-4 overflow-x-auto border-y border-rule">
            <table className="w-full text-sm text-left">
              <thead className="text-[13px] text-slate-500">
                <tr className="border-b border-rule">
                  <th className="py-3 pr-4 font-medium">Name</th>
                  <th className="py-3 pr-4 font-medium hidden sm:table-cell">Signs in with</th>
                  <th className="py-3 pr-4 font-medium">Role</th>
                  <th className="py-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-rule">
                {shown.length === 0 ? (
                  <tr><td colSpan={4} className="py-6 text-slate-500">No accounts match your search.</td></tr>
                ) : (
                  shown.map((a) => (
                    <tr key={a.id} className="align-top">
                      <td className="py-3 pr-4 font-medium text-ink">
                        {a.name}
                        {a.isMe && <span className="ml-2 text-xs font-normal text-slate-500">(you)</span>}
                        <span className="sm:hidden block text-[12px] font-normal text-slate-500 break-all">
                          {a.role === "PARENT" ? formatPhone(a.phone) || a.email : a.email}
                        </span>
                      </td>
                      <td className="py-3 pr-4 text-slate-600 break-all hidden sm:table-cell">{a.role === "PARENT" ? formatPhone(a.phone) || a.email : a.email}</td>
                      <td className="py-2 pr-4 min-w-44">
                        {a.role === "PARENT" ? (
                          <span className="inline-block py-2 text-slate-700">{ROLE_LABEL.PARENT}</span>
                        ) : (
                          <select aria-label={`Role for ${a.name}`} value={a.role} disabled={a.isMe || busyId === a.id}
                            onChange={(e) => run(a.id, () => setAccountRole(a.id, e.target.value as Role))}
                            className="bg-sheet border border-slate-300 rounded-md px-3 py-2 text-sm disabled:opacity-60">
                            {SCHOOL_ROLES.map((r) => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}
                          </select>
                        )}
                        <InlineError message={rowError?.id === a.id ? rowError.message : null} onDismiss={() => setRowError(null)} className="mt-2" />
                      </td>
                      <td className="py-2 min-w-36">
                        {a.status === "PENDING" ? (
                          <span className="inline-block py-2 text-orange-700">Waiting for approval</span>
                        ) : a.isMe ? (
                          <span className="inline-block py-2 text-emerald-700">Active</span>
                        ) : (
                          <button disabled={busyId === a.id} onClick={() => run(a.id, () => setAccountActive(a.id, a.status !== "ACTIVE"))}
                            className={`px-3 min-h-9 rounded-full text-[13px] font-medium disabled:opacity-60 ${
                              a.status === "ACTIVE" ? "text-emerald-700 hover:bg-red-50 hover:text-red-700" : "text-red-700 hover:bg-emerald-50 hover:text-emerald-700"
                            }`}
                            title={a.status === "ACTIVE" ? "Turn this account off" : "Turn this account back on"}>
                            {a.status === "ACTIVE" ? "Active · turn off" : "Off · turn on"}
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
