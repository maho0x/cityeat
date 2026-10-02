import { getLocale } from "next-intl/server";
import { RestaurantBrowser } from "@/components/restaurant/browser";
import { Announcement } from "@/components/site/announcement";
import {
  getActiveAnnouncement,
  getAreas,
  getHolidays,
  listRestaurants,
} from "@/lib/queries";
import { getViewer } from "@/lib/session";

export default async function HomePage() {
  const locale = await getLocale();
  const viewer = await getViewer();
  const [restaurants, areas, holidays, announcement] = await Promise.all([
    listRestaurants(locale, viewer),
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
        areas={usedAreas}
        holidays={holidays}
        serverNow={Date.now()}
      />
    </>
  );
}
