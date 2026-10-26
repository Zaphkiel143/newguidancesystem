"use client";

import React, { useEffect, useState } from "react";
import AnnouncementsPanel from "./AnnouncementsPanel";
import EventsPanel from "./EventsPanel";

export type InfoTab = "announcements" | "events";

// Information Service: announcements and events are both ways the office
// tells students, faculty, and parents what's happening, so they sit on one
// page: the announcements feed, with the events beside it.
export default function InformationModule({ initialTab }: { initialTab: InfoTab }) {
  // Bumped by "Add event" so the events column opens its form.
  const [addEvent, setAddEvent] = useState(0);

  // Old links to the Events tab (/information?tab=events) land on the events column.
  useEffect(() => {
    if (initialTab === "events") document.getElementById("events")?.scrollIntoView({ block: "start" });
  }, [initialTab]);

  return (
    <div className="px-5 sm:px-8 lg:px-10 pt-8 lg:pt-10 pb-16 text-slate-800">
      <header>
        <h1 className="page-title">Announcements &amp; Events</h1>
      </header>

      <div className="mt-6 grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_25rem] gap-10 items-start">
        <AnnouncementsPanel onAddEvent={() => setAddEvent((n) => n + 1)} />
        <aside id="events" aria-labelledby="events-heading" className="scroll-mt-24 xl:sticky xl:top-[calc(var(--topbar-h)+1.5rem)] xl:max-h-[calc(100dvh-var(--topbar-h)-3rem)] xl:overflow-y-auto">
          <EventsPanel openForm={addEvent} />
        </aside>
      </div>
    </div>
  );
}
