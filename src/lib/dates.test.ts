import { describe, expect, it } from "vitest";
import { todayInRome } from "./dates";

describe("todayInRome", () => {
  it("uses the Italian calendar date, not UTC", () => {
    expect(todayInRome(new Date("2026-09-30T23:30:00Z"))).toBe("2026-10-01");
    expect(todayInRome(new Date("2026-09-30T12:00:00Z"))).toBe("2026-09-30");
  });
});
