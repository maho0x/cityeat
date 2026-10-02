import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getLocale } from "next-intl/server";
import { RestaurantView } from "@/components/restaurant/view";
import { pick } from "@/i18n/config";
import {
  getHolidays,
  getMenus,
  getRestaurantBySlug,
  getReviews,
  isFavorite,
  type ReviewSort,
} from "@/lib/queries";
import { getViewer } from "@/lib/session";

const SORTS = new Set<ReviewSort>(["recent", "top", "high", "low"]);

export async function generateMetadata(
  props: PageProps<"/r/[slug]">,
): Promise<Metadata> {
  const { slug } = await props.params;
  const r = await getRestaurantBySlug(slug);
  if (!r) return {};
  const locale = await getLocale();
  return {
    title: pick(r, "name", locale),
    description: pick(r, "location", locale),
  };
}

export default async function RestaurantPage(props: PageProps<"/r/[slug]">) {
  const { slug } = await props.params;
  const search = await props.searchParams;
  const sortParam = String(search.sort ?? "recent") as ReviewSort;
  const sort = SORTS.has(sortParam) ? sortParam : "recent";

  const [r, viewer, locale, holidays] = await Promise.all([
    getRestaurantBySlug(slug),
    getViewer(),
    getLocale(),
    getHolidays(),
  ]);
  if (!r) notFound();

  const [menus, reviews, favorite] = await Promise.all([
    getMenus(r.id, viewer),
    getReviews(r.id, viewer, sort),
    viewer ? isFavorite(viewer.id, r.id) : false,
  ]);

  // Rating summary is computed over all visible reviews, not the sorted page.
  const distribution = [0, 0, 0, 0, 0];
  for (const rv of reviews) distribution[rv.rating - 1]++;
  const average = reviews.length
    ? reviews.reduce((s, rv) => s + rv.rating, 0) / reviews.length
    : null;

  return (
    <RestaurantView
      restaurant={{
        id: r.id,
        slug: r.slug,
        name: pick(r, "name", locale),
        altName: locale === "en" ? r.nameZh : r.nameEn,
        areaName: pick(r.area, "name", locale),
        location: pick(r, "location", locale),
        tags: r.tags,
        priceMin: r.priceMin,
        priceMax: r.priceMax,
        payment: r.payment,
        phone: r.phone,
        unverified: r.unverified,
        weekly: r.weekly,
        overrides: r.overrides,
      }}
      holidays={holidays}
      menus={menus}
      reviews={reviews}
      sort={sort}
      summary={{ average, distribution, count: reviews.length }}
      isFavorite={favorite}
      action={typeof search.action === "string" ? search.action : null}
      serverNow={Date.now()}
    />
  );
}
