"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Camera, Crop, Loader2, Smile, Trash2, X, ZoomIn, ZoomOut } from "lucide-react";
import { setMyPhoto } from "../app/action/profile";
import { AVATARS, avatarDataUrl, avatarPngBase64, type AvatarStyle } from "./avatars";
import InlineError from "./InlineError";

// Photos are cropped in the browser to a square this size before upload, so
// even a large phone photo is saved small.
const OUTPUT_PX = 512;
// The largest file accepted for cropping (the saved crop is much smaller).
const MAX_SOURCE_BYTES = 10 * 1024 * 1024;
const VIEW_PX = 280;
const MAX_ZOOM = 4;

type View = "menu" | "crop" | "avatars";

// Lets any signed-in user set their own profile picture: a cropped photo, one
// of the drawn avatars, or their initials. Clicking the picture opens it;
// `compact` leaves out the "Change picture" button beside it.
export default function PhotoPicker({ name, hasPhoto, compact = false }: { name: string; hasPhoto: boolean; compact?: boolean }) {
  const router = useRouter();
  const fileInput = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<View>("menu");
  const [source, setSource] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [version, setVersion] = useState(0);
  const [showPhoto, setShowPhoto] = useState(hasPhoto);

  const initials = name.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase()).join("");

  const close = useCallback(() => {
    if (busy) return;
    setOpen(false);
    setView("menu");
    setError(null);
    setSource((s) => {
      if (s?.startsWith("blob:")) URL.revokeObjectURL(s);
      return null;
    });
  }, [busy]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, close]);

  const save = async (base64: string | null) => {
    setBusy(true);
    setError(null);
    const result = await setMyPhoto(base64);
    setBusy(false);
    if (!result.success) return setError(result.error ?? "Couldn't save the picture.");
    setShowPhoto(base64 !== null);
    setVersion((v) => v + 1);
    setOpen(false);
    setView("menu");
    setSource(null);
    router.refresh();
  };

  const pickFile = (file: File | undefined) => {
    if (fileInput.current) fileInput.current.value = "";
    if (!file) return;
    if (!/^image\/(jpeg|png|webp)$/.test(file.type)) return setError("Use a JPG, PNG or WebP photo.");
    if (file.size > MAX_SOURCE_BYTES) return setError("Photos must be 10 MB or smaller.");
    setError(null);
    setSource(URL.createObjectURL(file));
    setView("crop");
  };

  const chooseAvatar = async (a: AvatarStyle) => {
    try {
      await save(await avatarPngBase64(a));
    } catch {
      setError("Couldn't use that avatar. Try another one.");
    }
  };

  const cropError = useCallback((msg: string) => setError(msg), []);

  const picture = (size: string, text: string) => (
    <span className={`${size} rounded-full bg-sti-yellow text-blue-900 grid place-items-center ${text} font-bold overflow-hidden shrink-0`}>
      {showPhoto ? (
        // eslint-disable-next-line @next/next/no-img-element -- our own authenticated route
        <img src={`/api/me/avatar?v=${version}`} alt="" className="w-full h-full object-cover" />
      ) : (
        initials
      )}
    </span>
  );

  const option = "w-full flex items-center gap-3 rounded-xl border border-slate-300 hover:bg-slate-50 px-4 min-h-12 text-[14px] text-left disabled:opacity-60";

  return (
    <div>
      <div className="flex items-center gap-4">
        <button type="button" onClick={() => setOpen(true)} aria-label="Change profile picture" className="relative group rounded-full">
          {picture("w-20 h-20", "text-xl")}
          <span className="absolute inset-0 rounded-full bg-black/45 text-white grid place-items-center opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100 transition-opacity">
            <Camera size={20} aria-hidden />
          </span>
        </button>
        {!compact && (
          <button type="button" onClick={() => setOpen(true)} className="inline-flex items-center gap-2 border border-slate-300 hover:bg-slate-100 text-sm px-4 min-h-10 rounded-full">
            <Camera size={15} /> Change picture
          </button>
        )}
      </div>

      <input ref={fileInput} type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" tabIndex={-1} aria-hidden onChange={(e) => pickFile(e.target.files?.[0])} />

      {open && (
        <div className="fixed inset-0 z-50 bg-black/40 grid place-items-center p-4" onClick={close}>
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="photo-title"
            className="w-full max-w-md max-h-[92vh] overflow-y-auto bg-sheet text-ink rounded-2xl p-5 sm:p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-3">
              <h2 id="photo-title" className="text-lg font-semibold">
                {view === "crop" ? "Adjust your photo" : view === "avatars" ? "Choose an avatar" : "Profile picture"}
              </h2>
              <button type="button" onClick={close} aria-label="Close" className="w-10 h-10 grid place-items-center rounded-full hover:bg-slate-100">
                <X size={18} />
              </button>
            </div>

            {view === "menu" && (
              <div className="mt-4 space-y-4">
                <div className="flex justify-center">{picture("w-28 h-28", "text-3xl")}</div>
                <div className="space-y-2">
                  <button type="button" className={option} disabled={busy} onClick={() => fileInput.current?.click()}>
                    <Camera size={18} className="text-blue-700" /> Upload a photo
                  </button>
                  {showPhoto && (
                    <button
                      type="button"
                      className={option}
                      disabled={busy}
                      onClick={() => {
                        setSource(`/api/me/avatar?v=${version}`);
                        setView("crop");
                      }}
                    >
                      <Crop size={18} className="text-blue-700" /> Adjust current picture
                    </button>
                  )}
                  <button type="button" className={option} disabled={busy} onClick={() => setView("avatars")}>
                    <Smile size={18} className="text-blue-700" /> Choose an avatar
                  </button>
                  {showPhoto && (
                    <button type="button" className={`${option} text-red-700 hover:bg-red-50`} disabled={busy} onClick={() => save(null)}>
                      {busy ? <Loader2 size={18} className="animate-spin" /> : <Trash2 size={18} />} Remove picture (show my initials)
                    </button>
                  )}
                </div>
              </div>
            )}

            {view === "crop" && source && (
              <Cropper
                src={source}
                busy={busy}
                onCancel={() => {
                  setView("menu");
                  setSource(null);
                }}
                onDone={(base64) => save(base64)}
                onError={cropError}
              />
            )}

            {view === "avatars" && (
              <div className="mt-4">
                <AvatarGroup title="Avatars 1–5" avatars={AVATARS.filter((a) => a.group === "male")} busy={busy} onPick={chooseAvatar} />
                <AvatarGroup title="Avatars 6–10" avatars={AVATARS.filter((a) => a.group === "female")} busy={busy} onPick={chooseAvatar} />
                <p className="mt-3 text-[12px] text-slate-500">Anyone can use any avatar.</p>
                <button type="button" onClick={() => setView("menu")} disabled={busy} className="mt-4 min-h-10 px-4 rounded-full border border-slate-300 text-[14px] hover:bg-slate-50">
                  Back
                </button>
              </div>
            )}

            <InlineError message={error} onDismiss={() => setError(null)} className="mt-4" />
          </div>
        </div>
      )}
    </div>
  );
}

