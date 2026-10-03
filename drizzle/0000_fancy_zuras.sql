CREATE TABLE "cows" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"tag" text NOT NULL,
	"breed" text NOT NULL,
	"birth" text DEFAULT '' NOT NULL,
	"status" text NOT NULL,
	"father" text DEFAULT '' NOT NULL,
	"mother" text DEFAULT '' NOT NULL,
	"notes" text DEFAULT '' NOT NULL,
	"photo" text DEFAULT '' NOT NULL,
	"body_photo" text DEFAULT '' NOT NULL,
	"milk_production" text DEFAULT '' NOT NULL,
	"calvings" text DEFAULT '' NOT NULL,
	"last_calving" text DEFAULT '' NOT NULL,
	"insemination" text DEFAULT '' NOT NULL,
	"expected_calving" text DEFAULT '' NOT NULL,
	"last_exam" text DEFAULT '' NOT NULL,
	"exam_result" text DEFAULT '' NOT NULL,
	"medicine" text DEFAULT '' NOT NULL,
	"medicine_date" text DEFAULT '' NOT NULL,
	"age" text DEFAULT '' NOT NULL,
	"photo_frame" text DEFAULT '' NOT NULL,
	"body_frame" text DEFAULT '' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "events" (
	"id" text PRIMARY KEY NOT NULL,
	"cow_id" text NOT NULL,
	"kind" text NOT NULL,
	"date" text NOT NULL,
	"value" double precision,
	"result" text DEFAULT '' NOT NULL,
	"notes" text DEFAULT '' NOT NULL,
	"due" text DEFAULT '' NOT NULL,
	"withdrawal" text DEFAULT '' NOT NULL
);
--> statement-breakpoint
ALTER TABLE "events" ADD CONSTRAINT "events_cow_id_cows_id_fk" FOREIGN KEY ("cow_id") REFERENCES "public"."cows"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "cows_tag_unique" ON "cows" USING btree ("tag");--> statement-breakpoint
CREATE INDEX "events_cow_date" ON "events" USING btree ("cow_id","date");