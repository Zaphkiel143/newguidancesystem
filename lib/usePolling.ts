"use client";

import { useEffect, useRef } from "react";

// Every poll is a server call (a billed function invocation on Vercel), so
// polling only happens while someone is actually using the page: the tab is
// visible AND there was mouse, keyboard, touch or scroll activity within the
// last IDLE_AFTER_MS. A tab left open on an unattended computer goes quiet,
// and the first activity after that refreshes straight away.

export const IDLE_AFTER_MS = 5 * 60 * 1000;

let lastActivity = Date.now();
let listening = false;
const wakeListeners = new Set<() => void>();

function isIdle() {
  return Date.now() - lastActivity > IDLE_AFTER_MS;
}

function onActivity() {
  const wasIdle = isIdle();
  lastActivity = Date.now();
  if (wasIdle) wakeListeners.forEach((wake) => wake());
}

function listen() {
  if (listening || typeof window === "undefined") return;
  listening = true;
  for (const event of ["pointerdown", "pointermove", "keydown", "wheel", "touchstart", "scroll"]) {
    window.addEventListener(event, onActivity, { passive: true, capture: true });
  }
}

// True while polling is worth doing.
export function pageInUse() {
  return typeof document !== "undefined" && document.visibilityState === "visible" && !isIdle();
}

// Calls `poll` every `intervalMs` while the page is in use, and once right away
// whenever the person comes back (tab shown again, or activity after idling).
// Pass `enabled: false` to turn it off. The latest `poll` is always used, so it
// doesn't need to be memoized.
export function usePolling(poll: () => unknown, intervalMs: number, enabled = true) {
  const pollRef = useRef(poll);
  useEffect(() => {
    pollRef.current = poll;
  });

  useEffect(() => {
    if (!enabled) return;
    listen();
    const run = () => {
      if (pageInUse()) void pollRef.current();
    };
    const id = window.setInterval(run, intervalMs);
    const onVisible = () => {
      if (document.visibilityState === "visible") {
        lastActivity = Date.now();
        run();
      }
    };
    document.addEventListener("visibilitychange", onVisible);
    wakeListeners.add(run);
    return () => {
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", onVisible);
      wakeListeners.delete(run);
    };
  }, [intervalMs, enabled]);
}
