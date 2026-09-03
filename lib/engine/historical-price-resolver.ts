// Historical-mode price resolver: looks up the real traded NAV for a given
// date, forward-filling to the next available trading day when the
// requested date falls on a weekend or market holiday (see app plan doc,
// Section 10 — "forward-filled to next trading day if d is a holiday").

import { addYearsUTC, parseISO, toISODate } from "./date";
import type { PriceAt } from "./replay";
import { cagr } from "./xirr";

export interface NavPoint {
  date: string; // ISO yyyy-MM-dd
  nav: number;
}

/** Builds a forward-filling lookup over a NAV series sorted ascending by date. */
export function historicalPriceResolver(series: NavPoint[]): PriceAt {
  if (series.length === 0) {
    return () => 0;
  }
  const dates = series.map((p) => p.date);
  const firstIso = dates[0];
  const lastIso = dates[dates.length - 1];

  return (date: Date): number => {
    const targetIso = toISODate(date);
    if (targetIso <= firstIso) return series[0].nav;
    if (targetIso > lastIso) return series[series.length - 1].nav;

    let lo = 0;
    let hi = dates.length - 1;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (dates[mid] < targetIso) lo = mid + 1;
      else hi = mid;
    }
    return series[lo].nav;
  };
}

export function firstAvailableDate(series: NavPoint[]): string | null {
  return series.length ? series[0].date : null;
}

export function lastAvailableDate(series: NavPoint[]): string | null {
  return series.length ? series[series.length - 1].date : null;
}

/**
 * The fund's own trailing CAGR (%), computed from its real NAV history over
 * the last `years` (or its full history, if younger). This is what seeds a
 * forward projection once a plan runs past the last real NAV available —
 * a data-driven "expected return" instead of a guessed one.
 */
export function trailingCAGR(series: NavPoint[], years = 10): number | null {
  if (series.length < 2) return null;
  const last = series[series.length - 1];
  const lastDate = parseISO(last.date);
  const targetStartIso = toISODate(addYearsUTC(lastDate, -years));

  const anchor = series.find((p) => p.date >= targetStartIso) ?? series[0];
  const anchorDate = parseISO(anchor.date);
  const days = (lastDate.getTime() - anchorDate.getTime()) / (1000 * 60 * 60 * 24);

  if (days < 30) return null;
  const rate = cagr(anchor.nav, last.nav, days);
  return rate != null ? rate * 100 : null;
}
