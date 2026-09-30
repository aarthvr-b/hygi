CREATE TABLE "services" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"hygienist_id" uuid DEFAULT auth.uid() NOT NULL,
	"name" text NOT NULL,
	"archived_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "services_id_hygienist_id_unique" UNIQUE("id","hygienist_id"),
	CONSTRAINT "services_name_not_blank" CHECK (btrim("services"."name") <> '')
);
--> statement-breakpoint
ALTER TABLE "services" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "studio_service_prices" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"hygienist_id" uuid DEFAULT auth.uid() NOT NULL,
	"studio_id" uuid NOT NULL,
	"service_id" uuid NOT NULL,
	"price_cents" integer NOT NULL,
	"valid_from" date NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "studio_service_prices_studio_id_service_id_valid_from_unique" UNIQUE("studio_id","service_id","valid_from"),
	CONSTRAINT "studio_service_prices_price_not_negative" CHECK ("studio_service_prices"."price_cents" >= 0)
);
--> statement-breakpoint
ALTER TABLE "studio_service_prices" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "studios" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"hygienist_id" uuid DEFAULT auth.uid() NOT NULL,
	"name" text NOT NULL,
	"address" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "studios_id_hygienist_id_unique" UNIQUE("id","hygienist_id"),
	CONSTRAINT "studios_name_not_blank" CHECK (btrim("studios"."name") <> '')
);
--> statement-breakpoint
ALTER TABLE "studios" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "services" ADD CONSTRAINT "services_hygienist_id_users_id_fk" FOREIGN KEY ("hygienist_id") REFERENCES "auth"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "studio_service_prices" ADD CONSTRAINT "studio_service_prices_hygienist_id_users_id_fk" FOREIGN KEY ("hygienist_id") REFERENCES "auth"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "studio_service_prices" ADD CONSTRAINT "studio_service_prices_studio_id_hygienist_id_studios_id_hygienist_id_fk" FOREIGN KEY ("studio_id","hygienist_id") REFERENCES "public"."studios"("id","hygienist_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "studio_service_prices" ADD CONSTRAINT "studio_service_prices_service_id_hygienist_id_services_id_hygienist_id_fk" FOREIGN KEY ("service_id","hygienist_id") REFERENCES "public"."services"("id","hygienist_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "studios" ADD CONSTRAINT "studios_hygienist_id_users_id_fk" FOREIGN KEY ("hygienist_id") REFERENCES "auth"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "services_active_name_unique" ON "services" USING btree ("hygienist_id",lower(btrim("name"))) WHERE "services"."archived_at" is null;--> statement-breakpoint
CREATE POLICY "hygienist owns services" ON "services" AS PERMISSIVE FOR ALL TO "authenticated" USING (hygienist_id = (select auth.uid())) WITH CHECK (hygienist_id = (select auth.uid()));--> statement-breakpoint
CREATE POLICY "hygienist owns studio_service_prices" ON "studio_service_prices" AS PERMISSIVE FOR ALL TO "authenticated" USING (hygienist_id = (select auth.uid())) WITH CHECK (hygienist_id = (select auth.uid()));--> statement-breakpoint
CREATE POLICY "hygienist owns studios" ON "studios" AS PERMISSIVE FOR ALL TO "authenticated" USING (hygienist_id = (select auth.uid())) WITH CHECK (hygienist_id = (select auth.uid()));