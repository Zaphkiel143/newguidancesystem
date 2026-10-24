"use client";

import React from "react";
import { MIN_PASSWORD, passwordStrength } from "../lib/parentSignup";

const BAR: Record<number, string> = { 1: "bg-red-500", 2: "bg-orange-500", 3: "bg-emerald-500", 4: "bg-emerald-600" };
const TEXT: Record<number, string> = { 1: "text-red-700", 2: "text-orange-700", 3: "text-emerald-700", 4: "text-emerald-700" };

// A four-step meter under a new-password box, with what makes it stronger.
export default function PasswordStrength({ password, id }: { password: string; id?: string }) {
  const { score, label } = passwordStrength(password);
  return (
    <div id={id} className="mt-1.5">
      <div className="flex gap-1" aria-hidden>
        {[1, 2, 3, 4].map((i) => (
          <span key={i} className={`h-1.5 flex-1 rounded-full ${score >= i ? BAR[score] : "bg-slate-200"}`} />
        ))}
      </div>
      <p className="text-xs text-slate-500 mt-1" aria-live="polite">
        {label && <span className={`font-medium ${TEXT[score]}`}>{label}. </span>}
        Use at least {MIN_PASSWORD} characters with letters and numbers. Adding capital letters, symbols (like ! or #) and more length makes it
        stronger.
      </p>
    </div>
  );
}
