"use client";

import React, { useEffect, useState } from "react";
import { Loader2, MapPin } from "lucide-react";
import { getBulletin } from "../app/action/bulletin";

import { FacebookPageCard, FacebookPost } from "./FacebookEmbed";
import { FACEBOOK_PAGE_URL } from "../app/config/school";

// Information Service board + upcoming events
export default function BulletinBoard() {
  const [data, setData] = useState<Awaited<ReturnType<typeof getBulletin>> | null>(null);
  const [category, setCategory] = useState("All");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const result = await getBulletin();
      if (!cancelled) setData(result);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const categories = ["All", ...Array.from(new Set(data?.announcements.map((a) => a.category) ?? []))];
  const shown = data?.announcements.filter((a) => category === "All" || a.category === category) ?? [];

  return (
    <div className="px-5 sm:px-8 lg:px-12 pt-8 lg:pt-12 pb-16 max-w-6xl text-slate-800">
      <header>
        <h1 className="page-title">Announcements &amp; events</h1>
        <p className="text-sm text-slate-500 mt-1">News, reminders, and upcoming activities from the Guidance and Counseling Office</p>
      </header>

      {!data ? (
        <div className="py-20 flex justify-center text-slate-500">
          <Loader2 className="animate-spin" size={20} />
        </div>
      ) : (
        <div className="mt-10 grid grid-cols-1 lg:grid-cols-[1.4fr_1fr] gap-12 lg:gap-16">
          <section>
            <div className="flex flex-wrap items-baseline justify-between gap-3 mb-3">
              <h2 className="font-serif text-[22px] text-ink">Announcements</h2>
              {categories.length > 2 && (
                <div role="group" aria-label="Filter by category" className="flex flex-wrap gap-1">
                  {categories.map((c) => (
                    <button
                      key={c}
                      onClick={() => setCategory(c)}
                      aria-pressed={category === c}
                      className={`px-3.5 min-h-9 rounded-full text-[13px] transition-colors ${
                        category === c ? "bg-butter-200 text-ink font-medium" : "text-slate-600 hover:bg-blue-100"
                      }`}
                    >
                      {c}
                    </button>
                  ))}
                </div>
              )}
            </div>
            {shown.length === 0 ? (
              <p className="border-t border-rule pt-4 text-sm text-slate-500">No announcements yet.</p>
            ) : (
              <ul className="divide-y divide-rule border-t border-rule">
                {shown.map((a) => (
                  <li key={a.id} className="py-5">
                    <p className="text-xs text-slate-500">
                      {a.category} · {new Date(a.createdAt).toLocaleDateString("en-PH", { month: "long", day: "numeric", year: "numeric" })}
                    </p>
                    <h3 className="font-serif text-xl text-ink mt-1">{a.title}</h3>
                    <p className="text-[15px] leading-relaxed text-slate-700 mt-2 whitespace-pre-wrap max-w-[65ch]">{a.body}</p>
                    {a.hasImage && (
                      // eslint-disable-next-line @next/next/no-img-element -- private, session-checked image route
                      <img
                        src={`/api/announcements/${a.id}/image?v=${new Date(a.updatedAt).getTime()}`}
                        alt={`Photo for ${a.title}`}
                        loading="lazy"
                        className="mt-3 w-full max-w-[560px] max-h-[640px] object-contain rounded-xl border border-rule bg-slate-50"
                      />
                    )}
                    {a.facebookUrl && <FacebookPost postUrl={a.facebookUrl} />}
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section>
            <h2 className="font-serif text-[22px] text-ink mb-3">Upcoming events</h2>
            {data.events.length === 0 ? (
              <p className="border-t border-rule pt-4 text-sm text-slate-500">No upcoming events.</p>
            ) : (
              <ul className="divide-y divide-rule border-t border-rule">
                {data.events.map((e) => {
                  const d = new Date(e.date);
                  return (
                    <li key={e.id} className="py-4 grid grid-cols-[56px_1fr] gap-4">
                      <div className="text-center border border-butter-200 rounded-lg bg-butter-100 py-1.5 h-fit">
                        <p className="text-[11px] uppercase text-slate-500 leading-none tracking-wide">
                          {d.toLocaleDateString("en-PH", { month: "short", timeZone: "UTC" })}
                        </p>
                        <p className="font-serif text-2xl text-ink leading-tight">{d.getUTCDate()}</p>
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-medium text-ink">{e.title}</h3>
                        <p className="text-[13px] text-slate-500 mt-0.5 flex flex-wrap gap-x-3">
                          <span className="font-mono">{e.time}</span>
                          {e.location && (
                            <span className="inline-flex items-center gap-1">
                              <MapPin size={12} /> {e.location}
                            </span>
                          )}
                        </p>
                        {e.description && <p className="text-sm text-slate-700 mt-1.5 whitespace-pre-wrap">{e.description}</p>}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}

            <h2 className="font-serif text-[22px] text-ink mt-12 mb-3">On Facebook</h2>
            <FacebookPageCard pageUrl={FACEBOOK_PAGE_URL} pageName="STI College Sta. Maria" />
          </section>
        </div>
      )}
    </div>
  );
}
