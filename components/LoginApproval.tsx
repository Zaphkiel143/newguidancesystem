"use client";

import React, { useCallback, useEffect, useState } from "react";
import { BellRing, Loader2, ShieldAlert } from "lucide-react";
import {
  answerLoginRequest,
  getMyLoginRequests,
  removePushSubscription,
  savePushSubscription,
} from "../app/action/loginApproval";
import InlineError from "./InlineError";

type Request = Awaited<ReturnType<typeof getMyLoginRequests>>[number];

const POLL_MS = 5000;

// Shown on any signed-in page when someone asks to sign in to this account
// with "Approve on my phone". The person taps the number shown on the other
// screen, or Deny.
export function LoginApprovalPrompt() {
  const [request, setRequest] = useState<Request | null>(null);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; text: string } | null>(null);

  const check = useCallback(async () => {
    if (document.visibilityState !== "visible") return;
    const [next] = await getMyLoginRequests();
    setRequest((current) => (current && next && current.id === next.id ? current : next ?? null));
  }, []);

  useEffect(() => {
    queueMicrotask(check);
    const id = setInterval(check, POLL_MS);
    document.addEventListener("visibilitychange", check);
    window.addEventListener("focus", check);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", check);
      window.removeEventListener("focus", check);
    };
  }, [check]);

  const answer = async (picked: number | "deny") => {
    if (!request) return;
    setBusy(true);
    const r = await answerLoginRequest(request.id, picked);
    setBusy(false);
    setRequest(null);
    if (picked === "deny") setResult({ ok: true, text: "Sign-in denied." });
    else if (r.success && r.approved) setResult({ ok: true, text: "Approved. The other device is signing in now." });
    else setResult({ ok: false, text: r.error ?? "The sign-in was blocked." });
    setTimeout(() => setResult(null), 6000);
  };

  if (result) {
    return (
      <div role="status" className={`fixed top-20 left-1/2 -translate-x-1/2 z-[70] px-4 py-3 rounded-xl shadow-xl text-sm ${result.ok ? "bg-emerald-700 text-white" : "bg-red-700 text-white"}`}>
        {result.text}
      </div>
    );
  }
  if (!request) return null;

  return (
    <div className="fixed inset-0 z-[70] bg-ink/50 flex items-end sm:items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="approve-title">
      <div className="w-full max-w-sm bg-sheet rounded-2xl shadow-2xl p-6 text-center">
        <ShieldAlert className="mx-auto text-blue-700" size={32} />
        <h2 id="approve-title" className="mt-3 text-lg font-semibold text-ink">Approve sign-in?</h2>
        <p className="mt-1 text-sm text-slate-600">
          Someone is signing in to your E-Gabay account on <strong>{request.device ?? "another device"}</strong>. If it&apos;s you, tap the
          number shown on that screen.
        </p>
        <div className="mt-5 grid grid-cols-3 gap-3">
          {request.choices.map((n) => (
            <button key={n} type="button" disabled={busy} onClick={() => answer(n)}
              className="min-h-14 rounded-xl border-2 border-blue-200 hover:border-blue-600 hover:bg-blue-50 text-2xl font-bold text-ink disabled:opacity-50">
              {n}
            </button>
          ))}
        </div>
        <button type="button" disabled={busy} onClick={() => answer("deny")}
          className="mt-4 w-full min-h-11 rounded-full text-red-700 hover:bg-red-50 font-medium text-sm disabled:opacity-50">
          {busy ? <Loader2 className="inline animate-spin" size={16} /> : "No, it's not me. Deny"}
        </button>
      </div>
    </div>
  );
}

function urlBase64ToUint8Array(base64: string) {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const raw = atob((base64 + padding).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
}

// "Get sign-in approvals on this device": turns on phone notifications.
export function PushToggle() {
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const [supported, setSupported] = useState<boolean | null>(null);
  const [subscribed, setSubscribed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isIos = typeof navigator !== "undefined" && /iPhone|iPad/i.test(navigator.userAgent);

  useEffect(() => {
    const ok = "serviceWorker" in navigator && "PushManager" in window && "Notification" in window && Boolean(publicKey);
    queueMicrotask(() => setSupported(ok));
    if (!ok) return;
    navigator.serviceWorker
      .register("/sw.js", { scope: "/", updateViaCache: "none" })
      .then((reg) => reg.pushManager.getSubscription())
      .then((sub) => setSubscribed(Boolean(sub)))
      .catch(() => setSupported(false));
  }, [publicKey]);

  const turnOn = async () => {
    setBusy(true);
    setError(null);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setError("Notifications are blocked for this site. Allow them in your browser settings, then try again.");
        return;
      }
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(publicKey!) });
      const saved = await savePushSubscription(JSON.parse(JSON.stringify(sub)));
      if (!saved.success) throw new Error("save failed");
      setSubscribed(true);
    } catch {
      setError("Couldn't turn on notifications on this device. Try again.");
    } finally {
      setBusy(false);
    }
  };

  const turnOff = async () => {
    setBusy(true);
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await removePushSubscription(sub.endpoint);
        await sub.unsubscribe();
      }
      setSubscribed(false);
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="bg-sheet border border-rule rounded-2xl p-5 sm:p-6" aria-labelledby="push-heading">
      <h2 id="push-heading" className="font-semibold text-[17px] text-ink inline-flex items-center gap-2">
        <BellRing size={18} className="text-blue-700" /> Approve sign-ins from this device
      </h2>
      <p className="text-sm text-slate-600 mt-1 max-w-[65ch]">
        When you sign in somewhere else with &ldquo;Approve on my phone&rdquo;, this device gets a notification. Tap it and pick the number
        shown on the other screen. Even without notifications, the request pops up whenever E-Gabay is open here.
      </p>
      {supported === null ? null : !supported ? (
        <p className="mt-3 text-sm text-slate-600">
          {isIos
            ? "On iPhone, first add E-Gabay to your Home Screen (Share → Add to Home Screen), open it from there, then come back to this page."
            : "This browser can't show notifications from websites. Requests will still pop up while E-Gabay is open."}
        </p>
      ) : subscribed ? (
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <p className="text-sm text-emerald-700 font-medium">Notifications are on for this device.</p>
          <button type="button" onClick={turnOff} disabled={busy} className="px-4 min-h-10 rounded-full text-sm text-slate-700 hover:bg-slate-100 border border-slate-300 disabled:opacity-50">
            Turn off
          </button>
        </div>
      ) : (
        <button type="button" onClick={turnOn} disabled={busy}
          className="mt-3 inline-flex items-center gap-2 bg-blue-700 hover:bg-blue-800 text-white text-sm font-medium px-5 min-h-11 rounded-full disabled:opacity-60">
          {busy && <Loader2 size={15} className="animate-spin" />} Turn on notifications on this device
        </button>
      )}
      <InlineError message={error} onDismiss={() => setError(null)} className="mt-3" />
    </section>
  );
}
