"use client";

import { useEffect, useState } from "react";
import { getMyChildren } from "../action/parent";

export type Child = Awaited<ReturnType<typeof getMyChildren>>[number];

// The students the guidance office has linked to the signed-in parent
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
