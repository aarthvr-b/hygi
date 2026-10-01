import Link from "next/link";
import { ActionForm } from "@/app/action-form";
import { AppNav } from "@/app/app-nav";
import { formatMonth, TIME_OF_DAY_LABELS, WEEKDAY_LABELS } from "@/app/schedule-labels";
import { todayInRome } from "@/lib/dates";
import { listStudios } from "@/lib/onboarding/studios";
import { addMonths, isMonth, monthOf, monthWeeks } from "@/lib/schedule/calendar";
import { listShifts, type Shift, type TimeOfDay } from "@/lib/schedule/shifts";
import { studioColorIndexes } from "@/lib/schedule/studio-colors";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createShiftAction } from "./actions";
import { ShiftFields } from "./shift-fields";
import { studioColor } from "./studio-color";

// Short enough for a phone-width day cell.
const TIME_OF_DAY_SHORT: Record<TimeOfDay, string> = { am: "AM", pm: "PM", full_day: "Day" };

export default async function CalendarPage(props: PageProps<"/calendar">) {
  const { month: requested } = await props.searchParams;
  const today = todayInRome();
  const month = typeof requested === "string" && isMonth(requested) ? requested : monthOf(today);
  const weeks = monthWeeks(month);

  const supabase = await createSupabaseServerClient();
  const [studios, colorIndexes, shifts] = await Promise.all([
    listStudios(supabase),
    studioColorIndexes(supabase),
    listShifts(supabase, { from: weeks[0][0], to: weeks[weeks.length - 1][6] }),
  ]);

  const studioNames = new Map(studios.map((studio) => [studio.id, studio.name]));
  const shiftsByDate = new Map<string, Shift[]>();
  for (const shift of shifts) {
    shiftsByDate.set(shift.date, [...(shiftsByDate.get(shift.date) ?? []), shift]);
  }

  return (
    <>
      <AppNav />
      <main className="flex flex-col gap-6 p-4 sm:p-8">
        <header className="flex items-center gap-4">
          <h1 className="text-2xl font-semibold">{formatMonth(month)}</h1>
          <span className="flex-1" />
          <Link href={`/calendar?month=${addMonths(month, -1)}`}>← Previous</Link>
          <Link href="/calendar">Today</Link>
          <Link href={`/calendar?month=${addMonths(month, 1)}`}>Next →</Link>
        </header>

        {studios.length > 0 && (
          <ul className="flex flex-wrap gap-2 text-sm">
            {studios.map((studio) => (
              <li key={studio.id} className={`rounded px-2 ${studioColor(colorIndexes.get(studio.id))}`}>
                {studio.name}
              </li>
            ))}
          </ul>
        )}

        <table className="w-full table-fixed border-collapse">
          <thead>
            <tr>
              {WEEKDAY_LABELS.map((weekday) => (
                <th key={weekday} scope="col" className="border p-1 text-sm font-semibold">
                  <abbr title={weekday} className="no-underline">
                    {weekday.slice(0, 3)}
                  </abbr>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {weeks.map((week) => (
              <tr key={week[0]}>
                {week.map((date) => (
                  <td key={date} className="h-20 border p-1 align-top">
                    <div
                      className={[
                        "text-sm",
                        monthOf(date) === month ? "" : "opacity-40",
                        date === today ? "font-bold underline" : "",
                      ].join(" ")}
                    >
                      {Number(date.slice(8))}
                    </div>
                    <ul className="flex flex-col gap-1">
                      {(shiftsByDate.get(date) ?? []).map((shift) => {
                        const studioName = studioNames.get(shift.studioId);
                        return (
                          <li key={shift.id}>
                            <Link
                              href={`/shifts/${shift.id}`}
                              title={`${studioName}, ${TIME_OF_DAY_LABELS[shift.timeOfDay]}`}
                              className={`block truncate rounded px-1 text-xs ${studioColor(colorIndexes.get(shift.studioId))}`}
                            >
                              <span className="font-semibold">{TIME_OF_DAY_SHORT[shift.timeOfDay]}</span>{" "}
                              {studioName}
                            </Link>
                          </li>
                        );
                      })}
                    </ul>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>

        <section className="flex max-w-lg flex-col gap-2">
          <h2 className="text-lg font-semibold">Add a one-off Shift</h2>
          {studios.length === 0 ? (
            <p>
              <Link href="/studios">Add a Studio</Link> first.
            </p>
          ) : (
            <ActionForm action={createShiftAction} submitLabel="Add Shift">
              <ShiftFields studios={studios} defaultDate={monthOf(today) === month ? today : `${month}-01`} />
              <p className="text-sm">
                For recurring work, add a Shift Template on the Studio&apos;s page instead.
              </p>
            </ActionForm>
          )}
        </section>
      </main>
    </>
  );
}
