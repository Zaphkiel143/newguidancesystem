"use client";

import React, { useCallback, useEffect, useState } from 'react';
import { Archive, Check, Copy, KeyRound, Loader2, RotateCcw, Search, X } from 'lucide-react';
import {
  decideStaffAccount,
  listAccounts,
  listStaffApprovals,
  resetParentPassword,
  setAccountArchived,
  setAccountRole,
} from '../app/action/accounts';
import InlineError from './InlineError';
import ConfirmDialog from './ConfirmDialog';
import { formatPhone } from '../lib/phone';

type Account = Awaited<ReturnType<typeof listAccounts>>[number];
type Pending = Awaited<ReturnType<typeof listStaffApprovals>>[number];
type Role = Account["role"];

const ROLE_LABEL: Record<Role, string> = {
  ADMIN: "Retired account",
  COUNSELOR: "Guidance Associate",
  FACULTY: "Faculty / staff",
  STUDENT: "Student",
  PARENT: "Parent / guardian",
};
// The Guidance Associate role moves by handover (My Account), so it isn't offered here.
const SWITCHABLE_ROLES: Role[] = ["STUDENT", "FACULTY"];
const FILTER_ROLES: Role[] = ["COUNSELOR", "FACULTY", "STUDENT", "PARENT"];

const STATUS: Record<string, { label: string; className: string }> = {
  ACTIVE: { label: "Active", className: "text-emerald-700" },
  PENDING: { label: "Waiting for approval", className: "text-orange-700" },
  REJECTED: { label: "Declined", className: "text-red-700" },
  ARCHIVED: { label: "Archived", className: "text-slate-500" },
};

const fmtDate = (d: Date | string) =>
  new Date(d).toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric", timeZone: "Asia/Manila" });

const signsInWith = (a: { role: Role; phone: string | null; email: string | null }) =>
  a.role === "PARENT" ? formatPhone(a.phone) || a.email : a.email;

