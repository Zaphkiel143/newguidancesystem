import { Phone } from "lucide-react";
import { LogoMark } from "./Logo";
import { CRISIS_HOTLINES } from "../app/config/hotlines";

// Bottom of every signed-in page: who runs E-Gabay, where to get help right
// away (the same hotlines the chatbot gives), and the copyright line.
export default function AppFooter() {
  const year = new Date().getFullYear();
  // The first number of each hotline keeps the line short; the chatbot lists them all.
  const hotlines = CRISIS_HOTLINES.map((h) => ({ name: h.name.replace(/\s*\(.*\)$/, ""), ...h.numbers[0] }));

  return (
    <footer className="mt-12 border-t border-rule bg-sheet text-[13px] text-slate-600 print:hidden">
      <div className="px-5 sm:px-8 lg:px-12 py-6 flex flex-col lg:flex-row lg:items-center gap-x-10 gap-y-4">
        <div className="flex items-center gap-3 min-w-0 lg:shrink-0">
          <LogoMark size={32} className="shrink-0" />
          <div className="leading-tight min-w-0">
            <p className="font-semibold text-ink">E-Gabay</p>
            <p className="text-[12px] text-slate-500">Guidance and Counseling Office · STI College Sta. Maria</p>
          </div>
        </div>

        <p className="flex flex-wrap items-center gap-x-3 gap-y-1 lg:flex-1 lg:min-w-0">
          <span className="inline-flex items-center gap-1.5 font-medium text-ink">
            <Phone size={14} className="text-red-700" aria-hidden /> Need help right now?
          </span>
          {hotlines.map((h) => (
            <span key={h.tel} className="whitespace-nowrap">
              {h.name}:{" "}
              <a href={`tel:${h.tel}`} className="font-semibold text-blue-700 underline underline-offset-2">
                {h.label}
              </a>
            </span>
          ))}
        </p>

        <p className="text-[12px] text-slate-500 lg:text-right lg:shrink-0 lg:whitespace-nowrap">© {year} STI College Sta. Maria. All rights reserved.</p>
      </div>
    </footer>
  );
}
