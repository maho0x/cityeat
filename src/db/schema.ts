import { relations, sql } from "drizzle-orm";
import {
  boolean,
  check,
  date,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  serial,
  smallint,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
};

/* ───────────────────────── Better Auth ───────────────────────── */

export const userRole = pgEnum("user_role", ["user", "admin"]);

export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").notNull().default(false),
  image: text("image"),
  role: userRole("role").notNull().default("user"),
  banned: boolean("banned").notNull().default(false),
  ...timestamps,
});

export const session = pgTable(
  "session",
  {
    id: text("id").primaryKey(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    token: text("token").notNull().unique(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    ...timestamps,
  },
  (t) => [index("session_user_idx").on(t.userId)],
);

export const account = pgTable("account", {
  id: text("id").primaryKey(),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  idToken: text("id_token"),
  accessTokenExpiresAt: timestamp("access_token_expires_at", {
    withTimezone: true,
  }),
  refreshTokenExpiresAt: timestamp("refresh_token_expires_at", {
    withTimezone: true,
  }),
  scope: text("scope"),
  password: text("password"),
  ...timestamps,
});

export const verification = pgTable(
  "verification",
  {
    id: text("id").primaryKey(),
    identifier: text("identifier").notNull(),
    value: text("value").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    ...timestamps,
  },
  (t) => [index("verification_identifier_idx").on(t.identifier)],
);

/* ───────────────────────── Places ───────────────────────── */

export const area = pgTable("area", {
  id: serial("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  nameZh: text("name_zh").notNull(),
  nameEn: text("name_en").notNull(),
  sort: smallint("sort").notNull().default(0),
});

export const restaurant = pgTable(
  "restaurant",
  {
    id: serial("id").primaryKey(),
    slug: text("slug").notNull().unique(),
    nameZh: text("name_zh").notNull(),
    nameEn: text("name_en").notNull(),
    areaId: integer("area_id")
      .notNull()
      .references(() => area.id),
    locationZh: text("location_zh").notNull().default(""),
    locationEn: text("location_en").notNull().default(""),
    /** Free-form tags, e.g. "canteen", "cafe", "halal", "vegetarian". */
    tags: text("tags").array().notNull().default(sql`'{}'::text[]`),
    /** Rough price per person in HKD. */
    priceMin: smallint("price_min"),
    priceMax: smallint("price_max"),
    payment: text("payment").array().notNull().default(sql`'{}'::text[]`),
    coverImage: text("cover_image"),
    phone: text("phone"),
    /** Shown on the page until a user confirms the seeded info. */
    unverified: boolean("unverified").notNull().default(false),
    isActive: boolean("is_active").notNull().default(true),
    ...timestamps,
  },
  (t) => [index("restaurant_area_idx").on(t.areaId)],
);

/**
 * Weekly opening periods. `weekday` 0–6 is Sunday–Saturday, 7 means public
 * holidays. Times are minutes since midnight; `closes` may exceed 1440 for
 * periods that run past midnight. A day with no rows is closed.
 */
export const openingHours = pgTable(
  "opening_hours",
  {
    id: serial("id").primaryKey(),
    restaurantId: integer("restaurant_id")
      .notNull()
      .references(() => restaurant.id, { onDelete: "cascade" }),
    weekday: smallint("weekday").notNull(),
    opens: smallint("opens").notNull(),
    closes: smallint("closes").notNull(),
  },
  (t) => [
    index("opening_hours_restaurant_idx").on(t.restaurantId),
    check("weekday_range", sql`${t.weekday} between 0 and 7`),
    check("period_order", sql`${t.opens} < ${t.closes}`),
  ],
);

export type Period = { opens: number; closes: number };

/**
 * Date-ranged exception to the weekly hours. `restaurantId` null applies to
 * every restaurant (e.g. typhoon, campus-wide holiday). When `closed` is
 * false, `periods` replaces the normal hours on those dates.
 */
export const hoursOverride = pgTable(
  "hours_override",
  {
    id: serial("id").primaryKey(),
    restaurantId: integer("restaurant_id").references(() => restaurant.id, {
      onDelete: "cascade",
    }),
    startDate: date("start_date").notNull(),
    endDate: date("end_date").notNull(),
    closed: boolean("closed").notNull().default(true),
    periods: jsonb("periods").$type<Period[]>(),
    note: text("note").notNull().default(""),
    createdBy: text("created_by").references(() => user.id, {
      onDelete: "set null",
    }),
    ...timestamps,
  },
  (t) => [index("hours_override_dates_idx").on(t.startDate, t.endDate)],
);

export const publicHoliday = pgTable("public_holiday", {
  date: date("date").primaryKey(),
  nameZh: text("name_zh").notNull(),
  nameEn: text("name_en").notNull(),
});

/* ───────────────────────── User content ───────────────────────── */

export const upload = pgTable("upload", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  width: integer("width").notNull(),
  height: integer("height").notNull(),
  createdAt: timestamps.createdAt,
});

export const menu = pgTable(
  "menu",
  {
    id: serial("id").primaryKey(),
    restaurantId: integer("restaurant_id")
      .notNull()
      .references(() => restaurant.id, { onDelete: "cascade" }),
    userId: text("user_id").references(() => user.id, {
      onDelete: "set null",
    }),
    images: text("images").array().notNull(),
    note: text("note").notNull().default(""),
    hidden: boolean("hidden").notNull().default(false),
    createdAt: timestamps.createdAt,
  },
  (t) => [index("menu_restaurant_idx").on(t.restaurantId, t.createdAt)],
);

export const menuVote = pgTable(
  "menu_vote",
  {
    menuId: integer("menu_id")
      .notNull()
      .references(() => menu.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    accurate: boolean("accurate").notNull(),
  },
  (t) => [primaryKey({ columns: [t.menuId, t.userId] })],
);

export const review = pgTable(
  "review",
  {
    id: serial("id").primaryKey(),
    restaurantId: integer("restaurant_id")
      .notNull()
      .references(() => restaurant.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    rating: smallint("rating").notNull(),
    content: text("content").notNull().default(""),
    images: text("images").array().notNull().default(sql`'{}'::text[]`),
    anonymous: boolean("anonymous").notNull().default(false),
    hidden: boolean("hidden").notNull().default(false),
    ...timestamps,
  },
  (t) => [
    uniqueIndex("review_one_per_user").on(t.restaurantId, t.userId),
    check("rating_range", sql`${t.rating} between 1 and 5`),
  ],
);

export const reviewReply = pgTable(
  "review_reply",
  {
    id: serial("id").primaryKey(),
    reviewId: integer("review_id")
      .notNull()
      .references(() => review.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    content: text("content").notNull(),
    anonymous: boolean("anonymous").notNull().default(false),
    hidden: boolean("hidden").notNull().default(false),
    createdAt: timestamps.createdAt,
  },
  (t) => [index("review_reply_review_idx").on(t.reviewId)],
);

export const reviewLike = pgTable(
  "review_like",
  {
    reviewId: integer("review_id")
      .notNull()
      .references(() => review.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
  },
  (t) => [primaryKey({ columns: [t.reviewId, t.userId] })],
);

export const favorite = pgTable(
  "favorite",
  {
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    restaurantId: integer("restaurant_id")
      .notNull()
      .references(() => restaurant.id, { onDelete: "cascade" }),
    createdAt: timestamps.createdAt,
  },
  (t) => [primaryKey({ columns: [t.userId, t.restaurantId] })],
);

/* ───────────────────────── Moderation ───────────────────────── */

export const submissionType = pgEnum("submission_type", [
  "new_restaurant",
  "hours_change",
  "info_correction",
]);
export const submissionStatus = pgEnum("submission_status", [
  "pending",
  "approved",
  "rejected",
]);

export type HoursChangePayload = {
  kind: "temporary" | "permanent";
  /** temporary: affected dates */
  startDate?: string;
  endDate?: string;
  closed?: boolean;
  /** permanent: new weekly hours, keyed by weekday 0–7 */
  weekly?: Record<string, Period[]>;
  periods?: Period[];
  note: string;
};
export type InfoCorrectionPayload = {
  field: "name" | "location" | "price" | "tags" | "other";
  value: string;
  note: string;
};
export type NewRestaurantPayload = {
  name: string;
  areaId: number;
  location: string;
  hours: string;
  price: string;
  note: string;
};

export const submission = pgTable(
  "submission",
  {
    id: serial("id").primaryKey(),
    type: submissionType("type").notNull(),
    restaurantId: integer("restaurant_id").references(() => restaurant.id, {
      onDelete: "cascade",
    }),
    userId: text("user_id").references(() => user.id, {
      onDelete: "set null",
    }),
    payload: jsonb("payload")
      .$type<
        HoursChangePayload | InfoCorrectionPayload | NewRestaurantPayload
      >()
      .notNull(),
    images: text("images").array().notNull().default(sql`'{}'::text[]`),
    status: submissionStatus("status").notNull().default("pending"),
    reviewerId: text("reviewer_id").references(() => user.id, {
      onDelete: "set null",
    }),
    reviewNote: text("review_note"),
    reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
    createdAt: timestamps.createdAt,
  },
  (t) => [index("submission_status_idx").on(t.status, t.createdAt)],
);

export const reportTarget = pgEnum("report_target", [
  "review",
  "reply",
  "menu",
]);
export const reportStatus = pgEnum("report_status", [
  "open",
  "resolved",
  "dismissed",
]);

export const report = pgTable(
  "report",
  {
    id: serial("id").primaryKey(),
    targetType: reportTarget("target_type").notNull(),
    targetId: integer("target_id").notNull(),
    userId: text("user_id").references(() => user.id, {
      onDelete: "set null",
    }),
    reason: text("reason").notNull(),
    status: reportStatus("status").notNull().default("open"),
    createdAt: timestamps.createdAt,
  },
  (t) => [index("report_status_idx").on(t.status)],
);

export type NotificationData =
  | { kind: "reply"; reviewId: number; restaurantSlug: string; by: string }
  | {
      kind: "submission";
      submissionId: number;
      status: "approved" | "rejected";
      note: string | null;
    }
  | { kind: "removed"; target: "review" | "reply" | "menu" };

export const notification = pgTable(
  "notification",
  {
    id: serial("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    data: jsonb("data").$type<NotificationData>().notNull(),
    readAt: timestamp("read_at", { withTimezone: true }),
    createdAt: timestamps.createdAt,
  },
  (t) => [index("notification_user_idx").on(t.userId, t.createdAt)],
);

export const announcement = pgTable("announcement", {
  id: serial("id").primaryKey(),
  titleZh: text("title_zh").notNull(),
  titleEn: text("title_en").notNull(),
  bodyZh: text("body_zh").notNull().default(""),
  bodyEn: text("body_en").notNull().default(""),
  active: boolean("active").notNull().default(true),
  ...timestamps,
});

/** Fixed-window counters for per-user rate limits. */
export const rateLimit = pgTable(
  "rate_limit",
  {
    key: text("key").notNull(),
    windowStart: timestamp("window_start", { withTimezone: true }).notNull(),
    count: integer("count").notNull().default(0),
  },
  (t) => [primaryKey({ columns: [t.key, t.windowStart] })],
);

/* ───────────────────────── Relations ───────────────────────── */

export const areaRelations = relations(area, ({ many }) => ({
  restaurants: many(restaurant),
}));

export const restaurantRelations = relations(restaurant, ({ one, many }) => ({
  area: one(area, { fields: [restaurant.areaId], references: [area.id] }),
  hours: many(openingHours),
  overrides: many(hoursOverride),
  menus: many(menu),
  reviews: many(review),
}));

export const openingHoursRelations = relations(openingHours, ({ one }) => ({
  restaurant: one(restaurant, {
    fields: [openingHours.restaurantId],
    references: [restaurant.id],
  }),
}));

export const hoursOverrideRelations = relations(hoursOverride, ({ one }) => ({
  restaurant: one(restaurant, {
    fields: [hoursOverride.restaurantId],
    references: [restaurant.id],
  }),
}));

export const menuRelations = relations(menu, ({ one, many }) => ({
  restaurant: one(restaurant, {
    fields: [menu.restaurantId],
    references: [restaurant.id],
  }),
  user: one(user, { fields: [menu.userId], references: [user.id] }),
  votes: many(menuVote),
}));

export const menuVoteRelations = relations(menuVote, ({ one }) => ({
  menu: one(menu, { fields: [menuVote.menuId], references: [menu.id] }),
}));

export const reviewRelations = relations(review, ({ one, many }) => ({
  restaurant: one(restaurant, {
    fields: [review.restaurantId],
    references: [restaurant.id],
  }),
  user: one(user, { fields: [review.userId], references: [user.id] }),
  replies: many(reviewReply),
  likes: many(reviewLike),
}));

export const reviewReplyRelations = relations(reviewReply, ({ one }) => ({
  review: one(review, {
    fields: [reviewReply.reviewId],
    references: [review.id],
  }),
  user: one(user, { fields: [reviewReply.userId], references: [user.id] }),
}));

export const reviewLikeRelations = relations(reviewLike, ({ one }) => ({
  review: one(review, {
    fields: [reviewLike.reviewId],
    references: [review.id],
  }),
}));

export const submissionRelations = relations(submission, ({ one }) => ({
  restaurant: one(restaurant, {
    fields: [submission.restaurantId],
    references: [restaurant.id],
  }),
  user: one(user, { fields: [submission.userId], references: [user.id] }),
}));
