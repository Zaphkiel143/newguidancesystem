"use server";

import db from "../../lib/db";
import { requireActionUser } from "../../lib/session";
import { logActivity } from "../../lib/activityLog";
import { OPTION_LIST_DEFAULTS } from "../../lib/optionListDefaults";

const counselorOnly = () => requireActionUser("COUNSELOR");

export interface OptionItemData {
  id: string;
  itemKey: string | null;
  parentItemKey: string | null;
  label: string;
  isProtected: boolean;
}

// Seeds a list from its hardcoded defaults the first time it's read, so a
// fresh environment (or one where the one-time seed never ran) still works.
async function ensureSeeded(listKey: string) {
  const def = OPTION_LIST_DEFAULTS[listKey];
  if (!def) return null;

  const existing = await db.optionList.findUnique({ where: { listKey } });
  if (existing) return existing.id;

  const created = await db.optionList.create({
    data: {
      listKey,
      label: def.label,
      parentKey: def.parentKey ?? null,
      items: {
        create: def.items.map((item, i) => ({
          itemKey: item.itemKey ?? null,
          parentItemKey: item.parentItemKey ?? null,
          label: item.label,
          isProtected: item.isProtected ?? false,
          sortOrder: i,
        })),
      },
    },
  });
  return created.id;
}

// Any signed-in (or pre-auth, e.g. sign-up) caller can read - these are
// vocabulary, not sensitive data.
export async function getOptionList(listKey: string): Promise<OptionItemData[]> {
  try {
    const listId = await ensureSeeded(listKey);
    if (!listId) return [];

    const items = await db.optionItem.findMany({ where: { listId }, orderBy: { sortOrder: "asc" } });
    return items.map((i) => ({ id: i.id, itemKey: i.itemKey, parentItemKey: i.parentItemKey, label: i.label, isProtected: i.isProtected }));
  } catch (error) {
    console.error("[optionLists] getOptionList failed:", error);
    const def = OPTION_LIST_DEFAULTS[listKey];
    return (def?.items ?? []).map((item, i) => ({
      id: `fallback-${i}`,
      itemKey: item.itemKey ?? null,
      parentItemKey: item.parentItemKey ?? null,
      label: item.label,
      isProtected: item.isProtected ?? false,
    }));
  }
}

export interface OptionListSummary {
  listKey: string;
  label: string;
  parentKey: string | null;
  items: OptionItemData[];
}

// Counselor-only: every list, for the Manage Options page.
export async function listAllOptionLists(): Promise<OptionListSummary[]> {
  await counselorOnly();
  await Promise.all(Object.keys(OPTION_LIST_DEFAULTS).map(ensureSeeded));

  const lists = await db.optionList.findMany({
    include: { items: { orderBy: { sortOrder: "asc" } } },
    orderBy: { label: "asc" },
  });

  return lists.map((l) => ({
    listKey: l.listKey,
    label: l.label,
    parentKey: l.parentKey,
    items: l.items.map((i) => ({ id: i.id, itemKey: i.itemKey, parentItemKey: i.parentItemKey, label: i.label, isProtected: i.isProtected })),
  }));
}

// Counselor edits a list: reorders/renames/adds/removes plain items.
// Protected items must stay present with their itemKey unchanged (their
// label may change) - that's what keeps existing records and app logic
// correct after an edit.
export async function updateOptionList(
  listKey: string,
  items: { itemKey: string | null; parentItemKey?: string | null; label: string }[]
) {
  try {
    const me = await counselorOnly();
    const list = await db.optionList.findUnique({ where: { listKey }, include: { items: true } });
    if (!list) return { success: false, error: "That list doesn't exist." };

    const protectedKeys = list.items.filter((i) => i.isProtected).map((i) => i.itemKey);
    const newKeys = new Set(items.map((i) => i.itemKey).filter(Boolean));
    const missing = protectedKeys.filter((k) => !newKeys.has(k));
    if (missing.length > 0) return { success: false, error: `"${missing[0]}" can't be removed - it's used elsewhere in the system.` };

    const cleanItems = items.map((i) => ({ ...i, label: i.label.trim() })).filter((i) => i.label.length > 0);
    if (cleanItems.length === 0) return { success: false, error: "The list can't be empty." };

    await db.$transaction([
      db.optionItem.deleteMany({ where: { listId: list.id } }),
      db.optionItem.createMany({
        data: cleanItems.map((item, i) => ({
          listId: list.id,
          itemKey: item.itemKey,
          parentItemKey: item.parentItemKey ?? null,
          label: item.label,
          isProtected: list.items.find((old) => old.itemKey && old.itemKey === item.itemKey)?.isProtected ?? false,
          sortOrder: i,
        })),
      }),
      db.optionList.update({ where: { id: list.id }, data: { updatedAt: new Date() } }),
    ]);

    await logActivity(me, `Edited the "${list.label}" option list`, "OptionList", list.id, `${cleanItems.length} items`);
    return { success: true };
  } catch (error) {
    console.error("[optionLists] updateOptionList failed:", error);
    return { success: false, error: String(error) };
  }
}
