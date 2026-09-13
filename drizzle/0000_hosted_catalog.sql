CREATE TABLE "catalog_removals" (
	"resource" text NOT NULL,
	"item_id" integer NOT NULL,
	"catalog_version" bigint NOT NULL,
	CONSTRAINT "catalog_removals_resource_item_id_pk" PRIMARY KEY("resource","item_id")
);
--> statement-breakpoint
CREATE TABLE "catalog_state" (
	"id" smallint PRIMARY KEY DEFAULT 1 NOT NULL,
	"active_version" bigint DEFAULT 0 NOT NULL,
	"talks_edition" text,
	"teachers_edition" text,
	"last_successful_refresh_at" timestamp with time zone,
	"refresh_token" uuid,
	"refresh_started_at" timestamp with time zone,
	"retry_after" timestamp with time zone,
	"last_failure_at" timestamp with time zone,
	"last_failure_reason" text,
	CONSTRAINT "catalog_state_singleton" CHECK ("catalog_state"."id" = 1)
);
--> statement-breakpoint
CREATE TABLE "catalog_talks" (
	"id" integer PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"recorded_at" text,
	"duration_minutes" double precision,
	"recording_type" text NOT NULL,
	"kind" text NOT NULL,
	"topic_ids" jsonb NOT NULL,
	"teacher_ids" integer[] NOT NULL,
	"venue_id" integer,
	"retreat_id" integer,
	"language_id" integer,
	"audio_url" text NOT NULL,
	"source_url" text NOT NULL,
	"catalog_version" bigint NOT NULL
);
--> statement-breakpoint
CREATE TABLE "catalog_teachers" (
	"id" integer PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"bio" text NOT NULL,
	"website" text,
	"donation_url" text,
	"photo_url" text,
	"is_public" boolean NOT NULL,
	"catalog_version" bigint NOT NULL
);
--> statement-breakpoint
CREATE INDEX "catalog_removals_version_idx" ON "catalog_removals" USING btree ("resource","catalog_version");--> statement-breakpoint
CREATE INDEX "catalog_talks_version_idx" ON "catalog_talks" USING btree ("catalog_version");--> statement-breakpoint
CREATE INDEX "catalog_teachers_version_idx" ON "catalog_teachers" USING btree ("catalog_version");--> statement-breakpoint
INSERT INTO "catalog_state" ("id") VALUES (1);
