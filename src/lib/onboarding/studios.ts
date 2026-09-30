import type { SupabaseClient } from "@supabase/supabase-js";
import { unwrap } from "./result";

export type Studio = {
  id: string;
  name: string;
  address: string | null;
};

export type StudioInput = {
  name: string;
  address: string | null;
};

type StudioRow = { id: string; name: string; address: string | null };

const columns = "id, name, address";

function toStudio(row: StudioRow): Studio {
  return { id: row.id, name: row.name, address: row.address };
}

function toRow(input: StudioInput) {
  return { name: input.name.trim(), address: input.address?.trim() || null };
}

export async function listStudios(client: SupabaseClient): Promise<Studio[]> {
  const rows = unwrap<StudioRow[]>(await client.from("studios").select(columns).order("name"));
  return rows.map(toStudio);
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function getStudio(client: SupabaseClient, id: string): Promise<Studio | null> {
  // Ids come from the URL; a malformed one is simply not one of her Studios.
  if (!UUID.test(id)) {
    return null;
  }
  const row = unwrap<StudioRow | null>(
    await client.from("studios").select(columns).eq("id", id).maybeSingle(),
  );
  return row && toStudio(row);
}

export async function createStudio(client: SupabaseClient, input: StudioInput): Promise<Studio> {
  const row = unwrap<StudioRow>(
    await client.from("studios").insert(toRow(input)).select(columns).single(),
  );
  return toStudio(row);
}

export async function updateStudio(
  client: SupabaseClient,
  id: string,
  input: StudioInput,
): Promise<Studio> {
  const row = unwrap<StudioRow>(
    await client.from("studios").update(toRow(input)).eq("id", id).select(columns).single(),
  );
  return toStudio(row);
}
