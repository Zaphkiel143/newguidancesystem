"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Pencil } from "lucide-react";
import { getMyFacultyDetails, updateMyFacultyDetails } from "../app/action/faculty";
import { STAFF_DEPARTMENTS } from "../app/config/staff";
import { capitalizeName, phoneChars } from "../app/config/collegeCareerForm";
import { PHONE_HELP, nameChars } from "../lib/parentSignup";
import { formatPhone } from "../lib/phone";
import { DEMO_DISPLAY_NAME } from "../lib/demo";
import InlineError from "./InlineError";

type Details = NonNullable<Awaited<ReturnType<typeof getMyFacultyDetails>>>;

const input = "w-full bg-sheet border border-slate-300 rounded-md px-3 py-2.5 text-sm";
const labelClass = "block text-[13px] font-medium text-slate-700 mb-1.5";

// Faculty edit their own name, contact number and department.
export default function FacultyDetailsForm() {
  const router = useRouter();
  const [details, setDetails] = useState<Details | null | undefined>(undefined);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ name: "", phone: "", department: "" });
  const [state, setState] = useState<{ busy: boolean; error: string | null; note: string | null }>({ busy: false, error: null, note: null });

  useEffect(() => {
    let cancelled = false;
    getMyFacultyDetails().then((d) => !cancelled && setDetails(d));
    return () => {
      cancelled = true;
    };
  }, []);

  if (details === undefined) {
    return (
      <div className="py-6 flex text-slate-500">
        <Loader2 className="animate-spin" size={18} />
      </div>
    );
  }
  if (details === null) return <p className="text-sm text-red-700">Couldn&apos;t load your details. Try refreshing the page.</p>;

  const shownName = details.isDemo ? DEMO_DISPLAY_NAME : details.name;

  const startEditing = () => {
    setForm({ name: details.name, phone: phoneChars(formatPhone(details.phone)), department: details.department ?? "" });
    setState({ busy: false, error: null, note: null });
    setEditing(true);
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setState({ busy: true, error: null, note: null });
    const result = await updateMyFacultyDetails(form);
    if (!result.success) return setState({ busy: false, error: result.error ?? "Couldn't save.", note: null });
    setDetails(await getMyFacultyDetails());
    setEditing(false);
    setState({ busy: false, error: null, note: "warning" in result && result.warning ? result.warning : "Your details were saved." });
    router.refresh();
  };

  return (
    <section className="bg-sheet border border-rule rounded-2xl p-5 sm:p-6" aria-labelledby="details-heading">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="details-heading" className="font-semibold text-[17px] text-ink">My details</h2>
        {!editing && (
          <button type="button" onClick={startEditing} className="inline-flex items-center gap-2 border border-slate-300 hover:bg-slate-100 text-sm px-4 min-h-10 rounded-full">
            <Pencil size={15} /> Edit details
          </button>
        )}
      </div>

      {!editing ? (
        <dl className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-x-8 gap-y-4 text-sm">
          <div>
            <dt className="text-xs text-slate-500">Name</dt>
            <dd className="text-ink mt-0.5">{shownName}</dd>
          </div>
          <div>
            <dt className="text-xs text-slate-500">Contact number</dt>
            <dd className="text-ink mt-0.5">{formatPhone(details.phone) || "—"}</dd>
          </div>
          <div>
            <dt className="text-xs text-slate-500">Department</dt>
            <dd className="text-ink mt-0.5">{details.department || "—"}</dd>
          </div>
        </dl>
      ) : (
        <form onSubmit={save} className="mt-4 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="fd-name" className={labelClass}>Full name</label>
              <input
                id="fd-name"
                className={`${input} ${details.isDemo ? "text-slate-500" : ""}`}
                value={details.isDemo ? DEMO_DISPLAY_NAME : form.name}
                readOnly={details.isDemo}
                maxLength={120}
                required
                placeholder="e.g. Maria L. Santos"
                aria-describedby="fd-name-help"
                onChange={(e) => setForm({ ...form, name: capitalizeName(nameChars(e.target.value)) })}
              />
              <p id="fd-name-help" className="text-[12px] text-slate-500 mt-1">
                {details.isDemo ? "Demo accounts keep their name." : "Letters only. First name, then last name."}
              </p>
            </div>
            <div>
              <label htmlFor="fd-phone" className={labelClass}>
                Contact number <span className="font-normal text-slate-500">(optional)</span>
              </label>
              <input
                id="fd-phone"
                type="tel"
                inputMode="tel"
                className={input}
                value={form.phone}
                placeholder="09171234567"
                aria-describedby="fd-phone-help"
                onChange={(e) => setForm({ ...form, phone: phoneChars(e.target.value) })}
              />
              <p id="fd-phone-help" className="text-[12px] text-slate-500 mt-1">{PHONE_HELP}</p>
            </div>
          </div>
          <div className="max-w-md">
            <label htmlFor="fd-dept" className={labelClass}>Department</label>
            <select id="fd-dept" className={input} value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })}>
              <option value="">Not set</option>
              {STAFF_DEPARTMENTS.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>
          <InlineError message={state.error} onDismiss={() => setState({ ...state, error: null })} />
          <div className="flex flex-wrap gap-2">
            <button
              type="submit"
              disabled={state.busy}
              className="inline-flex items-center gap-2 bg-blue-700 hover:bg-blue-800 disabled:opacity-60 text-white text-sm font-medium px-5 min-h-11 rounded-full"
            >
              {state.busy && <Loader2 size={15} className="animate-spin" />} Save changes
            </button>
            <button type="button" onClick={() => setEditing(false)} disabled={state.busy} className="px-5 min-h-11 rounded-full border border-slate-300 text-sm hover:bg-slate-50 disabled:opacity-60">
              Cancel
            </button>
          </div>
        </form>
      )}
      {state.note && !editing && (
        <p role="status" className="mt-4 text-sm text-emerald-700">
          {state.note}
        </p>
      )}
    </section>
  );
}
