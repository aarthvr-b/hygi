"use server";

import { redirect } from "next/navigation";
import { actionError, type ActionResult } from "@/app/action-result";
import { acceptSuggestedCatalog } from "@/lib/onboarding/service-catalog";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function acceptCatalog(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const names = formData.getAll("service").map(String);
  if (names.every((name) => name.trim() === "")) {
    return { error: "Keep at least one Service." };
  }

  try {
    const supabase = await createSupabaseServerClient();
    await acceptSuggestedCatalog(supabase, names);
  } catch (error) {
    return actionError(error);
  }

  redirect("/studios");
}
