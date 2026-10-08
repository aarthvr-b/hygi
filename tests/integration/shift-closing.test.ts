import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { setPrice } from "@/lib/onboarding/price-list";
import { addService } from "@/lib/onboarding/service-catalog";
import { createStudio } from "@/lib/onboarding/studios";
import { closeShift, listShiftLines, usualMix } from "@/lib/schedule/shift-closing";
import { createShift, getShift, updateShift } from "@/lib/schedule/shifts";
import { createAuthenticatedTestUser, type TestUser } from "../setup/test-user";

describe("Closing a Shift", () => {
  let hygienist: TestUser;
  let studioId: string;
  let cleaning: string;
  let whitening: string;

  beforeEach(async () => {
    hygienist = await createAuthenticatedTestUser();
    studioId = (await createStudio(hygienist.client, { name: "Treviglio", address: null })).id;
    cleaning = (await addService(hygienist.client, "Igiene")).id;
    whitening = (await addService(hygienist.client, "Sbiancamento")).id;
    await setPrice(hygienist.client, { studioId, serviceId: cleaning, priceCents: 3000, validFrom: "2026-01-01" });
    await setPrice(hygienist.client, { studioId, serviceId: cleaning, priceCents: 3200, validFrom: "2026-06-01" });
    await setPrice(hygienist.client, { studioId, serviceId: whitening, priceCents: 5000, validFrom: "2026-01-01" });
  });

  afterEach(async () => {
    await hygienist.cleanup();
  });

  const planShift = (date: string) => createShift(hygienist.client, { studioId, date, timeOfDay: "am" });

  const lines = async (shiftId: string) =>
    (await listShiftLines(hygienist.client, shiftId)).map((l) => [l.serviceName, l.count, l.unitPriceCents]);

  it("starts a Shift as Planned, with no Shift Lines", async () => {
    const shift = await planShift("2026-05-14");

    expect(shift.closedAt).toBeNull();
    expect(await lines(shift.id)).toEqual([]);
  });

  it("closes a Planned Shift with the Prices in force on the Shift's date", async () => {
    const shift = await planShift("2026-05-14");

    await closeShift(hygienist.client, shift.id, [
      { serviceId: cleaning, count: 6 },
      { serviceId: whitening, count: 1 },
    ]);

    expect((await getShift(hygienist.client, shift.id))?.closedAt).not.toBeNull();
    // Closed after the June price rise, but worked in May: the May Price applies.
    expect(await lines(shift.id)).toEqual([
      ["Igiene", 6, 3000],
      ["Sbiancamento", 1, 5000],
    ]);
  });

  it("keeps a Closed Shift's Shift Lines as they were when the Price List changes afterward", async () => {
    const shift = await planShift("2026-05-14");
    await closeShift(hygienist.client, shift.id, [{ serviceId: cleaning, count: 6 }]);

    // Both a correction of the entry that was in force and a new entry.
    await setPrice(hygienist.client, { studioId, serviceId: cleaning, priceCents: 2800, validFrom: "2026-01-01" });
    await setPrice(hygienist.client, { studioId, serviceId: cleaning, priceCents: 3500, validFrom: "2026-05-01" });

    expect(await lines(shift.id)).toEqual([["Igiene", 6, 3000]]);
  });

  it("corrects a Closed Shift: counts change, Services come and go, snapshotted prices stay", async () => {
    const periodontal = (await addService(hygienist.client, "Igiene parodontale")).id;
    await setPrice(hygienist.client, { studioId, serviceId: periodontal, priceCents: 4500, validFrom: "2026-01-01" });
    const shift = await planShift("2026-05-14");
    await closeShift(hygienist.client, shift.id, [
      { serviceId: cleaning, count: 6 },
      { serviceId: whitening, count: 1 },
    ]);
    const { closedAt } = (await getShift(hygienist.client, shift.id))!;
    await setPrice(hygienist.client, { studioId, serviceId: cleaning, priceCents: 3500, validFrom: "2026-05-01" });

    await closeShift(hygienist.client, shift.id, [
      { serviceId: cleaning, count: 5 },
      { serviceId: whitening, count: 0 },
      { serviceId: periodontal, count: 2 },
    ]);

    expect(await lines(shift.id)).toEqual([
      ["Igiene", 5, 3000],
      ["Igiene parodontale", 2, 4500],
    ]);
    expect((await getShift(hygienist.client, shift.id))?.closedAt).toBe(closedAt);
  });

  it("closes a Shift on which nothing was done, with no Shift Lines", async () => {
    const shift = await planShift("2026-05-14");

    await closeShift(hygienist.client, shift.id, [{ serviceId: cleaning, count: 0 }]);

    expect((await getShift(hygienist.client, shift.id))?.closedAt).not.toBeNull();
    expect(await lines(shift.id)).toEqual([]);
  });

  it("refuses to close a Shift with a Service that has no Price on the Shift's date, leaving it Planned", async () => {
    const shift = await planShift("2025-12-31");

    await expect(
      closeShift(hygienist.client, shift.id, [
        { serviceId: whitening, count: 1 },
        { serviceId: cleaning, count: 6 },
      ]),
    ).rejects.toThrow("Igiene, Sbiancamento");

    expect((await getShift(hygienist.client, shift.id))?.closedAt).toBeNull();
    expect(await lines(shift.id)).toEqual([]);
  });

  it("rejects a negative count", async () => {
    const shift = await planShift("2026-05-14");

    await expect(closeShift(hygienist.client, shift.id, [{ serviceId: cleaning, count: -1 }])).rejects.toThrow();

    expect((await getShift(hygienist.client, shift.id))?.closedAt).toBeNull();
  });

  it("lets a Closed Shift change date but not Studio", async () => {
    const other = (await createStudio(hygienist.client, { name: "Milano", address: null })).id;
    const shift = await planShift("2026-05-14");
    await closeShift(hygienist.client, shift.id, [{ serviceId: cleaning, count: 6 }]);

    await updateShift(hygienist.client, shift.id, { studioId, date: "2026-06-15", timeOfDay: "pm" });
    await expect(
      updateShift(hygienist.client, shift.id, { studioId: other, date: "2026-06-15", timeOfDay: "pm" }),
    ).rejects.toThrow();

    expect(await getShift(hygienist.client, shift.id)).toMatchObject({ studioId, date: "2026-06-15" });
    // Moving the date doesn't re-derive the price either.
    expect(await lines(shift.id)).toEqual([["Igiene", 6, 3000]]);
  });

  it("does not let another hygienist close the Shift", async () => {
    const intruder = await createAuthenticatedTestUser();
    try {
      const shift = await planShift("2026-05-14");

      await expect(closeShift(intruder.client, shift.id, [{ serviceId: cleaning, count: 6 }])).rejects.toThrow();

      expect((await getShift(hygienist.client, shift.id))?.closedAt).toBeNull();
      expect(await lines(shift.id)).toEqual([]);
    } finally {
      await intruder.cleanup();
    }
  });

  describe("usual mix", () => {
    const closedShift = async (
      shift: { studioId: string; date: string; timeOfDay: "am" | "pm" },
      counts: [string, number][],
    ) => {
      const { id } = await createShift(hygienist.client, shift);
      await closeShift(
        hygienist.client,
        id,
        counts.map(([serviceId, count]) => ({ serviceId, count })),
      );
    };

    it("is empty for a Studio with no Closed Shifts yet", async () => {
      await planShift("2026-05-14");

      expect(await usualMix(hygienist.client, { studioId, timeOfDay: "am" })).toEqual([]);
    });

    it("averages the Studio's recent Closed Shifts at the same time of day", async () => {
      const other = (await createStudio(hygienist.client, { name: "Milano", address: null })).id;
      await setPrice(hygienist.client, { studioId: other, serviceId: cleaning, priceCents: 4000, validFrom: "2026-01-01" });
      await closedShift({ studioId, date: "2026-05-07", timeOfDay: "am" }, [[cleaning, 6], [whitening, 1]]);
      await closedShift({ studioId, date: "2026-05-14", timeOfDay: "am" }, [[cleaning, 7]]);
      await closedShift({ studioId, date: "2026-05-21", timeOfDay: "am" }, [[cleaning, 8]]);
      // Neither another time of day nor another Studio says what a morning here looks like.
      await closedShift({ studioId, date: "2026-05-21", timeOfDay: "pm" }, [[cleaning, 2]]);
      await closedShift({ studioId: other, date: "2026-05-22", timeOfDay: "am" }, [[cleaning, 20]]);

      // Igiene: (6 + 7 + 8) / 3 = 7. Sbiancamento: 1 in 3 Shifts rounds to none.
      expect(await usualMix(hygienist.client, { studioId, timeOfDay: "am" })).toEqual([
        { serviceId: cleaning, count: 7 },
      ]);
    });

    it("looks only at the five most recent Closed Shifts", async () => {
      await closedShift({ studioId, date: "2026-03-05", timeOfDay: "am" }, [[cleaning, 40]]);
      for (const date of ["2026-04-02", "2026-04-09", "2026-04-16", "2026-04-23", "2026-04-30"]) {
        await closedShift({ studioId, date, timeOfDay: "am" }, [[cleaning, 6]]);
      }

      expect(await usualMix(hygienist.client, { studioId, timeOfDay: "am" })).toEqual([
        { serviceId: cleaning, count: 6 },
      ]);
    });
  });
});
