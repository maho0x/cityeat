import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { RestaurantEditor } from "@/components/admin/restaurant-editor";
import { db, schema } from "@/db";
import type { NewRestaurantPayload } from "@/db/schema";
import { getRestaurantForEdit } from "@/lib/admin-queries";

export default async function EditRestaurantPage(
  props: PageProps<"/admin/restaurants/[id]">,
) {
  const { id } = await props.params;
  const search = await props.searchParams;
  const areas = await db.select().from(schema.area).orderBy(schema.area.sort);
  const areaOptions = areas.map((a) => ({ id: a.id, name: a.nameZh }));

  if (id === "new") {
    // Optionally prefill from a "new restaurant" submission.
    let prefill: NewRestaurantPayload | null = null;
    if (typeof search.from === "string") {
      const sub = await db.query.submission.findFirst({
        where: eq(schema.submission.id, Number(search.from)),
      });
      if (sub?.type === "new_restaurant")
        prefill = sub.payload as NewRestaurantPayload;
    }
    return (
      <RestaurantEditor
        areas={areaOptions}
        initial={{
          slug: "",
          nameZh: prefill?.name ?? "",
          nameEn: "",
          areaId: prefill?.areaId ?? areas[0]?.id ?? 0,
          locationZh: prefill?.location ?? "",
          locationEn: "",
          tags: [],
          priceMin: null,
          priceMax: null,
          payment: [],
          phone: null,
          unverified: false,
          isActive: true,
          weekly: [],
        }}
        hint={
          prefill
            ? `${prefill.hours} ${prefill.price} ${prefill.note}`.trim()
            : undefined
        }
      />
    );
  }

  const r = await getRestaurantForEdit(Number(id));
  if (!r) notFound();
  return (
    <RestaurantEditor
      areas={areaOptions}
      initial={{
        id: r.id,
        slug: r.slug,
        nameZh: r.nameZh,
        nameEn: r.nameEn,
        areaId: r.areaId,
        locationZh: r.locationZh,
        locationEn: r.locationEn,
        tags: r.tags,
        priceMin: r.priceMin,
        priceMax: r.priceMax,
        payment: r.payment,
        phone: r.phone,
        unverified: r.unverified,
        isActive: r.isActive,
        weekly: r.hours.map((h) => ({
          weekday: h.weekday,
          opens: h.opens,
          closes: h.closes,
        })),
      }}
    />
  );
}
