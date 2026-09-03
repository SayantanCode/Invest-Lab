// Runs a multi-fund plan as N independent single-fund replays (one per
// allocation, each scaled by its weight%) and merges them into one
// portfolio-level result. This is deliberately NOT a rewrite of the core
// replay loop: plain weighted-SIP allocation has no cross-fund interaction
// (no rebalancing, no shared unit pool), so summing N independent
// simulations is exactly correct, not an approximation — and it means the
// tested single-fund engine never has to change to support this.

import { diffYears, parseISO } from "./date";
import { computeReturns, simulate, type Cashflow } from "./replay";
import { simulateHistorical } from "./historical-replay";
import { firstAvailableDate, lastAvailableDate, type NavPoint } from "./historical-price-resolver";
import { scalePlan } from "./scale-plan";
import type { FundAllocation, LedgerRow, Plan, ScenarioKey, SimulationResult } from "./types";

export interface PortfolioLeg {
  allocation: FundAllocation;
  result: SimulationResult;
}

export interface PortfolioResult {
  overall: SimulationResult;
  legs: PortfolioLeg[];
}

/** Weights should sum to 100 — returns a human-readable problem, or null if the allocation set is valid. */
export function validateAllocations(
  allocations: FundAllocation[],
  opts: { requireHistoricalScheme?: boolean } = {}
): string | null {
  if (allocations.length === 0) return "Add at least one fund.";
  const total = allocations.reduce((sum, a) => sum + a.weightPct, 0);
  if (Math.abs(total - 100) > 0.5) {
    return `Allocations add up to ${total.toFixed(1)}% — they need to total 100%.`;
  }
  // A fund sitting at exactly 0% is valid and simulates fine (it just holds
  // nothing) — it's the deliberate result of pushing another fund to 100%
  // via auto-balancing, not a mistake to block on. The UI surfaces it as a
  // non-blocking nudge instead (see fund-allocation-editor.tsx).
  if (opts.requireHistoricalScheme) {
    if (allocations.some((a) => !a.historicalScheme)) {
      return "Pick a fund for every allocation before backtesting.";
    }
    const codes = allocations.map((a) => a.historicalScheme!.schemeCode);
    if (new Set(codes).size !== codes.length) {
      return "The same fund is allocated more than once — combine those into a single row.";
    }
  }
  return null;
}

function mergeResults(results: SimulationResult[], plan: Plan, label: SimulationResult["scenario"]): SimulationResult {
  const rowCount = Math.max(0, ...results.map((r) => r.ledger.length));
  const ledger: LedgerRow[] = [];
  const cashflows: Cashflow[] = [];

  for (let i = 0; i < rowCount; i++) {
    let contribution = 0;
    let totalInvested = 0;
    let totalWithdrawn = 0;
    let value = 0;
    let gain = 0;
    let date = "";
    const labels = new Set<string>();

    for (const r of results) {
      const row = r.ledger[i];
      if (!row) continue;
      date = row.date;
      contribution += row.contribution;
      totalInvested += row.totalInvested;
      totalWithdrawn += row.totalWithdrawn;
      value += row.value;
      gain += row.gain;
      if (row.eventLabel && row.eventLabel !== "Holding") labels.add(row.eventLabel);
    }

    if (contribution !== 0) {
      cashflows.push({ date: parseISO(date), amount: -contribution });
    }

    ledger.push({
      date,
      eventLabel: labels.size ? [...labels].join(" + ") : "Holding",
      contribution,
      nav: NaN, // no single blended NAV is meaningful across funds — see each leg's own result for that
      units: NaN,
      totalUnits: NaN,
      totalInvested,
      totalWithdrawn,
      value,
      gain,
    });
  }

  const finalValue = ledger.length ? ledger[ledger.length - 1].value : 0;
  const totalInvested = ledger.length ? ledger[ledger.length - 1].totalInvested : 0;
  const totalWithdrawn = ledger.length ? ledger[ledger.length - 1].totalWithdrawn : 0;
  // From the merged ledger's own first row (not plan.startDate) — each leg
  // already walks back to cover any backdated event, so this is the true
  // earliest activity across the whole portfolio.
  const start = ledger.length ? parseISO(ledger[0].date) : parseISO(plan.startDate);
  const end = ledger.length ? parseISO(ledger[ledger.length - 1].date) : parseISO(plan.endDate);

  const returns = computeReturns(
    cashflows,
    finalValue,
    totalInvested,
    totalWithdrawn,
    start,
    end,
    plan.assumptions.inflation
  );

  return { scenario: label, ledger, totalInvested, totalWithdrawn, ...returns };
}

