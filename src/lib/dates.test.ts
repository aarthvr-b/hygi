import { describe, expect, it } from "vitest";
import { addDays, firstWeekdayOnOrAfter, isIsoDate, isoWeekday, todayInRome } from "./dates";

describe("todayInRome", () => {
  it("uses the Italian calendar date, not UTC", () => {
    expect(todayInRome(new Date("2026-09-30T23:30:00Z"))).toBe("2026-10-01");
    expect(todayInRome(new Date("2026-09-30T12:00:00Z"))).toBe("2026-09-30");
  });
});

describe("isIsoDate", () => {
  it("accepts only real calendar dates", () => {
    expect(isIsoDate("2026-10-01")).toBe(true);
    expect(isIsoDate("2026-13-01")).toBe(false);
    expect(isIsoDate("01/10/2026")).toBe(false);
    expect(isIsoDate("")).toBe(false);
  });
});

describe("addDays", () => {
  it("crosses month and year boundaries", () => {
    expect(addDays("2026-10-31", 1)).toBe("2026-11-01");
    expect(addDays("2027-01-01", -1)).toBe("2026-12-31");
  });
});

describe("isoWeekday", () => {
  it("numbers Monday as 1 and Sunday as 7", () => {
    expect(isoWeekday("2026-10-05")).toBe(1);
    expect(isoWeekday("2026-10-01")).toBe(4);
    expect(isoWeekday("2026-10-04")).toBe(7);
  });
});

describe("firstWeekdayOnOrAfter", () => {
  it("keeps a date already on that weekday", () => {
    expect(firstWeekdayOnOrAfter("2026-10-01", 4)).toBe("2026-10-01");
  });

  it("moves forward to the next such weekday otherwise", () => {
    expect(firstWeekdayOnOrAfter("2026-10-02", 4)).toBe("2026-10-08");
    expect(firstWeekdayOnOrAfter("2026-10-01", 1)).toBe("2026-10-05");
  });
});
