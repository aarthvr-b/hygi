import type { SupabaseClient } from "@supabase/supabase-js";
import { unwrap } from "./result";

// Dates are ISO calendar dates ("YYYY-MM-DD"), matching the Postgres `date` type.
export type PriceEntry = {
  id: string;
  serviceId: string;
  priceCents: number;
  validFrom: string;
  // Derived: the day before the next entry for the same Service starts.
  validUntil: string | null;
};

export type PriceInput = {
  studioId: string;
  serviceId: string;
  priceCents: number;
  validFrom: string;
};

type PriceRow = { id: string; service_id: string; price_cents: number; valid_from: string };

// Setting a Price again for the same start date corrects it rather than
// adding a second entry.
export async function setPrice(client: SupabaseClient, input: PriceInput): Promise<void> {
  unwrap(
    await client.from("studio_service_prices").upsert(
      {
        studio_id: input.studioId,
        service_id: input.serviceId,
        price_cents: input.priceCents,
        valid_from: input.validFrom,
      },
      { onConflict: "studio_id,service_id,valid_from" },
    ),
  );
}

export async function listPrices(client: SupabaseClient, studioId: string): Promise<PriceEntry[]> {
  const rows = unwrap<PriceRow[]>(
    await client
      .from("studio_service_prices")
      .select("id, service_id, price_cents, valid_from")
      .eq("studio_id", studioId)
      .order("service_id")
      .order("valid_from"),
  );

  return rows.map((row, i) => {
    const next = rows[i + 1];
    const hasSuccessor = next !== undefined && next.service_id === row.service_id;
    return {
      id: row.id,
      serviceId: row.service_id,
      priceCents: row.price_cents,
      validFrom: row.valid_from,
      validUntil: hasSuccessor ? dayBefore(next.valid_from) : null,
    };
  });
}

export function isInForce(entry: PriceEntry, on: string): boolean {
  return entry.validFrom <= on && (entry.validUntil === null || on <= entry.validUntil);
}

// The Price List lookup used when a Shift is closed (ADR-0002).
export async function priceInForce(
  client: SupabaseClient,
  query: { studioId: string; serviceId: string; on: string },
): Promise<number | null> {
  const row = unwrap<{ price_cents: number } | null>(
    await client
      .from("studio_service_prices")
      .select("price_cents")
      .eq("studio_id", query.studioId)
      .eq("service_id", query.serviceId)
      .lte("valid_from", query.on)
      .order("valid_from", { ascending: false })
      .limit(1)
      .maybeSingle(),
  );
  return row?.price_cents ?? null;
}

function dayBefore(isoDate: string): string {
  const date = new Date(`${isoDate}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() - 1);
  return date.toISOString().slice(0, 10);
}
