import Link from "next/link";
import { notFound } from "next/navigation";
import { ActionForm } from "@/app/action-form";
import { AppNav } from "@/app/app-nav";
import { deleteShiftAction, updateShiftAction } from "@/app/calendar/actions";
import { ShiftFields } from "@/app/calendar/shift-fields";
import { formatDate, TIME_OF_DAY_LABELS } from "@/app/schedule-labels";
import { listStudios } from "@/lib/onboarding/studios";
import { monthOf } from "@/lib/schedule/calendar";
import { getShift } from "@/lib/schedule/shifts";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function ShiftPage(props: PageProps<"/shifts/[id]">) {
  const { id } = await props.params;
  const supabase = await createSupabaseServerClient();
  const shift = await getShift(supabase, id);
  if (!shift) {
    notFound();
  }

  const studios = await listStudios(supabase);
  const studio = studios.find((s) => s.id === shift.studioId);
  const month = monthOf(shift.date);

  return (
    <>
      <AppNav />
      <main className="flex flex-col gap-8 p-8 max-w-lg">
        <section className="flex flex-col gap-2">
          <Link href={`/calendar?month=${month}`}>← Calendar</Link>
          <h1 className="text-2xl font-semibold">
            {studio?.name} — {formatDate(shift.date)}, {TIME_OF_DAY_LABELS[shift.timeOfDay].toLowerCase()}
          </h1>
          {shift.templateId && (
            <p className="text-sm">
              Generated from a Shift Template. Changing or deleting it affects only this Shift — the
              Template and its other Shifts stay as they are.
            </p>
          )}
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="text-lg font-semibold">Edit this Shift</h2>
          <ActionForm action={updateShiftAction.bind(null, shift.id)} submitLabel="Save">
            <ShiftFields studios={studios} shift={shift} />
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
