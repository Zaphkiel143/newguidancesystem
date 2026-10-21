"use client";

import React, { useCallback, useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { CalendarDays, ImagePlus, Loader2, X } from 'lucide-react';
import { listAnnouncements, saveAnnouncement, deleteAnnouncement } from '../../action/counselor';
import InlineError from '../../../components/InlineError';
import { FacebookPost } from '../../../components/FacebookEmbed';

type Announcement = Awaited<ReturnType<typeof listAnnouncements>>[number];

const CATEGORIES = ["General", "Seminar", "Mental Health", "Career", "Reminder", "Awareness Month"];
const AUDIENCES = [
  { value: "All", label: "Everyone" },
  { value: "Students", label: "Students" },
  { value: "Faculty", label: "Faculty" },
  { value: "Parents", label: "Parents" },
];
const OFFICE = "Guidance and Counseling Office";
const MAX_PHOTO_BYTES = 5 * 1024 * 1024;

type Draft = {
  id?: string;
  title: string;
  body: string;
  category: string;
  audience: string;
  isPublished: boolean;
  facebookUrl: string;
  showFacebook: boolean;
  // Photo: a new file, the existing one (by URL), or none.
  photoFile: File | null;
  photoPreview: string | null;
  removePhoto: boolean;
};

const EMPTY: Draft = {
  title: "", body: "", category: CATEGORIES[0], audience: "All", isPublished: true,
  facebookUrl: "", showFacebook: false, photoFile: null, photoPreview: null, removePhoto: false,
};

const imageUrl = (a: Announcement) => `/api/announcements/${a.id}/image?v=${new Date(a.updatedAt).getTime()}`;

function readAsBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(",")[1] ?? "");
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

function OfficeAvatar({ size = 40 }: { size?: number }) {
  return <Image src="/sti-logo.jpg" alt="" width={size} height={size} className="rounded-full ring-1 ring-rule shrink-0" />;
}

