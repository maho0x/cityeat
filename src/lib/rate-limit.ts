import "server-only";
import { sql } from "drizzle-orm";
import { db, schema } from "@/db";

const WINDOWS = { hour: 3600, day: 86400 } as const;

/**
 * Fixed-window counter. Returns false once `limit` hits within the window.
 * Counting and checking happen in one statement, so it is race-safe.
 */
export async function rateLimit(
  key: string,
  limit: number,
  window: keyof typeof WINDOWS = "day",
): Promise<boolean> {
  const seconds = WINDOWS[window];
  const start = new Date(
    Math.floor(Date.now() / 1000 / seconds) * seconds * 1000,
  );
  const [row] = await db
    .insert(schema.rateLimit)
    .values({ key, windowStart: start, count: 1 })
    .onConflictDoUpdate({
      target: [schema.rateLimit.key, schema.rateLimit.windowStart],
      set: { count: sql`${schema.rateLimit.count} + 1` },
    })
    .returning({ count: schema.rateLimit.count });
  return row.count <= limit;
}
