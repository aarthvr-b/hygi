import Link from "next/link";
import { notFound } from "next/navigation";
import { ActionForm } from "@/app/action-form";
import { AppNav } from "@/app/app-nav";
import { deleteShiftAction, updateShiftAction } from "@/app/calendar/actions";
import { ShiftFields } from "@/app/calendar/shift-fields";
import { formatDate, TIME_OF_DAY_LABELS } from "@/app/schedule-labels";
import { isInForce, listPrices } from "@/lib/onboarding/price-list";
import { listServices } from "@/lib/onboarding/service-catalog";
import { listStudios } from "@/lib/onboarding/studios";
import { monthOf } from "@/lib/schedule/calendar";
import { listShiftLines, usualMix } from "@/lib/schedule/shift-closing";
import { getShift } from "@/lib/schedule/shifts";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { closeShiftAction } from "./actions";
import { ServiceCounters, type CounterRow } from "./service-counters";

export default async function ShiftPage(props: PageProps<"/shifts/[id]">) {
  const { id } = await props.params;
  const supabase = await createSupabaseServerClient();
  const shift = await getShift(supabase, id);
  if (!shift) {
    notFound();
  }

  const closed = shift.closedAt !== null;
  const [studios, services, prices, lines, mix] = await Promise.all([
    listStudios(supabase),
    listServices(supabase),
    listPrices(supabase, shift.studioId),
    listShiftLines(supabase, shift.id),
    // A Closed Shift's counters show what was recorded, not the usual mix.
    closed ? [] : usualMix(supabase, shift),
  ]);
  const studio = studios.find((s) => s.id === shift.studioId);
  const month = monthOf(shift.date);

  // Services already on the Shift keep their snapshotted price (and stay
  // listed even if archived since); the others get the Price in force on the
  // Shift's date, and can't be counted without one.
  const onShift = new Set(lines.map((line) => line.serviceId));
  const counters: CounterRow[] = [...lines];
  const unpriced: string[] = [];
  for (const service of services) {
    if (onShift.has(service.id)) {
      continue;
    }
    const price = prices.find((p) => p.serviceId === service.id && isInForce(p, shift.date));
    if (!price) {
      unpriced.push(service.name);
      continue;
    }
    counters.push({
      serviceId: service.id,
      serviceName: service.name,
      unitPriceCents: price.priceCents,
      count: mix.find((usual) => usual.serviceId === service.id)?.count ?? 0,
    });
  }
  counters.sort((a, b) => a.serviceName.localeCompare(b.serviceName));

  return (
    <>
      <AppNav />
      <main className="flex flex-col gap-8 p-8 max-w-lg">
        <section className="flex flex-col gap-2">
          <Link href={`/calendar?month=${month}`}>← Calendar</Link>
          <h1 className="text-2xl font-semibold">
            {studio?.name} - {formatDate(shift.date)}, {TIME_OF_DAY_LABELS[shift.timeOfDay].toLowerCase()}
          </h1>
          <p>{closed ? "Closed" : "Planned"}</p>
          {shift.templateId && (
            <p className="text-sm">
              Generated from a Shift Template. Changing or deleting it affects only this Shift - the
              Template and its other Shifts stay as they are.
            </p>
          )}
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="text-lg font-semibold">{closed ? "Correct what you did" : "Close this Shift"}</h2>
          <p className="text-sm">
            {closed
              ? "Services already on this Shift keep the price they were closed with, even if the Price List has changed since."
              : "Pre-filled with your usual mix at this Studio. Prices are the ones in force on the Shift's date, and stay with the Shift from now on."}
          </p>
          {counters.length === 0 ? (
            <p>
              No Service has a price at this Studio on this date.{" "}
              <Link href={`/studios/${shift.studioId}`}>Set its Price List</Link> first.
            </p>
          ) : (
            <ActionForm
              action={closeShiftAction.bind(null, shift.id)}
              submitLabel={closed ? "Save correction" : "Close Shift"}
            >
              <ServiceCounters key={shift.closedAt ?? "planned"} rows={counters} />
              {unpriced.length > 0 && (
                <p className="text-sm">
                  No price at this Studio on this date for: {unpriced.join(", ")}.{" "}
                  <Link href={`/studios/${shift.studioId}`}>Set a price</Link> to count them.
                </p>
              )}
            </ActionForm>
          )}
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="text-lg font-semibold">Edit this Shift</h2>
          {closed && <p className="text-sm">A Closed Shift keeps its Studio; its date and time of day can change.</p>}
          <ActionForm action={updateShiftAction.bind(null, shift.id)} submitLabel="Save">
            <ShiftFields studios={closed ? studios.filter((s) => s.id === shift.studioId) : studios} shift={shift} />
          </ActionForm>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="text-lg font-semibold">Delete this Shift</h2>
          <ActionForm action={deleteShiftAction.bind(null, shift.id, month)} submitLabel="Delete Shift" />
        </section>
      </main>
    </>
  );
}
