"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, ShieldCheck } from "lucide-react";
import { acceptPrivacyNotice } from "../app/action/privacy";
import { logout } from "../app/action/auth";

// Shown once, before first use, to every role
export default function PrivacyNotice() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [checked, setChecked] = useState(false);
  const [error, setError] = useState(false);

  const agree = async () => {
    setBusy(true);
    setError(false);
    const r = await acceptPrivacyNotice();
    setBusy(false);
    if (r.success) router.refresh();
    else setError(true);
  };

  return (
    <div className="fixed inset-0 z-[80] bg-ink/60 flex items-center justify-center p-3 sm:p-6" role="dialog" aria-modal="true" aria-labelledby="privacy-title">
      <div className="w-full max-w-2xl max-h-[92dvh] bg-sheet rounded-2xl shadow-2xl flex flex-col">
        <header className="px-5 sm:px-7 pt-6 pb-3 border-b border-rule">
          <h2 id="privacy-title" className="text-xl font-bold text-ink inline-flex items-center gap-2">
            <ShieldCheck className="text-blue-700" size={22} /> Privacy notice
          </h2>
          <p className="text-sm text-slate-500 mt-1">Please read this before using E-Gabay. You only need to do this once.</p>
        </header>

        <div className="px-5 sm:px-7 py-4 overflow-y-auto text-[14px] leading-relaxed text-slate-700 space-y-3">
          <p>
            E-Gabay is run by the <strong>Guidance and Counseling Office (GCO) of STI College Sta. Maria</strong>. We handle your
            personal information according to the <strong>Data Privacy Act of 2012 (Republic Act No. 10173)</strong> and the
            confidentiality standards of guidance and counseling practice (RA 9258).
          </p>
          <div>
            <h3 className="font-semibold text-ink">What we collect</h3>
            <p>
              Your name, school email or mobile number, student ID, level, grade or year, section and strand or course; your appointments,
              referrals, messages, needs-assessment answers, uploaded documents, and messages to the E-Gabay chatbot. For students, the
              Individual Inventory record kept by the GCO.
            </p>
          </div>
          <div>
            <h3 className="font-semibold text-ink">Why</h3>
            <p>
              Only to provide guidance services: consultation, referral, career guidance, group guidance, information, and the Individual
              Inventory. It is not used for grading, discipline, or anything outside the GCO&apos;s work.
            </p>
          </div>
          <div>
            <h3 className="font-semibold text-ink">Who can see it</h3>
            <ul className="list-disc pl-5 space-y-0.5">
              <li>The Guidance Associate sees the records needed to help you. Session notes stay confidential to the GCO.</li>
              <li>Students see only their own records.</li>
              <li>Parents see only their confirmed child&apos;s profile, sessions and career plan progress, not session notes.</li>
              <li>Faculty and staff see only the referrals and appointments they made.</li>
            </ul>
            <p className="mt-1">Every time a student&apos;s record or document is opened, E-Gabay records who opened it.</p>
          </div>
          <div>
            <h3 className="font-semibold text-ink">How it is protected</h3>
            <p>Encrypted connections (HTTPS), role-based access, sign-in codes instead of shared passwords, and limits against misuse.</p>
          </div>
          <div>
            <h3 className="font-semibold text-ink">Your rights</h3>
            <p>
              Under RA 10173 you may ask to see, correct, or have your information deleted, object to its use, and file a complaint with the
              National Privacy Commission. Contact the GCO in person or through Messages in E-Gabay.
            </p>
          </div>
          <p className="text-[13px] text-slate-500">
            If you are in danger or need urgent help, don&apos;t wait for a reply here: go to the Guidance Office, tell a trusted adult, or call
            the NCMH Crisis Hotline at 1553.
          </p>
        </div>

        <footer className="px-5 sm:px-7 py-4 border-t border-rule space-y-3">
          <label className="flex items-start gap-3 text-sm text-ink cursor-pointer">
            <input type="checkbox" checked={checked} onChange={(e) => setChecked(e.target.checked)} className="mt-0.5 w-5 h-5 accent-blue-700 shrink-0" />
            I have read this notice and agree to the collection and use of my information as described.
          </label>
          {error && <p role="alert" className="text-sm text-red-700">Couldn&apos;t save your answer. Try again.</p>}
          <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
            <button type="button" onClick={() => logout()} className="min-h-11 px-5 rounded-full text-sm text-slate-700 hover:bg-slate-100">
              I don&apos;t agree, sign me out
            </button>
            <button type="button" onClick={agree} disabled={!checked || busy}
              className="min-h-11 px-6 rounded-full bg-blue-700 hover:bg-blue-800 text-white text-sm font-medium disabled:opacity-50 inline-flex items-center justify-center gap-2">
              {busy && <Loader2 size={15} className="animate-spin" />} I agree
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
}
