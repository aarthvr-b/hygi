import { sql } from "drizzle-orm";
import {
  check,
  date,
  foreignKey,
  integer,
  pgPolicy,
  pgTable,
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
