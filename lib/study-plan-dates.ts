export function isValidTimeZone(timeZone: string): boolean {
  try { new Intl.DateTimeFormat("en", { timeZone }).format(0); return true; }
  catch { return false; }
}

export function dateKeyInTimeZone(date: Date, timeZone: string): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone, year: "numeric", month: "2-digit", day: "2-digit",
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return values.year + "-" + values.month + "-" + values.day;
}

export function dateFromKey(dateKey: string): Date {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateKey);
  if (!match) throw new Error("Invalid calendar date");
  const date = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
  if (dateKeyInTimeZone(date, "UTC") !== dateKey) throw new Error("Invalid calendar date");
  return date;
}

export function addCalendarDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setUTCDate(result.getUTCDate() + days);
  return result;
}

export function mondayOf(date: Date): Date {
  return addCalendarDays(date, -((date.getUTCDay() + 6) % 7));
}

export function formatCalendarDay(date: Date): string {
  return new Intl.DateTimeFormat("en", {
    timeZone: "UTC", weekday: "long", month: "short", day: "numeric",
  }).format(date);
}