// Every account, managed by the Guidance Associate (there is no Super Admin):
// approve faculty and guidance staff sign-ups, switch student/faculty roles,
// archive or restore accounts, and reset parent passwords.
export default function AccountsManager() {
  const [accounts, setAccounts] = useState<Account[] | null>(null);
  const [pending, setPending] = useState<Pending[] | null>(null);
  const [tab, setTab] = useState<"current" | "archived">("current");
  const [roleFilter, setRoleFilter] = useState<Role | "">("");
  const [query, setQuery] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [rowError, setRowError] = useState<{ id: string; message: string } | null>(null);
  const [tempPassword, setTempPassword] = useState<{ name: string; password: string } | null>(null);
  const [copied, setCopied] = useState(false);
  // Every change is confirmed first in a dialog
  const [asking, setAsking] = useState<{ id: string; title: string; message: string; confirmLabel: string; danger?: boolean; go: () => Promise<void> } | null>(null);

  const load = useCallback(async () => {
    const [a, p] = await Promise.all([listAccounts(), listStaffApprovals()]);
    setAccounts(a);
    setPending(p);
  }, []);

  useEffect(() => {
    let cancelled = false;
    Promise.all([listAccounts(), listStaffApprovals()]).then(([a, p]) => {
      if (cancelled) return;
      setAccounts(a);
      setPending(p);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // Runs a confirmed change, then reloads the list
  const doRun = async (id: string, action: () => Promise<{ success: boolean; error?: string }>) => {
    setBusyId(id);
    setRowError(null);
    const result = await action();
    setBusyId(null);
    setAsking(null);
    if (result.success) await load();
    else setRowError({ id, message: result.error || "Something went wrong." });
  };

  const run = (id: string, title: string, message: string, confirmLabel: string, action: () => Promise<{ success: boolean; error?: string }>, danger = false) =>
    setAsking({ id, title, message, confirmLabel, danger, go: () => doRun(id, action) });

  const resetPassword = (a: Account) =>
    setAsking({
      id: a.id,
      title: `Reset ${a.name}'s password?`,
      message: "Their current password stops working and they're signed out. You'll get a temporary password to give them.",
      confirmLabel: "Reset password",
      danger: true,
      go: async () => {
        setBusyId(a.id);
        setRowError(null);
        const result = await resetParentPassword(a.id);
        setBusyId(null);
        setAsking(null);
        if (result.success) {
          setCopied(false);
          setTempPassword({ name: a.name, password: result.password });
        } else setRowError({ id: a.id, message: result.error });
      },
    });

  const q = query.trim().toLowerCase();
  const digits = q.replace(/\D/g, "");
  const shown = (accounts ?? []).filter((a) => {
    if ((tab === "archived") !== (a.status === "ARCHIVED")) return false;
    if (roleFilter && a.role !== roleFilter) return false;
    return !q || a.name.toLowerCase().includes(q) || (a.email ?? "").toLowerCase().includes(q) || (digits.length > 2 && (a.phone ?? "").includes(digits.slice(-9)));
  });
  const archivedCount = (accounts ?? []).filter((a) => a.status === "ARCHIVED").length;

  const pill = "inline-flex items-center gap-1.5 text-[13px] font-medium px-3 min-h-9 rounded-full disabled:opacity-50";

  return (
    <div>
      <section className="mt-12" aria-labelledby="staff-waiting-heading">
        <h2 id="staff-waiting-heading" className="font-serif text-[22px] text-ink">
          Faculty and staff sign-ups {pending && pending.length > 0 && <span className="ml-1 text-base text-red-700 tabular">({pending.length})</span>}
        </h2>
        {!pending ? (
          <div className="py-8 flex justify-center text-slate-500"><Loader2 className="animate-spin" size={20} /></div>
        ) : pending.length === 0 ? (
          <p className="mt-3 border-t border-rule pt-4 text-sm text-slate-500">
            Nothing waiting. Faculty and staff who sign up with their school email show up here.
          </p>
        ) : (
          <ul className="mt-3 grid gap-3 lg:grid-cols-2">
            {pending.map((u) => (
              <li key={u.id} className="bg-sheet border border-rule rounded-xl p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-semibold text-ink">{u.name}</p>
                    <p className="text-[13px] text-slate-600 break-all">{u.email}</p>
                    <p className="text-[13px] text-slate-500 mt-0.5">
                      Signed up as <strong className="font-medium text-ink">{ROLE_LABEL[u.role]}</strong> · {fmtDate(u.createdAt)}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button disabled={busyId === u.id}
                      onClick={() => run(u.id, `Approve ${u.name}?`, `They'll be able to sign in right away as ${ROLE_LABEL[u.role]}.`, "Approve", () => decideStaffAccount(u.id, true))}
                      className={`${pill} bg-emerald-600 hover:bg-emerald-700 text-white px-4 min-h-10`}>
                      <Check size={15} /> Approve
                    </button>
                    <button disabled={busyId === u.id}
                      onClick={() => run(u.id, `Decline ${u.name}'s request?`, "They won't be able to sign in with this account.", "Decline", () => decideStaffAccount(u.id, false), true)}
                      className={`${pill} bg-red-50 hover:bg-red-100 text-red-700 px-4 min-h-10`}>
                      <X size={15} /> Decline
                    </button>
                  </div>
                </div>
                <InlineError message={rowError?.id === u.id ? rowError.message : null} onDismiss={() => setRowError(null)} className="mt-2" />
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mt-12" aria-labelledby="all-heading">
        <h2 id="all-heading" className="font-serif text-[22px] text-ink">All accounts</h2>

        <div className="mt-3 flex flex-wrap items-center gap-3">
          <div role="tablist" aria-label="Which accounts" className="inline-flex rounded-full bg-slate-100 p-1">
            {(["current", "archived"] as const).map((t) => (
              <button key={t} role="tab" aria-selected={tab === t} onClick={() => setTab(t)}
                className={`px-4 min-h-9 rounded-full text-[13px] font-medium ${tab === t ? "bg-sheet text-ink shadow-sm" : "text-slate-600 hover:text-ink"}`}>
                {t === "current" ? "Current" : `Archived${archivedCount ? ` (${archivedCount})` : ""}`}
              </button>
            ))}
          </div>
          <label className="sr-only" htmlFor="role-filter">Role</label>
          <select id="role-filter" value={roleFilter} onChange={(e) => setRoleFilter(e.target.value as Role | "")}
            className="bg-sheet border border-slate-300 rounded-md px-3 py-2 text-sm">
            <option value="">All roles</option>
            {FILTER_ROLES.map((r) => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}
          </select>
          <div className="relative flex-1 min-w-56 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={17} />
            <input type="text" aria-label="Search by name, email or mobile number" placeholder="Search by name, email or mobile number" value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-sheet border border-slate-300 rounded-md text-sm" />
          </div>
        </div>

        {accounts === null ? (
          <div className="py-20 flex justify-center text-slate-500"><Loader2 className="animate-spin" size={20} /></div>
        ) : (
          <div className="mt-4 overflow-x-auto border-y border-rule">
            <table className="w-full text-sm text-left">
              <thead className="text-[13px] text-slate-500">
                <tr className="border-b border-rule">
                  <th className="py-3 pr-4 font-medium">Name</th>
                  <th className="py-3 pr-4 font-medium hidden md:table-cell">Signs in with</th>
                  <th className="py-3 pr-4 font-medium">Role</th>
                  <th className="py-3 pr-4 font-medium">Status</th>
                  <th className="py-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-rule">
                {shown.length === 0 ? (
                  <tr><td colSpan={5} className="py-6 text-slate-500">{tab === "archived" ? "No archived accounts." : "No accounts match."}</td></tr>
                ) : (
                  shown.map((a) => {
                    const status = STATUS[a.status] ?? { label: a.status, className: "text-slate-600" };
                    const busy = busyId === a.id;
                    return (
                      <tr key={a.id} className="align-top">
                        <td className="py-3 pr-4 font-medium text-ink">
                          {a.name}
                          {a.isMe && <span className="ml-2 text-xs font-normal text-slate-500">(you)</span>}
                          <span className="md:hidden block text-[12px] font-normal text-slate-500 break-all">{signsInWith(a)}</span>
                        </td>
                        <td className="py-3 pr-4 text-slate-600 break-all hidden md:table-cell">{signsInWith(a)}</td>
                        <td className="py-2 pr-4 min-w-44">
                          {!SWITCHABLE_ROLES.includes(a.role) || a.isMe || a.status === "ARCHIVED" ? (
                            <span className="inline-block py-2 text-slate-700">{ROLE_LABEL[a.role]}</span>
                          ) : (
                            <select aria-label={`Role for ${a.name}`} value={a.role} disabled={busy}
                              onChange={(e) => {
                                const next = e.target.value as Role;
                                run(a.id, `Change ${a.name}'s role?`, `From ${ROLE_LABEL[a.role]} to ${ROLE_LABEL[next]}. They'll be signed out and see the new menu when they sign in again.`,
                                  "Change role", () => setAccountRole(a.id, next));
                              }}
                              className="bg-sheet border border-slate-300 rounded-md px-3 py-2 text-sm disabled:opacity-60">
                              {SWITCHABLE_ROLES.map((r) => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}
                            </select>
                          )}
                        </td>
                        <td className={`py-3 pr-4 ${status.className}`}>
                          {status.label}
                          {a.archivedAt && <span className="block text-[12px] text-slate-500">since {fmtDate(a.archivedAt)}</span>}
                        </td>
                        <td className="py-2">
                          {!a.isMe && (
                            <div className="flex flex-wrap justify-end gap-1">
                              {a.role === "PARENT" && a.status !== "ARCHIVED" && (
                                <button disabled={busy} onClick={() => resetPassword(a)} className={`${pill} text-slate-700 hover:bg-slate-100`}>
                                  <KeyRound size={14} /> Reset password
                                </button>
                              )}
                              {a.status === "ARCHIVED" ? (
                                <button disabled={busy}
                                  onClick={() => run(a.id, `Restore ${a.name}'s account?`, "They'll be able to sign in again.", "Restore", () => setAccountArchived(a.id, false))}
                                  className={`${pill} text-emerald-700 hover:bg-emerald-50`}>
                                  <RotateCcw size={14} /> Restore
                                </button>
                              ) : (
                                <button disabled={busy}
                                  onClick={() => run(a.id, `Archive ${a.name}'s account?`, "They'll be signed out and can't sign in until it's restored. Their records are kept.", "Archive", () => setAccountArchived(a.id, true), true)}
                                  className={`${pill} text-red-700 hover:bg-red-50`}>
                                  <Archive size={14} /> Archive
                                </button>
                              )}
                            </div>
                          )}
                          <InlineError message={rowError?.id === a.id ? rowError.message : null} onDismiss={() => setRowError(null)} className="mt-2" />
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <ConfirmDialog
        open={asking !== null}
        title={asking?.title ?? ""}
        message={asking?.message}
        confirmLabel={asking?.confirmLabel ?? "OK"}
        danger={asking?.danger}
        busy={asking !== null && busyId === asking.id}
        onCancel={() => setAsking(null)}
        onConfirm={() => void asking?.go()}
      />

      {tempPassword && (
        <div role="dialog" aria-modal="true" aria-labelledby="temp-title" className="fixed inset-0 z-50 bg-ink/40 grid place-items-center p-4">
          <div className="w-full max-w-md bg-sheet rounded-2xl shadow-2xl p-6">
            <h2 id="temp-title" className="text-lg font-semibold text-ink">Temporary password for {tempPassword.name}</h2>
            <p className="text-sm text-slate-600 mt-1">Give it to the parent in person or by phone. It is shown only once. Ask them to change it in My Profile after signing in.</p>
            <div className="mt-4 flex items-center gap-2">
              <code className="flex-1 font-mono text-xl tracking-wider bg-slate-50 border border-rule rounded-lg px-4 py-3 select-all">{tempPassword.password}</code>
              <button onClick={() => { void navigator.clipboard?.writeText(tempPassword.password); setCopied(true); }}
                className="inline-flex items-center gap-1.5 px-3 min-h-11 rounded-full border border-slate-300 text-sm hover:bg-slate-50">
                <Copy size={15} /> {copied ? "Copied" : "Copy"}
              </button>
            </div>
            <button onClick={() => setTempPassword(null)} autoFocus
              className="mt-5 w-full bg-blue-700 hover:bg-blue-800 text-white font-medium rounded-full min-h-11">
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
