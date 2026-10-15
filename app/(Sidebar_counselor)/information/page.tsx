"use client";

import React, { useCallback, useEffect, useState } from 'react';
import { Loader2, X } from 'lucide-react';
import { listAnnouncements, saveAnnouncement, deleteAnnouncement } from '../../action/counselor';
import InlineError from '../../../components/InlineError';

type Announcement = Awaited<ReturnType<typeof listAnnouncements>>[number];

const CATEGORIES = ["General", "Seminar", "Mental Health", "Career", "Reminder", "Awareness Month"];
const AUDIENCES = ["All", "Students", "Faculty", "Parents"];

const EMPTY = { title: "", body: "", category: CATEGORIES[0], audience: "All", isPublished: true };

export default function InformationServicePage() {
  const [items, setItems] = useState<Announcement[] | null>(null);
  const [editing, setEditing] = useState<{ id?: string } & typeof EMPTY>(EMPTY);
  const [isSaving, setIsSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [rowError, setRowError] = useState<{ id: string; message: string } | null>(null);
  const [viewersOf, setViewersOf] = useState<Announcement | null>(null);

  const load = useCallback(async () => setItems(await listAnnouncements()), []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const data = await listAnnouncements();
      if (!cancelled) setItems(data);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setFormError(null);
    const result = await saveAnnouncement(editing);
    setIsSaving(false);
    if (result.success) {
      setEditing(EMPTY);
      await load();
    } else {
      setFormError(result.error || "Couldn't save the announcement.");
    }
  };

  const togglePublished = async (a: Announcement) => {
    setRowError(null);
    const result = await saveAnnouncement({ ...a, isPublished: !a.isPublished });
    if (result.success) await load();
    else setRowError({ id: a.id, message: "Couldn't change visibility. Try again." });
  };

  const handleDelete = async (a: Announcement) => {
    if (!window.confirm(`Delete "${a.title}"? This can't be undone.`)) return;
    setRowError(null);
    const result = await deleteAnnouncement(a.id);
    if (result.success) {
      if (editing.id === a.id) setEditing(EMPTY);
      await load();
    } else {
      setRowError({ id: a.id, message: "Couldn't delete this announcement. Try again." });
    }
  };

  return (
    <div className="px-5 sm:px-8 lg:px-12 pt-8 lg:pt-12 pb-16 max-w-6xl text-slate-800">
      <header>
        <h1 className="page-title">Information Service</h1>
        <p className="text-sm text-slate-500 mt-1">Post announcements and resources once; students, faculty, and parents see them in E-Gabay</p>
      </header>

      <div className="mt-10 grid grid-cols-1 lg:grid-cols-[1fr_1.3fr] gap-12">
        <section>
          <h2 className="font-serif text-[22px] text-ink mb-3">{editing.id ? "Edit announcement" : "New announcement"}</h2>
          <form onSubmit={handleSubmit} className="border-t border-rule pt-4 space-y-4">
            <div>
              <label htmlFor="a-title" className="block text-[13px] font-medium text-slate-700 mb-1.5">Title</label>
              <input id="a-title" value={editing.title} onChange={(e) => setEditing({ ...editing, title: e.target.value })} required
                className="w-full bg-sheet border border-slate-300 rounded-md px-3 py-2.5 text-sm" />
            </div>
            <div>
              <label htmlFor="a-body" className="block text-[13px] font-medium text-slate-700 mb-1.5">Message</label>
              <textarea id="a-body" rows={6} value={editing.body} onChange={(e) => setEditing({ ...editing, body: e.target.value })} required
                className="w-full bg-sheet border border-slate-300 rounded-md px-3 py-2.5 text-sm resize-y" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="a-cat" className="block text-[13px] font-medium text-slate-700 mb-1.5">Category</label>
                <select id="a-cat" value={editing.category} onChange={(e) => setEditing({ ...editing, category: e.target.value })}
                  className="w-full bg-sheet border border-slate-300 rounded-md px-3 py-2.5 text-sm">
                  {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label htmlFor="a-aud" className="block text-[13px] font-medium text-slate-700 mb-1.5">Visible to</label>
                <select id="a-aud" value={editing.audience} onChange={(e) => setEditing({ ...editing, audience: e.target.value })}
                  className="w-full bg-sheet border border-slate-300 rounded-md px-3 py-2.5 text-sm">
                  {AUDIENCES.map((c) => <option key={c} value={c}>{c === "All" ? "Everyone" : c}</option>)}
                </select>
              </div>
            </div>
            <label className="flex items-center gap-2 text-sm text-slate-700 min-h-11">
              <input type="checkbox" checked={editing.isPublished} onChange={(e) => setEditing({ ...editing, isPublished: e.target.checked })}
                className="accent-blue-700 w-4 h-4" />
              Publish now (uncheck to save as a hidden draft)
            </label>
            <InlineError message={formError} onDismiss={() => setFormError(null)} />
            <div className="flex gap-2">
              <button type="submit" disabled={isSaving}
                className="inline-flex items-center gap-2 bg-blue-700 hover:bg-blue-800 disabled:opacity-60 text-white text-sm font-medium px-4 min-h-11 rounded-full transition-colors">
                {isSaving && <Loader2 size={16} className="animate-spin" />}
                {editing.id ? "Save changes" : "Post announcement"}
              </button>
              {editing.id && (
                <button type="button" onClick={() => { setEditing(EMPTY); setFormError(null); }}
                  className="px-4 min-h-11 rounded-full text-sm text-slate-600 hover:bg-slate-100 transition-colors">
                  Cancel
                </button>
              )}
            </div>
          </form>
        </section>

        <section>
          <h2 className="font-serif text-[22px] text-ink mb-3">Posted</h2>
          {items === null ? (
            <div className="py-12 flex justify-center text-slate-500"><Loader2 className="animate-spin" size={20} /></div>
          ) : items.length === 0 ? (
            <p className="border-t border-rule pt-4 text-sm text-slate-500">Nothing posted yet.</p>
          ) : (
            <ul className="divide-y divide-rule border-y border-rule">
              {items.map((a) => (
                <li key={a.id} className="py-4">
                  <div className="flex items-baseline justify-between gap-3">
                    <p className="text-xs text-slate-500">
                      {a.category} · {a.audience === "All" ? "Everyone" : a.audience} ·{" "}
                      {new Date(a.createdAt).toLocaleDateString("en-PH", { month: "short", day: "numeric" })}
                    </p>
                    <span className={`text-xs ${a.isPublished ? "text-emerald-700" : "text-slate-500"}`}>
                      {a.isPublished ? "Published" : "Hidden"}
                    </span>
                  </div>
                  <p className="font-medium text-ink mt-1">{a.title}</p>
                  <p className="text-sm text-slate-600 mt-1 line-clamp-2">{a.body}</p>
                  <div className="mt-2 flex flex-wrap items-center gap-x-1 text-[13px]">
                    <button onClick={() => setViewersOf(a)} className="px-2 min-h-9 -ml-2 rounded-full text-blue-700 hover:bg-blue-50">
                      Seen by {a.views.length}
                    </button>
                    <button onClick={() => { setEditing({ id: a.id, title: a.title, body: a.body, category: a.category, audience: a.audience, isPublished: a.isPublished }); setFormError(null); }}
                      className="px-2 min-h-9 rounded-full text-slate-600 hover:bg-slate-100">Edit</button>
                    <button onClick={() => togglePublished(a)} className="px-2 min-h-9 rounded-full text-slate-600 hover:bg-slate-100">
                      {a.isPublished ? "Hide" : "Publish"}
                    </button>
                    <button onClick={() => handleDelete(a)} className="px-2 min-h-9 rounded-full text-red-700 hover:bg-red-50">Delete</button>
                  </div>
                  <InlineError message={rowError?.id === a.id ? rowError.message : null} onDismiss={() => setRowError(null)} className="mt-2" />
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      {viewersOf && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4" onClick={() => setViewersOf(null)}>
          <div role="dialog" aria-modal="true" aria-labelledby="viewers-title" onClick={(e) => e.stopPropagation()}
            className="bg-sheet w-full max-w-md max-h-[80vh] overflow-y-auto rounded-xl border border-rule shadow-xl">
            <div className="flex items-start justify-between gap-4 p-5 border-b border-rule">
              <div>
                <h3 id="viewers-title" className="font-medium text-ink">Who has seen this</h3>
                <p className="text-xs text-slate-500 mt-0.5">{viewersOf.title}</p>
              </div>
              <button onClick={() => setViewersOf(null)} aria-label="Close"
                className="w-11 h-11 -m-2 grid place-items-center text-slate-500 hover:text-ink hover:bg-slate-100 rounded-full"><X size={18} /></button>
            </div>
            {viewersOf.views.length === 0 ? (
              <p className="p-5 text-sm text-slate-500">No one has opened the board since this was posted.</p>
            ) : (
              <ul className="divide-y divide-rule">
                {viewersOf.views.map((v) => (
                  <li key={v.id} className="px-5 py-3 flex items-baseline justify-between gap-4 text-sm">
                    <span className="text-ink">{v.viewerName} <span className="text-slate-500">· {v.viewerRole}</span></span>
                    <span className="text-xs text-slate-500 shrink-0">
                      {new Date(v.viewedAt).toLocaleString("en-PH", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
