"use client";

import React, { useCallback, useEffect, useState } from "react";
import { Loader2, Settings as SettingsIcon } from "lucide-react";
import { listAllOptionLists, type OptionListSummary } from "../../action/optionLists";
import EditOptionsButton from "../../../components/EditOptionsButton";

export default function SettingsPage() {
  const [lists, setLists] = useState<OptionListSummary[] | null>(null);

  const load = useCallback(async () => {
    setLists(await listAllOptionLists());
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const data = await listAllOptionLists();
      if (!cancelled) setLists(data);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="px-5 sm:px-8 lg:px-12 pt-8 lg:pt-12 pb-16 max-w-5xl text-slate-800">
      <header>
        <h1 className="page-title flex items-center gap-2">
          <SettingsIcon size={24} className="text-slate-400" />
          Manage Options
        </h1>
      </header>

      {lists === null ? (
        <div className="flex justify-center py-20 text-slate-400">
          <Loader2 className="animate-spin" size={24} />
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6">
          {lists.map((list) => (
            <div key={list.listKey} className="bg-white border border-slate-100 rounded-2xl shadow-sm p-5">
              <div className="flex items-start justify-between gap-2 mb-3">
                <h3 className="font-semibold text-slate-900 text-sm">{list.label}</h3>
                <EditOptionsButton listKey={list.listKey} listLabel={list.label} onSaved={load} />
              </div>
              <div className="flex flex-wrap gap-1.5">
                {list.items.map((item) => (
                  <span key={item.id} className="text-xs bg-slate-50 border border-slate-200 text-slate-600 px-2.5 py-1 rounded-full">
                    {item.label}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
