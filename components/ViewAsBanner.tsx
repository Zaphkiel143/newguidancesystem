import { Eye } from "lucide-react";
import { stopViewAs } from "../app/action/accounts";
import { ROLE_LABEL } from "../lib/session";
import type { UserRole } from "../lib/generated";

// Shown on every page while the Super Admin is viewing as someone else
export default function ViewAsBanner({ viewAs }: { viewAs: { name: string; role: UserRole } | null }) {
  if (!viewAs) return null;
  return (
    <div role="status" className="sticky top-(--topbar-h) z-30 bg-butter-200 border-b border-butter-300 text-ink px-4 sm:px-8 py-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px]">
      <Eye size={15} className="text-blue-700 shrink-0" />
      <span>
        Viewing as <strong className="font-semibold">{viewAs.name}</strong> ({ROLE_LABEL[viewAs.role]}). Read-only: nothing can be changed.
      </span>
      <form action={stopViewAs} className="ml-auto">
        <button type="submit" className="px-3 min-h-8 rounded-full bg-blue-700 text-white font-medium hover:bg-blue-800">
          Exit View as
        </button>
      </form>
    </div>
  );
}
