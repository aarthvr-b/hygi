import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  acceptSuggestedCatalog,
  addService,
  archiveService,
  hasServiceCatalog,
  listServices,
  renameService,
  SUGGESTED_SERVICES,
} from "@/lib/onboarding/service-catalog";
import { createAuthenticatedTestUser, type TestUser } from "../setup/test-user";

describe("Service catalog", () => {
  let hygienist: TestUser;

  beforeEach(async () => {
    hygienist = await createAuthenticatedTestUser();
  });

  afterEach(async () => {
    await hygienist.cleanup();
  });

  it("starts empty, so onboarding can offer the suggested catalog", async () => {
    expect(await listServices(hygienist.client)).toEqual([]);
    expect(await hasServiceCatalog(hygienist.client)).toBe(false);
    expect(SUGGESTED_SERVICES.length).toBeGreaterThan(0);
  });

  it("stays onboarded even after every Service is archived", async () => {
    const [igiene] = await acceptSuggestedCatalog(hygienist.client, ["Igiene"]);
    await archiveService(hygienist.client, igiene.id);

    expect(await hasServiceCatalog(hygienist.client)).toBe(true);
  });

  it("accepts an edited version of the suggested catalog", async () => {
    await acceptSuggestedCatalog(hygienist.client, ["Igiene", "  Igiene e sbiancamento ", "", "Sbiancamento"]);

    const names = (await listServices(hygienist.client)).map((s) => s.name);
    expect(names).toEqual(["Igiene", "Igiene e sbiancamento", "Sbiancamento"]);
  });

  it("adds, renames and archives Services", async () => {
    const igiene = await addService(hygienist.client, "Igiene");
    const perio = await addService(hygienist.client, "Perio");

    await renameService(hygienist.client, perio.id, "Igiene parodontale");
    await archiveService(hygienist.client, igiene.id);

    const names = (await listServices(hygienist.client)).map((s) => s.name);
    expect(names).toEqual(["Igiene parodontale"]);
  });

  it("rejects a duplicate active name, but allows reusing an archived one", async () => {
    const igiene = await addService(hygienist.client, "Igiene");

    await expect(addService(hygienist.client, "igiene")).rejects.toThrow();

    await archiveService(hygienist.client, igiene.id);
    await expect(addService(hygienist.client, "Igiene")).resolves.toMatchObject({ name: "Igiene" });
  });
});
