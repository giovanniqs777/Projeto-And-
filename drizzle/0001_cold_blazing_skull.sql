CREATE TABLE "app_settings" (
	"key" text PRIMARY KEY NOT NULL,
	"value" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "appointments" (
	"id" text PRIMARY KEY NOT NULL,
	"cow_id" text,
	"calf_id" text,
	"kind" text NOT NULL,
	"date" text NOT NULL,
	"notes" text DEFAULT '' NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"source_key" text
);
--> statement-breakpoint
CREATE TABLE "calves" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"tag" text NOT NULL,
	"photo" text DEFAULT '' NOT NULL,
	"body_photo" text DEFAULT '' NOT NULL,
	"photo_frame" text DEFAULT '' NOT NULL,
	"body_frame" text DEFAULT '' NOT NULL,
	"mother_tag" text DEFAULT '' NOT NULL,
	"mother_name" text DEFAULT '' NOT NULL,
	"birth" text DEFAULT '' NOT NULL,
	"breed" text NOT NULL,
	"daily_milk" text DEFAULT '' NOT NULL,
	"weaning_date" text DEFAULT '' NOT NULL,
	"medicine_date" text DEFAULT '' NOT NULL,
	"medicine" text DEFAULT '' NOT NULL,
	"vaccination_date" text DEFAULT '' NOT NULL
);
--> statement-breakpoint
ALTER TABLE "cows" ADD COLUMN "feed_consumption" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "cows" ADD COLUMN "dry_off_date" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "events" ADD COLUMN "morning" double precision;--> statement-breakpoint
ALTER TABLE "events" ADD COLUMN "afternoon" double precision;--> statement-breakpoint
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_cow_id_cows_id_fk" FOREIGN KEY ("cow_id") REFERENCES "public"."cows"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_calf_id_calves_id_fk" FOREIGN KEY ("calf_id") REFERENCES "public"."calves"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "appointments_date" ON "appointments" USING btree ("date");--> statement-breakpoint
CREATE UNIQUE INDEX "appointments_source_unique" ON "appointments" USING btree ("source_key");--> statement-breakpoint
CREATE UNIQUE INDEX "calves_tag_unique" ON "calves" USING btree ("tag");