import type { TimeOfDay } from "@/lib/schedule/shifts";

export const TIME_OF_DAY_LABELS: Record<TimeOfDay, string> = {
  am: "Morning",
  pm: "Afternoon",
  full_day: "Full day",
};

// Indexed by ISO weekday - 1 (Monday first).
export const WEEKDAY_LABELS = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
] as const;

// "YYYY-MM-DD" → "Thursday 1 October 2026".
export function formatDate(isoDate: string): string {
  return new Intl.DateTimeFormat("en-GB", { dateStyle: "full", timeZone: "UTC" })
    .format(new Date(`${isoDate}T00:00:00Z`))
    .replace(",", "");
}

// "YYYY-MM" → "October 2026".
export function formatMonth(month: string): string {
  return new Intl.DateTimeFormat("en-GB", { month: "long", year: "numeric", timeZone: "UTC" }).format(
    new Date(`${month}-01T00:00:00Z`),
  );
}
