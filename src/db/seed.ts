import "dotenv/config";
import { parseTime } from "@/lib/hours";
import { db, schema } from ".";
import { areas, holidays, restaurants } from "./seed-data/restaurants";

/** Idempotent: inserts missing rows only, never overwrites user edits. */
async function main() {
  await db
    .insert(schema.area)
    .values(areas.map((a, sort) => ({ ...a, sort })))
    .onConflictDoNothing();
  const areaRows = await db.select().from(schema.area);
  const areaId = new Map(areaRows.map((a) => [a.slug, a.id]));

  let created = 0;
  for (const r of restaurants) {
    const [row] = await db
      .insert(schema.restaurant)
      .values({
        slug: r.slug,
        nameZh: r.nameZh,
        nameEn: r.nameEn,
        areaId: areaId.get(r.area) ?? 0,
        locationZh: r.locationZh,
        locationEn: r.locationEn,
        tags: r.tags,
        priceMin: r.price[0],
        priceMax: r.price[1],
        payment: r.payment,
        phone: r.phone,
        unverified: true,
      })
      .onConflictDoNothing()
      .returning({ id: schema.restaurant.id });
    if (!row) continue;
    created++;
    const periods = Object.entries(r.hours).flatMap(([weekday, ranges]) =>
      (ranges ?? []).map(([o, c]) => ({
        restaurantId: row.id,
        weekday: Number(weekday),
        opens: parseTime(o) ?? 0,
        closes: parseTime(c) ?? 0,
      })),
    );
    if (periods.length) await db.insert(schema.openingHours).values(periods);
  }

  await db.insert(schema.publicHoliday).values(holidays).onConflictDoNothing();
  console.info(
    `Seeded: ${areas.length} areas, ${created} new restaurants, ${holidays.length} holidays`,
  );
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
