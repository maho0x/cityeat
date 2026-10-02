"use server";

import { and, eq, ne } from "drizzle-orm";
import { refresh } from "next/cache";
import { z } from "zod";
import { db, schema } from "@/db";
import type { HoursChangePayload } from "@/db/schema";
import { ActionFail, action } from "@/lib/action";
import { parseOrderUrl } from "@/lib/menu-sync/parse-url";
import { syncSource } from "@/lib/menu-sync/sync";

const admin = { admin: true } as const;
const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const period = z
  .object({
    opens: z.number().int().min(0).max(1440),
    closes: z.number().int().min(1).max(2880),
  })
  .refine((p) => p.opens < p.closes);

/** Replace a restaurant's weekly hours; keys are weekday 0–7. */
async function replaceWeekly(
  restaurantId: number,
  weekly: Record<string, { opens: number; closes: number }[]>,
) {
  await db.transaction(async (tx) => {
    await tx
      .delete(schema.openingHours)
      .where(eq(schema.openingHours.restaurantId, restaurantId));
    const rows = Object.entries(weekly).flatMap(([day, periods]) =>
      periods.map((p) => ({ restaurantId, weekday: Number(day), ...p })),
    );
    if (rows.length) await tx.insert(schema.openingHours).values(rows);
  });
}

/* ───────── Submissions ───────── */

export const reviewSubmission = action(
  z.object({
    id: z.number().int(),
    approve: z.boolean(),
    note: z.string().trim().max(500).optional(),
  }),
  async ({ id, approve, note }, viewer) => {
    const sub = await db.query.submission.findFirst({
      where: eq(schema.submission.id, id),
    });
    if (!sub || sub.status !== "pending") throw new ActionFail("NOT_FOUND");

    // Approving an hours change applies it immediately. Other types are
    // applied by hand in the restaurant editor.
    if (approve && sub.type === "hours_change" && sub.restaurantId) {
      const p = sub.payload as HoursChangePayload;
      if (p.kind === "permanent" && p.weekly) {
        await replaceWeekly(sub.restaurantId, p.weekly);
      } else if (p.startDate && p.endDate) {
        await db.insert(schema.hoursOverride).values({
          restaurantId: sub.restaurantId,
          startDate: p.startDate,
          endDate: p.endDate,
          closed: p.closed ?? true,
          periods: p.closed ? null : (p.periods ?? null),
          note: p.note,
          createdBy: viewer.id,
        });
      }
    }

    await db
      .update(schema.submission)
      .set({
        status: approve ? "approved" : "rejected",
        reviewerId: viewer.id,
        reviewNote: note || null,
        reviewedAt: new Date(),
      })
      .where(eq(schema.submission.id, id));
    if (sub.userId) {
      await db.insert(schema.notification).values({
        userId: sub.userId,
        data: {
          kind: "submission",
          submissionId: id,
          status: approve ? "approved" : "rejected",
          note: note || null,
        },
      });
    }
    refresh();
    return null;
  },
  admin,
);

/* ───────── Restaurants ───────── */

const restaurantInput = z.object({
  id: z.number().int().optional(),
  slug: z
    .string()
    .trim()
    .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/)
    .max(60),
  nameZh: z.string().trim().min(1).max(100),
  nameEn: z.string().trim().min(1).max(100),
  areaId: z.number().int().positive(),
  locationZh: z.string().trim().max(200),
  locationEn: z.string().trim().max(200),
  tags: z.array(z.string().trim().min(1).max(30)).max(10),
  priceMin: z.number().int().min(0).max(2000).nullable(),
  priceMax: z.number().int().min(0).max(2000).nullable(),
  payment: z.array(z.string()).max(12),
  phone: z.string().trim().max(30).nullable(),
  unverified: z.boolean(),
  isActive: z.boolean(),
  weekly: z.record(z.string().regex(/^[0-7]$/), z.array(period).max(4)),
});

export const saveRestaurant = action(
  restaurantInput,
  async ({ id, weekly, ...values }) => {
    const clash = await db.query.restaurant.findFirst({
      where: id
        ? and(
            eq(schema.restaurant.slug, values.slug),
            ne(schema.restaurant.id, id),
          )
        : eq(schema.restaurant.slug, values.slug),
    });
    if (clash) throw new ActionFail("INVALID");

    let restaurantId = id;
    if (id) {
      await db
        .update(schema.restaurant)
        .set(values)
        .where(eq(schema.restaurant.id, id));
    } else {
      const [row] = await db
        .insert(schema.restaurant)
        .values(values)
        .returning({ id: schema.restaurant.id });
      restaurantId = row.id;
    }
    await replaceWeekly(restaurantId as number, weekly);
    refresh();
    return { id: restaurantId as number, slug: values.slug };
  },
  admin,
);

/* ───────── Overrides ───────── */

