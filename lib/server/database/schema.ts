import { sql } from "drizzle-orm";
import {
  bigint,
  boolean,
  check,
  doublePrecision,
  index,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  smallint,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import type { RecordingKind } from "@/lib/domain/talk";

export const catalogState = pgTable(
  "catalog_state",
  {
    id: smallint("id").primaryKey().default(1),
    activeVersion: bigint("active_version", { mode: "number" }).notNull().default(0),
    talksEdition: text("talks_edition"),
    teachersEdition: text("teachers_edition"),
    lastSuccessfulRefreshAt: timestamp("last_successful_refresh_at", {
      withTimezone: true,
      mode: "date",
    }),
    refreshToken: uuid("refresh_token"),
    refreshStartedAt: timestamp("refresh_started_at", {
      withTimezone: true,
      mode: "date",
    }),
    retryAfter: timestamp("retry_after", { withTimezone: true, mode: "date" }),
    lastFailureAt: timestamp("last_failure_at", { withTimezone: true, mode: "date" }),
    lastFailureReason: text("last_failure_reason"),
  },
  (table) => [check("catalog_state_singleton", sql`${table.id} = 1`)],
);

export const catalogTalks = pgTable(
  "catalog_talks",
  {
    id: integer("id").primaryKey(),
    title: text("title").notNull(),
    description: text("description").notNull(),
    recordedAt: text("recorded_at"),
    durationMinutes: doublePrecision("duration_minutes"),
    recordingType: text("recording_type").notNull(),
    kind: text("kind").$type<RecordingKind>().notNull(),
    topicIds: jsonb("topic_ids").$type<string[]>().notNull(),
    teacherIds: integer("teacher_ids").array().notNull(),
    venueId: integer("venue_id"),
    retreatId: integer("retreat_id"),
    languageId: integer("language_id"),
    audioUrl: text("audio_url").notNull(),
    sourceUrl: text("source_url").notNull(),
    catalogVersion: bigint("catalog_version", { mode: "number" }).notNull(),
  },
  (table) => [index("catalog_talks_version_idx").on(table.catalogVersion)],
);

export const catalogTeachers = pgTable(
  "catalog_teachers",
  {
    id: integer("id").primaryKey(),
    name: text("name").notNull(),
    bio: text("bio").notNull(),
    website: text("website"),
    donationUrl: text("donation_url"),
    photoUrl: text("photo_url"),
    isPublic: boolean("is_public").notNull(),
    catalogVersion: bigint("catalog_version", { mode: "number" }).notNull(),
  },
  (table) => [index("catalog_teachers_version_idx").on(table.catalogVersion)],
);

export const catalogRemovals = pgTable(
  "catalog_removals",
  {
    resource: text("resource").$type<"talks" | "teachers">().notNull(),
    itemId: integer("item_id").notNull(),
    catalogVersion: bigint("catalog_version", { mode: "number" }).notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.resource, table.itemId] }),
    index("catalog_removals_version_idx").on(table.resource, table.catalogVersion),
  ],
);
