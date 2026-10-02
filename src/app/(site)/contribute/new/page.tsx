import { redirect } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { NewRestaurantForm } from "@/components/site/new-restaurant-form";
import { db, schema } from "@/db";
import { pick } from "@/i18n/config";
import { getViewer } from "@/lib/session";

export async function generateMetadata() {
  const t = await getTranslations("newForm");
  return { title: t("title") };
}

export default async function NewRestaurantPage() {
  if (!(await getViewer())) redirect("/login?next=/contribute/new");
  const locale = await getLocale();
  const areas = await db.select().from(schema.area).orderBy(schema.area.sort);
  return (
    <NewRestaurantForm
      areas={areas.map((a) => ({ id: a.id, name: pick(a, "name", locale) }))}
    />
  );
}
