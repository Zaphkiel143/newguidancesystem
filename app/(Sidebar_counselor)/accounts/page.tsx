"use client";

import React, { useCallback, useEffect, useState } from 'react';
import { Check, Loader2, X } from 'lucide-react';
import { decideParentLink, listParentRequests } from '../../action/accounts';
import InlineError from '../../../components/InlineError';
import ConfirmDialog from '../../../components/ConfirmDialog';
import { formatPhone } from '../../../lib/phone';

type ParentRequest = Awaited<ReturnType<typeof listParentRequests>>[number];

function sameDigits(a: string | null | undefined, b: string | null | undefined) {
  const d = (s: string | null | undefined) => (s ?? "").replace(/\D/g, "").slice(-10);
  return d(a).length === 10 && d(a) === d(b);
}

// Guidance Associates confirm parents against the student's record; the Super Admin manages accounts
export default function ParentConfirmationsPage() {
  const [requests, setRequests] = useState<ParentRequest[] | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [rowError, setRowError] = useState<{ id: string; message: string } | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>({});
  // Confirming or declining asks first, in a dialog
  const [asking, setAsking] = useState<{ request: ParentRequest; approve: boolean } | null>(null);

  const load = useCallback(async () => setRequests(await listParentRequests()), []);

  useEffect(() => {
    let cancelled = false;
    listParentRequests().then((r) => {
      if (!cancelled) setRequests(r);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const decide = async (r: ParentRequest, approve: boolean, confirmed = false) => {
    if (!confirmed) return setAsking({ request: r, approve });
    setBusyId(r.id);
    setRowError(null);
    const result = await decideParentLink(r.id, approve, notes[r.id]);
    setBusyId(null);
    setAsking(null);
    if (result.success) await load();
    else setRowError({ id: r.id, message: result.error });
  };

  return (
    <div className="px-5 sm:px-8 lg:px-12 pt-8 lg:pt-12 pb-16 max-w-6xl text-slate-800">
      <header>
        <h1 className="page-title">Parent confirmations</h1>
        <p className="text-sm text-slate-500 mt-1">
          Check each parent against the student&apos;s Individual Inventory record before confirming. Other accounts are managed by the Super Admin.
        </p>
      </header>

      <section className="mt-8" aria-labelledby="waiting-heading">
        <h2 id="waiting-heading" className="font-serif text-[22px] text-ink">
          Waiting for confirmation {requests && requests.length > 0 && <span className="ml-1 text-base text-red-700 tabular">({requests.length})</span>}
        </h2>

        {!requests ? (
          <div className="py-10 flex justify-center text-slate-500"><Loader2 className="animate-spin" size={20} /></div>
        ) : requests.length === 0 ? (
          <p className="mt-3 border-t border-rule pt-4 text-sm text-slate-500">Nothing waiting. New requests show up here and in your notifications.</p>
        ) : (
          <ul className="mt-3 space-y-3">
            {requests.map((r) => {
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
                    <button disabled={busyId === r.id || !r.match} onClick={() => decide(r, true)}
                      className="inline-flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium px-4 min-h-10 rounded-full disabled:opacity-50">
                      <Check size={15} /> Approve
                    </button>
                    <button disabled={busyId === r.id} onClick={() => decide(r, false)}
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

      <ConfirmDialog
        open={asking !== null}
        title={asking?.approve ? `Confirm ${asking.request.parent.name}?` : `Decline ${asking?.request.parent.name ?? ""}'s request?`}
        message={
          asking &&
          (asking.approve
            ? `As the ${asking.request.relationship.toLowerCase()} of ${asking.request.match?.name ?? asking.request.childName}. They'll be able to see this student's appointments, sessions and career plan progress.`
            : `They won't be linked to ${asking.request.childName}.`)
        }
        confirmLabel={asking?.approve ? "Confirm parent" : "Decline"}
        danger={asking !== null && !asking.approve}
        busy={asking !== null && busyId === asking.request.id}
        onCancel={() => setAsking(null)}
        onConfirm={() => asking && decide(asking.request, asking.approve, true)}
      />
    </div>
  );
}
