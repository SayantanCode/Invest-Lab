// Minimal, dependency-free date helpers for the engine. Dates are parsed as
// UTC-anchored to avoid local-timezone drift shifting a plan's month buckets.

export function parseISO(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, (m ?? 1) - 1, d ?? 1));
}

export function toISODate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function monthKey(date: Date): string {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

/** The last valid day-of-month for (year, 0-indexed month) — day 0 of the following month. */
function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
}

/**
 * Adds `n` months, clamping the day-of-month to the target month's last day
 * instead of letting it overflow into the month after — JS's native
 * `setUTCMonth` does the latter (Aug 31 + 1 month lands on Oct 1, silently
 * skipping September entirely, since September has no 31st). Always
 * computed from `date`'s own day, not a remembered "original" day, so
 * callers that want a fixed anchor day preserved across multiple months
 * (see `monthRange` below) must pass that anchor in fresh each time rather
 * than chaining calls off the previous result.
 */
export function addMonthsUTC(date: Date, n: number): Date {
  const day = date.getUTCDate();
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth() + n;
  const targetYear = year + Math.floor(month / 12);
  const targetMonth = ((month % 12) + 12) % 12;
  const clampedDay = Math.min(day, daysInMonth(targetYear, targetMonth));
  return new Date(Date.UTC(targetYear, targetMonth, clampedDay));
}

/**
 * Generates one anchor date per calendar month from start up to (but not
 * including) end — so a plan spanning exactly N years produces exactly
 * N*12 monthly SIP dates, matching how every other SIP calculator counts
 * "25 years of investing" (300 contributions, not 301). Treating `end` as
 * inclusive here used to add one extra contribution whenever a plan's
 * duration landed on a whole number of months, quietly inflating the
 * result by one installment's worth of (barely-grown) value.
 * `start === end` still yields the single start month, so a same-day plan
 * never simulates zero months.
 *
 * Each month is computed directly from `start` (`addMonthsUTC(start, k)`),
 * not by repeatedly stepping a cursor forward — chaining would still drift
 * a day-31 start down to day-30 the first time it hits a shorter month, and
 * never recover it in a later 31-day month, unlike a real SIP auto-debit
 * "on the 31st, or the last day if unavailable" that re-attempts the 31st
 * every month.
 */
export function monthRange(start: Date, end: Date): Date[] {
  if (start.getTime() >= end.getTime()) return [new Date(start.getTime())];
  const months: Date[] = [];
  let k = 0;
  let cursor = addMonthsUTC(start, k);
  let guard = 0;
  while (cursor.getTime() < end.getTime() && guard < 1200) {
    months.push(cursor);
    k++;
    cursor = addMonthsUTC(start, k);
    guard++;
  }
  return months;
}

export function diffYears(a: Date, b: Date): number {
  return (b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24 * 365);
}

/** Adds a (possibly fractional) number of years to a date, rounding to the nearest whole month. */
export function addYearsUTC(date: Date, years: number): Date {
  return addMonthsUTC(date, Math.round(years * 12));
}
