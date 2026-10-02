import { getLocale, getTranslations } from "next-intl/server";
import { Roulette } from "@/components/roulette/roulette";
import {
  getAreas,
  getHolidays,
  listDishes,
  listRestaurants,
} from "@/lib/queries";
import { getViewer } from "@/lib/session";

export async function generateMetadata() {
  const t = await getTranslations("nav");
  return { title: t("spin") };
}

export default async function SpinPage(props: PageProps<"/spin">) {
  const search = await props.searchParams;
  const locale = await getLocale();
  const viewer = await getViewer();
  const [restaurants, dishes, areas, holidays] = await Promise.all([
    listRestaurants(locale, viewer),
    listDishes(locale),
    getAreas(locale),
    getHolidays(),
  ]);
  const str = (v: unknown) => (typeof v === "string" ? v : "");
  return (
    <Roulette
      restaurants={restaurants}
      dishes={dishes}
      areas={areas.filter((a) =>
        restaurants.some((r) => r.areaSlug === a.slug),
      )}
      holidays={holidays}
      serverNow={Date.now()}
      initial={{
        // Open-only is on by default; ?open=0 turns it off.
        openOnly: str(search.open) !== "0",
        favOnly: str(search.fav) === "1",
        areas: str(search.area) ? str(search.area).split(",") : [],
        query: str(search.q),
      }}
    />
  );
}
