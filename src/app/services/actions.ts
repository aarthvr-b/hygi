"use server";

import { refresh } from "next/cache";
import { actionError, type ActionResult } from "@/app/action-result";
import { addService, archiveService, renameService } from "@/lib/onboarding/service-catalog";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function addServiceAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  try {
    await addService(await createSupabaseServerClient(), String(formData.get("name")));
  } catch (error) {
    return actionError(error);
  }
  refresh();
  return null;
}

export async function renameServiceAction(
  id: string,
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  try {
    await renameService(await createSupabaseServerClient(), id, String(formData.get("name")));
  } catch (error) {
    return actionError(error);
  }
  refresh();
  return null;
}

export async function archiveServiceAction(id: string): Promise<ActionResult> {
  try {
    await archiveService(await createSupabaseServerClient(), id);
  } catch (error) {
    return actionError(error);
  }
  refresh();
  return null;
}
