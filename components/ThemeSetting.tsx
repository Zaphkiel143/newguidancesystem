"use client";

import React, { useEffect, useState } from "react";
import { Monitor, Moon, Sun } from "lucide-react";

// Light, dark, or whatever the device uses. Saved on this device only; the
// script in app/layout.tsx applies it before the page paints.
type Theme = "light" | "dark" | "system";
const KEY = "egabay-theme";
const OPTIONS: { value: Theme; label: string; icon: React.ElementType }[] = [
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
  { value: "system", label: "Match my device", icon: Monitor },
];

const deviceIsDark = () => window.matchMedia("(prefers-color-scheme: dark)").matches;

function apply(theme: Theme) {
  const dark = theme === "dark" || (theme === "system" && deviceIsDark());
  if (dark) document.documentElement.dataset.theme = "dark";
  else delete document.documentElement.dataset.theme;
}

function saved(): Theme {
  try {
    const t = localStorage.getItem(KEY);
    return t === "dark" || t === "system" ? t : "light";
  } catch {
    return "light";
  }
}

export default function ThemeSetting() {
  const [theme, setTheme] = useState<Theme>("light");

  // Read the saved choice after mounting (localStorage isn't there on the server).
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- syncing from browser storage once
    setTheme(saved());
  }, []);

  // "Match my device" follows the device when it switches between light and dark.
  useEffect(() => {
    if (theme !== "system") return;
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => apply("system");
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, [theme]);

  const choose = (t: Theme) => {
    setTheme(t);
    try {
      localStorage.setItem(KEY, t);
    } catch {
      // Private browsing: the choice still applies until the page is closed.
    }
    apply(t);
  };

  return (
    <section className="bg-sheet border border-rule rounded-2xl p-5 sm:p-6" aria-labelledby="theme-heading">
      <h2 id="theme-heading" className="font-semibold text-[17px] text-ink inline-flex items-center gap-2">
        <Moon size={18} className="text-blue-700" /> Appearance
      </h2>
      <p className="text-sm text-slate-600 mt-1">Choose light or dark mode. This is saved on this device.</p>
      <div role="radiogroup" aria-labelledby="theme-heading" className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-2 max-w-xl">
        {OPTIONS.map(({ value, label, icon: Icon }) => (
          <label
            key={value}
            className={`flex items-center gap-2.5 rounded-xl border px-3.5 min-h-12 cursor-pointer text-[14px] transition-colors ${
              theme === value ? "border-blue-600 bg-blue-50 text-ink" : "border-slate-300 hover:bg-slate-50"
            }`}
          >
            <input type="radio" name="theme" value={value} checked={theme === value} onChange={() => choose(value)} className="accent-blue-700" />
            <Icon size={16} className="text-slate-500" aria-hidden />
            {label}
          </label>
        ))}
      </div>
    </section>
  );
}
