import { sql } from "drizzle-orm";
import {
  check,
  date,
  foreignKey,
  index,
  integer,
  pgEnum,
  pgPolicy,
  pgTable,
  smallint,
  text,
  timestamp,
  unique,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { authenticatedRole, authUid, authUsers } from "drizzle-orm/supabase";

// Tenant pattern (ADR-0003), followed by every hygienist-owned table:
//   * hygienist_id defaults to auth.uid() and references auth.users
//   * RLS enabled with a single policy: hygienist_id = auth.uid()
//   * unique (id, hygienist_id) so child tables can use composite FKs, which
//     make it impossible to reference another hygienist's rows.
const hygienistId = () =>
  uuid("hygienist_id")
    .notNull()
    .default(sql`auth.uid()`)
    .references(() => authUsers.id, { onDelete: "cascade" });

const ownedByHygienist = (table: string) =>
  pgPolicy(`hygienist owns ${table}`, {
    for: "all",
    to: authenticatedRole,
    using: sql`hygienist_id = ${authUid}`,
    withCheck: sql`hygienist_id = ${authUid}`,
  });

export const studios = pgTable(
  "studios",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    hygienistId: hygienistId(),
    name: text("name").notNull(),
    address: text("address"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    unique().on(t.id, t.hygienistId),
    check("studios_name_not_blank", sql`btrim(${t.name}) <> ''`),
    ownedByHygienist("studios"),
  ],
).enableRLS();

// A Service is never hard-deleted: archiving hides it from the catalog while
// keeping its price history (and, later, Shift Lines) intact.
export const services = pgTable(
  "services",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    hygienistId: hygienistId(),
    name: text("name").notNull(),
    archivedAt: timestamp("archived_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    unique().on(t.id, t.hygienistId),
    uniqueIndex("services_active_name_unique")
      .on(t.hygienistId, sql`lower(btrim(${t.name}))`)
      .where(sql`${t.archivedAt} is null`),
    check("services_name_not_blank", sql`btrim(${t.name}) <> ''`),
    ownedByHygienist("services"),
  ],
).enableRLS();

// Each entry is valid from valid_from until the next entry's valid_from for
// the same (Studio, Service), so validity ranges cannot overlap by construction.
export const studioServicePrices = pgTable(
  "studio_service_prices",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    hygienistId: hygienistId(),
    studioId: uuid("studio_id").notNull(),
    serviceId: uuid("service_id").notNull(),
    priceCents: integer("price_cents").notNull(),
    validFrom: date("valid_from").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    unique().on(t.studioId, t.serviceId, t.validFrom),
    foreignKey({
      columns: [t.studioId, t.hygienistId],
      foreignColumns: [studios.id, studios.hygienistId],
    }).onDelete("cascade"),
    foreignKey({
      columns: [t.serviceId, t.hygienistId],
      foreignColumns: [services.id, services.hygienistId],
    }).onDelete("cascade"),
    check("studio_service_prices_price_not_negative", sql`${t.priceCents} >= 0`),
    ownedByHygienist("studio_service_prices"),
  ],
).enableRLS();

export const timeOfDay = pgEnum("time_of_day", ["am", "pm", "full_day"]);

// The anchor date is the Template's first occurrence: it fixes both the
// weekday and, for intervals over a week, which weeks the Template falls on.
// generated_through is how far the generation job has materialized Shifts
// (ADR-0001). It only moves forward, so a Shift she deleted or moved is never
// generated again.
export const shiftTemplates = pgTable(
  "shift_templates",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    hygienistId: hygienistId(),
    studioId: uuid("studio_id").notNull(),
    // ISO weekday: 1 = Monday ... 7 = Sunday.
    weekday: smallint("weekday").notNull(),
    timeOfDay: timeOfDay("time_of_day").notNull(),
    intervalWeeks: integer("interval_weeks").notNull(),
    anchorDate: date("anchor_date").notNull(),
    generatedThrough: date("generated_through"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    unique().on(t.id, t.hygienistId),
    foreignKey({
      columns: [t.studioId, t.hygienistId],
      foreignColumns: [studios.id, studios.hygienistId],
    }).onDelete("cascade"),
    check("shift_templates_interval_at_least_one_week", sql`${t.intervalWeeks} >= 1`),
    check(
      "shift_templates_anchor_falls_on_weekday",
      sql`extract(isodow from ${t.anchorDate}) = ${t.weekday}`,
    ),
    ownedByHygienist("shift_templates"),
  ],
).enableRLS();

// A Shift is independent of its Template once generated (ADR-0001):
// template_id is provenance only, and is null for a one-off Shift.
// A Shift is Planned until closed_at is set, which close_shift does when it
// writes the Shift's Lines.
export const shifts = pgTable(
  "shifts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    hygienistId: hygienistId(),
    studioId: uuid("studio_id").notNull(),
    templateId: uuid("template_id"),
    date: date("date").notNull(),
    timeOfDay: timeOfDay("time_of_day").notNull(),
    closedAt: timestamp("closed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    unique().on(t.id, t.hygienistId),
    foreignKey({
      columns: [t.studioId, t.hygienistId],
      foreignColumns: [studios.id, studios.hygienistId],
    }).onDelete("cascade"),
    // The migration narrows this to SET NULL (template_id), which Drizzle
    // can't express, so losing a Template never nulls the Shift's hygienist_id.
    foreignKey({
      columns: [t.templateId, t.hygienistId],
      foreignColumns: [shiftTemplates.id, shiftTemplates.hygienistId],
    }).onDelete("set null"),
    index("shifts_hygienist_date_idx").on(t.hygienistId, t.date),
    ownedByHygienist("shifts"),
  ],
).enableRLS();

// unit_price_cents is a snapshot of the Price List taken when the Shift was
// closed (ADR-0002): it is copied, never a reference to a Price List entry.
export const shiftLines = pgTable(
  "shift_lines",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    hygienistId: hygienistId(),
    shiftId: uuid("shift_id").notNull(),
    serviceId: uuid("service_id").notNull(),
    count: integer("count").notNull(),
    unitPriceCents: integer("unit_price_cents").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    unique().on(t.shiftId, t.serviceId),
    foreignKey({
      columns: [t.shiftId, t.hygienistId],
      foreignColumns: [shifts.id, shifts.hygienistId],
    }).onDelete("cascade"),
    foreignKey({
      columns: [t.serviceId, t.hygienistId],
      foreignColumns: [services.id, services.hygienistId],
    }).onDelete("cascade"),
    check("shift_lines_count_positive", sql`${t.count} > 0`),
    check("shift_lines_unit_price_not_negative", sql`${t.unitPriceCents} >= 0`),
    ownedByHygienist("shift_lines"),
  ],
).enableRLS();
