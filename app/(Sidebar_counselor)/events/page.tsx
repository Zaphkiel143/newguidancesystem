"use client";

import React, { useCallback, useEffect, useState } from 'react';
import { Loader2, MapPin } from 'lucide-react';
import { listEvents, saveEvent, deleteEvent } from '../../action/counselor';
import InlineError from '../../../components/InlineError';
import type { Event as DbEvent } from '../../../lib/generated';

const EMPTY = { title: "", description: "", dateString: "", time: "", location: "" };

// Event dates are calendar days stored as UTC midnight.
function toDateInput(d: Date) {
  return new Date(d).toISOString().slice(0, 10);
}

function localToday() {
  const t = new Date();
  return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, "0")}-${String(t.getDate()).padStart(2, "0")}`;
}

export default function EventsPage() {
  const [events, setEvents] = useState<DbEvent[] | null>(null);
  const [editing, setEditing] = useState<{ id?: string } & typeof EMPTY>(EMPTY);
  const [isSaving, setIsSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [rowError, setRowError] = useState<{ id: string; message: string } | null>(null);

  const load = useCallback(async () => setEvents(await listEvents()), []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const data = await listEvents();
      if (!cancelled) setEvents(data);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setFormError(null);
    const result = await saveEvent(editing);
    setIsSaving(false);
    if (result.success) {
      setEditing(EMPTY);
      await load();
    } else {
      setFormError(result.error || "Couldn't save the event.");
    }
  };

  const handleDelete = async (ev: DbEvent) => {
    if (!window.confirm(`Remove "${ev.title}"?`)) return;
    setRowError(null);
    const result = await deleteEvent(ev.id);
    if (result.success) {
      if (editing.id === ev.id) setEditing(EMPTY);
      await load();
    } else {
      setRowError({ id: ev.id, message: "Couldn't remove this event. Try again." });
    }
  };

  const today = localToday();
  const upcoming = events?.filter((e) => toDateInput(e.date) >= today) ?? [];
  const past = events?.filter((e) => toDateInput(e.date) < today).reverse() ?? [];

  return (
    <div className="px-5 sm:px-8 lg:px-12 pt-8 lg:pt-12 pb-16 max-w-6xl text-slate-800">
      <header>
        <h1 className="page-title">Events</h1>
        <p className="text-sm text-slate-500 mt-1">Seminars, awareness-month activities, and other guidance events shown to students, faculty, and parents</p>
      </header>

      <div className="mt-10 grid grid-cols-1 lg:grid-cols-[1fr_1.3fr] gap-12">
        <section>
          <h2 className="font-serif text-[22px] text-ink mb-3">{editing.id ? "Edit event" : "New event"}</h2>
          <form onSubmit={handleSubmit} className="border-t border-rule pt-4 space-y-4">
            <div>
              <label htmlFor="e-title" className="block text-[13px] font-medium text-slate-700 mb-1.5">Title</label>
              <input id="e-title" value={editing.title} onChange={(e) => setEditing({ ...editing, title: e.target.value })} required
                className="w-full bg-sheet border border-slate-300 rounded-md px-3 py-2.5 text-sm" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="e-date" className="block text-[13px] font-medium text-slate-700 mb-1.5">Date</label>
                <input id="e-date" type="date" value={editing.dateString} onChange={(e) => setEditing({ ...editing, dateString: e.target.value })} required
                  className="w-full bg-sheet border border-slate-300 rounded-md px-3 py-2.5 text-sm" />
              </div>
              <div>
                <label htmlFor="e-time" className="block text-[13px] font-medium text-slate-700 mb-1.5">Time</label>
                <input id="e-time" placeholder="e.g. 1:00 PM – 3:00 PM" value={editing.time} onChange={(e) => setEditing({ ...editing, time: e.target.value })} required
                  className="w-full bg-sheet border border-slate-300 rounded-md px-3 py-2.5 text-sm" />
              </div>
            </div>
            <div>
              <label htmlFor="e-loc" className="block text-[13px] font-medium text-slate-700 mb-1.5">Location (optional)</label>
              <input id="e-loc" value={editing.location} onChange={(e) => setEditing({ ...editing, location: e.target.value })}
                className="w-full bg-sheet border border-slate-300 rounded-md px-3 py-2.5 text-sm" />
            </div>
            <div>
              <label htmlFor="e-desc" className="block text-[13px] font-medium text-slate-700 mb-1.5">Description</label>
              <textarea id="e-desc" rows={4} value={editing.description} onChange={(e) => setEditing({ ...editing, description: e.target.value })}
                className="w-full bg-sheet border border-slate-300 rounded-md px-3 py-2.5 text-sm resize-y" />
            </div>
            <InlineError message={formError} onDismiss={() => setFormError(null)} />
            <div className="flex gap-2">
              <button type="submit" disabled={isSaving}
                className="inline-flex items-center gap-2 bg-blue-700 hover:bg-blue-800 disabled:opacity-60 text-white text-sm font-medium px-4 min-h-11 rounded-md transition-colors">
                {isSaving && <Loader2 size={16} className="animate-spin" />}
                {editing.id ? "Save changes" : "Add event"}
              </button>
              {editing.id && (
                <button type="button" onClick={() => { setEditing(EMPTY); setFormError(null); }}
                  className="px-4 min-h-11 rounded-md text-sm text-slate-600 hover:bg-slate-100 transition-colors">Cancel</button>
              )}
            </div>
          </form>
        </section>

        <section>
          <h2 className="font-serif text-[22px] text-ink mb-3">Upcoming</h2>
          {events === null ? (
            <div className="py-12 flex justify-center text-slate-500"><Loader2 className="animate-spin" size={20} /></div>
          ) : (
            <>
              <EventList items={upcoming} empty="No upcoming events." onEdit={(ev) => { setEditing({ id: ev.id, title: ev.title, description: ev.description, dateString: toDateInput(ev.date), time: ev.time, location: ev.location ?? "" }); setFormError(null); }} onDelete={handleDelete} rowError={rowError} clearRowError={() => setRowError(null)} />
              {past.length > 0 && (
                <>
                  <h2 className="font-serif text-[22px] text-ink mt-10 mb-3">Past</h2>
                  <EventList items={past} empty="" muted onEdit={(ev) => setEditing({ id: ev.id, title: ev.title, description: ev.description, dateString: toDateInput(ev.date), time: ev.time, location: ev.location ?? "" })} onDelete={handleDelete} rowError={rowError} clearRowError={() => setRowError(null)} />
                </>
              )}
            </>
          )}
        </section>
      </div>
    </div>
  );
}

function EventList({ items, empty, muted, onEdit, onDelete, rowError, clearRowError }: {
  items: DbEvent[];
  empty: string;
  muted?: boolean;
  onEdit: (e: DbEvent) => void;
  onDelete: (e: DbEvent) => void;
  rowError: { id: string; message: string } | null;
  clearRowError: () => void;
}) {
  if (items.length === 0) return <p className="border-t border-rule pt-4 text-sm text-slate-500">{empty}</p>;
  return (
    <ul className={`divide-y divide-rule border-y border-rule ${muted ? "opacity-70" : ""}`}>
      {items.map((ev) => (
        <li key={ev.id} className="py-4">
          <p className="font-mono text-[13px] text-slate-500">
            {new Date(ev.date).toLocaleDateString("en-PH", { timeZone: "UTC", weekday: "short", month: "short", day: "numeric", year: "numeric" })} · {ev.time}
          </p>
          <p className="font-medium text-ink mt-0.5">{ev.title}</p>
          {ev.location && <p className="text-[13px] text-slate-500 inline-flex items-center gap-1 mt-0.5"><MapPin size={12} /> {ev.location}</p>}
          {ev.description && <p className="text-sm text-slate-600 mt-1 line-clamp-2">{ev.description}</p>}
          <div className="mt-1 flex gap-1 text-[13px]">
            <button onClick={() => onEdit(ev)} className="px-2 min-h-9 -ml-2 rounded-md text-slate-600 hover:bg-slate-100">Edit</button>
            <button onClick={() => onDelete(ev)} className="px-2 min-h-9 rounded-md text-red-700 hover:bg-red-50">Remove</button>
          </div>
          <InlineError message={rowError?.id === ev.id ? rowError.message : null} onDismiss={clearRowError} className="mt-2" />
        </li>
      ))}
    </ul>
  );
}
