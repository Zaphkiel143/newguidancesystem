"use client";

import React, { useCallback, useEffect, useState } from 'react';
import { Loader2, Search } from 'lucide-react';
import { listAccounts, setAccountRole } from '../../action/counselor';
import InlineError from '../../../components/InlineError';
import { SCHOOL_EMAIL_DOMAIN } from '../../config/school';

type Account = Awaited<ReturnType<typeof listAccounts>>[number];
type Role = Account["role"];

const ROLE_OPTIONS: { value: Role; label: string }[] = [
  { value: "STUDENT", label: "Student" },
  { value: "FACULTY", label: "Faculty / staff" },
  { value: "COUNSELOR", label: "Guidance Associate" },
  { value: "PARENT", label: "Parent / guardian" },
];

export default function AccountsPage() {
  const [accounts, setAccounts] = useState<Account[] | null>(null);
  const [query, setQuery] = useState("");
  const [savingId, setSavingId] = useState<string | null>(null);
  const [rowError, setRowError] = useState<{ id: string; message: string } | null>(null);
  const [saved, setSaved] = useState<string | null>(null);

  const load = useCallback(async () => setAccounts(await listAccounts()), []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const data = await listAccounts();
      if (!cancelled) setAccounts(data);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const changeRole = async (account: Account, role: Role) => {
    setSavingId(account.id);
    setRowError(null);
    setSaved(null);
    const result = await setAccountRole(account.id, role);
    setSavingId(null);
    if (result.success) {
      setSaved(account.id);
      await load();
    } else {
      setRowError({ id: account.id, message: result.error || "Couldn't change the role." });
    }
  };

  const q = query.trim().toLowerCase();
  const shown = (accounts ?? []).filter((a) => !q || a.name.toLowerCase().includes(q) || a.email.toLowerCase().includes(q));

  return (
    <div className="px-5 sm:px-8 lg:px-12 pt-8 lg:pt-12 pb-16 max-w-5xl text-slate-800">
      <header>
        <h1 className="page-title">Accounts</h1>
        <p className="text-sm text-slate-500 mt-1 max-w-[65ch]">
          Anyone with an @{SCHOOL_EMAIL_DOMAIN} email can sign in with a code and starts as a student. Change the role here
          for faculty, staff, and other Guidance Associates.
        </p>
      </header>

      <div className="relative mt-8 max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={17} />
        <input type="text" aria-label="Search by name or email" placeholder="Search by name or email" value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 bg-sheet border border-slate-300 rounded-md text-sm" />
      </div>

      {accounts === null ? (
        <div className="py-20 flex justify-center text-slate-500"><Loader2 className="animate-spin" size={20} /></div>
      ) : (
        <div className="mt-6 overflow-x-auto border-y border-rule">
          <table className="w-full text-sm text-left">
            <thead className="text-[13px] text-slate-500">
              <tr className="border-b border-rule">
                <th className="py-3 pr-4 font-medium">Name</th>
                <th className="py-3 pr-4 font-medium">Email</th>
                <th className="py-3 pr-4 font-medium">Joined</th>
                <th className="py-3 font-medium">Role</th>
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
                    </td>
                    <td className="py-3 pr-4 text-slate-600 break-all">{a.email}</td>
                    <td className="py-3 pr-4 font-mono text-[13px] text-slate-600">
                      {new Date(a.createdAt).toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" })}
                    </td>
                    <td className="py-2 min-w-48">
                      <div className="flex items-center gap-2">
                        <select
                          aria-label={`Role for ${a.name}`}
                          value={a.role}
                          disabled={a.isMe || savingId === a.id}
                          onChange={(e) => changeRole(a, e.target.value as Role)}
                          className="bg-sheet border border-slate-300 rounded-md px-3 py-2 text-sm disabled:opacity-60"
                        >
                          {ROLE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                        </select>
                        {savingId === a.id && <Loader2 size={16} className="animate-spin text-slate-500" />}
                        {saved === a.id && savingId !== a.id && <span role="status" className="text-xs text-emerald-700">Saved</span>}
                      </div>
                      <InlineError message={rowError?.id === a.id ? rowError.message : null} onDismiss={() => setRowError(null)} className="mt-2" />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
