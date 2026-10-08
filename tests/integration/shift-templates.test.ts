import postgres from "postgres";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createStudio } from "@/lib/onboarding/studios";
import { createShiftTemplate, listShiftTemplates } from "@/lib/schedule/shift-templates";
import { deleteShift, listShifts, materializeShifts, updateShift } from "@/lib/schedule/shifts";
import { createAuthenticatedTestUser, type TestUser } from "../setup/test-user";

// 2026-10-01 is a Thursday; the rolling window runs 12 weeks from "today".
const TODAY = "2026-10-01";
const WINDOW_END = "2026-12-24";
const THURSDAY = 4;
const everything = { from: "2000-01-01", to: "2100-01-01" };

describe("Shift Templates", () => {
  let hygienist: TestUser;
  let milano: string;
  let treviglio: string;

  beforeEach(async () => {
    hygienist = await createAuthenticatedTestUser();
    milano = (await createStudio(hygienist.client, { name: "Milano", address: null })).id;
    treviglio = (await createStudio(hygienist.client, { name: "Treviglio", address: null })).id;
  });

  afterEach(async () => {
    await hygienist.cleanup();
  });

  const thursdays = (studioId: string, intervalWeeks: number, startingFrom: string) =>
    createShiftTemplate(
      hygienist.client,
      { studioId, weekday: THURSDAY, timeOfDay: "am", intervalWeeks, startingFrom },
      TODAY,
    );

  it("creates a Template for a Studio and generates its Shifts into the rolling window", async () => {
    const template = await thursdays(milano, 1, TODAY);

    expect(await listShiftTemplates(hygienist.client, milano)).toEqual([
      {
        id: template.id,
        studioId: milano,
        weekday: THURSDAY,
        timeOfDay: "am",
        intervalWeeks: 1,
        anchorDate: TODAY,
      },
    ]);

    const shifts = await listShifts(hygienist.client, everything);
    expect(shifts).toHaveLength(13);
    expect(shifts[0]).toMatchObject({
      studioId: milano,
      date: TODAY,
      timeOfDay: "am",
      templateId: template.id,
    });
    expect(shifts[1].date).toBe("2026-10-08");
    expect(shifts.at(-1)?.date).toBe(WINDOW_END);
  });

  it("anchors a Template on the first matching weekday on or after its start date", async () => {
    const template = await thursdays(milano, 1, "2026-10-02");

    expect(template.anchorDate).toBe("2026-10-08");
    expect((await listShifts(hygienist.client, everything))[0].date).toBe("2026-10-08");
  });

  it("alternates two Studios from two biweekly Templates anchored a week apart", async () => {
    await thursdays(milano, 2, "2026-10-01");
    await thursdays(treviglio, 2, "2026-10-08");

    const shifts = await listShifts(hygienist.client, { from: TODAY, to: "2026-10-29" });

    expect(shifts.map((s) => [s.date, s.studioId])).toEqual([
      ["2026-10-01", milano],
      ["2026-10-08", treviglio],
      ["2026-10-15", milano],
      ["2026-10-22", treviglio],
      ["2026-10-29", milano],
    ]);
  });

  it("keeps the phase of a Template anchored in the past without backfilling past Shifts", async () => {
    await thursdays(milano, 2, "2026-09-24");

    const shifts = await listShifts(hygienist.client, everything);

    expect(shifts[0].date).toBe("2026-10-08");
    expect(shifts[1].date).toBe("2026-10-22");
  });

  it("tops up the window on later runs without duplicating Shifts", async () => {
    await thursdays(milano, 1, TODAY);

    expect(await materializeShifts(hygienist.client, TODAY)).toBe(0);
    expect(await materializeShifts(hygienist.client, "2026-10-15")).toBe(2);

    const shifts = await listShifts(hygienist.client, everything);
    expect(shifts).toHaveLength(15);
    expect(shifts.at(-1)?.date).toBe("2027-01-07");
    expect(new Set(shifts.map((s) => s.date)).size).toBe(15);
  });

  it("deletes one generated Shift without affecting its Template or other Shifts", async () => {
    const template = await thursdays(milano, 1, TODAY);
    const [, holiday] = await listShifts(hygienist.client, everything);

    await deleteShift(hygienist.client, holiday.id);
    // Later runs of the job must not bring the deleted Shift back.
    await materializeShifts(hygienist.client, "2026-10-08");

    const shifts = await listShifts(hygienist.client, everything);
    expect(shifts.map((s) => s.date)).not.toContain(holiday.date);
    expect(shifts).toHaveLength(13);
    expect(await listShiftTemplates(hygienist.client, milano)).toEqual([template]);
  });

  it("edits one generated Shift without affecting its Template or other Shifts", async () => {
    const template = await thursdays(milano, 1, TODAY);
    const before = await listShifts(hygienist.client, everything);
    const swapped = before[1];

    await updateShift(hygienist.client, swapped.id, {
      studioId: treviglio,
      date: "2026-10-09",
      timeOfDay: "pm",
    });
    await materializeShifts(hygienist.client, TODAY);

    const after = await listShifts(hygienist.client, everything);
    expect(after.find((s) => s.id === swapped.id)).toEqual({
      id: swapped.id,
      studioId: treviglio,
      date: "2026-10-09",
      timeOfDay: "pm",
      templateId: template.id,
      closedAt: null,
    });
    expect(after.filter((s) => s.id !== swapped.id)).toEqual(
      before.filter((s) => s.id !== swapped.id),
    );
    expect(await listShiftTemplates(hygienist.client, milano)).toEqual([template]);
  });

  it("rejects an interval shorter than a week", async () => {
    await expect(thursdays(milano, 0, TODAY)).rejects.toThrow();
  });

  it("generates only the signed-in hygienist's Shifts", async () => {
    const other = await createAuthenticatedTestUser();
    try {
      const studio = await createStudio(other.client, { name: "Canonica", address: null });
      await createShiftTemplate(
        other.client,
        { studioId: studio.id, weekday: THURSDAY, timeOfDay: "pm", intervalWeeks: 1, startingFrom: TODAY },
        TODAY,
      );

      await materializeShifts(hygienist.client, "2026-11-05");

      expect(await listShifts(hygienist.client, everything)).toEqual([]);
      expect(await listShifts(other.client, everything)).toHaveLength(13);
    } finally {
      await other.cleanup();
    }
  });

  describe("the scheduled job", () => {
    let sql: postgres.Sql;

    beforeEach(() => {
      sql = postgres(process.env.DATABASE_URL!, { max: 1 });
    });

    afterEach(async () => {
      await sql.end();
    });

    it("is scheduled daily", async () => {
      const jobs = await sql`select schedule, command from cron.job where jobname = 'materialize-shifts'`;

      expect(jobs).toEqual([{ schedule: "0 3 * * *", command: "SELECT public.materialize_shifts()" }]);
    });

    it("generates Shifts owned by each Template's hygienist, with no one signed in", async () => {
      // A Template the job hasn't seen yet, in a window far from every other
      // test's, since the job runs across all hygienists.
      const { error } = await hygienist.client.from("shift_templates").insert({
        studio_id: milano,
        weekday: 1,
        time_of_day: "full_day",
        interval_weeks: 1,
        anchor_date: "1999-01-04",
      });
      expect(error).toBeNull();

      await sql`select public.materialize_shifts('1999-01-04'::date, 2)`;

      const shifts = await listShifts(hygienist.client, { from: "1999-01-01", to: "1999-12-31" });
      expect(shifts.map((s) => [s.date, s.studioId, s.timeOfDay])).toEqual([
        ["1999-01-04", milano, "full_day"],
        ["1999-01-11", milano, "full_day"],
        ["1999-01-18", milano, "full_day"],
      ]);
    });
  });
});
