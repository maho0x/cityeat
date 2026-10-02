import { getLocale, getTranslations } from "next-intl/server";
import { ContributePicker } from "@/components/site/contribute-picker";
import { listRestaurants } from "@/lib/queries";

export async function generateMetadata() {
  const t = await getTranslations("contribute");
  return { title: t("title") };
}

export default async function ContributePage() {
  const locale = await getLocale();
  const restaurants = await listRestaurants(locale, null);
  return (
    <ContributePicker
      restaurants={restaurants.map((r) => ({
        slug: r.slug,
        name: r.name,
        altName: r.altName,
        location: r.location || r.areaName,
      }))}
    />
  );
}
