import { getLocale } from "next-intl/server";
import { RestaurantBrowser } from "@/components/restaurant/browser";
import { Announcement } from "@/components/site/announcement";
import {
  getActiveAnnouncement,
  getAreas,
  getHolidays,
  listDishes,
  listRestaurants,
} from "@/lib/queries";
import { getViewer } from "@/lib/session";

export default async function HomePage() {
  const locale = await getLocale();
  const viewer = await getViewer();
  const [restaurants, dishes, areas, holidays, announcement] =
    await Promise.all([
      listRestaurants(locale, viewer),
      listDishes(locale),
      getAreas(locale),
      getHolidays(),
      getActiveAnnouncement(locale),
    ]);
  const usedAreas = areas.filter((a) =>
    restaurants.some((r) => r.areaSlug === a.slug),
  );
  return (
    <>
      {announcement && <Announcement {...announcement} />}
      <RestaurantBrowser
        restaurants={restaurants}
        dishes={dishes}
        areas={usedAreas}
        holidays={holidays}
        serverNow={Date.now()}
      />
    </>
  );
}
