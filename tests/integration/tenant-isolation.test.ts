import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createAuthenticatedTestUser, type TestUser } from "../setup/test-user";

// Every hygienist-owned table must be invisible and unwritable to other
// hygienists (ADR-0003). This is the pattern later tables follow.
describe("tenant isolation (hygienist_id + RLS)", () => {
  let owner: TestUser;
  let intruder: TestUser;
  let studioId: string;
  let serviceId: string;
  let priceId: string;

  beforeAll(async () => {
    owner = await createAuthenticatedTestUser();
    intruder = await createAuthenticatedTestUser();

    const studio = await owner.client
      .from("studios")
      .insert({ name: "Studio Treviglio" })
      .select()
      .single();
    expect(studio.error).toBeNull();
    studioId = studio.data!.id;

    const service = await owner.client
      .from("services")
      .insert({ name: "Igiene" })
      .select()
      .single();
    expect(service.error).toBeNull();
    serviceId = service.data!.id;

    const price = await owner.client
      .from("studio_service_prices")
      .insert({ studio_id: studioId, service_id: serviceId, price_cents: 3200, valid_from: "2026-01-01" })
      .select()
      .single();
    expect(price.error).toBeNull();
    priceId = price.data!.id;
  });

  afterAll(async () => {
    await owner?.cleanup();
    await intruder?.cleanup();
  });

  it("stamps new rows with the signed-in hygienist's id", async () => {
    const { data } = await owner.client.from("studios").select("hygienist_id").eq("id", studioId).single();
    expect(data?.hygienist_id).toBe(owner.id);
  });

  it.each([
    ["studios", () => studioId],
    ["services", () => serviceId],
    ["studio_service_prices", () => priceId],
  ])("hides %s rows from another hygienist", async (table, id) => {
    const { data, error } = await intruder.client.from(table).select().eq("id", id());
    expect(error).toBeNull();
    expect(data).toEqual([]);
  });

  it("does not let another hygienist edit Studios, Services or Prices", async () => {
    await intruder.client.from("studios").update({ name: "Hijacked" }).eq("id", studioId);
    await intruder.client.from("services").update({ name: "Hijacked" }).eq("id", serviceId);
    await intruder.client.from("studio_service_prices").update({ price_cents: 1 }).eq("id", priceId);

    const studio = await owner.client.from("studios").select("name").eq("id", studioId).single();
    const service = await owner.client.from("services").select("name").eq("id", serviceId).single();
    const price = await owner.client.from("studio_service_prices").select("price_cents").eq("id", priceId).single();
    expect(studio.data?.name).toBe("Studio Treviglio");
    expect(service.data?.name).toBe("Igiene");
    expect(price.data?.price_cents).toBe(3200);
  });

  it.each([
    ["studio_service_prices", () => priceId],
    ["services", () => serviceId],
    ["studios", () => studioId],
  ])("does not let another hygienist delete %s rows", async (table, id) => {
    await intruder.client.from(table).delete().eq("id", id());

    const { data } = await owner.client.from(table).select("id").eq("id", id());
    expect(data).toHaveLength(1);
  });

  it.each([
    ["studios", () => ({ name: "Spoofed" })],
    ["services", () => ({ name: "Spoofed" })],
    [
      "studio_service_prices",
      () => ({ studio_id: studioId, service_id: serviceId, price_cents: 1, valid_from: "2026-03-01" }),
    ],
  ])("rejects %s rows claiming another hygienist's id", async (table, row) => {
    const { error } = await intruder.client.from(table).insert({ ...row(), hygienist_id: owner.id });
    expect(error).not.toBeNull();
  });

  it("rejects a Price pointing at another hygienist's Studio or Service", async () => {
    const { error } = await intruder.client
      .from("studio_service_prices")
      .insert({ studio_id: studioId, service_id: serviceId, price_cents: 1, valid_from: "2026-02-01" });
    expect(error).not.toBeNull();
  });
});
