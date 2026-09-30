import { execSync } from "node:child_process";

type SupabaseStatus = {
  API_URL: string;
  ANON_KEY: string;
  SERVICE_ROLE_KEY: string;
};

export default async function globalSetup() {
  execSync("npx supabase start", { stdio: "inherit" });

  // The CLI can print warning lines (e.g. about optional services it didn't
  // start) before the JSON payload, so pull out just the `{...}` object.
  const rawStatus = execSync("npx supabase status -o json").toString();
  const status: SupabaseStatus = JSON.parse(
    rawStatus.slice(rawStatus.indexOf("{"), rawStatus.lastIndexOf("}") + 1),
  );
  process.env.NEXT_PUBLIC_SUPABASE_URL = status.API_URL;
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = status.ANON_KEY;
  process.env.SUPABASE_SERVICE_ROLE_KEY = status.SERVICE_ROLE_KEY;

  return async () => {
    execSync("npx supabase stop", { stdio: "inherit" });
  };
}
