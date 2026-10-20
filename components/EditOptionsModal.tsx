"use client";

import React, { useEffect, useState } from "react";
import { X, Plus, Trash2, ChevronUp, ChevronDown, Loader2 } from "lucide-react";
import { getOptionList, updateOptionList, type OptionItemData } from "../app/action/optionLists";

interface EditOptionsModalProps {
  listKey: string;
  listLabel: string;
  onClose: () => void;
  onSaved?: () => void;
}

type Row = { itemKey: string | null; parentItemKey: string | null; label: string; isProtected: boolean };

export default function EditOptionsModal({ listKey, listLabel, onClose, onSaved }: EditOptionsModalProps) {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [newLabel, setNewLabel] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const items: OptionItemData[] = await getOptionList(listKey);
      if (!cancelled) setRows(items.map((i) => ({ itemKey: i.itemKey, parentItemKey: i.parentItemKey, label: i.label, isProtected: i.isProtected })));
    })();
    return () => {
      cancelled = true;
    };
  }, [listKey]);

  const move = (index: number, dir: -1 | 1) => {
    if (!rows) return;
    const target = index + dir;
    if (target < 0 || target >= rows.length) return;
    const next = [...rows];
    [next[index], next[target]] = [next[target], next[index]];
    setRows(next);
  };

  const rename = (index: number, label: string) => {
    if (!rows) return;
    const next = [...rows];
    next[index] = { ...next[index], label };
    setRows(next);
  };

  const remove = (index: number) => {
    if (!rows) return;
    setRows(rows.filter((_, i) => i !== index));
  };

  const addItem = () => {
    const label = newLabel.trim();
    if (!label || !rows) return;
    setRows([...rows, { itemKey: null, parentItemKey: null, label, isProtected: false }]);
    setNewLabel("");
  };

  const save = async () => {
    if (!rows) return;
    setIsSaving(true);
    setError(null);
    const result = await updateOptionList(listKey, rows);
    setIsSaving(false);
    if (result.success) {
      onSaved?.();
      onClose();
    } else {
      setError(result.error || "Couldn't save changes.");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white w-full max-w-md max-h-[85vh] overflow-y-auto rounded-2xl shadow-xl border border-slate-100">
        <div className="flex items-start justify-between p-5 border-b border-slate-100 sticky top-0 bg-white">
          <div>
            <h3 className="text-base font-semibold text-slate-900">Edit {listLabel}</h3>
            <p className="text-xs text-slate-500">Reorder, rename, add, or remove choices.</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="text-slate-400 hover:text-slate-700 p-1 rounded-full hover:bg-slate-100">
            <X size={18} />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {rows === null ? (
            <div className="flex justify-center py-8 text-slate-400">
              <Loader2 className="animate-spin" size={20} />
            </div>
          ) : (
            <>
              <div className="space-y-2">
                {rows.map((row, i) => (
                  <div key={`${row.itemKey ?? "plain"}-${i}`} className="flex items-center gap-1.5">
                    <div className="flex flex-col shrink-0">
                      <button type="button" aria-label="Move up" disabled={i === 0} onClick={() => move(i, -1)} className="text-slate-400 hover:text-slate-700 disabled:opacity-30 disabled:cursor-not-allowed">
                        <ChevronUp size={14} />
                      </button>
                      <button type="button" aria-label="Move down" disabled={i === rows.length - 1} onClick={() => move(i, 1)} className="text-slate-400 hover:text-slate-700 disabled:opacity-30 disabled:cursor-not-allowed">
                        <ChevronDown size={14} />
                      </button>
                    </div>
                    <input
                      value={row.label}
                      maxLength={100}
                      onChange={(e) => rename(i, e.target.value)}
                      className="flex-1 text-sm bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <button
                      type="button"
                      aria-label={`Remove ${row.label}`}
                      disabled={row.isProtected}
                      title={row.isProtected ? "This choice is used elsewhere in the system and can't be removed" : "Remove"}
                      onClick={() => remove(i)}
                      className="text-rose-500 hover:text-rose-700 disabled:opacity-25 disabled:cursor-not-allowed p-1.5 shrink-0"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                ))}
              </div>

              <div className="flex items-center gap-1.5 pt-1 border-t border-slate-100">
                <input
                  value={newLabel}
                  maxLength={100}
                  placeholder="Add a new choice..."
                  onChange={(e) => setNewLabel(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addItem();
                    }
                  }}
                  className="flex-1 text-sm bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button type="button" onClick={addItem} disabled={!newLabel.trim()} className="text-blue-600 hover:text-blue-800 disabled:opacity-30 disabled:cursor-not-allowed p-1.5 shrink-0">
                  <Plus size={18} />
                </button>
              </div>
            </>
          )}

          {error && <div className="bg-red-50 border border-red-100 text-red-600 p-3 rounded-xl text-xs font-medium">{error}</div>}
        </div>

        <div className="flex justify-end gap-2 p-5 pt-0">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-full transition">
            Cancel
          </button>
          <button
            type="button"
            onClick={save}
            disabled={isSaving || rows === null}
            className="px-5 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 rounded-full transition"
          >
            {isSaving ? "Saving..." : "Save changes"}
          </button>
        </div>
      </div>
    </div>
  );
}
