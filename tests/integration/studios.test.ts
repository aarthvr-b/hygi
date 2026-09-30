import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createStudio, getStudio, listStudios, updateStudio } from "@/lib/onboarding/studios";
import { createAuthenticatedTestUser, type TestUser } from "../setup/test-user";

describe("Studios", () => {
  let hygienist: TestUser;

  beforeEach(async () => {
    hygienist = await createAuthenticatedTestUser();
  });

  afterEach(async () => {
    await hygienist.cleanup();
  });

  it("creates a Studio and lists it by name", async () => {
    await createStudio(hygienist.client, { name: "Treviglio", address: "Via Roma 1" });
    await createStudio(hygienist.client, { name: "Canonica", address: null });

    const studios = await listStudios(hygienist.client);

    expect(studios.map((s) => s.name)).toEqual(["Canonica", "Treviglio"]);
    expect(studios[1]).toMatchObject({ address: "Via Roma 1" });
  });

  it("edits a Studio", async () => {
    const studio = await createStudio(hygienist.client, { name: "Osio", address: null });

    await updateStudio(hygienist.client, studio.id, { name: "Osio Sotto", address: "Piazza 2" });

    expect(await getStudio(hygienist.client, studio.id)).toMatchObject({
      name: "Osio Sotto",
      address: "Piazza 2",
    });
  });

  it("trims names and rejects blank ones", async () => {
    const studio = await createStudio(hygienist.client, { name: "  Pozzuolo  ", address: "  " });

    expect(studio).toMatchObject({ name: "Pozzuolo", address: null });
    await expect(createStudio(hygienist.client, { name: "   ", address: null })).rejects.toThrow();
  });

  it("returns null for an id that isn't a Studio id at all", async () => {
    expect(await getStudio(hygienist.client, "not-a-uuid")).toBeNull();
  });

  it("returns null for a Studio that isn't the hygienist's", async () => {
    const other = await createAuthenticatedTestUser();
    try {
      const studio = await createStudio(other.client, { name: "Milano", address: null });
      expect(await getStudio(hygienist.client, studio.id)).toBeNull();
    } finally {
      await other.cleanup();
    }
  });
});
