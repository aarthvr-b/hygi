import type { SupabaseClient } from "@supabase/supabase-js";
import { unwrap } from "./result";

export type Service = {
  id: string;
  name: string;
};

// Offered at onboarding; the hygienist edits the list before accepting it.
export const SUGGESTED_SERVICES = [
  "Igiene",
  "Igiene e sbiancamento",
  "Sbiancamento",
  "Igiene parodontale",
  "Levigatura radicolare",
] as const;

const columns = "id, name";

// Onboarding is done once she has saved a catalog, even if she later archives
// every Service in it.
export async function hasServiceCatalog(client: SupabaseClient): Promise<boolean> {
  const { count, error } = await client
    .from("services")
    .select("id", { count: "exact", head: true });
  unwrap({ data: null, error });
  return (count ?? 0) > 0;
}

// Archived Services are hidden from the catalog but kept for price history.
export async function listServices(client: SupabaseClient): Promise<Service[]> {
  return unwrap<Service[]>(
    await client.from("services").select(columns).is("archived_at", null).order("name"),
  );
}

export async function acceptSuggestedCatalog(
  client: SupabaseClient,
  names: readonly string[],
): Promise<Service[]> {
  const rows = names
    .map((name) => name.trim())
    .filter((name) => name !== "")
    .map((name) => ({ name }));
  return unwrap<Service[]>(await client.from("services").insert(rows).select(columns));
}

export async function addService(client: SupabaseClient, name: string): Promise<Service> {
  return unwrap<Service>(
    await client.from("services").insert({ name: name.trim() }).select(columns).single(),
  );
}

export async function renameService(
  client: SupabaseClient,
  id: string,
  name: string,
): Promise<Service> {
  return unwrap<Service>(
    await client
      .from("services")
      .update({ name: name.trim() })
      .eq("id", id)
      .select(columns)
      .single(),
  );
}

export async function archiveService(client: SupabaseClient, id: string): Promise<void> {
  unwrap(
    await client.from("services").update({ archived_at: new Date().toISOString() }).eq("id", id),
  );
}
