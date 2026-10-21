"use client";

import React, { useState } from "react";
import AnnouncementsPanel from "./AnnouncementsPanel";
import EventsPanel from "./EventsPanel";

export type InfoTab = "announcements" | "events";

const TABS: { value: InfoTab; label: string }[] = [
  { value: "announcements", label: "Announcements" },
  { value: "events", label: "Events" },
];

// Information Service: announcements and events are both ways the office
// tells students, faculty, and parents what's happening, so they share one
// module with a tab each.
export default function InformationModule({ initialTab }: { initialTab: InfoTab }) {
  const [tab, setTab] = useState<InfoTab>(initialTab);

  // Keep the tab in the address so a refresh or shared link opens the same one.
  const choose = (t: InfoTab) => {
    setTab(t);
    window.history.replaceState(null, "", t === "events" ? "/information?tab=events" : "/information");
  };

  return (
    <div className="px-5 sm:px-8 lg:px-12 pt-8 lg:pt-12 pb-16 max-w-6xl text-slate-800">
      <header>
        <h1 className="page-title">Announcements &amp; Events</h1>
      </header>

      <div role="tablist" aria-label="Information Service" className="mt-6 mb-8 flex flex-wrap gap-1">
        {TABS.map((t) => (
          <button key={t.value} role="tab" aria-selected={tab === t.value} onClick={() => choose(t.value)}
            className={`px-4 min-h-10 rounded-full text-sm ${tab === t.value ? "bg-butter-200 text-ink font-medium" : "text-slate-600 hover:bg-blue-100"}`}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === "announcements" ? <AnnouncementsPanel onAddEvent={() => choose("events")} /> : <EventsPanel />}
    </div>
  );
}
