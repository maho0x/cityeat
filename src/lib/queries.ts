import "server-only";
import { and, desc, eq, gte, inArray, isNull, or, sql } from "drizzle-orm";
import { cache } from "react";
import { db, schema } from "@/db";
import { type Locale, pick } from "@/i18n/config";
import { addDays, hkClock, type Override, type WeeklyPeriod } from "./hours";
import { menuPriceRange } from "./menu-sync/price";
import type { Dish } from "./search";
import type { Viewer } from "./session";
import { imageUrl } from "./upload";

const {
  area,
  restaurant,
  openingHours,
  hoursOverride,
  publicHoliday,
  review,
  menu,
  favorite,
} = schema;

export type Schedule = {
  weekly: WeeklyPeriod[];
  overrides: Override[];
};

export type RestaurantSummary = Schedule & {
  id: number;
  slug: string;
  name: string;
  altName: string;
  areaSlug: string;
  areaName: string;
  location: string;
  tags: string[];
  priceMin: number | null;
  priceMax: number | null;
  rating: number | null;
  reviewCount: number;
  cover: string | null;
  favorite: boolean;
};

export type AreaOption = { slug: string; name: string };

export const getAreas = cache(async (locale: Locale): Promise<AreaOption[]> => {
  const rows = await db.select().from(area).orderBy(area.sort);
  return rows.map((a) => ({ slug: a.slug, name: pick(a, "name", locale) }));
});

/** Holidays from a week ago to two months ahead, enough for status checks. */
export const getHolidays = cache(async (): Promise<string[]> => {
  const today = hkClock(new Date()).date;
  const rows = await db
    .select({ date: publicHoliday.date })
    .from(publicHoliday)
    .where(
      and(
        gte(publicHoliday.date, addDays(today, -7)),
        sql`${publicHoliday.date} <= ${addDays(today, 60)}`,
      ),
    );
  return rows.map((r) => r.date);
});

/** Overrides that touch the next week, keyed by restaurant (null = campus). */
async function getActiveOverrides(restaurantIds: number[]) {
  const today = hkClock(new Date()).date;
  const rows = await db
    .select()
    .from(hoursOverride)
    .where(
      and(
        gte(hoursOverride.endDate, addDays(today, -1)),
        sql`${hoursOverride.startDate} <= ${addDays(today, 8)}`,
        or(
          isNull(hoursOverride.restaurantId),
          restaurantIds.length
            ? inArray(hoursOverride.restaurantId, restaurantIds)
            : sql`false`,
        ),
      ),
    );
  return rows.map(
    (o): Override => ({
      restaurantId: o.restaurantId,
      startDate: o.startDate,
      endDate: o.endDate,
      closed: o.closed,
      periods: o.periods,
      note: o.note,
    }),
  );
}

function overridesFor(all: Override[], restaurantId: number) {
  return all.filter(
    (o) => o.restaurantId === null || o.restaurantId === restaurantId,
  );
}

async function getWeekly(restaurantIds: number[]) {
  if (restaurantIds.length === 0) return new Map<number, WeeklyPeriod[]>();
  const rows = await db
    .select()
    .from(openingHours)
    .where(inArray(openingHours.restaurantId, restaurantIds));
  const map = new Map<number, WeeklyPeriod[]>();
  for (const r of rows) {
    const list = map.get(r.restaurantId) ?? [];
    list.push({ weekday: r.weekday, opens: r.opens, closes: r.closes });
    map.set(r.restaurantId, list);
  }
  return map;
}

/**
 * Price ranges worked out from synced ordering menus, by restaurant. These
 * replace the stored (often estimated) priceMin/priceMax when present.
 */
export const getMenuPriceRanges = cache(async () => {
  const rows = await db
    .select({
      restaurantId: schema.menuSource.restaurantId,
      price: schema.menuItem.price,
    })
    .from(schema.menuItem)
    .innerJoin(
      schema.menuSource,
      eq(schema.menuSource.id, schema.menuItem.sourceId),
    )
    .where(eq(schema.menuSource.enabled, true));
  const prices = new Map<number, number[]>();
  for (const { restaurantId, price } of rows) {
    const list = prices.get(restaurantId) ?? [];
    list.push(price);
    prices.set(restaurantId, list);
  }
  const ranges = new Map<number, [number, number]>();
  for (const [id, list] of prices) {
    const range = menuPriceRange(list);
    if (range) ranges.set(id, range);
  }
  return ranges;
});

/**
 * Every synced dish, for searching by dish. The same dish listed twice at a
 * restaurant (several categories or counters) is kept once, preferring an
 * available copy.
 */
