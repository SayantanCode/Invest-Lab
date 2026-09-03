// Historical mode: replays a plan against real traded NAV instead of an
// assumed return curve. Reuses the exact same replay core as Forecast mode
// (see replay.ts) — only the price resolver and the effective end date
// (capped at the last date real data actually covers) differ.

import { monthRange, parseISO } from "./date";
import { runReplay } from "./replay";
import { historicalPriceResolver, lastAvailableDate, type NavPoint } from "./historical-price-resolver";
import type { Plan, SimulationResult } from "./types";

export function simulateHistorical(plan: Plan, series: NavPoint[]): SimulationResult {
  const start = parseISO(plan.startDate);
  const lastIso = lastAvailableDate(series);
  const cappedEndIso = lastIso && lastIso < plan.endDate ? lastIso : plan.endDate;
  const end = parseISO(cappedEndIso);
  const months = monthRange(start, end);
  const priceAt = historicalPriceResolver(series);
  return runReplay(plan, priceAt, months, "historical", end);
}
