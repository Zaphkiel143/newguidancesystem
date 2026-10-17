"use client";

import { useEffect, useState } from "react";
import { getMyChildren } from "../action/parent";

export type Child = Awaited<ReturnType<typeof getMyChildren>>[number];

// The students linked to the signed-in parent (StudentProfile.parentName).
// `children` is null while loading.
export function useMyChildren() {
  const [children, setChildren] = useState<Child[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const data = await getMyChildren();
      if (!cancelled) setChildren(data);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return children;
}
