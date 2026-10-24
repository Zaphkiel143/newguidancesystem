import { BookOpen, ExternalLink, FileText } from "lucide-react";

export type Reading = { id: string; title: string; description: string | null; topic: string | null; link: string | null; fileName: string | null };

// Supplementary reading materials from the guidance office, on the
// Announcements & Events board and the parents' feed.
export default function ReadingList({ items, compact = false }: { items: Reading[]; compact?: boolean }) {
  return (
    <ul className={compact ? "space-y-3" : "divide-y divide-rule border-t border-rule"}>
      {items.map((r) => (
        <li key={r.id} className={compact ? "bg-sheet border border-rule rounded-2xl p-4 shadow-sm" : "py-4"}>
          {r.topic && <p className="text-[12px] font-medium text-blue-700">{r.topic}</p>}
          <h3 className="font-medium text-ink break-words inline-flex items-start gap-2">
            <BookOpen size={16} className="shrink-0 mt-0.5 text-slate-500" aria-hidden /> {r.title}
          </h3>
          {r.description && <p className="text-sm text-slate-700 mt-1 whitespace-pre-wrap break-words">{r.description}</p>}
          <p className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[13px]">
            {r.fileName && (
              <a href={`/api/reading/${r.id}`} target="_blank" rel="noopener" className="inline-flex items-center gap-1.5 font-medium text-blue-700 hover:underline min-h-9">
                <FileText size={14} aria-hidden /> Open {r.fileName}
              </a>
            )}
            {r.link && (
              <a href={r.link} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 font-medium text-blue-700 hover:underline min-h-9">
                <ExternalLink size={14} aria-hidden /> Open link
              </a>
            )}
          </p>
        </li>
      ))}
    </ul>
  );
}