export const listDishes = cache(async (locale: Locale): Promise<Dish[]> => {
  const rows = await db
    .select({
      restaurantId: schema.menuSource.restaurantId,
      nameZh: schema.menuItem.nameZh,
      nameEn: schema.menuItem.nameEn,
      price: schema.menuItem.price,
      available: schema.menuItem.available,
    })
    .from(schema.menuItem)
    .innerJoin(
      schema.menuSource,
      eq(schema.menuSource.id, schema.menuItem.sourceId),
    )
    .where(eq(schema.menuSource.enabled, true))
    .orderBy(desc(schema.menuItem.available));
  const seen = new Set<string>();
  const dishes: Dish[] = [];
  for (const row of rows) {
    const key = `${row.restaurantId}|${row.nameZh}|${row.price}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const name = pick(row, "name", locale);
    const other = locale === "en" ? row.nameZh : row.nameEn;
    dishes.push({
      restaurantId: row.restaurantId,
      name,
      altName: other === name ? "" : other,
      price: row.price,
      available: row.available,
    });
  }
  return dishes;
});

export const listRestaurants = cache(
  async (
    locale: Locale,
    viewer: Viewer | null,
  ): Promise<RestaurantSummary[]> => {
    const rows = await db
      .select({
        r: restaurant,
        areaSlug: area.slug,
        areaZh: area.nameZh,
        areaEn: area.nameEn,
        areaSort: area.sort,
        rating: sql<
          string | null
        >`(select avg(${review.rating}) from ${review} where ${review.restaurantId} = ${restaurant.id} and not ${review.hidden})`,
        reviewCount: sql<number>`(select count(*)::int from ${review} where ${review.restaurantId} = ${restaurant.id} and not ${review.hidden})`,
        cover: sql<
          string | null
        >`(select ${menu.images}[1] from ${menu} where ${menu.restaurantId} = ${restaurant.id} and not ${menu.hidden} order by ${menu.createdAt} desc limit 1)`,
        favorite: viewer
          ? sql<boolean>`exists (select 1 from ${favorite} where ${favorite.restaurantId} = ${restaurant.id} and ${favorite.userId} = ${viewer.id})`
          : sql<boolean>`false`,
      })
      .from(restaurant)
      .innerJoin(area, eq(area.id, restaurant.areaId))
      .where(eq(restaurant.isActive, true))
      .orderBy(area.sort, restaurant.nameEn);

    const ids = rows.map((x) => x.r.id);
    const [weekly, overrides, menuPrices] = await Promise.all([
      getWeekly(ids),
      getActiveOverrides(ids),
      getMenuPriceRanges(),
    ]);

    return rows.map(({ r, ...x }) => ({
      id: r.id,
      slug: r.slug,
      name: pick(r, "name", locale),
      altName: locale === "en" ? r.nameZh : r.nameEn,
      areaSlug: x.areaSlug,
      areaName: locale === "en" ? x.areaEn : x.areaZh,
      location: pick(r, "location", locale),
      tags: r.tags,
      priceMin: menuPrices.get(r.id)?.[0] ?? r.priceMin,
      priceMax: menuPrices.get(r.id)?.[1] ?? r.priceMax,
      rating: x.rating === null ? null : Number(x.rating),
      reviewCount: x.reviewCount,
      cover: r.coverImage ?? (x.cover ? imageUrl(x.cover, "thumb") : null),
      favorite: x.favorite,
      weekly: weekly.get(r.id) ?? [],
      overrides: overridesFor(overrides, r.id),
    }));
  },
);

export async function getRestaurantBySlug(slug: string) {
  const r = await db.query.restaurant.findFirst({
    where: and(eq(restaurant.slug, slug), eq(restaurant.isActive, true)),
    with: { area: true },
  });
  if (!r) return null;
  const [weekly, overrides, menuPrices] = await Promise.all([
    getWeekly([r.id]),
    getActiveOverrides([r.id]),
    getMenuPriceRanges(),
  ]);
  const menuPrice = menuPrices.get(r.id);
  return {
    ...r,
    priceMin: menuPrice?.[0] ?? r.priceMin,
    priceMax: menuPrice?.[1] ?? r.priceMax,
    weekly: weekly.get(r.id) ?? [],
    overrides: overridesFor(overrides, r.id),
  };
}

export type MenuEntry = {
  id: number;
  images: string[];
  note: string;
  createdAt: Date;
  uploader: string | null;
  accurate: number;
  inaccurate: number;
  myVote: boolean | null;
  mine: boolean;
};

export async function getMenus(
  restaurantId: number,
  viewer: Viewer | null,
): Promise<MenuEntry[]> {
  const rows = await db
    .select({
      id: menu.id,
      images: menu.images,
      note: menu.note,
      createdAt: menu.createdAt,
      userId: menu.userId,
      uploader: schema.user.name,
      accurate: sql<number>`count(*) filter (where ${schema.menuVote.accurate})::int`,
      inaccurate: sql<number>`count(*) filter (where not ${schema.menuVote.accurate})::int`,
      myVote: viewer
        ? sql<
            boolean | null
          >`bool_or(${schema.menuVote.accurate}) filter (where ${schema.menuVote.userId} = ${viewer.id})`
        : sql<null>`null`,
    })
    .from(menu)
    .leftJoin(schema.user, eq(schema.user.id, menu.userId))
    .leftJoin(schema.menuVote, eq(schema.menuVote.menuId, menu.id))
    .where(and(eq(menu.restaurantId, restaurantId), eq(menu.hidden, false)))
    .groupBy(menu.id, schema.user.name)
    .orderBy(desc(menu.createdAt))
    .limit(20);
  return rows.map(({ userId, ...m }) => ({
    ...m,
    mine: !!viewer && userId === viewer.id,
  }));
}

export type OrderMenu = {
  id: number;
  name: string;
  url: string;
  syncedAt: Date;
  categories: {
    name: string;
    items: {
      id: number;
      name: string;
      altName: string;
      price: number;
      imageUrl: string | null;
      available: boolean;
    }[];
  }[];
};

/** Menus mirrored from online-ordering platforms, one per store. */
export async function getOrderMenus(
  restaurantId: number,
  locale: Locale,
): Promise<OrderMenu[]> {
  const sources = await db.query.menuSource.findMany({
    where: and(
      eq(schema.menuSource.restaurantId, restaurantId),
      eq(schema.menuSource.enabled, true),
    ),
    with: { items: { orderBy: schema.menuItem.sort } },
    orderBy: schema.menuSource.id,
  });
  return sources.flatMap((src) => {
    if (!src.lastSyncedAt || src.items.length === 0) return [];
    const categories = new Map<string, OrderMenu["categories"][number]>();
    for (const item of src.items) {
      const name = pick(item, "category", locale);
      let cat = categories.get(name);
      if (!cat) {
        cat = { name, items: [] };
        categories.set(name, cat);
      }
      const other = locale === "en" ? item.nameZh : item.nameEn;
      const own = pick(item, "name", locale);
      cat.items.push({
        id: item.id,
        name: own,
        altName: other === own ? "" : other,
        price: item.price,
        imageUrl: item.imageUrl,
        available: item.available,
      });
    }
    return [
      {
        id: src.id,
        name: pick(src, "storeName", locale),
        url: src.url,
        syncedAt: src.lastSyncedAt,
        categories: [...categories.values()],
      },
    ];
  });
}

export type ReviewEntry = {
  id: number;
  rating: number;
  content: string;
  images: string[];
  author: string | null;
  authorImage: string | null;
  mine: boolean;
  createdAt: Date;
  updatedAt: Date;
  likes: number;
  liked: boolean;
  replies: {
    id: number;
    content: string;
    author: string | null;
    mine: boolean;
    createdAt: Date;
  }[];
};

export type ReviewSort = "recent" | "top" | "high" | "low";

export async function getReviews(
  restaurantId: number,
  viewer: Viewer | null,
  sort: ReviewSort = "recent",
): Promise<ReviewEntry[]> {
  const likes = sql<number>`(select count(*)::int from ${schema.reviewLike} where ${schema.reviewLike.reviewId} = ${review.id})`;
  const order = {
    recent: [desc(review.createdAt)],
    top: [desc(likes), desc(review.createdAt)],
    high: [desc(review.rating), desc(review.createdAt)],
    low: [review.rating, desc(review.createdAt)],
  }[sort];

  const rows = await db
    .select({
      r: review,
      name: schema.user.name,
      image: schema.user.image,
      likes,
      liked: viewer
        ? sql<boolean>`exists (select 1 from ${schema.reviewLike} where ${schema.reviewLike.reviewId} = ${review.id} and ${schema.reviewLike.userId} = ${viewer.id})`
        : sql<boolean>`false`,
    })
    .from(review)
    .innerJoin(schema.user, eq(schema.user.id, review.userId))
    .where(and(eq(review.restaurantId, restaurantId), eq(review.hidden, false)))
    .orderBy(...order)
    .limit(100);

  const ids = rows.map((x) => x.r.id);
  const replies = ids.length
    ? await db
        .select({
          id: schema.reviewReply.id,
          reviewId: schema.reviewReply.reviewId,
          content: schema.reviewReply.content,
          anonymous: schema.reviewReply.anonymous,
          userId: schema.reviewReply.userId,
          name: schema.user.name,
          createdAt: schema.reviewReply.createdAt,
        })
        .from(schema.reviewReply)
        .innerJoin(schema.user, eq(schema.user.id, schema.reviewReply.userId))
        .where(
          and(
            inArray(schema.reviewReply.reviewId, ids),
            eq(schema.reviewReply.hidden, false),
          ),
        )
        .orderBy(schema.reviewReply.createdAt)
    : [];

  return rows.map(({ r, name, image, likes, liked }) => ({
    id: r.id,
    rating: r.rating,
    content: r.content,
    images: r.images,
    author: r.anonymous ? null : name,
    authorImage: r.anonymous ? null : image,
    mine: !!viewer && r.userId === viewer.id,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
    likes,
    liked,
    replies: replies
      .filter((p) => p.reviewId === r.id)
      .map((p) => ({
        id: p.id,
        content: p.content,
        author: p.anonymous ? null : p.name,
        mine: !!viewer && p.userId === viewer.id,
        createdAt: p.createdAt,
      })),
  }));
}

export async function getActiveAnnouncement(locale: Locale) {
  const a = await db.query.announcement.findFirst({
    where: eq(schema.announcement.active, true),
    orderBy: desc(schema.announcement.createdAt),
  });
  if (!a) return null;
  return {
    id: a.id,
    title: pick(a, "title", locale),
    body: pick(a, "body", locale),
  };
}

export async function getUnreadCount(userId: string) {
  const [row] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(schema.notification)
    .where(
      and(
        eq(schema.notification.userId, userId),
        isNull(schema.notification.readAt),
      ),
    );
  return row?.n ?? 0;
}

export async function isFavorite(userId: string, restaurantId: number) {
  const row = await db.query.favorite.findFirst({
    where: and(
      eq(favorite.userId, userId),
      eq(favorite.restaurantId, restaurantId),
    ),
  });
  return !!row;
}

export async function getMyPage(userId: string, locale: Locale) {
  const [favorites, reviews, submissions, notifications] = await Promise.all([
    db
      .select({
        slug: restaurant.slug,
        nameZh: restaurant.nameZh,
        nameEn: restaurant.nameEn,
      })
      .from(favorite)
      .innerJoin(restaurant, eq(restaurant.id, favorite.restaurantId))
      .where(eq(favorite.userId, userId))
      .orderBy(desc(favorite.createdAt)),
    db
      .select({
        id: review.id,
        rating: review.rating,
        content: review.content,
        createdAt: review.createdAt,
        slug: restaurant.slug,
        nameZh: restaurant.nameZh,
        nameEn: restaurant.nameEn,
      })
      .from(review)
      .innerJoin(restaurant, eq(restaurant.id, review.restaurantId))
      .where(eq(review.userId, userId))
      .orderBy(desc(review.createdAt)),
    db
      .select({
        id: schema.submission.id,
        type: schema.submission.type,
        status: schema.submission.status,
        reviewNote: schema.submission.reviewNote,
        createdAt: schema.submission.createdAt,
        nameZh: restaurant.nameZh,
        nameEn: restaurant.nameEn,
        payload: schema.submission.payload,
      })
      .from(schema.submission)
      .leftJoin(restaurant, eq(restaurant.id, schema.submission.restaurantId))
      .where(eq(schema.submission.userId, userId))
      .orderBy(desc(schema.submission.createdAt))
      .limit(30),
    db
      .select()
      .from(schema.notification)
      .where(eq(schema.notification.userId, userId))
      .orderBy(desc(schema.notification.createdAt))
      .limit(30),
  ]);
  const name = (r: { nameZh: string | null; nameEn: string | null }) =>
    (locale === "en" ? r.nameEn || r.nameZh : r.nameZh || r.nameEn) ?? "";
  return {
    favorites: favorites.map((f) => ({ slug: f.slug, name: name(f) })),
    reviews: reviews.map((r) => ({ ...r, name: name(r) })),
    submissions: submissions.map((s) => ({
      id: s.id,
      type: s.type,
      status: s.status,
      reviewNote: s.reviewNote,
      createdAt: s.createdAt,
      name:
        s.nameZh || s.nameEn
          ? name(s)
          : ((s.payload as { name?: string }).name ?? ""),
    })),
    notifications,
  };
}
