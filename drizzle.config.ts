import { defineConfig } from "drizzle-kit";

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/lib/db/schema.ts",
  out: "./src/lib/db/migrations",
  schemaFilter: ["public"],
  // Supabase owns its roles (anon, authenticated, ...); don't try to create them.
  entities: { roles: { provider: "supabase" } },
});
