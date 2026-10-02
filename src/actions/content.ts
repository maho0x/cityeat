"use server";

import { and, eq } from "drizzle-orm";
import { refresh } from "next/cache";
import { z } from "zod";
import { db, schema } from "@/db";
import { ActionFail, action, imageIds } from "@/lib/action";
import { rateLimit } from "@/lib/rate-limit";
import { ownsUploads } from "@/lib/upload";

async function limit(key: string, max: number) {
  if (!(await rateLimit(key, max))) throw new ActionFail("RATE_LIMITED");
}

async function checkImages(userId: string, ids: string[]) {
  if (!(await ownsUploads(userId, ids))) throw new ActionFail("BAD_IMAGES");
}

/* ───────── Reviews ───────── */

export const saveReview = action(
  z.object({
    restaurantId: z.number().int().positive(),
    rating: z.number().int().min(1).max(5),
    content: z.string().trim().max(2000),
    images: imageIds,
    anonymous: z.boolean(),
  }),
  async (input, viewer) => {
    await limit(`review:${viewer.id}`, 20);
    await checkImages(viewer.id, input.images);
    const values = { ...input, userId: viewer.id };
    await db
      .insert(schema.review)
      .values(values)
      .onConflictDoUpdate({
        target: [schema.review.restaurantId, schema.review.userId],
        set: {
          rating: input.rating,
          content: input.content,
          images: input.images,
          anonymous: input.anonymous,
          hidden: false,
          updatedAt: new Date(),
        },
      });
    refresh();
    return null;
  },
);

export const deleteReview = action(
  z.object({ id: z.number().int() }),
  async ({ id }, viewer) => {
    const where = viewer.isAdmin
      ? eq(schema.review.id, id)
      : and(eq(schema.review.id, id), eq(schema.review.userId, viewer.id));
    await db.delete(schema.review).where(where);
    refresh();
    return null;
  },
);

export const toggleLike = action(
  z.object({ reviewId: z.number().int() }),
  async ({ reviewId }, viewer) => {
    const deleted = await db
      .delete(schema.reviewLike)
      .where(
        and(
          eq(schema.reviewLike.reviewId, reviewId),
          eq(schema.reviewLike.userId, viewer.id),
        ),
      )
      .returning();
    if (deleted.length === 0) {
      await db
        .insert(schema.reviewLike)
        .values({ reviewId, userId: viewer.id })
        .onConflictDoNothing();
    }
    return { liked: deleted.length === 0 };
  },
);

export const addReply = action(
  z.object({
    reviewId: z.number().int(),
    content: z.string().trim().min(1).max(500),
    anonymous: z.boolean(),
  }),
  async (input, viewer) => {
    await limit(`reply:${viewer.id}`, 60);
    const target = await db.query.review.findFirst({
      where: eq(schema.review.id, input.reviewId),
      with: { restaurant: { columns: { slug: true } } },
    });
    if (!target || target.hidden) throw new ActionFail("NOT_FOUND");
    await db.insert(schema.reviewReply).values({ ...input, userId: viewer.id });
    if (target.userId !== viewer.id) {
      await db.insert(schema.notification).values({
        userId: target.userId,
        data: {
          kind: "reply",
          reviewId: target.id,
          restaurantSlug: target.restaurant.slug,
          by: input.anonymous ? "" : viewer.name,
        },
      });
    }
    refresh();
    return null;
  },
);

export const deleteReply = action(
  z.object({ id: z.number().int() }),
  async ({ id }, viewer) => {
    const where = viewer.isAdmin
      ? eq(schema.reviewReply.id, id)
      : and(
          eq(schema.reviewReply.id, id),
          eq(schema.reviewReply.userId, viewer.id),
        );
    await db.delete(schema.reviewReply).where(where);
    refresh();
    return null;
  },
);

/* ───────── Menus ───────── */

export const createMenu = action(
  z.object({
    restaurantId: z.number().int().positive(),
    images: imageIds.min(1),
    note: z.string().trim().max(300),
  }),
  async (input, viewer) => {
    await limit(`menu:${viewer.id}`, 20);
    await checkImages(viewer.id, input.images);
    await db.insert(schema.menu).values({ ...input, userId: viewer.id });
    refresh();
    return null;
  },
);

