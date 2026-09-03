// Forecast-mode price resolver: a smooth, deterministic NAV curve implied by
// an annual return assumption. This is intentionally not a random walk —
// Forecast mode is an assumption, not a market simulation, and the UI must
// keep that distinction visible (see app plan doc, Section 6 / 10).

import { diffYears } from "./date";
import type { PriceAt } from "./replay";

const BASE_NAV = 10;

export function forecastPriceResolver(annualReturnPct: number) {
  const r = annualReturnPct / 100;
  return (monthIndex: number): number => BASE_NAV * Math.pow(1 + r, monthIndex / 12);
}

/**
 * Continues a smooth growth curve from an arbitrary seed point instead of
 * always starting at BASE_NAV — used to project a plan forward past the last
 * real NAV available, picking up exactly where the real data (or a nominal
 * base, if there's none at all) left off.
 */
export function continuationPriceResolver(seedNav: number, seedDate: Date, annualReturnPct: number): PriceAt {
  const r = annualReturnPct / 100;
  return (date: Date): number => seedNav * Math.pow(1 + r, diffYears(seedDate, date));
}
