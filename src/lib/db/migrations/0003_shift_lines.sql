CREATE TABLE "shift_lines" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"hygienist_id" uuid DEFAULT auth.uid() NOT NULL,
	"shift_id" uuid NOT NULL,
	"service_id" uuid NOT NULL,
	"count" integer NOT NULL,
	"unit_price_cents" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "shift_lines_shift_id_service_id_unique" UNIQUE("shift_id","service_id"),
	CONSTRAINT "shift_lines_count_positive" CHECK ("shift_lines"."count" > 0),
	CONSTRAINT "shift_lines_unit_price_not_negative" CHECK ("shift_lines"."unit_price_cents" >= 0)
);
--> statement-breakpoint
ALTER TABLE "shift_lines" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "shifts" ADD COLUMN "closed_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "shift_lines" ADD CONSTRAINT "shift_lines_hygienist_id_users_id_fk" FOREIGN KEY ("hygienist_id") REFERENCES "auth"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shift_lines" ADD CONSTRAINT "shift_lines_shift_id_hygienist_id_shifts_id_hygienist_id_fk" FOREIGN KEY ("shift_id","hygienist_id") REFERENCES "public"."shifts"("id","hygienist_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shift_lines" ADD CONSTRAINT "shift_lines_service_id_hygienist_id_services_id_hygienist_id_fk" FOREIGN KEY ("service_id","hygienist_id") REFERENCES "public"."services"("id","hygienist_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE POLICY "hygienist owns shift_lines" ON "shift_lines" AS PERMISSIVE FOR ALL TO "authenticated" USING (hygienist_id = (select auth.uid())) WITH CHECK (hygienist_id = (select auth.uid()));