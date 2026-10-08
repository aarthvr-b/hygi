"use server";

import { redirect } from "next/navigation";
import { actionError, type ActionResult } from "@/app/action-result";
import { closeShift, type ServiceCount } from "@/lib/schedule/shift-closing";
import { createSupabaseServerClient } from "@/lib/supabase/server";

// The counters post one "count:<service id>" field per Service.
const COUNT_FIELD = "count:";

function serviceCounts(formData: FormData): ServiceCount[] | null {
  const counts: ServiceCount[] = [];
  for (const [field, value] of formData) {
    if (!field.startsWith(COUNT_FIELD)) {
      continue;
    }
    if (!/^\d{1,4}$/.test(String(value))) {
      return null;
    }
    counts.push({ serviceId: field.slice(COUNT_FIELD.length), count: Number(value) });
  }
  return counts;
}

// Closes a Planned Shift, and saves a correction to a Closed one.
export async function closeShiftAction(
  id: string,
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const counts = serviceCounts(formData);
  if (!counts) {
    return { error: "Counts must be whole numbers." };
  }
  try {
    await closeShift(await createSupabaseServerClient(), id, counts);
  } catch (error) {
    return actionError(error);
  }
  redirect(`/shifts/${id}`);
}
