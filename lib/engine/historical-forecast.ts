// Historical mode, extended to plans that reach past the fund's last real
// NAV — including plans that start today or in the future, which have *no*
// real data to replay against at all. Rather than showing ₹0, the replay
// continues past the real-data boundary on a projected curve seeded by the
// fund's own trailing CAGR (see historical-price-resolver.ts), picking up
// exactly where the real data (or its last point) left off so value is
// continuous across the boundary. Three cases fall out of the same code
// path: pure past (unchanged from simulateHistorical), pure future (the
// whole replay is projected from the fund's last real NAV), and a hybrid of
// both.

import { monthRange, parseISO, toISODate } from "./date";
import { continuationPriceResolver } from "./forecast-price-resolver";
import { historicalPriceResolver, lastAvailableDate, trailingCAGR, type NavPoint } from "./historical-price-resolver";
import { computeReturns, extendToTargetEnd, initialEngineState, replayMonths, type PriceAt } from "./replay";
import type { LedgerRow, Plan, SimulationResult } from "./types";
import type { Cashflow } from "./xirr";

/** Sane fallback expected return when the fund's own history is too thin to compute a trailing CAGR. */
const DEFAULT_PROJECTED_RETURN_PCT = 10;

export interface HistoricalProjectionResult extends SimulationResult {
  /** Whether any part of the replay beyond real NAV data used a projected curve. */
  isProjected: boolean;
  /** First ledger date (ISO) that used projected pricing rather than real NAV; null if none. */
  projectedFromDate: string | null;
  /** The annual return (%) used to seed the projection — the fund's own trailing CAGR when available. */
  projectedReturnPct: number | null;
}

export function simulateHistoricalWithProjection(plan: Plan, series: NavPoint[]): HistoricalProjectionResult {
  const start = parseISO(plan.startDate);
  const end = parseISO(plan.endDate);
  const months = monthRange(start, end);
  const lastIso = lastAvailableDate(series);

  const splitIndex = lastIso ? months.findIndex((m) => toISODate(m) > lastIso) : 0;
  const pastMonths = lastIso ? (splitIndex === -1 ? months : months.slice(0, splitIndex)) : [];
  const futureMonths = lastIso ? (splitIndex === -1 ? [] : months.slice(splitIndex)) : months;

  const historicalAt = historicalPriceResolver(series);
  let pastLedger: LedgerRow[] = [];
  let pastCashflows: Cashflow[] = [];
  let state = initialEngineState();

  if (pastMonths.length > 0) {
    const segment = replayMonths(plan, historicalAt, pastMonths);
    pastLedger = segment.ledger;
    pastCashflows = segment.cashflows;
    state = segment.endState;
  }

  let futureLedger: LedgerRow[] = [];
  let futureCashflows: Cashflow[] = [];
  const projectedReturnPct = trailingCAGR(series, 10) ?? DEFAULT_PROJECTED_RETURN_PCT;
  // Whichever resolver produced the last segment is also the right one to
  // extend the final valuation-only row with (see extendToTargetEnd) — real
  // NAV if the plan never runs past what's available, the same projected
  // curve otherwise.
  let lastPriceAt: PriceAt = historicalAt;

  if (futureMonths.length > 0) {
    const seedNav = pastLedger.length
      ? pastLedger[pastLedger.length - 1].nav
      : series.length
        ? series[series.length - 1].nav
        : 10;
    const seedDate = pastLedger.length
      ? parseISO(pastLedger[pastLedger.length - 1].date)
      : lastIso
        ? parseISO(lastIso)
        : futureMonths[0];

    const continuationAt = continuationPriceResolver(seedNav, seedDate, projectedReturnPct);
    const segment = replayMonths(plan, continuationAt, futureMonths, state);
    futureLedger = segment.ledger;
    futureCashflows = segment.cashflows;
    state = segment.endState;
    lastPriceAt = continuationAt;
  }

  const rawLedger = [...pastLedger, ...futureLedger];
  const cashflows = [...pastCashflows, ...futureCashflows];
  const ledger = extendToTargetEnd(rawLedger, state, lastPriceAt, end);
  const finalValue = ledger.length ? ledger[ledger.length - 1].value : 0;
  const effectiveEnd = ledger.length ? parseISO(ledger[ledger.length - 1].date) : end;

  const returns = computeReturns(
    cashflows,
    finalValue,
    state.totalInvested,
    state.totalWithdrawn,
    start,
    effectiveEnd,
    plan.assumptions.inflation
  );

  return {
    scenario: "historical",
    ledger,
    totalInvested: state.totalInvested,
    totalWithdrawn: state.totalWithdrawn,
    ...returns,
    isProjected: futureMonths.length > 0,
    projectedFromDate: futureMonths.length > 0 ? toISODate(futureMonths[0]) : null,
    projectedReturnPct: futureMonths.length > 0 ? projectedReturnPct : null,
  };
}