// The Facebook-style announcements feed. The composer's "Event" shortcut
// switches to the Events tab of the same module.
export default function AnnouncementsPanel({ onAddEvent }: { onAddEvent: () => void }) {
  const [items, setItems] = useState<Announcement[] | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null); // null = composer closed
  const [isSaving, setIsSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [rowError, setRowError] = useState<{ id: string; message: string } | null>(null);
  const [viewersOf, setViewersOf] = useState<Announcement | null>(null);
  const photoInput = useRef<HTMLInputElement>(null);
  const titleInput = useRef<HTMLInputElement>(null);

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

  // Escape closes the composer; the page behind doesn't scroll while it's open.
  useEffect(() => {
    if (!draft) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && !isSaving && setDraft(null);
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [draft, isSaving]);

  const open = (start: Partial<Draft> = {}, pickPhoto = false) => {
    setFormError(null);
    setDraft({ ...EMPTY, ...start });
    setTimeout(() => (pickPhoto ? photoInput.current?.click() : titleInput.current?.focus()), 50);
  };

  const openEdit = (a: Announcement) =>
    open({
      id: a.id, title: a.title, body: a.body, category: a.category, audience: a.audience, isPublished: a.isPublished,
      facebookUrl: a.facebookUrl ?? "", showFacebook: Boolean(a.facebookUrl),
      photoPreview: a.hasImage ? imageUrl(a) : null,
    });

  const choosePhoto = (file: File | undefined) => {
    if (!file || !draft) return;
    if (!file.type.startsWith("image/")) return setFormError("Choose a photo (JPG, PNG, WebP, or GIF).");
    if (file.size > MAX_PHOTO_BYTES) return setFormError("Photos must be 5 MB or smaller.");
    setFormError(null);
    setDraft({ ...draft, photoFile: file, photoPreview: URL.createObjectURL(file), removePhoto: false });
  };

  const removePhoto = () => {
    if (!draft) return;
    setDraft({ ...draft, photoFile: null, photoPreview: null, removePhoto: Boolean(draft.id) });
    if (photoInput.current) photoInput.current.value = "";
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!draft) return;
    setIsSaving(true);
    setFormError(null);
    const image = draft.photoFile ? { dataBase64: await readAsBase64(draft.photoFile) } : draft.removePhoto ? null : undefined;
    const result = await saveAnnouncement({
      id: draft.id,
      title: draft.title,
      body: draft.body,
      category: draft.category,
      audience: draft.audience,
      isPublished: draft.isPublished,
      facebookUrl: draft.showFacebook ? draft.facebookUrl : "",
      image,
    });
    setIsSaving(false);
    if (result.success) {
      setDraft(null);
      await load();
    } else {
      setFormError(result.error || "Couldn't save the announcement.");
    }
  };

  const togglePublished = async (a: Announcement) => {
    setRowError(null);
    const result = await saveAnnouncement({
      id: a.id, title: a.title, body: a.body, category: a.category, audience: a.audience,
      facebookUrl: a.facebookUrl ?? "", isPublished: !a.isPublished,
    });
    if (result.success) await load();
    else setRowError({ id: a.id, message: "Couldn't change visibility. Try again." });
  };

  const handleDelete = async (a: Announcement) => {
    if (!window.confirm(`Delete "${a.title}"? This can't be undone.`)) return;
    setRowError(null);
    const result = await deleteAnnouncement(a.id);
    if (result.success) await load();
    else setRowError({ id: a.id, message: "Couldn't delete this announcement. Try again." });
  };

  const canPost = Boolean(draft && draft.title.trim() && draft.body.trim());

  return (
    <div className="max-w-3xl">
      {/* Composer bar, like Facebook's "What's on your mind?" */}
      <section className="bg-sheet border border-rule rounded-2xl shadow-sm p-4">
        <div className="flex items-center gap-3">
          <OfficeAvatar />
          <button
            type="button"
            onClick={() => open()}
            className="flex-1 text-left bg-slate-100 hover:bg-slate-200 text-slate-500 text-[15px] px-4 min-h-11 rounded-full transition-colors"
          >
            What would you like to announce?
          </button>
        </div>
        <div className="mt-3 pt-3 border-t border-rule grid grid-cols-3 gap-1">
          <button type="button" onClick={() => open({}, true)}
            className="inline-flex items-center justify-center gap-2 min-h-11 rounded-full text-[14px] font-medium text-slate-600 hover:bg-slate-100 transition-colors">
            <ImagePlus size={19} className="text-emerald-600" /> Photo
          </button>
          <button type="button" onClick={() => open({ showFacebook: true })}
            className="inline-flex items-center justify-center gap-2 min-h-11 rounded-full text-[14px] font-medium text-slate-600 hover:bg-slate-100 transition-colors">
            <FacebookMark /> Facebook post
          </button>
          <button type="button" onClick={onAddEvent}
            className="inline-flex items-center justify-center gap-2 min-h-11 rounded-full text-[14px] font-medium text-slate-600 hover:bg-slate-100 transition-colors">
            <CalendarDays size={19} className="text-orange-600" /> Event
          </button>
        </div>
      </section>

      {/* Feed */}
      <section className="mt-6 space-y-4" aria-label="Posted announcements">
        {items === null ? (
          <div className="py-16 flex justify-center text-slate-500"><Loader2 className="animate-spin" size={20} /></div>
        ) : items.length === 0 ? (
          <p className="text-center text-sm text-slate-500 py-10">Nothing posted yet. Your first announcement will show here.</p>
        ) : (
          items.map((a) => (
            <article key={a.id} className="bg-sheet border border-rule rounded-2xl shadow-sm overflow-hidden">
              <div className="px-4 pt-4 flex items-start gap-3">
                <OfficeAvatar />
                <div className="min-w-0 flex-1 leading-tight">
                  <p className="font-semibold text-ink text-[15px]">{OFFICE}</p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {new Date(a.createdAt).toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" })} ·{" "}
                    {AUDIENCES.find((x) => x.value === a.audience)?.label ?? a.audience} · {a.category}
                  </p>
                </div>
                <span className={`shrink-0 text-xs font-medium px-2.5 py-1 rounded-full ${a.isPublished ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"}`}>
                  {a.isPublished ? "Published" : "Hidden"}
                </span>
              </div>

              <div className="px-4 pt-3">
                <h2 className="font-semibold text-ink text-[17px]">{a.title}</h2>
                <p className="text-[15px] leading-relaxed text-slate-700 mt-1 whitespace-pre-wrap">{a.body}</p>
              </div>

              {a.hasImage && (
                // eslint-disable-next-line @next/next/no-img-element -- private, session-checked image route
                <img src={imageUrl(a)} alt={`Photo for ${a.title}`} loading="lazy"
                  className="mt-3 w-full max-h-[560px] object-contain bg-slate-50 border-y border-rule" />
              )}

              {a.facebookUrl && (
                <div className="px-4">
                  <FacebookPost postUrl={a.facebookUrl} />
                </div>
              )}

              <div className="mt-3 mx-4 py-2 border-t border-rule flex flex-wrap items-center gap-1 text-[13px]">
                <button onClick={() => setViewersOf(a)} className="px-3 min-h-9 rounded-full text-blue-700 hover:bg-blue-50">
                  Seen by {a.views.length}
                </button>
                <span className="flex-1" />
                <button onClick={() => openEdit(a)} className="px-3 min-h-9 rounded-full text-slate-600 hover:bg-slate-100">Edit</button>
                <button onClick={() => togglePublished(a)} className="px-3 min-h-9 rounded-full text-slate-600 hover:bg-slate-100">
                  {a.isPublished ? "Hide" : "Publish"}
                </button>
                <button onClick={() => handleDelete(a)} className="px-3 min-h-9 rounded-full text-red-700 hover:bg-red-50">Delete</button>
              </div>
              <InlineError message={rowError?.id === a.id ? rowError.message : null} onDismiss={() => setRowError(null)} className="mx-4 mb-3" />
            </article>
          ))
        )}
      </section>

      {/* Composer pop-up, like Facebook's "Create post" */}
      {draft && (
        <div className="fixed inset-0 z-50 flex items-start sm:items-center justify-center bg-ink/50 p-3 sm:p-6 overflow-y-auto"
          onClick={() => !isSaving && setDraft(null)}>
          <form role="dialog" aria-modal="true" aria-labelledby="composer-title" onSubmit={handleSubmit} onClick={(e) => e.stopPropagation()}
            className="w-full max-w-[540px] bg-sheet rounded-2xl shadow-2xl border border-rule my-auto animate-rise-in">
            <div className="relative px-5 py-4 border-b border-rule text-center">
              <h2 id="composer-title" className="font-bold text-ink text-lg">{draft.id ? "Edit announcement" : "Create announcement"}</h2>
              <button type="button" onClick={() => setDraft(null)} disabled={isSaving} aria-label="Close"
                className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 grid place-items-center rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600">
                <X size={18} />
              </button>
            </div>

            <div className="px-5 pt-4 max-h-[70vh] overflow-y-auto">
              <div className="flex items-center gap-3">
                <OfficeAvatar size={44} />
                <div className="min-w-0">
                  <p className="font-semibold text-ink text-[15px] leading-tight">{OFFICE}</p>
                  <div className="mt-1 flex flex-wrap gap-1.5">
                    <select aria-label="Who can see this" value={draft.audience} onChange={(e) => setDraft({ ...draft, audience: e.target.value })}
                      className="bg-slate-100 hover:bg-slate-200 border-0 rounded-full pl-3 pr-7 py-1 text-xs font-medium text-ink cursor-pointer">
                      {AUDIENCES.map((x) => <option key={x.value} value={x.value}>{x.label}</option>)}
                    </select>
                    <select aria-label="Category" value={draft.category} onChange={(e) => setDraft({ ...draft, category: e.target.value })}
                      className="bg-slate-100 hover:bg-slate-200 border-0 rounded-full pl-3 pr-7 py-1 text-xs font-medium text-ink cursor-pointer">
                      {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
                    </select>
                  </div>
                </div>
              </div>

              <label htmlFor="c-title" className="sr-only">Headline</label>
              <input id="c-title" ref={titleInput} value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })}
                placeholder="Headline" maxLength={140}
                className="mt-4 w-full bg-transparent border-0 px-0 text-xl font-semibold text-ink placeholder:text-slate-400 shadow-none!" />
              <label htmlFor="c-body" className="sr-only">Message</label>
              <textarea id="c-body" value={draft.body} onChange={(e) => setDraft({ ...draft, body: e.target.value })}
                placeholder="What would you like to announce?" rows={draft.photoPreview ? 3 : 5}
                className="mt-1 w-full bg-transparent border-0 px-0 text-[16px] leading-relaxed text-ink placeholder:text-slate-400 resize-none shadow-none!" />

              {draft.photoPreview && (
                <div className="relative mt-2 rounded-xl border border-rule overflow-hidden bg-slate-50">
                  {/* eslint-disable-next-line @next/next/no-img-element -- local preview / private image route */}
                  <img src={draft.photoPreview} alt="Selected photo" className="w-full max-h-80 object-contain" />
                  <button type="button" onClick={removePhoto} aria-label="Remove photo"
                    className="absolute right-2 top-2 w-9 h-9 grid place-items-center rounded-full bg-sheet/90 hover:bg-sheet shadow text-slate-700">
                    <X size={16} />
                  </button>
                </div>
              )}

              {draft.showFacebook && (
                <div className="mt-3 rounded-xl border border-rule p-3">
                  <div className="flex items-center justify-between gap-2">
                    <label htmlFor="c-fb" className="inline-flex items-center gap-2 text-[13px] font-medium text-slate-700">
                      <FacebookMark /> Facebook post
                    </label>
                    <button type="button" onClick={() => setDraft({ ...draft, showFacebook: false, facebookUrl: "" })} aria-label="Remove Facebook post"
                      className="w-8 h-8 grid place-items-center rounded-full hover:bg-slate-100 text-slate-500"><X size={15} /></button>
                  </div>
                  <textarea id="c-fb" rows={2} value={draft.facebookUrl} onChange={(e) => setDraft({ ...draft, facebookUrl: e.target.value })}
                    placeholder="https://www.facebook.com/stamaria.sti.edu/posts/…"
                    className="mt-2 w-full bg-sheet border border-slate-300 rounded-md px-3 py-2 text-sm resize-y" />
                  <p className="text-xs text-slate-500 mt-1">
                    Click the post&apos;s date or time on Facebook (like “1d”) and copy that link, or paste the code from ⋯ → Embed. “Copy link” share links don&apos;t work.
                  </p>
                </div>
              )}

              <InlineError message={formError} onDismiss={() => setFormError(null)} className="mt-3" />
            </div>

            <div className="px-5 pt-3 pb-5">
              <div className="flex items-center justify-between gap-2 border border-rule rounded-xl px-3 py-1.5">
                <span className="text-[14px] font-medium text-ink">Add to your announcement</span>
                <span className="flex items-center gap-1">
                  <button type="button" onClick={() => photoInput.current?.click()} aria-label="Add a photo" title="Photo"
                    className="w-10 h-10 grid place-items-center rounded-full hover:bg-slate-100"><ImagePlus size={21} className="text-emerald-600" /></button>
                  <button type="button" onClick={() => setDraft({ ...draft, showFacebook: true })} aria-label="Add a Facebook post" title="Facebook post"
                    className="w-10 h-10 grid place-items-center rounded-full hover:bg-slate-100"><FacebookMark size={21} /></button>
                </span>
              </div>
              <input ref={photoInput} type="file" accept="image/jpeg,image/png,image/webp,image/gif" className="hidden"
                onChange={(e) => choosePhoto(e.target.files?.[0])} />

              <label className="mt-3 flex items-center gap-2 text-[13px] text-slate-600">
                <input type="checkbox" checked={!draft.isPublished} onChange={(e) => setDraft({ ...draft, isPublished: !e.target.checked })}
                  className="accent-blue-700 w-4 h-4" />
                Save as a hidden draft
              </label>

              <button type="submit" disabled={!canPost || isSaving}
                className="mt-3 w-full inline-flex items-center justify-center gap-2 bg-blue-700 hover:bg-blue-800 disabled:bg-slate-200 disabled:text-slate-500 text-white font-semibold min-h-11 rounded-full transition-colors">
                {isSaving && <Loader2 size={16} className="animate-spin" />}
                {draft.id ? "Save" : draft.isPublished ? "Post" : "Save draft"}
              </button>
            </div>
          </form>
        </div>
      )}

      {viewersOf && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4" onClick={() => setViewersOf(null)}>
          <div role="dialog" aria-modal="true" aria-labelledby="viewers-title" onClick={(e) => e.stopPropagation()}
            className="bg-sheet w-full max-w-md max-h-[80vh] overflow-y-auto rounded-2xl border border-rule shadow-xl">
            <div className="flex items-start justify-between gap-4 p-5 border-b border-rule">
              <div>
                <h3 id="viewers-title" className="font-semibold text-ink">Who has seen this</h3>
                <p className="text-xs text-slate-500 mt-0.5">{viewersOf.title}</p>
              </div>
              <button onClick={() => setViewersOf(null)} aria-label="Close"
                className="w-10 h-10 -m-1 grid place-items-center text-slate-500 hover:text-ink hover:bg-slate-100 rounded-full"><X size={18} /></button>
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

function FacebookMark({ size = 18 }: { size?: number }) {
  return (
    <svg aria-hidden viewBox="0 0 24 24" width={size} height={size} className="shrink-0">
      <circle cx="12" cy="12" r="12" fill="#1877F2" />
      <path fill="#fff" d="M13.4 19.5v-6.1h2.1l.3-2.4h-2.4V9.5c0-.7.2-1.2 1.2-1.2h1.3V6.2c-.2 0-1-.1-1.9-.1-1.9 0-3.2 1.2-3.2 3.3v1.7H8.7v2.4h2.1v6.1z" />
    </svg>
  );
}
