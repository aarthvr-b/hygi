// Today's calendar date ("YYYY-MM-DD") where the hygienist works, so a price
// entered late in the evening doesn't land on the wrong day.
export function todayInRome(now: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Rome" }).format(now);
}
