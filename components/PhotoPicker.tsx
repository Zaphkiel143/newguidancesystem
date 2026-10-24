"use client";

import React, { useRef, useState } from "react";
import { Camera, Loader2, Trash2 } from "lucide-react";
import { setMyPhoto } from "../app/action/profile";
import InlineError from "./InlineError";

function readAsBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(",")[1] ?? "");
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

// Lets any signed-in user add, change or remove their own profile photo
export default function PhotoPicker({ name, hasPhoto }: { name: string; hasPhoto: boolean }) {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [version, setVersion] = useState(0);
  const [showPhoto, setShowPhoto] = useState(hasPhoto);

  const upload = async (file: File | undefined) => {
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      setError("Profile photos must be 2 MB or smaller.");
      return;
    }
    setBusy(true);
    setError(null);
    const result = await setMyPhoto(await readAsBase64(file));
    setBusy(false);
    if (input.current) input.current.value = "";
    if (result.success) {
      setShowPhoto(true);
      setVersion((v) => v + 1);
    } else {
      setError(result.error ?? "Couldn't save the photo.");
    }
  };

  const remove = async () => {
    setBusy(true);
    setError(null);
    const result = await setMyPhoto(null);
    setBusy(false);
    if (result.success) setShowPhoto(false);
    else setError(result.error ?? "Couldn't remove the photo.");
  };

  const initials = name.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase()).join("");

  return (
    <div>
      <div className="flex items-center gap-4">
        <span className="w-20 h-20 rounded-full bg-sti-yellow text-blue-900 grid place-items-center text-xl font-bold overflow-hidden shrink-0">
          {showPhoto ? (
            // eslint-disable-next-line @next/next/no-img-element -- our own authenticated route
            <img src={`/api/me/avatar?v=${version}`} alt="Your profile photo" className="w-full h-full object-cover" />
          ) : (
            initials
          )}
        </span>
        <div className="flex flex-wrap gap-2">
          <input ref={input} type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" id="photo-input"
            onChange={(e) => upload(e.target.files?.[0])} />
          <label htmlFor="photo-input"
            className={`inline-flex items-center gap-2 border border-slate-300 hover:bg-slate-100 text-sm px-4 min-h-10 rounded-full cursor-pointer ${busy ? "opacity-60 pointer-events-none" : ""}`}>
            {busy ? <Loader2 size={15} className="animate-spin" /> : <Camera size={15} />}
            {showPhoto ? "Change photo" : "Add photo"}
          </label>
          {showPhoto && (
            <button type="button" onClick={remove} disabled={busy}
              className="inline-flex items-center gap-2 text-sm text-red-700 hover:bg-red-50 px-4 min-h-10 rounded-full disabled:opacity-60">
              <Trash2 size={15} /> Remove
            </button>
          )}
        </div>
      </div>
      <InlineError message={error} onDismiss={() => setError(null)} className="mt-3" />
    </div>
  );
}
