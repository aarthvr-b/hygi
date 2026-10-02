import { TIME_OF_DAY_LABELS } from "@/app/schedule-labels";
import type { Studio } from "@/lib/onboarding/studios";
import { TIMES_OF_DAY, type Shift, type TimeOfDay } from "@/lib/schedule/shifts";

export function TimeOfDaySelect({ defaultValue }: { defaultValue?: TimeOfDay }) {
  return (
    <label className="flex flex-col gap-1">
      <span>Time of day</span>
      <select name="timeOfDay" required defaultValue={defaultValue}>
        {TIMES_OF_DAY.map((timeOfDay) => (
          <option key={timeOfDay} value={timeOfDay}>
            {TIME_OF_DAY_LABELS[timeOfDay]}
          </option>
        ))}
      </select>
    </label>
  );
}

type Props = {
  studios: Studio[];
  shift?: Shift;
  defaultDate?: string;
};

export function ShiftFields({ studios, shift, defaultDate }: Props) {
  return (
    <>
      <label className="flex flex-col gap-1">
        <span>Studio</span>
        <select name="studioId" required defaultValue={shift?.studioId}>
          {studios.map((studio) => (
            <option key={studio.id} value={studio.id}>
              {studio.name}
            </option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-1">
        <span>Date</span>
        <input name="date" type="date" required defaultValue={shift?.date ?? defaultDate} />
      </label>
      <TimeOfDaySelect defaultValue={shift?.timeOfDay} />
    </>
  );
}
