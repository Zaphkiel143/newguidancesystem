import Link from "next/link";
import { SearchX } from "lucide-react";

// A link to a page that doesn't exist (or no longer does).
export default function NotFound() {
  return (
    <main className="min-h-full flex-1 grid place-items-center px-5 py-16 text-center text-slate-800">
      <div className="max-w-md">
        <span className="mx-auto w-14 h-14 rounded-full bg-blue-50 text-blue-700 grid place-items-center" aria-hidden>
          <SearchX size={26} />
        </span>
        <h1 className="page-title mt-4">Page not found</h1>
        <p className="mt-2 text-[15px] text-slate-600">That page doesn&apos;t exist, or it has moved.</p>
        <Link href="/" className="mt-6 inline-flex items-center justify-center min-h-11 px-6 rounded-full bg-blue-700 hover:bg-blue-800 text-white text-[14px] font-medium">
          Go to E-Gabay
        </Link>
      </div>
    </main>
  );
}
