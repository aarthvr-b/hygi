import type { SupabaseClient } from "@supabase/supabase-js";
import { firstWeekdayOnOrAfter, todayInRome } from "@/lib/dates";
import { unwrap } from "@/lib/onboarding/result";
import { materializeShifts, type TimeOfDay } from "./shifts";

export type ShiftTemplate = {
  id: string;
  studioId: string;
  // ISO weekday: 1 = Monday ... 7 = Sunday.
  weekday: number;
  timeOfDay: TimeOfDay;
  intervalWeeks: number;
  // The first occurrence; with an interval over a week it fixes which weeks
  // the Template falls on.
  anchorDate: string;
};

export type ShiftTemplateInput = {
  studioId: string;
  weekday: number;
  timeOfDay: TimeOfDay;
  intervalWeeks: number;
  // The Template is anchored on the first `weekday` on or after this date.
  startingFrom: string;
};

type ShiftTemplateRow = {
  id: string;
  studio_id: string;
  weekday: number;
  time_of_day: TimeOfDay;
  interval_weeks: number;
  anchor_date: string;
};

const columns = "id, studio_id, weekday, time_of_day, interval_weeks, anchor_date";

function toShiftTemplate(row: ShiftTemplateRow): ShiftTemplate {
  return {
    id: row.id,
    studioId: row.studio_id,
    weekday: row.weekday,
    timeOfDay: row.time_of_day,
    intervalWeeks: row.interval_weeks,
    anchorDate: row.anchor_date,
  };
}

// Generates the new Template's Shifts straight away rather than leaving them
// to the next run of the scheduled job.
export async function createShiftTemplate(
  client: SupabaseClient,
  input: ShiftTemplateInput,
  today: string = todayInRome(),
): Promise<ShiftTemplate> {
  const row = unwrap<ShiftTemplateRow>(
    await client
      .from("shift_templates")
      .insert({
        studio_id: input.studioId,
        weekday: input.weekday,
        time_of_day: input.timeOfDay,
        interval_weeks: input.intervalWeeks,
        anchor_date: firstWeekdayOnOrAfter(input.startingFrom, input.weekday),
      })
      .select(columns)
      .single(),
  );
  await materializeShifts(client, today);
  return toShiftTemplate(row);
}

export async function listShiftTemplates(
  client: SupabaseClient,
  studioId: string,
): Promise<ShiftTemplate[]> {
  const rows = unwrap<ShiftTemplateRow[]>(
    await client
      .from("shift_templates")
      .select(columns)
      .eq("studio_id", studioId)
      .order("weekday")
      .order("time_of_day")
      .order("anchor_date"),
  );
  return rows.map(toShiftTemplate);
}
