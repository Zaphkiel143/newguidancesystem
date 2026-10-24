"use client";

import React, { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { changeMyPassword, getMyParentProfile, requestChildLink, updateMyParentProfile } from "../../action/parent";
import PhotoPicker from "../../../components/PhotoPicker";
import { PushToggle } from "../../../components/LoginApproval";
import InlineError from "../../../components/InlineError";
import { formatPhone } from "../../../lib/phone";

type Profile = NonNullable<Awaited<ReturnType<typeof getMyParentProfile>>>;

const EXTENSIONS = ["Jr.", "Sr.", "II", "III", "IV", "V"];
const RELATIONSHIPS = ["Mother", "Father", "Guardian", "Grandparent", "Sibling", "Other relative"];

// Best guess at name parts from the stored full name ("First Middle Last Ext")
function splitName(full: string) {
  const parts = full.split(/\s+/).filter(Boolean);
  const ext = EXTENSIONS.includes(parts[parts.length - 1] ?? "") ? parts.pop()! : "";
  const last = parts.length > 1 ? parts.pop()! : "";
  return { first: parts.join(" "), last, ext };
}

const STATUS: Record<string, { label: string; className: string }> = {
  APPROVED: { label: "Linked", className: "text-emerald-700 bg-emerald-50" },
  PENDING: { label: "Waiting for the guidance office", className: "text-orange-700 bg-orange-50" },
  REJECTED: { label: "Not approved", className: "text-red-700 bg-red-50" },
};

const input = "w-full px-3.5 py-2.5 bg-sheet border border-slate-300 rounded-md text-[15px]";
const label = "block text-[13px] font-medium text-slate-700 mb-1.5";
const primary = "inline-flex items-center justify-center gap-2 bg-blue-700 hover:bg-blue-800 text-white font-medium px-6 min-h-11 rounded-full text-[14px] disabled:opacity-60";

export default function ParentProfilePage() {
  const [profile, setProfile] = useState<Profile | null | undefined>(undefined);
  const [form, setForm] = useState({ first: "", last: "", ext: "", phone: "", email: "" });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [pw, setPw] = useState({ current: "", next: "", confirm: "" });
  const [pwState, setPwState] = useState<{ busy: boolean; error: string | null; done: boolean }>({ busy: false, error: null, done: false });

  const [link, setLink] = useState({ childStudentId: "", childName: "", relationship: "" });
  const [linkState, setLinkState] = useState<{ busy: boolean; error: string | null; done: boolean }>({ busy: false, error: null, done: false });

  const apply = (p: Profile | null) => {
    setProfile(p);
    if (p) {
      const n = splitName(p.name);
      setForm({ first: n.first, last: n.last, ext: n.ext, phone: formatPhone(p.phone), email: p.email ?? "" });
    }
  };

  useEffect(() => {
    let cancelled = false;
    getMyParentProfile().then((p) => !cancelled && apply(p));
    return () => {
      cancelled = true;
    };
  }, []);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSaved(false);
    const result = await updateMyParentProfile({ firstName: form.first, lastName: form.last, nameExtension: form.ext, phone: form.phone, email: form.email });
    setSaving(false);
    if (result.success) {
      setSaved(true);
      // The name in the top bar comes from the server
      window.location.reload();
    } else setError(result.error ?? "Couldn't save.");
  };

  const savePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pw.next !== pw.confirm) return setPwState({ busy: false, error: "The new passwords don't match.", done: false });
    setPwState({ busy: true, error: null, done: false });
    const result = await changeMyPassword({ current: pw.current, next: pw.next });
    setPwState({ busy: false, error: result.success ? null : result.error ?? "Couldn't change it.", done: result.success });
    if (result.success) setPw({ current: "", next: "", confirm: "" });
  };

  const sendLink = async (e: React.FormEvent) => {
    e.preventDefault();
    setLinkState({ busy: true, error: null, done: false });
    const result = await requestChildLink(link);
    setLinkState({ busy: false, error: result.success ? null : result.error ?? "Couldn't send it.", done: result.success });
    if (result.success) {
      setLink({ childStudentId: "", childName: "", relationship: "" });
      apply(await getMyParentProfile());
    }
  };

  if (profile === undefined) {
    return <div className="py-24 flex justify-center text-slate-500"><Loader2 className="animate-spin" size={20} /></div>;
  }
  if (profile === null) {
    return <p className="px-5 sm:px-8 lg:px-12 pt-12 text-sm text-slate-600">Couldn&apos;t load your profile. Refresh the page to try again.</p>;
  }

  return (
    <div className="px-5 sm:px-8 lg:px-12 pt-8 lg:pt-12 pb-16 max-w-3xl text-slate-800">
      <header>
        <h1 className="page-title">My profile</h1>
      </header>

      <section className="mt-8 bg-sheet border border-rule rounded-2xl p-5 sm:p-6">
        <PhotoPicker name={profile.name} hasPhoto={profile.hasPhoto} />

        <form onSubmit={save} className="mt-6 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_7rem] gap-3">
            <div>
              <label htmlFor="p-last" className={label}>Last name</label>
              <input id="p-last" className={input} value={form.last} maxLength={60} required onChange={(e) => setForm({ ...form, last: e.target.value })} />
            </div>
            <div>
              <label htmlFor="p-first" className={label}>First name</label>
              <input id="p-first" className={input} value={form.first} maxLength={60} required onChange={(e) => setForm({ ...form, first: e.target.value })} />
            </div>
            <div>
              <label htmlFor="p-ext" className={label}>Ext. <span className="font-normal text-slate-500">(optional)</span></label>
              <select id="p-ext" className={input} value={form.ext} onChange={(e) => setForm({ ...form, ext: e.target.value })}>
                <option value="">None</option>
                {EXTENSIONS.map((x) => <option key={x} value={x}>{x}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label htmlFor="p-phone" className={label}>Mobile number (used to sign in)</label>
              <input id="p-phone" type="tel" inputMode="tel" className={input} value={form.phone} required onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </div>
            <div>
              <label htmlFor="p-email" className={label}>Email <span className="font-normal text-slate-500">(optional)</span></label>
              <input id="p-email" type="email" className={input} value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </div>
          </div>
          <InlineError message={error} onDismiss={() => setError(null)} />
          <div className="flex items-center gap-3">
            <button type="submit" disabled={saving} className={primary}>
              {saving && <Loader2 size={15} className="animate-spin" />} Save changes
            </button>
            {saved && <span role="status" className="text-sm text-emerald-700">Saved</span>}
          </div>
        </form>
      </section>

      <section className="mt-8 bg-sheet border border-rule rounded-2xl p-5 sm:p-6" aria-labelledby="children-heading">
        <h2 id="children-heading" className="font-semibold text-[17px] text-ink">My children at STI</h2>
        <ul className="mt-3 divide-y divide-rule border-y border-rule">
          {profile.links.length === 0 && <li className="py-3 text-sm text-slate-500">No students linked yet.</li>}
          {profile.links.map((l) => (
            <li key={l.id} className="py-3 flex flex-wrap items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="font-medium text-ink">{l.childName}</p>
                <p className="text-[13px] text-slate-500">
                  ID <span className="font-mono">{l.studentIdNumber}</span> · {l.relationship}
                  {l.note && <span className="block text-slate-600">Note from the office: {l.note}</span>}
                </p>
              </div>
              <span className={`text-[12px] font-medium px-2.5 py-1 rounded-full ${STATUS[l.status]?.className ?? ""}`}>{STATUS[l.status]?.label ?? l.status}</span>
            </li>
          ))}
        </ul>

        <form onSubmit={sendLink} className="mt-5 space-y-3">
          <p className="text-[14px] font-medium text-ink">Link another child</p>
          <div className="grid grid-cols-1 sm:grid-cols-[1.4fr_1fr_1fr] gap-3">
            <div>
              <label htmlFor="l-name" className={label}>Child&apos;s full name</label>
              <input id="l-name" className={input} value={link.childName} maxLength={120} required onChange={(e) => setLink({ ...link, childName: e.target.value })} />
            </div>
            <div>
              <label htmlFor="l-id" className={label}>Student ID</label>
              <input id="l-id" className={input} value={link.childStudentId} maxLength={20} required onChange={(e) => setLink({ ...link, childStudentId: e.target.value })} />
            </div>
            <div>
              <label htmlFor="l-rel" className={label}>You are their</label>
              <select id="l-rel" className={input} value={link.relationship} required onChange={(e) => setLink({ ...link, relationship: e.target.value })}>
                <option value="" disabled>Choose…</option>
                {RELATIONSHIPS.map((r) => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
          </div>
          <InlineError message={linkState.error} onDismiss={() => setLinkState({ ...linkState, error: null })} />
          <div className="flex items-center gap-3">
            <button type="submit" disabled={linkState.busy} className={primary}>
              {linkState.busy && <Loader2 size={15} className="animate-spin" />} Send request
            </button>
            {linkState.done && <span role="status" className="text-sm text-emerald-700">Sent. The guidance office will confirm it.</span>}
          </div>
        </form>
      </section>

      <div id="settings" className="scroll-mt-24 mt-8 space-y-8">
        <PushToggle />
      <section className="bg-sheet border border-rule rounded-2xl p-5 sm:p-6" aria-labelledby="pw-heading">
        <h2 id="pw-heading" className="font-semibold text-[17px] text-ink">Change password</h2>
        <form onSubmit={savePassword} className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
          <div>
            <label htmlFor="pw-current" className={label}>Current password</label>
            <input id="pw-current" type="password" autoComplete="current-password" className={input} value={pw.current} required onChange={(e) => setPw({ ...pw, current: e.target.value })} />
          </div>
          <div>
            <label htmlFor="pw-next" className={label}>New password</label>
            <input id="pw-next" type="password" autoComplete="new-password" minLength={8} className={input} value={pw.next} required onChange={(e) => setPw({ ...pw, next: e.target.value })} />
          </div>
          <div>
            <label htmlFor="pw-confirm" className={label}>Repeat new password</label>
            <input id="pw-confirm" type="password" autoComplete="new-password" minLength={8} className={input} value={pw.confirm} required onChange={(e) => setPw({ ...pw, confirm: e.target.value })} />
          </div>
          <div className="sm:col-span-3 space-y-2">
            <InlineError message={pwState.error} onDismiss={() => setPwState({ ...pwState, error: null })} />
            <div className="flex items-center gap-3">
              <button type="submit" disabled={pwState.busy} className={primary}>
                {pwState.busy && <Loader2 size={15} className="animate-spin" />} Change password
              </button>
              {pwState.done && <span role="status" className="text-sm text-emerald-700">Password changed</span>}
            </div>
          </div>
        </form>
      </section>
      </div>
    </div>
  );
}
