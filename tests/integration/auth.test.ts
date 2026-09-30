import { describe, expect, it } from "vitest";
import { createAuthenticatedTestUser } from "../setup/test-user";

describe("Supabase Auth wiring (via the test-Postgres harness)", () => {
  it("signs a hygienist in and exposes their session", async () => {
    const testUser = await createAuthenticatedTestUser();

    try {
      const { data, error } = await testUser.client.auth.getUser();

      expect(error).toBeNull();
      expect(data.user?.email).toBe(testUser.email);
    } finally {
      await testUser.cleanup();
    }
  });

  it("rejects sign-in with the wrong password", async () => {
    const testUser = await createAuthenticatedTestUser();

    try {
      const { error } = await testUser.client.auth.signInWithPassword({
        email: testUser.email,
        password: "definitely-not-the-password",
      });

      expect(error).not.toBeNull();
    } finally {
      await testUser.cleanup();
    }
  });
});
