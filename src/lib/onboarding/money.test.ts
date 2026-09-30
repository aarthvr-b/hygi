import { describe, expect, it } from "vitest";
import { formatCents, parseEuroToCents } from "./money";

describe("parseEuroToCents", () => {
  it.each([
    ["32", 3200],
    ["34,5", 3450],
    ["34.5", 3450],
    ["34,50", 3450],
    [" 30 ", 3000],
    ["0", 0],
    ["0,05", 5],
  ])("parses %j as %i cents", (input, cents) => {
    expect(parseEuroToCents(input)).toBe(cents);
  });

  it.each(["", "abc", "-5", "3,456", "1.000,00", "12,"])("rejects %j", (input) => {
    expect(parseEuroToCents(input)).toBeNull();
  });
});

describe("formatCents", () => {
  it("formats cents as euros with a comma decimal separator", () => {
    expect(formatCents(3450)).toBe("34,50");
    expect(formatCents(5)).toBe("0,05");
  });
});
