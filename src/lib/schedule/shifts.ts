import type { SupabaseClient } from "@supabase/supabase-js";
import { todayInRome } from "@/lib/dates";
import { unwrap } from "@/lib/onboarding/result";
import { UUID } from "@/lib/onboarding/studios";

export const TIMES_OF_DAY = ["am", "pm", "full_day"] as const;
export type TimeOfDay = (typeof TIMES_OF_DAY)[number];

export function isTimeOfDay(value: unknown): value is TimeOfDay {
  return TIMES_OF_DAY.includes(value as TimeOfDay);
}

// Dates are ISO calendar dates ("YYYY-MM-DD"), matching the Postgres `date` type.
export type Shift = {
  id: string;
  studioId: string;
  date: string;
  timeOfDay: TimeOfDay;
  // Provenance only: the Shift Template this Shift was generated from, if any.
  templateId: string | null;
};

export type ShiftInput = {
  studioId: string;
  date: string;
  timeOfDay: TimeOfDay;
};

type ShiftRow = {
  id: string;
  studio_id: string;
  date: string;
  time_of_day: TimeOfDay;
  template_id: string | null;
};

const columns = "id, studio_id, date, time_of_day, template_id";

function toShift(row: ShiftRow): Shift {
  return {
    id: row.id,
    studioId: row.studio_id,
    date: row.date,
    timeOfDay: row.time_of_day,
    templateId: row.template_id,
  };
}

function toRow(input: ShiftInput) {
  return { studio_id: input.studioId, date: input.date, time_of_day: input.timeOfDay };
}

// Both ends of the range are inclusive.
export async function listShifts(
  client: SupabaseClient,
  range: { from: string; to: string },
): Promise<Shift[]> {
  const rows = unwrap<ShiftRow[]>(
    await client
      .from("shifts")
      .select(columns)
      .gte("date", range.from)
      .lte("date", range.to)
      .order("date")
      .order("time_of_day")
      .order("created_at"),
  );
  return rows.map(toShift);
}

export async function getShift(client: SupabaseClient, id: string): Promise<Shift | null> {
  // Ids come from the URL; a malformed one is simply not one of her Shifts.
  if (!UUID.test(id)) {
    return null;
  }
  const row = unwrap<ShiftRow | null>(
    await client.from("shifts").select(columns).eq("id", id).maybeSingle(),
  );
  return row && toShift(row);
}

// A one-off Shift: created directly, with no Shift Template behind it.
export async function createShift(client: SupabaseClient, input: ShiftInput): Promise<Shift> {
  const row = unwrap<ShiftRow>(
    await client.from("shifts").insert(toRow(input)).select(columns).single(),
  );
  return toShift(row);
}

// Editing or deleting a Shift is how an exception is expressed (ADR-0001):
// neither touches the Shift's Template or any other Shift.
export async function updateShift(
  client: SupabaseClient,
  id: string,
  input: ShiftInput,
): Promise<Shift> {
  const row = unwrap<ShiftRow>(
    await client.from("shifts").update(toRow(input)).eq("id", id).select(columns).single(),
  );
  return toShift(row);
}

export async function deleteShift(client: SupabaseClient, id: string): Promise<void> {
  unwrap(await client.from("shifts").delete().eq("id", id));
}

// Tops up the rolling window of Shifts generated from her Shift Templates, as
// the scheduled job does for every hygienist. Returns how many were generated.
export async function materializeShifts(
  client: SupabaseClient,
  from: string = todayInRome(),
): Promise<number> {
  return unwrap<number>(await client.rpc("materialize_shifts", { p_from: from }));
}
