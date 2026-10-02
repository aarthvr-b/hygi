import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createStudio } from "@/lib/onboarding/studios";
import { listShiftTemplates } from "@/lib/schedule/shift-templates";
import { createShift, deleteShift, getShift, listShifts, updateShift } from "@/lib/schedule/shifts";
import { studioColorIndexes } from "@/lib/schedule/studio-colors";
import { createAuthenticatedTestUser, type TestUser } from "../setup/test-user";

describe("Shifts", () => {
  let hygienist: TestUser;
  let studioId: string;

  beforeEach(async () => {
    hygienist = await createAuthenticatedTestUser();
    studioId = (await createStudio(hygienist.client, { name: "Osio", address: null })).id;
  });

  afterEach(async () => {
    await hygienist.cleanup();
  });

  it("creates a one-off Shift for a Studio with no Template", async () => {
    const shift = await createShift(hygienist.client, { studioId, date: "2026-10-06", timeOfDay: "pm" });

    expect(shift).toMatchObject({ studioId, date: "2026-10-06", timeOfDay: "pm", templateId: null });
    expect(await getShift(hygienist.client, shift.id)).toEqual(shift);
    expect(await listShiftTemplates(hygienist.client, studioId)).toEqual([]);
  });

  it("lists the Shifts in a date range, in calendar order", async () => {
    const other = (await createStudio(hygienist.client, { name: "Pozzuolo", address: null })).id;
    await createShift(hygienist.client, { studioId, date: "2026-10-07", timeOfDay: "am" });
    await createShift(hygienist.client, { studioId: other, date: "2026-10-06", timeOfDay: "pm" });
    await createShift(hygienist.client, { studioId, date: "2026-10-06", timeOfDay: "am" });
    await createShift(hygienist.client, { studioId, date: "2026-10-08", timeOfDay: "am" });

    const shifts = await listShifts(hygienist.client, { from: "2026-10-06", to: "2026-10-07" });

    expect(shifts.map((s) => [s.date, s.timeOfDay, s.studioId])).toEqual([
      ["2026-10-06", "am", studioId],
      ["2026-10-06", "pm", other],
      ["2026-10-07", "am", studioId],
    ]);
  });

  it("edits and deletes a Shift", async () => {
    const shift = await createShift(hygienist.client, { studioId, date: "2026-10-06", timeOfDay: "pm" });

    await updateShift(hygienist.client, shift.id, { studioId, date: "2026-10-13", timeOfDay: "full_day" });
    expect(await getShift(hygienist.client, shift.id)).toMatchObject({
      date: "2026-10-13",
      timeOfDay: "full_day",
    });

    await deleteShift(hygienist.client, shift.id);
    expect(await getShift(hygienist.client, shift.id)).toBeNull();
  });

  it("returns null for an id that isn't a Shift id, or isn't the hygienist's Shift", async () => {
    const other = await createAuthenticatedTestUser();
    try {
      const studio = await createStudio(other.client, { name: "Milano", address: null });
      const shift = await createShift(other.client, { studioId: studio.id, date: "2026-10-06", timeOfDay: "am" });

      expect(await getShift(hygienist.client, "not-a-uuid")).toBeNull();
      expect(await getShift(hygienist.client, shift.id)).toBeNull();
    } finally {
      await other.cleanup();
    }
  });

  it("numbers Studios in creation order, for stable calendar colors", async () => {
    const second = (await createStudio(hygienist.client, { name: "Canonica", address: null })).id;

    const indexes = await studioColorIndexes(hygienist.client);

    expect(indexes.get(studioId)).toBe(0);
    expect(indexes.get(second)).toBe(1);
  });
});
