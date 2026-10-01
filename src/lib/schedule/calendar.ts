import { addDays, isoWeekday } from "@/lib/dates";

// Months are "YYYY-MM", the prefix of an ISO calendar date.
export function isMonth(value: string): boolean {
  return /^\d{4}-(0[1-9]|1[0-2])$/.test(value);
}

export function monthOf(isoDate: string): string {
  return isoDate.slice(0, 7);
}

export function addMonths(month: string, months: number): string {
  const date = new Date(`${month}-01T00:00:00Z`);
  date.setUTCMonth(date.getUTCMonth() + months);
  return date.toISOString().slice(0, 7);
}

// The Monday-to-Sunday weeks that cover a month, padded with the neighbouring
// months' days so every week is full.
export function monthWeeks(month: string): string[][] {
  const firstOfMonth = `${month}-01`;
  const weeks: string[][] = [];
  let monday = addDays(firstOfMonth, 1 - isoWeekday(firstOfMonth));
  while (monthOf(monday) <= month) {
    weeks.push(Array.from({ length: 7 }, (_, day) => addDays(monday, day)));
    monday = addDays(monday, 7);
  }
  return weeks;
}
