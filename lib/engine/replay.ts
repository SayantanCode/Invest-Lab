// The cashflow replayer: walks a plan's calendar month by month, applies
// whichever events fall in that month, and produces a full ledger plus
// summary returns. This core loop is shared by every mode — Forecast,
// Historical, and any future scenario type — only the price resolver
// differs (see app plan doc, Section 8).

import { addMonthsUTC, diffYears, monthKey, monthRange, parseISO, toISODate } from "./date";
import { forecastPriceResolver } from "./forecast-price-resolver";
import type { LedgerRow, Plan, ScenarioKey, SimulationResult } from "./types";
import { realValue } from "./inflation";
import { cagr, xirr, type Cashflow } from "./xirr";

export interface EngineState {
  sipActive: boolean;
  sipAmount: number;
  swpActive: boolean;
  swpAmount: number;
  totalUnits: number;
  totalInvested: number;
  totalWithdrawn: number;
}

export function initialEngineState(): EngineState {
  return {
    sipActive: false,
    sipAmount: 0,
    swpActive: false,
    swpAmount: 0,
    totalUnits: 0,
    totalInvested: 0,
    totalWithdrawn: 0,
  };
}

function eventLabel(labels: string[]): string {
  return labels.filter(Boolean).join(" + ") || "Holding";
}

export type PriceAt = (date: Date) => number;

export interface ReturnsSummary {
  finalValue: number;
  gain: number;
  absoluteReturnPct: number;
  xirrPct: number | null;
  realFinalValue: number;
  realXirrPct: number | null;
}

/**
 * Turns a signed monthly cashflow series into the return figures every mode
 * shows — nominal and real XIRR, absolute return. Factored out of the
 * replay loop so a merged multi-fund portfolio, or a stitched
 * historical-then-projected result (see portfolio-replay.ts and
 * historical-forecast.ts), can compute exactly the same figures from their
 * combined cashflows, without duplicating the XIRR/inflation math.
 */
export function computeReturns(
  cashflows: Cashflow[],
  finalValue: number,
  totalInvested: number,
  totalWithdrawn: number,
  start: Date,
  end: Date,
  inflationPct: number
): ReturnsSummary {
  const years = diffYears(start, end);

  const xirrCashflows: Cashflow[] = [...cashflows];
  if (finalValue > 0) {
    xirrCashflows.push({ date: end, amount: finalValue });
  }
  const xirrPct = xirr(xirrCashflows);

  // Real XIRR deflates *every* cashflow to start-date purchasing power (not
  // just the terminal value) — otherwise a growing contribution stream (e.g.
  // step-up) leaves large, barely-discounted nominal outflows near the end
  // fighting a terminal value that's been deflated by the full plan duration,
  // producing a real-XIRR number with no honest relationship to the nominal one.
  const realFinalValue = realValue(finalValue, inflationPct, years);
  const deflate = (amount: number, date: Date) =>
    realValue(amount, inflationPct, Math.max(diffYears(start, date), 0));
  const realXirrCashflows: Cashflow[] = cashflows.map((cf) => ({
    date: cf.date,
    amount: deflate(cf.amount, cf.date),
  }));
  if (finalValue > 0) {
    realXirrCashflows.push({ date: end, amount: realFinalValue });
  }
  const realXirrPct = xirr(realXirrCashflows);

  const gain = finalValue - totalInvested + totalWithdrawn;
  const absoluteReturnPct = totalInvested > 0 ? (gain / totalInvested) * 100 : 0;

  return {
    finalValue,
    gain,
    absoluteReturnPct,
    xirrPct: xirrPct != null ? xirrPct * 100 : null,
    realFinalValue,
    realXirrPct: realXirrPct != null ? realXirrPct * 100 : null,
  };
}

export interface ReplaySegment {
  ledger: LedgerRow[];
  cashflows: Cashflow[];
  endState: EngineState;
}

/**
 * Appends one valuation-only row (no new contribution) at `targetEnd`, if
 * the walked months stopped short of it. monthRange only ever lands
 * contribution months strictly before its end bound (see date.ts) — by
 * design, so a plan spanning exactly N years makes exactly N*12 SIP
 * payments, matching every other SIP calculator, rather than N*12+1. But
 * that means the last contribution is up to a month short of the plan's
 * actual end date; the standard "value after N years" convention (and the
 * usual FV-of-an-annuity-due formula) still lets that final corpus keep
 * growing, untouched by new money, right up to the real end date. This row
 * is what supplies that last stretch of growth.
 */
