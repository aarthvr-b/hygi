import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { listPrices, priceInForce, setPrice } from "@/lib/onboarding/price-list";
import { addService } from "@/lib/onboarding/service-catalog";
import { createStudio } from "@/lib/onboarding/studios";
import { createAuthenticatedTestUser, type TestUser } from "../setup/test-user";

describe("Price List", () => {
  let hygienist: TestUser;
  let studioId: string;
  let serviceId: string;

  beforeEach(async () => {
    hygienist = await createAuthenticatedTestUser();
    studioId = (await createStudio(hygienist.client, { name: "Treviglio", address: null })).id;
    serviceId = (await addService(hygienist.client, "Igiene")).id;
  });

  afterEach(async () => {
    await hygienist.cleanup();
  });

  it("finds the Price in force on a date: the latest one starting on or before it", async () => {
    await setPrice(hygienist.client, { studioId, serviceId, priceCents: 3000, validFrom: "2026-01-01" });
    await setPrice(hygienist.client, { studioId, serviceId, priceCents: 3200, validFrom: "2026-06-01" });

    const at = (on: string) => priceInForce(hygienist.client, { studioId, serviceId, on });

    expect(await at("2025-12-31")).toBeNull();
    expect(await at("2026-01-01")).toBe(3000);
    expect(await at("2026-05-31")).toBe(3000);
    expect(await at("2026-06-01")).toBe(3200);
    expect(await at("2027-01-01")).toBe(3200);
  });

  it("corrects the Price when set again for the same start date", async () => {
    await setPrice(hygienist.client, { studioId, serviceId, priceCents: 3200, validFrom: "2026-06-01" });
    await setPrice(hygienist.client, { studioId, serviceId, priceCents: 3450, validFrom: "2026-06-01" });

    const prices = await listPrices(hygienist.client, studioId);

    expect(prices).toEqual([
      expect.objectContaining({ serviceId, priceCents: 3450, validFrom: "2026-06-01", validUntil: null }),
    ]);
  });

  it("lists a Studio's price history with each entry's derived end date", async () => {
    const whitening = (await addService(hygienist.client, "Igiene e sbiancamento")).id;
    await setPrice(hygienist.client, { studioId, serviceId, priceCents: 3000, validFrom: "2026-01-01" });
    await setPrice(hygienist.client, { studioId, serviceId, priceCents: 3200, validFrom: "2026-06-01" });
    await setPrice(hygienist.client, { studioId, serviceId: whitening, priceCents: 3450, validFrom: "2026-01-01" });

    const prices = await listPrices(hygienist.client, studioId);

    expect(prices.map((p) => [p.serviceId, p.validFrom, p.validUntil, p.priceCents])).toEqual(
      expect.arrayContaining([
        [serviceId, "2026-01-01", "2026-05-31", 3000],
        [serviceId, "2026-06-01", null, 3200],
        [whitening, "2026-01-01", null, 3450],
      ]),
    );
    expect(prices).toHaveLength(3);
  });

  it("allows only one raw Price row per (Studio, Service, start date)", async () => {
    const row = { studio_id: studioId, service_id: serviceId, valid_from: "2026-03-01" };

    const first = await hygienist.client.from("studio_service_prices").insert({ ...row, price_cents: 3000 });
    const duplicate = await hygienist.client.from("studio_service_prices").insert({ ...row, price_cents: 3100 });

    expect(first.error).toBeNull();
    expect(duplicate.error).not.toBeNull();
  });

  it("rejects a negative Price", async () => {
    await expect(
      setPrice(hygienist.client, { studioId, serviceId, priceCents: -1, validFrom: "2026-01-01" }),
    ).rejects.toThrow();
  });
});
