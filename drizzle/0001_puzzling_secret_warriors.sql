CREATE TYPE "public"."menu_platform" AS ENUM('aigens', 'qmai');--> statement-breakpoint
CREATE TABLE "menu_item" (
	"id" serial PRIMARY KEY NOT NULL,
	"source_id" integer NOT NULL,
	"external_id" text NOT NULL,
	"category_zh" text NOT NULL,
	"category_en" text NOT NULL,
	"name_zh" text NOT NULL,
	"name_en" text NOT NULL,
	"price" integer NOT NULL,
	"image_url" text,
	"available" boolean DEFAULT true NOT NULL,
	"sort" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "menu_source" (
	"id" serial PRIMARY KEY NOT NULL,
	"restaurant_id" integer NOT NULL,
	"platform" "menu_platform" NOT NULL,
	"store_id" text NOT NULL,
	"url" text NOT NULL,
	"store_name_zh" text DEFAULT '' NOT NULL,
	"store_name_en" text DEFAULT '' NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"last_synced_at" timestamp with time zone,
	"last_attempt_at" timestamp with time zone,
	"last_error" text,
	"item_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "menu_item" ADD CONSTRAINT "menu_item_source_id_menu_source_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."menu_source"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "menu_source" ADD CONSTRAINT "menu_source_restaurant_id_restaurant_id_fk" FOREIGN KEY ("restaurant_id") REFERENCES "public"."restaurant"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "menu_item_external" ON "menu_item" USING btree ("source_id","external_id");--> statement-breakpoint
CREATE UNIQUE INDEX "menu_source_store" ON "menu_source" USING btree ("platform","store_id");--> statement-breakpoint
CREATE INDEX "menu_source_restaurant_idx" ON "menu_source" USING btree ("restaurant_id");