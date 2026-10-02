CREATE TYPE "public"."time_of_day" AS ENUM('am', 'pm', 'full_day');--> statement-breakpoint
CREATE TABLE "shift_templates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"hygienist_id" uuid DEFAULT auth.uid() NOT NULL,
	"studio_id" uuid NOT NULL,
	"weekday" smallint NOT NULL,
	"time_of_day" time_of_day NOT NULL,
	"interval_weeks" integer NOT NULL,
	"anchor_date" date NOT NULL,
	"generated_through" date,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "shift_templates_id_hygienist_id_unique" UNIQUE("id","hygienist_id"),
	CONSTRAINT "shift_templates_interval_at_least_one_week" CHECK ("shift_templates"."interval_weeks" >= 1),
	CONSTRAINT "shift_templates_anchor_falls_on_weekday" CHECK (extract(isodow from "shift_templates"."anchor_date") = "shift_templates"."weekday")
);
--> statement-breakpoint
ALTER TABLE "shift_templates" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "shifts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"hygienist_id" uuid DEFAULT auth.uid() NOT NULL,
	"studio_id" uuid NOT NULL,
	"template_id" uuid,
	"date" date NOT NULL,
	"time_of_day" time_of_day NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "shifts_id_hygienist_id_unique" UNIQUE("id","hygienist_id")
);
--> statement-breakpoint
ALTER TABLE "shifts" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "shift_templates" ADD CONSTRAINT "shift_templates_hygienist_id_users_id_fk" FOREIGN KEY ("hygienist_id") REFERENCES "auth"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shift_templates" ADD CONSTRAINT "shift_templates_studio_id_hygienist_id_studios_id_hygienist_id_fk" FOREIGN KEY ("studio_id","hygienist_id") REFERENCES "public"."studios"("id","hygienist_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shifts" ADD CONSTRAINT "shifts_hygienist_id_users_id_fk" FOREIGN KEY ("hygienist_id") REFERENCES "auth"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shifts" ADD CONSTRAINT "shifts_studio_id_hygienist_id_studios_id_hygienist_id_fk" FOREIGN KEY ("studio_id","hygienist_id") REFERENCES "public"."studios"("id","hygienist_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shifts" ADD CONSTRAINT "shifts_template_id_hygienist_id_shift_templates_id_hygienist_id_fk" FOREIGN KEY ("template_id","hygienist_id") REFERENCES "public"."shift_templates"("id","hygienist_id") ON DELETE set null ("template_id") ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "shifts_hygienist_date_idx" ON "shifts" USING btree ("hygienist_id","date");--> statement-breakpoint
CREATE POLICY "hygienist owns shift_templates" ON "shift_templates" AS PERMISSIVE FOR ALL TO "authenticated" USING (hygienist_id = (select auth.uid())) WITH CHECK (hygienist_id = (select auth.uid()));--> statement-breakpoint
CREATE POLICY "hygienist owns shifts" ON "shifts" AS PERMISSIVE FOR ALL TO "authenticated" USING (hygienist_id = (select auth.uid())) WITH CHECK (hygienist_id = (select auth.uid()));