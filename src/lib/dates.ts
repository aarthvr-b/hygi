// Today's calendar date ("YYYY-MM-DD") where the hygienist works, so a price
// entered late in the evening doesn't land on the wrong day.
export function todayInRome(now: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Rome" }).format(now);
}

// The helpers below work on ISO calendar dates ("YYYY-MM-DD"), matching the
// Postgres `date` type; they never involve a time or a timezone.

export function isIsoDate(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00Z`));
}

export function addDays(isoDate: string, days: number): string {
  const date = new Date(`${isoDate}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

// ISO weekday: 1 = Monday ... 7 = Sunday.
export function isoWeekday(isoDate: string): number {
  return new Date(`${isoDate}T00:00:00Z`).getUTCDay() || 7;
}

export function firstWeekdayOnOrAfter(isoDate: string, weekday: number): string {
  return addDays(isoDate, (weekday - isoWeekday(isoDate) + 7) % 7);
}
