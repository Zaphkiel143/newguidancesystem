"use client";

import React, { useCallback, useEffect, useState } from 'react';
import { Loader2, MapPin, Plus } from 'lucide-react';
import { listEvents, saveEvent, deleteEvent } from '../../action/counselor';
import InlineError from '../../../components/InlineError';
import { eventDateLabel, isMultiDay } from '../../../lib/eventDates';
import type { Event as DbEvent } from '../../../lib/generated';

const EMPTY = { title: "", description: "", dateString: "", endDateString: "", multiDay: false, time: "", location: "" };

// Event dates are calendar days stored as UTC midnight.
function toDateInput(d: Date) {
  return new Date(d).toISOString().slice(0, 10);
}

function localToday() {
  const t = new Date();
  return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, "0")}-${String(t.getDate()).padStart(2, "0")}`;
}

// The events column beside the announcements: the list, with the form opened on demand.
// openForm changes when "Add event" is clicked elsewhere on the page.
export default function EventsPanel({ openForm = 0 }: { openForm?: number }) {
  const [events, setEvents] = useState<DbEvent[] | null>(null);
  const [editing, setEditing] = useState<{ id?: string } & typeof EMPTY>(EMPTY);
  const [showForm, setShowForm] = useState(false);
  const [lastOpenForm, setLastOpenForm] = useState(openForm);
  if (openForm !== lastOpenForm) {
    setLastOpenForm(openForm);
    setShowForm(true);
  }

  // Bring the form into view and start on the title when it opens.
  useEffect(() => {
    if (!showForm) return;
    const title = document.getElementById("e-title");
    title?.scrollIntoView({ behavior: "smooth", block: "center" });
    title?.focus({ preventScroll: true });
  }, [showForm, openForm, editing.id]);

  const closeForm = () => {
    setEditing(EMPTY);
    setFormError(null);
    setShowForm(false);
  };
  const startEdit = (ev: DbEvent) => {
    setEditing({
      id: ev.id, title: ev.title, description: ev.description, dateString: toDateInput(ev.date),
      endDateString: ev.endDate ? toDateInput(ev.endDate) : "", multiDay: isMultiDay(ev), time: ev.time, location: ev.location ?? "",
    });
    setFormError(null);
    setShowForm(true);
  };
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
    if (editing.multiDay && !editing.endDateString) return setFormError("Choose the last day of the event.");
    if (editing.multiDay && editing.endDateString <= editing.dateString) return setFormError("The end date must be after the start date.");
    setIsSaving(true);
    setFormError(null);
    const { multiDay, ...fields } = editing;
    const result = await saveEvent({ ...fields, endDateString: multiDay ? fields.endDateString : "" });
    setIsSaving(false);
    if (result.success) {
      closeForm();
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
      if (editing.id === ev.id) closeForm();
      await load();
    } else {
      setRowError({ id: ev.id, message: "Couldn't remove this event. Try again." });
    }
  };

  const today = localToday();
  // A multi-day event is upcoming until its last day
  const lastDay = (e: DbEvent) => toDateInput(e.endDate ?? e.date);
  const upcoming = events?.filter((e) => lastDay(e) >= today) ?? [];
  const past = events?.filter((e) => lastDay(e) < today).reverse() ?? [];

  return (
    <div>
      <div className="flex items-center justify-between gap-3 mb-3">
        <h2 id="events-heading" className="font-serif text-[22px] text-ink">Events</h2>
        {!showForm && (
          <button type="button" onClick={() => { setEditing(EMPTY); setShowForm(true); }}
            className="inline-flex items-center gap-1.5 bg-blue-700 hover:bg-blue-800 text-white text-sm font-medium px-4 min-h-10 rounded-full">
            <Plus size={16} /> New event
          </button>
        )}
      </div>

      {showForm && (
        <section aria-label={editing.id ? "Edit event" : "New event"} className="bg-sheet border border-rule rounded-2xl p-4 mb-6">
          <h3 className="font-semibold text-ink mb-3">{editing.id ? "Edit event" : "New event"}</h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="e-title" className="block text-[13px] font-medium text-slate-700 mb-1.5">Title</label>
              <input id="e-title" value={editing.title} onChange={(e) => setEditing({ ...editing, title: e.target.value })} required
                className="w-full bg-sheet border border-slate-300 rounded-md px-3 py-2.5 text-sm" />
            </div>
            <fieldset>
              <legend className="block text-[13px] font-medium text-slate-700 mb-1.5">How long is the event?</legend>
              <div className="grid grid-cols-2 gap-2">
                {([[false, "One day"], [true, "Multiple days"]] as const).map(([multi, label]) => (
                  <label key={label} className={`flex items-center gap-2 rounded-lg border px-3 min-h-11 cursor-pointer text-sm ${editing.multiDay === multi ? "border-blue-600 bg-blue-50 font-medium" : "border-slate-300"}`}>
                    <input type="radio" name="e-length" checked={editing.multiDay === multi} className="accent-blue-700"
                      onChange={() => setEditing({ ...editing, multiDay: multi })} />
                    {label}
                  </label>
                ))}
              </div>
            </fieldset>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="e-date" className="block text-[13px] font-medium text-slate-700 mb-1.5">{editing.multiDay ? "Start date" : "Date"}</label>
                <input id="e-date" type="date" value={editing.dateString} onChange={(e) => setEditing({ ...editing, dateString: e.target.value })} required
                  className="w-full bg-sheet border border-slate-300 rounded-md px-3 py-2.5 text-sm" />
              </div>
              {editing.multiDay && (
                <div>
                  <label htmlFor="e-end" className="block text-[13px] font-medium text-slate-700 mb-1.5">End date</label>
                  <input id="e-end" type="date" value={editing.endDateString} min={editing.dateString || undefined}
                    onChange={(e) => setEditing({ ...editing, endDateString: e.target.value })} required
                    className="w-full bg-sheet border border-slate-300 rounded-md px-3 py-2.5 text-sm" />
                </div>
              )}
              <div className={editing.multiDay ? "col-span-2" : ""}>
                <label htmlFor="e-time" className="block text-[13px] font-medium text-slate-700 mb-1.5">{editing.multiDay ? "Time each day" : "Time"}</label>
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
              <textarea id="e-desc" rows={3} value={editing.description} onChange={(e) => setEditing({ ...editing, description: e.target.value })}
                className="w-full bg-sheet border border-slate-300 rounded-md px-3 py-2.5 text-sm resize-y" />
            </div>
            <InlineError message={formError} onDismiss={() => setFormError(null)} />
            <div className="flex gap-2">
              <button type="submit" disabled={isSaving}
                className="inline-flex items-center gap-2 bg-blue-700 hover:bg-blue-800 disabled:opacity-60 text-white text-sm font-medium px-4 min-h-11 rounded-full transition-colors">
                {isSaving && <Loader2 size={16} className="animate-spin" />}
                {editing.id ? "Save changes" : "Add event"}
              </button>
              <button type="button" onClick={closeForm}
                className="px-4 min-h-11 rounded-full text-sm text-slate-600 hover:bg-slate-100 transition-colors">Cancel</button>
            </div>
          </form>
        </section>
      )}

      <h3 className="text-[13px] font-semibold text-slate-600 mb-1">Upcoming</h3>
      {events === null ? (
        <div className="py-12 flex justify-center text-slate-500"><Loader2 className="animate-spin" size={20} /></div>
      ) : (
        <>
          <EventList items={upcoming} empty="No upcoming events." onEdit={startEdit} onDelete={handleDelete} rowError={rowError} clearRowError={() => setRowError(null)} />
          {past.length > 0 && (
            <details className="mt-6 group">
              <summary className="cursor-pointer text-[13px] font-semibold text-slate-600 min-h-9 flex items-center">Past events ({past.length})</summary>
              <EventList items={past} empty="" muted onEdit={startEdit} onDelete={handleDelete} rowError={rowError} clearRowError={() => setRowError(null)} />
            </details>
          )}
        </>
      )}
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
            {eventDateLabel(ev, true)} · {ev.time}
            {isMultiDay(ev) && <span className="ml-2 font-sans text-[11px] font-semibold text-blue-700 bg-blue-50 rounded px-1.5 py-0.5">Multi-day</span>}
          </p>
          <p className="font-medium text-ink mt-0.5">{ev.title}</p>
          {ev.location && <p className="text-[13px] text-slate-500 inline-flex items-center gap-1 mt-0.5"><MapPin size={12} /> {ev.location}</p>}
          {ev.description && <p className="text-sm text-slate-600 mt-1 line-clamp-2">{ev.description}</p>}
          <div className="mt-1 flex gap-1 text-[13px]">
            <button onClick={() => onEdit(ev)} className="px-2 min-h-9 -ml-2 rounded-full text-slate-600 hover:bg-slate-100">Edit</button>
            <button onClick={() => onDelete(ev)} className="px-2 min-h-9 rounded-full text-red-700 hover:bg-red-50">Remove</button>
          </div>
          <InlineError message={rowError?.id === ev.id ? rowError.message : null} onDismiss={clearRowError} className="mt-2" />
        </li>
      ))}
    </ul>
  );
}
