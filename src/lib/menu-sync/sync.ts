import { and, eq, isNull, lt, or } from "drizzle-orm";
import { db, schema } from "@/db";
import { aigensMenuUrl, parseAigensMenu } from "./aigens";
import type { ParsedMenu } from "./types";

type Source = typeof schema.menuSource.$inferSelect;

const { menuSource, menuItem } = schema;

async function fetchMenu(source: Source): Promise<ParsedMenu> {
  if (source.platform !== "aigens") {
    throw new Error(`${source.platform} sync is not supported yet`);
  }
  const res = await fetch(aigensMenuUrl(source.storeId), {
    headers: { "User-Agent": "Mozilla/5.0 (compatible; cityeat-menu-sync)" },
    signal: AbortSignal.timeout(30_000),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return parseAigensMenu(await res.json());
}

/**
 * Fetch one source and replace its items. Failures (including an empty menu)
 * only record `lastError`, so a platform outage never wipes the mirror.
 */
export async function syncSource(source: Source) {
  const now = new Date();
  try {
    const menu = await fetchMenu(source);
    if (menu.items.length === 0) throw new Error("Menu has no items");
    await db.transaction(async (tx) => {
      await tx.delete(menuItem).where(eq(menuItem.sourceId, source.id));
      await tx
        .insert(menuItem)
        .values(menu.items.map((item) => ({ ...item, sourceId: source.id })));
      await tx
        .update(menuSource)
        .set({
          storeNameZh: menu.storeName.zh,
          storeNameEn: menu.storeName.en,
          lastSyncedAt: now,
          lastAttemptAt: now,
          lastError: null,
          itemCount: menu.items.length,
        })
        .where(eq(menuSource.id, source.id));
    });
    return { ok: true as const, items: menu.items.length };
  } catch (e) {
    const error = (e instanceof Error ? e.message : String(e)).slice(0, 500);
    await db
      .update(menuSource)
      .set({ lastAttemptAt: now, lastError: error })
      .where(eq(menuSource.id, source.id));
    return { ok: false as const, error };
  }
}

/** Enabled sources not attempted within `intervalMs`. */
export function dueSources(intervalMs: number) {
  return db
    .select()
    .from(menuSource)
    .where(
      and(
        eq(menuSource.enabled, true),
        or(
          isNull(menuSource.lastAttemptAt),
          lt(menuSource.lastAttemptAt, new Date(Date.now() - intervalMs)),
        ),
      ),
    )
    .orderBy(menuSource.lastAttemptAt);
}