export function extendToTargetEnd(
  ledger: LedgerRow[],
  endState: EngineState,
  priceAt: PriceAt,
  targetEnd: Date
): LedgerRow[] {
  if (!ledger.length) return ledger;
  const lastDate = parseISO(ledger[ledger.length - 1].date);
  if (targetEnd.getTime() <= lastDate.getTime()) return ledger;
  const nav = priceAt(targetEnd);
  const value = endState.totalUnits * nav;
  return [
    ...ledger,
    {
      date: toISODate(targetEnd),
      eventLabel: "Holding",
      contribution: 0,
      nav,
      units: 0,
      totalUnits: endState.totalUnits,
      totalInvested: endState.totalInvested,
      totalWithdrawn: endState.totalWithdrawn,
      value,
      gain: value - endState.totalInvested + endState.totalWithdrawn,
    },
  ];
}

/**
 * The mechanical part of the replay: walk `months`, apply whichever of the
 * plan's events fall in each one, buy/sell units at `priceAt`, and produce a
 * ledger. Takes an optional starting state so a segment can pick up exactly
 * where a previous one (e.g. a real-NAV historical segment) left off —
 * that's what lets a plan seamlessly switch from real data to a projected
 * continuation mid-replay without losing accumulated units or an active SIP.
 */
export function replayMonths(plan: Plan, priceAt: PriceAt, months: Date[], seed?: EngineState): ReplaySegment {
  const eventsByMonth = new Map<string, Plan["events"]>();
  for (const evt of [...plan.events].sort((a, b) => a.date.localeCompare(b.date))) {
    const key = monthKey(parseISO(evt.date));
    const bucket = eventsByMonth.get(key) ?? [];
    bucket.push(evt);
    eventsByMonth.set(key, bucket);
  }

  const state: EngineState = seed ? { ...seed } : initialEngineState();
  const ledger: LedgerRow[] = [];
  const cashflows: Cashflow[] = [];

  months.forEach((monthDate) => {
    const key = monthKey(monthDate);
    const bucket = eventsByMonth.get(key) ?? [];
    const labels: string[] = [];
    let lumpsumThisMonth = 0;
    let withdrawalThisMonth = 0;

    for (const evt of bucket) {
      switch (evt.type) {
        case "SIP_START":
          state.sipActive = true;
          state.sipAmount = evt.amount;
          labels.push("SIP started");
          break;
        case "SIP_STEPUP":
          state.sipAmount =
            evt.mode === "percent" ? state.sipAmount * (1 + evt.value / 100) : evt.value;
          labels.push("Step-up");
          break;
        case "SIP_PAUSE":
          state.sipActive = false;
          labels.push("SIP paused");
          break;
        case "SIP_RESUME":
          state.sipActive = true;
          if (evt.amount != null) state.sipAmount = evt.amount;
          labels.push("SIP resumed");
          break;
        case "SIP_STOP":
          state.sipActive = false;
          state.sipAmount = 0;
          labels.push("SIP stopped");
          break;
        case "LUMPSUM":
          lumpsumThisMonth += evt.amount;
          labels.push("Lumpsum");
          break;
        case "WITHDRAWAL":
          withdrawalThisMonth += evt.amount;
          labels.push("Withdrawal");
          break;
        case "SWP_START":
          state.swpActive = true;
          state.swpAmount = evt.amount;
          labels.push("SWP started");
          break;
        case "SWP_STOP":
          state.swpActive = false;
          state.swpAmount = 0;
          labels.push("SWP stopped");
          break;
      }
    }

    const nav = priceAt(monthDate);
    let netUnitsThisRow = 0;
    let netContribution = 0;

    if (state.sipActive && state.sipAmount > 0) {
      const units = state.sipAmount / nav;
      state.totalUnits += units;
      state.totalInvested += state.sipAmount;
      netUnitsThisRow += units;
      netContribution += state.sipAmount;
      cashflows.push({ date: monthDate, amount: -state.sipAmount });
      if (!labels.includes("SIP started")) labels.push("SIP");
    }

    if (lumpsumThisMonth > 0) {
      const units = lumpsumThisMonth / nav;
      state.totalUnits += units;
      state.totalInvested += lumpsumThisMonth;
      netUnitsThisRow += units;
      netContribution += lumpsumThisMonth;
      cashflows.push({ date: monthDate, amount: -lumpsumThisMonth });
    }

    if (state.swpActive && state.swpAmount > 0) {
      withdrawalThisMonth += state.swpAmount;
      if (!labels.includes("SWP started")) labels.push("SWP");
    }

    if (withdrawalThisMonth > 0) {
      // Capped at whatever's actually left — a real SWP just quietly pays
      // out less (and eventually nothing) once the folio is drawn down,
      // rather than going negative.
      const available = state.totalUnits * nav;
      const applied = Math.min(withdrawalThisMonth, Math.max(available, 0));
      const units = applied / nav;
      state.totalUnits = Math.max(0, state.totalUnits - units);
      state.totalWithdrawn += applied;
      netUnitsThisRow -= units;
      netContribution -= applied;
      cashflows.push({ date: monthDate, amount: applied });
    }

    const value = state.totalUnits * nav;
    ledger.push({
      date: toISODate(monthDate),
      eventLabel: eventLabel(labels),
      contribution: netContribution,
      nav,
      units: netUnitsThisRow,
      totalUnits: state.totalUnits,
      totalInvested: state.totalInvested,
      totalWithdrawn: state.totalWithdrawn,
      value,
      gain: value - state.totalInvested + state.totalWithdrawn,
    });
  });

  return { ledger, cashflows, endState: state };
}

