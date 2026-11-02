import { sql } from "drizzle-orm";
import {
  bigint,
  bigserial,
  index,
  inet,
  integer,
  pgTable,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

/**
 * S1/T2: one row per short link.
 *
 * `code` is the public identifier (7 chars from `[0-9A-Za-z]`, never a
 * reserved word). `disabled_at` implements the soft delete of S11 so that
 * historical clicks survive. `expires_at` implements the 30 day lifetime of
 * anonymous links (S4).
 */
export const links = pgTable("links", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  code: text("code").notNull().unique(),
  targetUrl: text("target_url").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  expiresAt: timestamp("expires_at", { withTimezone: true })
    .notNull()
    .default(sql`now() + interval '30 days'`),
  createdIp: inet("created_ip"),
  disabledAt: timestamp("disabled_at", { withTimezone: true }),
});

/**
 * S2/T2: one row per recorded click. Cascades with the link so deleting a
 * link never leaves orphan clicks.
 */
export const clicks = pgTable(
  "clicks",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    linkId: bigint("link_id", { mode: "number" })
      .notNull()
      .references(() => links.id, { onDelete: "cascade" }),
    clickedAt: timestamp("clicked_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("clicks_link_id_clicked_at_idx").on(table.linkId, table.clickedAt),
  ],
);

/**
 * S3: creation rate limit counter, one row per bucket (client IP).
 *
 * The row is updated with a single `INSERT ... ON CONFLICT DO UPDATE ...
 * RETURNING` so concurrent replicas cannot overspend the window and the count
 * survives redeploys.
 */
export const rateLimits = pgTable("rate_limits", {
  bucket: text("bucket").primaryKey(),
  windowStart: timestamp("window_start", { withTimezone: true })
    .notNull()
    .defaultNow(),
  count: integer("count").notNull().default(0),
});

export type LinkRow = typeof links.$inferSelect;
export type NewLinkRow = typeof links.$inferInsert;
export type ClickRow = typeof clicks.$inferSelect;
export type RateLimitRow = typeof rateLimits.$inferSelect;
