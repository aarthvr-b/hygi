import { join } from "node:path";
import { cwd } from "node:process";

import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";

import { getDatabaseUrl } from "./index";

async function main() {
  const client = postgres(getDatabaseUrl(), { max: 1 });
  const db = drizzle(client);

  console.log("Running database migrations...");

  try {
    await migrate(db, {
      migrationsFolder: join(cwd(), "src/lib/db/migrations"),
    });
    console.log("Database migrations completed successfully");
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
