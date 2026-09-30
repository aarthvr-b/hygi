import { describe, expect, it } from "vitest";
import { isInForce, type PriceEntry } from "./price-list";

const entry = (validFrom: string, validUntil: string | null): PriceEntry => ({
  id: "id",
  serviceId: "service",
  priceCents: 3000,
  validFrom,
  validUntil,
});

describe("isInForce", () => {
  it("is in force from its start date through its end date, inclusive", () => {
    const bounded = entry("2026-01-01", "2026-05-31");
    expect(isInForce(bounded, "2025-12-31")).toBe(false);
    expect(isInForce(bounded, "2026-01-01")).toBe(true);
    expect(isInForce(bounded, "2026-05-31")).toBe(true);
    expect(isInForce(bounded, "2026-06-01")).toBe(false);
  });

  it("stays in force indefinitely when no later entry exists", () => {
    expect(isInForce(entry("2026-06-01", null), "2030-01-01")).toBe(true);
  });
});
