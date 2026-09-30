import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { randomUUID } from "node:crypto";

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} is not set — did the global test-Postgres setup run?`);
  }
  return value;
}

function serviceRoleClient() {
  return createClient(
    requireEnv("NEXT_PUBLIC_SUPABASE_URL"),
    requireEnv("SUPABASE_SERVICE_ROLE_KEY"),
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}

export type TestUser = {
  id: string;
  email: string;
  password: string;
  client: SupabaseClient;
  cleanup: () => Promise<void>;
};

// Creates a confirmed user against the local test-Postgres/Auth stack and
// signs in as them, so tests exercise the same Auth wiring the app uses.
export async function createAuthenticatedTestUser(): Promise<TestUser> {
  const admin = serviceRoleClient();
  const email = `test-${randomUUID()}@example.com`;
  const password = randomUUID();

  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (createError || !created.user) {
    throw createError ?? new Error("Failed to create test user");
  }

  const client = createClient(
    requireEnv("NEXT_PUBLIC_SUPABASE_URL"),
    requireEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
    { auth: { autoRefreshToken: false, persistSession: false } },
  );

  const { error: signInError } = await client.auth.signInWithPassword({ email, password });
  if (signInError) {
    throw signInError;
  }

  return {
    id: created.user.id,
    email,
    password,
    client,
    cleanup: async () => {
      await admin.auth.admin.deleteUser(created.user.id);
    },
  };
}