/**
 * The shared replay core. `priceAt` is the only thing that changes between
 * modes: Forecast resolves a synthetic assumption-driven curve, Historical
 * resolves real traded NAV. Everything downstream — units, the ledger,
 * XIRR, inflation adjustment — is identical either way.
 */
export function runReplay(
  plan: Plan,
  priceAt: PriceAt,
  months: Date[],
  label: ScenarioKey | "historical",
  targetEnd?: Date
): SimulationResult {
  // Derived from `months` (not re-parsed from plan.startDate) so a caller
  // that extends the walked range earlier — to cover an event backdated
  // before the plan's official start, e.g. an already-running SIP — gets a
  // holding period, XIRR, and inflation adjustment that reflect the true
  // start, not just the "new money" date.
  const start = months.length ? months[0] : parseISO(plan.startDate);

  const { cashflows, endState, ledger: rawLedger } = replayMonths(plan, priceAt, months);
  const ledger = extendToTargetEnd(rawLedger, endState, priceAt, targetEnd ?? parseISO(plan.endDate));
  const end = ledger.length ? parseISO(ledger[ledger.length - 1].date) : targetEnd ?? parseISO(plan.endDate);

  const finalValue = ledger.length ? ledger[ledger.length - 1].value : 0;
  const returns = computeReturns(
    cashflows,
    finalValue,
    endState.totalInvested,
    endState.totalWithdrawn,
    start,
    end,
    plan.assumptions.inflation
  );

  return {
    scenario: label,
    ledger,
    totalInvested: endState.totalInvested,
    totalWithdrawn: endState.totalWithdrawn,
    ...returns,
  };
}

/**
 * The earliest date any event actually happens on, if that's before the
 * plan's own start date — an already-running SIP or a lumpsum made before
 * today, backdated on the timeline (see event-dialog.tsx). Forecast mode
 * has no real NAV to fall back on, but its price curve is just one smooth
 * assumption-driven function of elapsed time, so walking it from that
 * earlier date instead of plan.startDate is enough: the "already invested"
 * portion accrues the same assumed return as everything after it, with no
 * seam at today.
 */
function effectiveStart(plan: Plan): Date {
  const planStart = parseISO(plan.startDate);
  let earliest = planStart;
  for (const evt of plan.events) {
    const d = parseISO(evt.date);
    if (d < earliest) earliest = d;
  }
  return earliest;
}

export function simulate(plan: Plan, scenario: ScenarioKey): SimulationResult {
  const start = effectiveStart(plan);
  const end = parseISO(plan.endDate);
  const months = monthRange(start, end);
  const forecastAt = forecastPriceResolver(plan.assumptions.returns[scenario]);
  const priceAt: PriceAt = (date) => {
    const monthIndex = (date.getUTCFullYear() - start.getUTCFullYear()) * 12 + (date.getUTCMonth() - start.getUTCMonth());
    return forecastAt(monthIndex);
  };
  return runReplay(plan, priceAt, months, scenario, end);
}

export function simulateAllScenarios(plan: Plan): Record<ScenarioKey, SimulationResult> {
  return {
    conservative: simulate(plan, "conservative"),
    expected: simulate(plan, "expected"),
    optimistic: simulate(plan, "optimistic"),
  };
}

// Re-exported for convenience so callers don't need to import from two files.
export { cagr, addMonthsUTC };
export type { Cashflow };