export const createOverride = action(
  z
    .object({
      restaurantId: z.number().int().nullable(),
      startDate: isoDate,
      endDate: isoDate,
      closed: z.boolean(),
      periods: z.array(period).max(4).nullable(),
      note: z.string().trim().max(300),
    })
    .refine((o) => o.startDate <= o.endDate)
    .refine((o) => o.closed || (o.periods?.length ?? 0) > 0),
  async (input, viewer) => {
    await db.insert(schema.hoursOverride).values({
      ...input,
      periods: input.closed ? null : input.periods,
      createdBy: viewer.id,
    });
    refresh();
    return null;
  },
  admin,
);

export const deleteOverride = action(
  z.object({ id: z.number().int() }),
  async ({ id }) => {
    await db
      .delete(schema.hoursOverride)
      .where(eq(schema.hoursOverride.id, id));
    refresh();
    return null;
  },
  admin,
);

/* ───────── Ordering-platform menus ───────── */

/** Add an online-ordering link and fetch its menu straight away. */
export const addMenuSource = action(
  z.object({ restaurantId: z.number().int(), url: z.string().trim().max(500) }),
  async ({ restaurantId, url }) => {
    const store = parseOrderUrl(url);
    // Only Aigens can be synced so far; Qmai needs a logged-in token.
    if (store?.platform !== "aigens") throw new ActionFail("INVALID");
    const [source] = await db
      .insert(schema.menuSource)
      .values({ ...store, restaurantId, url })
      .onConflictDoNothing()
      .returning();
    if (!source) throw new ActionFail("INVALID");
    const result = await syncSource(source);
    refresh();
    return result;
  },
  admin,
);

export const syncMenuSource = action(
  z.object({ id: z.number().int() }),
  async ({ id }) => {
    const source = await db.query.menuSource.findFirst({
      where: eq(schema.menuSource.id, id),
    });
    if (!source) throw new ActionFail("NOT_FOUND");
    const result = await syncSource(source);
    refresh();
    return result;
  },
  admin,
);

export const setMenuSourceEnabled = action(
  z.object({ id: z.number().int(), enabled: z.boolean() }),
  async ({ id, enabled }) => {
    await db
      .update(schema.menuSource)
      .set({ enabled })
      .where(eq(schema.menuSource.id, id));
    refresh();
    return null;
  },
  admin,
);

export const deleteMenuSource = action(
  z.object({ id: z.number().int() }),
  async ({ id }) => {
    await db.delete(schema.menuSource).where(eq(schema.menuSource.id, id));
    refresh();
    return null;
  },
  admin,
);

/* ───────── Reports ───────── */

const TARGET_TABLE = {
  review: schema.review,
  reply: schema.reviewReply,
  menu: schema.menu,
} as const;

export const resolveReport = action(
  z.object({ id: z.number().int(), removeContent: z.boolean() }),
  async ({ id, removeContent }) => {
    const report = await db.query.report.findFirst({
      where: eq(schema.report.id, id),
    });
    if (!report) throw new ActionFail("NOT_FOUND");
    if (removeContent) {
      const table = TARGET_TABLE[report.targetType];
      const [hidden] = await db
        .update(table)
        .set({ hidden: true })
        .where(eq(table.id, report.targetId))
        .returning({ userId: table.userId });
      if (hidden?.userId) {
        await db.insert(schema.notification).values({
          userId: hidden.userId,
          data: { kind: "removed", target: report.targetType },
        });
      }
    }
    // Close every open report on the same target.
    await db
      .update(schema.report)
      .set({ status: removeContent ? "resolved" : "dismissed" })
      .where(
        and(
          eq(schema.report.targetType, report.targetType),
          eq(schema.report.targetId, report.targetId),
          eq(schema.report.status, "open"),
        ),
      );
    refresh();
    return null;
  },
  admin,
);

/* ───────── Announcements ───────── */

export const saveAnnouncement = action(
  z.object({
    id: z.number().int().optional(),
    titleZh: z.string().trim().min(1).max(100),
    titleEn: z.string().trim().max(100),
    bodyZh: z.string().trim().max(1000),
    bodyEn: z.string().trim().max(1000),
    active: z.boolean(),
  }),
  async ({ id, ...values }) => {
    if (id) {
      await db
        .update(schema.announcement)
        .set(values)
        .where(eq(schema.announcement.id, id));
    } else {
      await db.insert(schema.announcement).values(values);
    }
    refresh();
    return null;
  },
  admin,
);

export const deleteAnnouncement = action(
  z.object({ id: z.number().int() }),
  async ({ id }) => {
    await db.delete(schema.announcement).where(eq(schema.announcement.id, id));
    refresh();
    return null;
  },
  admin,
);

/* ───────── Users ───────── */

export const setUserBanned = action(
  z.object({ userId: z.string(), banned: z.boolean() }),
  async ({ userId, banned }, viewer) => {
    if (userId === viewer.id) throw new ActionFail("INVALID");
    await db
      .update(schema.user)
      .set({ banned })
      .where(eq(schema.user.id, userId));
    if (banned) {
      await db.delete(schema.session).where(eq(schema.session.userId, userId));
    }
    refresh();
    return null;
  },
  admin,
);