export const voteMenu = action(
  z.object({ menuId: z.number().int(), accurate: z.boolean().nullable() }),
  async ({ menuId, accurate }, viewer) => {
    const key = and(
      eq(schema.menuVote.menuId, menuId),
      eq(schema.menuVote.userId, viewer.id),
    );
    if (accurate === null) {
      await db.delete(schema.menuVote).where(key);
    } else {
      await db
        .insert(schema.menuVote)
        .values({ menuId, userId: viewer.id, accurate })
        .onConflictDoUpdate({
          target: [schema.menuVote.menuId, schema.menuVote.userId],
          set: { accurate },
        });
    }
    refresh();
    return null;
  },
);

export const deleteMenu = action(
  z.object({ id: z.number().int() }),
  async ({ id }, viewer) => {
    const where = viewer.isAdmin
      ? eq(schema.menu.id, id)
      : and(eq(schema.menu.id, id), eq(schema.menu.userId, viewer.id));
    await db.delete(schema.menu).where(where);
    refresh();
    return null;
  },
);

/* ───────── Favourites & reports ───────── */

export const toggleFavorite = action(
  z.object({ restaurantId: z.number().int() }),
  async ({ restaurantId }, viewer) => {
    const deleted = await db
      .delete(schema.favorite)
      .where(
        and(
          eq(schema.favorite.restaurantId, restaurantId),
          eq(schema.favorite.userId, viewer.id),
        ),
      )
      .returning();
    if (deleted.length === 0) {
      await db
        .insert(schema.favorite)
        .values({ restaurantId, userId: viewer.id })
        .onConflictDoNothing();
    }
    return { favorite: deleted.length === 0 };
  },
);

export const createReport = action(
  z.object({
    targetType: z.enum(["review", "reply", "menu"]),
    targetId: z.number().int(),
    reason: z.string().trim().min(1).max(500),
  }),
  async (input, viewer) => {
    await limit(`report:${viewer.id}`, 30);
    await db.insert(schema.report).values({ ...input, userId: viewer.id });
    return null;
  },
);

/* ───────── Submissions (reviewed by admins) ───────── */

const period = z
  .object({
    opens: z.number().int().min(0).max(1440),
    closes: z.number().int().min(1).max(2880),
  })
  .refine((p) => p.opens < p.closes);
const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

const submissionInput = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("hours_change"),
    restaurantId: z.number().int().positive(),
    images: imageIds,
    payload: z
      .object({
        kind: z.enum(["temporary", "permanent"]),
        startDate: isoDate.optional(),
        endDate: isoDate.optional(),
        closed: z.boolean().optional(),
        periods: z.array(period).max(4).optional(),
        weekly: z.record(z.string(), z.array(period).max(4)).optional(),
        note: z.string().trim().max(500),
      })
      .refine((p) =>
        p.kind === "permanent"
          ? !!p.weekly
          : !!p.startDate && !!p.endDate && p.startDate <= p.endDate,
      ),
  }),
  z.object({
    type: z.literal("info_correction"),
    restaurantId: z.number().int().positive(),
    images: imageIds,
    payload: z.object({
      field: z.enum(["name", "location", "price", "tags", "other"]),
      value: z.string().trim().min(1).max(500),
      note: z.string().trim().max(500),
    }),
  }),
  z.object({
    type: z.literal("new_restaurant"),
    images: imageIds,
    payload: z.object({
      name: z.string().trim().min(1).max(100),
      areaId: z.number().int().positive(),
      location: z.string().trim().min(1).max(200),
      hours: z.string().trim().max(300),
      price: z.string().trim().max(50),
      note: z.string().trim().max(500),
    }),
  }),
]);

export const createSubmission = action(
  submissionInput,
  async (input, viewer) => {
    await limit(`submission:${viewer.id}`, 20);
    await checkImages(viewer.id, input.images);
    await db.insert(schema.submission).values({
      type: input.type,
      restaurantId: "restaurantId" in input ? input.restaurantId : null,
      payload: input.payload,
      images: input.images,
      userId: viewer.id,
    });
    return null;
  },
);

/* ───────── Profile ───────── */

export const updateName = action(
  z.object({ name: z.string().trim().min(1).max(30) }),
  async ({ name }, viewer) => {
    await db
      .update(schema.user)
      .set({ name })
      .where(eq(schema.user.id, viewer.id));
    refresh();
    return null;
  },
);

export const markNotificationsRead = action(z.object({}), async (_, viewer) => {
  await db
    .update(schema.notification)
    .set({ readAt: new Date() })
    .where(eq(schema.notification.userId, viewer.id));
  refresh();
  return null;
});
