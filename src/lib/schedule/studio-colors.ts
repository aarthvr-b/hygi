import type { SupabaseClient } from "@supabase/supabase-js";
import { unwrap } from "@/lib/onboarding/result";

// Each Studio's position in creation order, which the calendar turns into a
// color. Creation order keeps a Studio's color stable as more are added.
export async function studioColorIndexes(client: SupabaseClient): Promise<Map<string, number>> {
  const rows = unwrap<{ id: string }[]>(
    await client.from("studios").select("id").order("created_at").order("id"),
  );
  return new Map(rows.map((row, index) => [row.id, index]));
}
