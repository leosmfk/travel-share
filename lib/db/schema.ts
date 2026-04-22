import { pgTable, text, timestamp, doublePrecision, integer } from "drizzle-orm/pg-core";

export const points = pgTable("points", {
  id: text("id").primaryKey(),
  lat: doublePrecision("lat").notNull(),
  lng: doublePrecision("lng").notNull(),
  title: text("title"),
  description: text("description"),
  author: text("author"),
  photoKey: text("photo_key").notNull(),
  photoWidth: integer("photo_width"),
  photoHeight: integer("photo_height"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export type Point = typeof points.$inferSelect;
export type NewPoint = typeof points.$inferInsert;
