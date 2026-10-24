import { Phone } from "lucide-react";
import { LogoMark } from "./Logo";
import { CRISIS_HOTLINES } from "../app/config/hotlines";

// A slim bar fixed to the bottom of every signed-in page, so help is always in
// view: who runs E-Gabay, the crisis hotlines (the same list the chatbot
// gives), and the copyright line. It sits beside the sidebar, or across the
// full width when the sidebar is hidden. Pages that fill the screen subtract
// --footer-h so nothing hides behind it.
export default function AppFooter({ sidebarHidden }: { sidebarHidden: boolean }) {
  const year = new Date().getFullYear();
  // The first number of each hotline keeps the bar to one line; the chatbot lists them all.
  const hotlines = CRISIS_HOTLINES.map((h) => ({ name: h.name.replace(/\s*\(.*\)$/, ""), ...h.numbers[0] }));

  return (
    <footer
      className={`fixed bottom-0 right-0 left-0 z-30 h-(--footer-h) border-t border-rule bg-sheet/95 backdrop-blur text-[12px] sm:text-[13px] text-slate-600 print:hidden transition-[left] duration-300 ease-out ${
        sidebarHidden ? "md:left-0" : "md:left-(--sidebar-w)"
      }`}
    >
      <div className="h-full px-4 sm:px-8 lg:px-12 flex items-center gap-x-6 whitespace-nowrap overflow-hidden">
        {/* Brand: wide screens only; phones already show it in the top bar. */}
        {/* The hotlines come first in importance, so the brand shortens before they'd be cut off. */}
        <div className="hidden xl:flex items-center gap-2 shrink-0">
          <LogoMark size={22} className="shrink-0" />
          <span>
            <span className="font-semibold text-ink">E-Gabay</span>
            <span className="hidden 2xl:inline"> · Guidance and Counseling Office</span> · STI College Sta. Maria
          </span>
        </div>

        <p className="flex items-center gap-x-3 min-w-0 overflow-hidden">
          <span className="inline-flex items-center gap-1.5 font-medium text-ink shrink-0">
            <Phone size={14} className="text-red-700" aria-hidden />
            <span className="hidden sm:inline">Need help right now?</span>
            <span className="sm:hidden">Need help?</span>
          </span>
          {hotlines.map((h) => (
            <span key={h.tel} className="shrink-0">
              <span className="hidden sm:inline">{h.name}: </span>
              <a href={`tel:${h.tel}`} className="font-semibold text-blue-700 underline underline-offset-2" aria-label={`Call ${h.name}, ${h.label}`}>
                {h.label}
              </a>
            </span>
          ))}
        </p>

        <p className="ml-auto shrink-0 text-[11px] sm:text-[12px] text-slate-500">
          © {year}<span className="hidden sm:inline xl:hidden"> STI College Sta. Maria</span>
          <span className="hidden 2xl:inline"> STI College Sta. Maria. All rights reserved.</span>
        </p>
      </div>
    </footer>
  );
}
