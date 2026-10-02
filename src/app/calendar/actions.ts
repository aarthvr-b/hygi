"use server";

import { redirect } from "next/navigation";
import { actionError, type ActionResult } from "@/app/action-result";
import { isIsoDate } from "@/lib/dates";
import { isMonth, monthOf } from "@/lib/schedule/calendar";
import {
  createShift,
  deleteShift,
  isTimeOfDay,
  updateShift,
  type ShiftInput,
} from "@/lib/schedule/shifts";
import { createSupabaseServerClient } from "@/lib/supabase/server";

function shiftInput(formData: FormData): ShiftInput | null {
  const date = String(formData.get("date"));
  const timeOfDay = formData.get("timeOfDay");
  if (!isIsoDate(date) || !isTimeOfDay(timeOfDay)) {
    return null;
  }
  return { studioId: String(formData.get("studioId")), date, timeOfDay };
}

const invalidShift: ActionResult = { error: "Pick a Studio, a date and a time of day." };

export async function createShiftAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const input = shiftInput(formData);
  if (!input) {
    return invalidShift;
  }
  try {
    await createShift(await createSupabaseServerClient(), input);
  } catch (error) {
    return actionError(error);
  }
  // Show the month the new Shift landed in.
  redirect(`/calendar?month=${monthOf(input.date)}`);
}

export async function updateShiftAction(
  id: string,
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const input = shiftInput(formData);
  if (!input) {
    return invalidShift;
  }
  try {
    await updateShift(await createSupabaseServerClient(), id, input);
  } catch (error) {
    return actionError(error);
  }
  redirect(`/calendar?month=${monthOf(input.date)}`);
}

export async function deleteShiftAction(id: string, month: string): Promise<ActionResult> {
  try {
    await deleteShift(await createSupabaseServerClient(), id);
  } catch (error) {
    return actionError(error);
  }
  redirect(isMonth(month) ? `/calendar?month=${month}` : "/calendar");
}
