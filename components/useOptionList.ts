"use client";

import { useEffect, useState } from "react";
import { getOptionList, type OptionItemData } from "../app/action/optionLists";

// Fetches a counselor-editable dropdown's current items. Returns [] while
// loading - callers render their current/default selection regardless, so
// a brief loading flash never blocks the form.
export function useOptionList(listKey: string): OptionItemData[] {
  const [items, setItems] = useState<OptionItemData[]>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const data = await getOptionList(listKey);
      if (!cancelled) setItems(data);
    })();
    return () => {
      cancelled = true;
    };
  }, [listKey]);

  return items;
}
