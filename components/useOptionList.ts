"use client";

import { useEffect, useState } from "react";
import { getOptionList, type OptionItemData } from "../app/action/optionLists";

// Fetches a counselor-editable dropdown's current items
export function useOptionList(listKey: string): [OptionItemData[], () => void] {
  const [items, setItems] = useState<OptionItemData[]>([]);
  const [refreshToken, setRefreshToken] = useState(0);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const data = await getOptionList(listKey);
      if (!cancelled) setItems(data);
    })();
    return () => {
      cancelled = true;
    };
  }, [listKey, refreshToken]);

  const refetch = () => setRefreshToken((n) => n + 1);
  return [items, refetch];
}