export function simulatePortfolioForecast(
  plan: Plan,
  scenario: ScenarioKey,
  allocations: FundAllocation[]
): PortfolioResult {
  const legs: PortfolioLeg[] = allocations.map((allocation) => {
    const scaled = scalePlan(plan, allocation.weightPct / 100);
    const returns = allocation.returns ?? plan.assumptions.returns;
    const legPlan: Plan = {
      ...scaled,
      events: [...scaled.events, ...(allocation.extraEvents ?? [])],
      assumptions: { ...plan.assumptions, returns },
    };
    return { allocation, result: simulate(legPlan, scenario) };
  });
  const overall = mergeResults(
    legs.map((l) => l.result),
    plan,
    scenario
  );
  return { overall, legs };
}

export interface PortfolioWindow {
  startDate: string;
  endDate: string;
  /** Non-fatal notices — e.g. one fund limits how far back the backtest can meaningfully go. */
  warnings: string[];
  /** Set when the funds simply don't overlap enough to backtest together at all. */
  fatalError: string | null;
}

/**
 * For a multi-fund historical backtest, every included fund needs *real*
 * data across the whole window — clamping a younger fund to its inception
 * NAV (as the single-fund resolver does) would silently distort a portfolio
 * blend. So the portfolio window is the latest of all the funds' inception
 * dates through the earliest of their last-available dates: the true
 * overlap where every fund has genuine data.
 */
export function computePortfolioHistoricalWindow(
  plan: Plan,
  navByAllocationId: Map<string, NavPoint[]>,
  allocations: FundAllocation[]
): PortfolioWindow {
  let latestFirst = plan.startDate;
  let earliestLast = plan.endDate;
  const warnings: string[] = [];

  for (const alloc of allocations) {
    const navs = navByAllocationId.get(alloc.id) ?? [];
    const first = firstAvailableDate(navs);
    const last = lastAvailableDate(navs);
    if (!first || !last) continue;
    if (first > latestFirst) {
      latestFirst = first;
      warnings.push(`${alloc.label} only has data from ${first} — that sets the earliest possible start.`);
    }
    if (last < earliestLast) {
      earliestLast = last;
    }
  }

  if (latestFirst >= earliestLast) {
    return {
      startDate: latestFirst,
      endDate: earliestLast,
      warnings,
      fatalError: "These funds don't have enough overlapping history to backtest together.",
    };
  }

  return { startDate: latestFirst, endDate: earliestLast, warnings, fatalError: null };
}

export function simulatePortfolioHistorical(
  plan: Plan,
  allocations: FundAllocation[],
  navByAllocationId: Map<string, NavPoint[]>,
  window: PortfolioWindow
): PortfolioResult {
  const windowedPlan: Plan = { ...plan, startDate: window.startDate, endDate: window.endDate };

  const legs: PortfolioLeg[] = allocations.map((allocation) => {
    const scaled = scalePlan(windowedPlan, allocation.weightPct / 100);
    const legPlan: Plan = { ...scaled, events: [...scaled.events, ...(allocation.extraEvents ?? [])] };
    const navs = navByAllocationId.get(allocation.id) ?? [];
    return { allocation, result: simulateHistorical(legPlan, navs) };
  });
  const overall = mergeResults(
    legs.map((l) => l.result),
    windowedPlan,
    "historical"
  );
  return { overall, legs };
}

// Re-exported so callers building chart data don't need a separate import.
export { diffYears };
