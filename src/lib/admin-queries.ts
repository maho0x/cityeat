import "server-only";
import { desc, eq, gte, inArray, sql } from "drizzle-orm";
import { db, schema } from "@/db";
import { hkClock } from "./hours";

const { submission, restaurant, user, report, area } = schema;

export async function getPendingSubmissions() {
  return db
    .select({
      s: submission,
      restaurantName: restaurant.nameZh,
      restaurantSlug: restaurant.slug,
      userName: user.name,
      userEmail: user.email,
    })
    .from(submission)
    .leftJoin(restaurant, eq(restaurant.id, submission.restaurantId))
    .leftJoin(user, eq(user.id, submission.userId))
    .where(eq(submission.status, "pending"))
    .orderBy(submission.createdAt);
}

export async function getOpenReports() {
  const rows = await db
    .select({ r: report, reporter: user.email })
    .from(report)
    .leftJoin(user, eq(user.id, report.userId))
    .where(eq(report.status, "open"))
    .orderBy(desc(report.createdAt));

  // Load the reported content so admins can judge without clicking through.
  const ids = (type: "review" | "reply" | "menu") =>
    rows.filter((x) => x.r.targetType === type).map((x) => x.r.targetId);
  const [reviews, replies, menus] = await Promise.all([
    ids("review").length
      ? db
          .select({
            id: schema.review.id,
            text: schema.review.content,
            userId: schema.review.userId,
            images: schema.review.images,
          })
          .from(schema.review)
          .where(inArray(schema.review.id, ids("review")))
      : [],
    ids("reply").length
      ? db
          .select({
            id: schema.reviewReply.id,
            text: schema.reviewReply.content,
            userId: schema.reviewReply.userId,
          })
          .from(schema.reviewReply)
          .where(inArray(schema.reviewReply.id, ids("reply")))
      : [],
    ids("menu").length
      ? db
          .select({
            id: schema.menu.id,
            text: schema.menu.note,
            userId: schema.menu.userId,
            images: schema.menu.images,
          })
          .from(schema.menu)
          .where(inArray(schema.menu.id, ids("menu")))
      : [],
  ]);
  const lookup = { review: reviews, reply: replies, menu: menus };
  return rows.map(({ r, reporter }) => {
    const target = (
      lookup[r.targetType] as {
        id: number;
        text: string;
        userId: string | null;
        images?: string[];
      }[]
    ).find((x) => x.id === r.targetId);
    return { ...r, reporter, target: target ?? null };
  });
}

export async function getAdminRestaurants() {
  return db
    .select({
      id: restaurant.id,
      slug: restaurant.slug,
      nameZh: restaurant.nameZh,
      nameEn: restaurant.nameEn,
      isActive: restaurant.isActive,
      unverified: restaurant.unverified,
      area: area.nameZh,
    })
    .from(restaurant)
    .innerJoin(area, eq(area.id, restaurant.areaId))
    .orderBy(area.sort, restaurant.nameEn);
}

export async function getRestaurantForEdit(id: number) {
  const r = await db.query.restaurant.findFirst({
    where: eq(restaurant.id, id),
    with: { hours: true },
  });
  return r ?? null;
}

export async function getUpcomingOverrides() {
  const today = hkClock(new Date()).date;
  return db
    .select({ o: schema.hoursOverride, restaurantName: restaurant.nameZh })
    .from(schema.hoursOverride)
    .leftJoin(restaurant, eq(restaurant.id, schema.hoursOverride.restaurantId))
    .where(gte(schema.hoursOverride.endDate, today))
    .orderBy(schema.hoursOverride.startDate);
}

export async function getAnnouncements() {
  return db
    .select()
    .from(schema.announcement)
    .orderBy(desc(schema.announcement.createdAt));
}

export async function getAdminCounts() {
  const [row] = await db
    .select({
      pending: sql<number>`(select count(*)::int from ${submission} where ${submission.status} = 'pending')`,
      reports: sql<number>`(select count(*)::int from ${report} where ${report.status} = 'open')`,
    })
    .from(sql`(select 1) as one`);
  return row;
}

export async function getMenuSources() {
  return db
    .select({
      source: schema.menuSource,
      restaurantName: restaurant.nameZh,
    })
    .from(schema.menuSource)
    .innerJoin(restaurant, eq(restaurant.id, schema.menuSource.restaurantId))
    .orderBy(restaurant.nameZh, schema.menuSource.id);
}