function AvatarGroup({ title, avatars, busy, onPick }: { title: string; avatars: AvatarStyle[]; busy: boolean; onPick: (a: AvatarStyle) => void }) {
  return (
    <fieldset className="mt-3 first:mt-0">
      <legend className="text-[13px] font-medium text-slate-600 mb-2">{title}</legend>
      <div className="grid grid-cols-5 gap-2">
        {avatars.map((a) => (
          <button
            key={a.id}
            type="button"
            disabled={busy}
            onClick={() => onPick(a)}
            aria-label={`Use avatar: ${a.label}`}
            title={a.label}
            className="aspect-square rounded-full overflow-hidden ring-2 ring-transparent hover:ring-blue-600 focus-visible:ring-blue-600 disabled:opacity-60"
          >
            {/* eslint-disable-next-line @next/next/no-img-element -- inline SVG data URL */}
            <img src={avatarDataUrl(a)} alt="" className="w-full h-full" />
          </button>
        ))}
      </div>
    </fieldset>
  );
}

// Drag to move, slider (or mouse wheel) to zoom; saves a square crop.
function Cropper({
  src,
  busy,
  onCancel,
  onDone,
  onError,
}: {
  src: string;
  busy: boolean;
  onCancel: () => void;
  onDone: (base64: string) => void;
  onError: (message: string) => void;
}) {
  const [img, setImg] = useState<HTMLImageElement | null>(null);
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const drag = useRef<{ x: number; y: number; ox: number; oy: number } | null>(null);

  useEffect(() => {
    let cancelled = false;
    const image = new Image();
    image.onload = () => !cancelled && setImg(image);
    image.onerror = () => !cancelled && onError("That photo couldn't be opened. Try another one.");
    image.src = src;
    return () => {
      cancelled = true;
    };
  }, [src, onError]);

  // The image always covers the square: "cover" size times the zoom.
  const sizeAt = (z: number) =>
    img ? { w: img.naturalWidth * Math.max(VIEW_PX / img.naturalWidth, VIEW_PX / img.naturalHeight) * z, h: img.naturalHeight * Math.max(VIEW_PX / img.naturalWidth, VIEW_PX / img.naturalHeight) * z } : { w: VIEW_PX, h: VIEW_PX };
  const { w, h } = sizeAt(zoom);
  const clamp = (o: { x: number; y: number }, size = { w, h }) => ({
    x: Math.max(-(size.w - VIEW_PX) / 2, Math.min((size.w - VIEW_PX) / 2, o.x)),
    y: Math.max(-(size.h - VIEW_PX) / 2, Math.min((size.h - VIEW_PX) / 2, o.y)),
  });

  const setZoomTo = (z: number) => {
    const next = Math.max(1, Math.min(MAX_ZOOM, z));
    setZoom(next);
    setOffset((o) => clamp(o, sizeAt(next)));
  };

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = { x: e.clientX, y: e.clientY, ox: offset.x, oy: offset.y };
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!drag.current) return;
    setOffset(clamp({ x: drag.current.ox + e.clientX - drag.current.x, y: drag.current.oy + e.clientY - drag.current.y }));
  };
  const onKeyDown = (e: React.KeyboardEvent) => {
    const step = 10;
    const moves: Record<string, [number, number]> = { ArrowLeft: [step, 0], ArrowRight: [-step, 0], ArrowUp: [0, step], ArrowDown: [0, -step] };
    const m = moves[e.key];
    if (!m) return;
    e.preventDefault();
    setOffset((o) => clamp({ x: o.x + m[0], y: o.y + m[1] }));
  };

  const finish = () => {
    if (!img) return;
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = OUTPUT_PX;
    const ctx = canvas.getContext("2d");
    if (!ctx) return onError("Your browser couldn't crop the photo.");
    const r = OUTPUT_PX / VIEW_PX;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, OUTPUT_PX, OUTPUT_PX);
    ctx.drawImage(img, ((VIEW_PX - w) / 2 + offset.x) * r, ((VIEW_PX - h) / 2 + offset.y) * r, w * r, h * r);
    onDone(canvas.toDataURL("image/jpeg", 0.9).split(",")[1] ?? "");
  };

  return (
    <div className="mt-4">
      <div
        className="relative mx-auto overflow-hidden rounded-2xl bg-slate-900 touch-none select-none cursor-grab active:cursor-grabbing"
        style={{ width: VIEW_PX, height: VIEW_PX }}
        tabIndex={0}
        role="application"
        aria-label="Photo position. Drag, or use the arrow keys, to move it."
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={() => (drag.current = null)}
        onPointerCancel={() => (drag.current = null)}
        onWheel={(e) => setZoomTo(zoom - e.deltaY * 0.002)}
        onKeyDown={onKeyDown}
      >
        {img ? (
          // eslint-disable-next-line @next/next/no-img-element -- local preview of the chosen file
          <img
            src={src}
            alt=""
            draggable={false}
            className="absolute max-w-none pointer-events-none"
            style={{ width: w, height: h, left: (VIEW_PX - w) / 2 + offset.x, top: (VIEW_PX - h) / 2 + offset.y }}
          />
        ) : (
          <div className="absolute inset-0 grid place-items-center text-white/80">
            <Loader2 className="animate-spin" size={20} />
          </div>
        )}
        {/* Dims everything outside the circle that will show as the picture. */}
        <div className="absolute inset-0 pointer-events-none rounded-full" style={{ boxShadow: "0 0 0 999px rgb(0 0 0 / 0.5)" }} />
      </div>

      <div className="mt-4 flex items-center gap-3">
        <button type="button" onClick={() => setZoomTo(zoom - 0.25)} aria-label="Zoom out" className="w-10 h-10 grid place-items-center rounded-full hover:bg-slate-100">
          <ZoomOut size={18} />
        </button>
        <input type="range" min={1} max={MAX_ZOOM} step={0.01} value={zoom} onChange={(e) => setZoomTo(Number(e.target.value))} aria-label="Zoom" className="flex-1 accent-blue-700" />
        <button type="button" onClick={() => setZoomTo(zoom + 0.25)} aria-label="Zoom in" className="w-10 h-10 grid place-items-center rounded-full hover:bg-slate-100">
          <ZoomIn size={18} />
        </button>
      </div>
      <p className="mt-1 text-center text-[12px] text-slate-500">Drag the photo to move it. Use the slider to zoom.</p>

      <div className="mt-5 flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
        <button type="button" onClick={onCancel} disabled={busy} className="min-h-11 px-5 rounded-full border border-slate-300 text-[14px] hover:bg-slate-50 disabled:opacity-60">
          Back
        </button>
        <button
          type="button"
          onClick={finish}
          disabled={busy || !img}
          className="min-h-11 px-5 rounded-full bg-blue-700 hover:bg-blue-800 text-white text-[14px] font-medium inline-flex items-center justify-center gap-2 disabled:opacity-60"
        >
          {busy && <Loader2 size={15} className="animate-spin" />} Save picture
        </button>
      </div>
    </div>
  );
}
