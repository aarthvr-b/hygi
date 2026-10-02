import { describe, expect, it } from "vitest";
import { addMonths, isMonth, monthOf, monthWeeks } from "./calendar";

describe("isMonth", () => {
  it("accepts only YYYY-MM", () => {
    expect(isMonth("2026-10")).toBe(true);
    expect(isMonth("2026-13")).toBe(false);
    expect(isMonth("2026-10-01")).toBe(false);
  });
});

describe("addMonths", () => {
  it("crosses year boundaries", () => {
    expect(addMonths("2026-12", 1)).toBe("2027-01");
    expect(addMonths("2026-01", -1)).toBe("2025-12");
  });
});

describe("monthWeeks", () => {
  it("covers the month in full Monday-to-Sunday weeks", () => {
    const weeks = monthWeeks("2026-10");

    expect(weeks).toHaveLength(5);
    expect(weeks[0]).toEqual([
      "2026-09-28",
      "2026-09-29",
      "2026-09-30",
      "2026-10-01",
      "2026-10-02",
      "2026-10-03",
      "2026-10-04",
    ]);
    expect(weeks.at(-1)?.at(-1)).toBe("2026-11-01");
  });

  it("adds no padding week when the month starts on a Monday and ends on a Sunday", () => {
    const weeks = monthWeeks("2027-02");

    expect(weeks).toHaveLength(4);
    expect(weeks[0][0]).toBe("2027-02-01");
    expect(weeks[3][6]).toBe("2027-02-28");
  });

  it("handles December without spilling into a whole January week", () => {
    const weeks = monthWeeks("2026-12");

    expect(monthOf(weeks[0][6])).toBe("2026-12");
    expect(monthOf(weeks.at(-1)![0])).toBe("2026-12");
  });
});
