"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

// Pages that load their content after opening (like account pages) don't exist
// yet when the browser tries to jump to "#settings", so retry for a few seconds.
export default function ScrollToHash() {
  const pathname = usePathname();
  useEffect(() => {
    const id = window.location.hash.slice(1);
    if (!id) return;
    let tries = 0;
    const timer = setInterval(() => {
      const el = document.getElementById(id);
      // Keep nudging until it sticks: the page may still be loading or scrolling to the top.
      if (el && Math.abs(el.getBoundingClientRect().top) > 120) el.scrollIntoView({ block: "start" });
      if (++tries > 20) clearInterval(timer);
    }, 150);
    return () => clearInterval(timer);
  }, [pathname]);
  return null;
}
