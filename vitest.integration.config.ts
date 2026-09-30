import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: { "@": path.resolve(__dirname, "./src") },
  },
  test: {
    include: ["tests/integration/**/*.test.ts"],
    globalSetup: ["tests/setup/global-setup.ts"],
    // The local Supabase stack can take a while to become healthy on a cold start.
    testTimeout: 30_000,
    hookTimeout: 120_000,
  },
});
