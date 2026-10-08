import type { SupabaseClient } from "@supabase/supabase-js";
import { unwrap } from "@/lib/onboarding/result";
import type { TimeOfDay } from "./shifts";

// How many of a Service were done on a Shift.
export type ServiceCount = {
  serviceId: string;
  count: number;
};

export type ShiftLine = {
  serviceId: string;
  serviceName: string;
  count: number;
  // The Price List snapshot taken when the Shift was closed (ADR-0002).
  unitPriceCents: number;
};

type ShiftLineRow = {
  service_id: string;
  count: number;
  unit_price_cents: number;
  services: { name: string };
};

// Closes a Planned Shift, or corrects a Closed one: Services already on the
// Shift keep the price they were closed with, new ones take the Price in force
// on the Shift's date, and a count of zero takes the Service off the Shift.
export async function closeShift(
  client: SupabaseClient,
  shiftId: string,
  counts: ServiceCount[],
): Promise<void> {
  unwrap(
    await client.rpc("close_shift", {
      p_shift_id: shiftId,
      p_counts: counts.map(({ serviceId, count }) => ({ service_id: serviceId, count })),
    }),
  );
}

export async function listShiftLines(client: SupabaseClient, shiftId: string): Promise<ShiftLine[]> {
  const rows = unwrap<ShiftLineRow[]>(
    await client
      .from("shift_lines")
      .select("service_id, count, unit_price_cents, services(name)")
      .eq("shift_id", shiftId)
      .order("services(name)")
      .overrideTypes<ShiftLineRow[], { merge: false }>(),
  );
  return rows.map((row) => ({
    serviceId: row.service_id,
    serviceName: row.services.name,
    count: row.count,
    unitPriceCents: row.unit_price_cents,
  }));
}

// How many Closed Shifts the usual mix looks back over.
const USUAL_MIX_SHIFTS = 5;

// What a Shift at this Studio usually looks like, to pre-fill the counters
// when closing one: each Service's average count over the Studio's most
// recent Closed Shifts at the same time of day (a full day isn't a morning).
// Services that round to none are left out.
export async function usualMix(
  client: SupabaseClient,
  shift: { studioId: string; timeOfDay: TimeOfDay },
): Promise<ServiceCount[]> {
  const recent = unwrap<{ shift_lines: { service_id: string; count: number }[] }[]>(
    await client
      .from("shifts")
      .select("shift_lines(service_id, count)")
      .eq("studio_id", shift.studioId)
      .eq("time_of_day", shift.timeOfDay)
      .not("closed_at", "is", null)
      .order("date", { ascending: false })
      .limit(USUAL_MIX_SHIFTS),
  );

  const totals = new Map<string, number>();
  for (const line of recent.flatMap((closed) => closed.shift_lines)) {
    totals.set(line.service_id, (totals.get(line.service_id) ?? 0) + line.count);
  }
  return [...totals]
    .map(([serviceId, total]) => ({ serviceId, count: Math.round(total / recent.length) }))
    .filter(({ count }) => count > 0);
}
