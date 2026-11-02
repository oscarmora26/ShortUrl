import {
  bigint,
  bigserial,
  index,
  inet,
  pgTable,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

/**
 * S1/T2: one row per short link.
 *
 * `code` is the public identifier (7 chars from `[0-9A-Za-z]`, never a
 * reserved word). `disabled_at` implements the soft delete of S8 so that
 * historical clicks survive.
 */
export const links = pgTable("links", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  code: text("code").notNull().unique(),
  targetUrl: text("target_url").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
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

export type LinkRow = typeof links.$inferSelect;
export type NewLinkRow = typeof links.$inferInsert;
export type ClickRow = typeof clicks.$inferSelect;
