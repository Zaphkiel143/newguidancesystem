"use client";

import React, { useEffect, useState } from "react";
import { BookOpen, CalendarDays, Loader2, MapPin } from "lucide-react";
import ReadingList from "./ReadingList";
import { getBulletin } from "../app/action/bulletin";
import { LogoMark } from "./Logo";
import { useCurrentUser } from "./CurrentUser";
import { greetingName } from "../lib/demo";

// Parents' home page: what the guidance office posted, newest first, with
// upcoming events on top. No search or filters, just a feed.
export default function ParentFeed() {
  const me = useCurrentUser();
  const [data, setData] = useState<Awaited<ReturnType<typeof getBulletin>> | null>(null);

  useEffect(() => {
    let cancelled = false;
    getBulletin().then((result) => {
      if (!cancelled) setData(result);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="px-4 sm:px-8 pt-8 lg:pt-12 pb-16 max-w-2xl mx-auto text-slate-800">
      <header>
        <h1 className="page-title">Feed</h1>
        <p className="text-sm text-slate-500 mt-1">
          Hello{me?.displayName ? `, ${greetingName(me.displayName)}` : ""}. Here&apos;s the latest from the Guidance and Counseling Office.
        </p>
      </header>

      {!data ? (
        <div className="py-20 flex justify-center text-slate-500">
          <Loader2 className="animate-spin" size={20} />
        </div>
      ) : (
        <>
          {data.events.length > 0 && (
            <section aria-labelledby="events-heading" className="mt-8">
              <h2 id="events-heading" className="text-[15px] font-semibold text-ink inline-flex items-center gap-2">
                <CalendarDays size={16} className="text-blue-700" /> Upcoming events
              </h2>
              <ul className="mt-3 flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 snap-x">
                {data.events.map((e) => {
                  const d = new Date(e.date);
                  return (
                    <li key={e.id} className="snap-start shrink-0 w-64 bg-sheet border border-rule rounded-2xl p-4 shadow-sm">
                      <p className="text-[12px] font-semibold text-blue-700">
                        {d.toLocaleDateString("en-PH", { weekday: "short", month: "short", day: "numeric", timeZone: "UTC" })} · {e.time}
                      </p>
                      <h3 className="font-semibold text-ink mt-1 break-words">{e.title}</h3>
                      {e.location && (
                        <p className="text-[13px] text-slate-500 mt-1 inline-flex items-center gap-1">
                          <MapPin size={12} /> {e.location}
                        </p>
                      )}
                      {e.description && <p className="text-[13px] text-slate-700 mt-2 line-clamp-3 break-words">{e.description}</p>}
                    </li>
                  );
                })}
              </ul>
            </section>
          )}

          {data.readings.length > 0 && (
            <section aria-labelledby="readings-heading" className="mt-8">
              <h2 id="readings-heading" className="text-[15px] font-semibold text-ink inline-flex items-center gap-2 mb-3">
                <BookOpen size={16} className="text-blue-700" /> Reading materials
              </h2>
              <ReadingList items={data.readings} compact />
            </section>
          )}

          <section aria-label="Posts" className="mt-6 space-y-4">
            {data.announcements.length === 0 ? (
              <p className="bg-sheet border border-rule rounded-2xl p-8 text-center text-sm text-slate-500">
                Nothing posted yet. New announcements from the guidance office will show up here.
              </p>
            ) : (
              data.announcements.map((a) => (
                <article key={a.id} className="bg-sheet border border-rule rounded-2xl shadow-sm overflow-hidden">
                  <div className="px-4 pt-4 flex items-center gap-3">
                    <LogoMark size={40} className="shrink-0" />
                    <div className="min-w-0">
                      <p className="font-semibold text-[14px] text-ink truncate">Guidance and Counseling Office</p>
                      <p className="text-[12px] text-slate-500">
                        {new Date(a.createdAt).toLocaleDateString("en-PH", { month: "long", day: "numeric", year: "numeric", timeZone: "Asia/Manila" })} · {a.category}
                      </p>
                    </div>
                  </div>
                  <div className="px-4 pt-3 pb-4">
                    <h3 className="font-semibold text-[17px] text-ink break-words">{a.title}</h3>
                    <p className="text-[15px] leading-relaxed text-slate-700 mt-1.5 whitespace-pre-wrap break-words">{a.body}</p>
                  </div>
                  {a.hasImage && (
                    // eslint-disable-next-line @next/next/no-img-element -- private, session-checked image route
                    <img
                      src={`/api/announcements/${a.id}/image`}
                      alt={`Photo for ${a.title}`}
                      className="w-full max-h-[560px] object-contain bg-slate-50 border-t border-rule"
                    />
                  )}
                </article>
              ))
            )}
          </section>
        </>
      )}
    </div>
  );
}
