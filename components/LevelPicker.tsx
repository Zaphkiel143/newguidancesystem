"use client";

import type { OptionItemData } from "../app/action/optionLists";
import { optionValue } from "../lib/optionListDefaults";
import { OFF_TERM, TERTIARY } from "../app/config/studentLevels";

// The "Level" choice on every form that places a student (inventory, profile,
// first sign-in, referrals). Off Term is a kind of Tertiary, so it isn't a
// level of its own here: picking Tertiary asks "Regular term or Off term?".
// Records still store "Off Term" as the department, so nothing else changes.
//
// onChange's second argument is true when only the term changed, so callers
// can keep the year level and course (both are the same Tertiary lists).
export default function LevelPicker({
  departments,
  value,
  onChange,
  name,
  rounded = "rounded-lg",
  columns = "grid-cols-2",
}: {
  departments: OptionItemData[];
  value: string;
  onChange: (department: string, sameTrack: boolean) => void;
  name: string;
  rounded?: string;
  columns?: string;
}) {
  const values = departments.map(optionValue);
  const hasTerms = values.includes(TERTIARY) && values.includes(OFF_TERM);
  const levels = hasTerms ? departments.filter((d) => optionValue(d) !== OFF_TERM) : departments;
  const isTertiary = hasTerms && (value === TERTIARY || value === OFF_TERM);
  const chip = (selected: boolean) =>
    `flex items-center gap-2 ${rounded} border px-3 min-h-11 cursor-pointer text-[14px] ${selected ? "border-blue-600 bg-blue-50" : "border-slate-300"}`;

  return (
    <>
      <div className={`grid ${columns} gap-2 max-w-md`}>
        {levels.map((d) => {
          const v = optionValue(d);
          const selected = v === TERTIARY ? isTertiary : value === v;
          return (
            <label key={d.id} className={chip(selected)}>
              <input type="radio" name={name} className="accent-blue-700" checked={selected}
                onChange={() => onChange(v, false)} />
              {d.label}
            </label>
          );
        })}
      </div>
      {isTertiary && (
        <div role="radiogroup" aria-label="Term" className="mt-2 max-w-md">
          <p className="text-[12px] text-slate-500 mb-1.5">Term</p>
          <div className="grid grid-cols-2 gap-2">
            {[
              [TERTIARY, "Regular term"],
              [OFF_TERM, departments.find((d) => optionValue(d) === OFF_TERM)?.label ?? "Off term"],
            ].map(([v, label]) => (
              <label key={v} className={chip(value === v)}>
                <input type="radio" name={`${name}-term`} className="accent-blue-700" checked={value === v}
                  onChange={() => onChange(v, true)} />
                {label}
              </label>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
