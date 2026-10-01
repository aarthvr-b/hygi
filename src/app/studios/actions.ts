"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { actionError, type ActionResult } from "@/app/action-result";
import { isIsoDate } from "@/lib/dates";
import { parseEuroToCents } from "@/lib/onboarding/money";
import { setPrice } from "@/lib/onboarding/price-list";
import { createStudio, updateStudio, type StudioInput } from "@/lib/onboarding/studios";
import { createShiftTemplate } from "@/lib/schedule/shift-templates";
import { isTimeOfDay } from "@/lib/schedule/shifts";
import { createSupabaseServerClient } from "@/lib/supabase/server";

function studioInput(formData: FormData): StudioInput {
  return {
    name: String(formData.get("name")),
    address: String(formData.get("address") ?? ""),
  };
}

export async function createStudioAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  let id: string;
  try {
    id = (await createStudio(await createSupabaseServerClient(), studioInput(formData))).id;
  } catch (error) {
    return actionError(error);
  }
  // Straight to the Studio's page, where its prices are set.
  redirect(`/studios/${id}`);
}

export async function updateStudioAction(
  id: string,
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  try {
    await updateStudio(await createSupabaseServerClient(), id, studioInput(formData));
  } catch (error) {
    return actionError(error);
  }
  refresh();
  return null;
}

export async function setPriceAction(
  studioId: string,
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const priceCents = parseEuroToCents(String(formData.get("price")));
  if (priceCents === null) {
    return { error: "Enter a price in euros, like 34,50." };
  }
  const validFrom = String(formData.get("validFrom"));
  if (!/^\d{4}-\d{2}-\d{2}$/.test(validFrom)) {
    return { error: "Pick the date this price starts from." };
  }

  try {
    await setPrice(await createSupabaseServerClient(), {
      studioId,
      serviceId: String(formData.get("serviceId")),
      priceCents,
      validFrom,
    });
  } catch (error) {
    return actionError(error);
  }
  refresh();
  return null;
}

export async function createShiftTemplateAction(
  studioId: string,
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const weekday = Number(formData.get("weekday"));
  const timeOfDay = formData.get("timeOfDay");
  if (!Number.isInteger(weekday) || weekday < 1 || weekday > 7 || !isTimeOfDay(timeOfDay)) {
    return { error: "Pick a weekday and a time of day." };
  }
  const intervalWeeks = Number(formData.get("intervalWeeks"));
  if (!Number.isInteger(intervalWeeks) || intervalWeeks < 1) {
    return { error: "Enter how many weeks apart the Shifts are: 1 for every week." };
  }
  const startingFrom = String(formData.get("startingFrom"));
  if (!isIsoDate(startingFrom)) {
    return { error: "Pick the date this Template starts from." };
  }

  try {
    await createShiftTemplate(await createSupabaseServerClient(), {
      studioId,
      weekday,
      timeOfDay,
      intervalWeeks,
      startingFrom,
    });
  } catch (error) {
    return actionError(error);
  }
  refresh();
  return null;
}
