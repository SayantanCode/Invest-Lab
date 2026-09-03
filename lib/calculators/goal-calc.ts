// Reverse-SIP math for goal planning: given a target corpus, how much do
// you need to invest monthly to get there? This is the inverse of the
// engine's forward replay — a closed-form annuity calculation (a goal is a
// number to aim for, not a real event stream to replay).

import { futureCost } from "@/lib/engine";

/** CAGR-consistent monthly rate — annual^(1/12), matching forecastPriceResolver, not the naive annual/12 most calculators skip. */
function monthlyRate(annualReturnPct: number): number {
  return Math.pow(1 + annualReturnPct / 100, 1 / 12) - 1;
}

/** How much a goal costs today will actually cost by the target date, after inflation. */
export function inflatedTarget(targetAmountToday: number, inflationPct: number, years: number): number {
  return futureCost(targetAmountToday, inflationPct, Math.max(years, 0));
}

/** What existing savings, put in today and left untouched, grow to by the target date at `annualReturnPct`. */
export function grownExistingSavings(existingSavings: number, annualReturnPct: number, years: number): number {
  const n = Math.round(Math.max(years, 0) * 12);
  const i = monthlyRate(annualReturnPct);
  return Math.max(0, existingSavings) * Math.pow(1 + i, n);
}

/**
 * The monthly SIP needed to close the *remaining* gap to `targetFV` in
 * `years` at `annualReturnPct`, after crediting whatever `existingSavings`
 * will grow to on their own by then — money you've already set aside for
 * this goal shouldn't be modeled as if it doesn't exist. The underlying
 * math is the annuity-due future-value formula, inverted:
 * P = (FV - existing_grown) / ( [(1+i)^n - 1]/i × (1+i) ).
 */
export function requiredMonthlySip(
  targetFV: number,
  annualReturnPct: number,
  years: number,
  existingSavings = 0
): number {
  const n = Math.round(Math.max(years, 0) * 12);
  const i = monthlyRate(annualReturnPct);
  const remaining = Math.max(0, targetFV - grownExistingSavings(existingSavings, annualReturnPct, years));
  if (n <= 0 || remaining <= 0) return 0;
  if (i <= 0) return remaining / n;
  const factor = ((Math.pow(1 + i, n) - 1) / i) * (1 + i);
  return remaining / factor;
}

/** The forward form of the annuity math requiredMonthlySip inverts: what a fixed monthly contribution grows to over a horizon. */
export function futureValueOfSip(monthlyAmount: number, annualReturnPct: number, years: number): number {
  const n = Math.round(Math.max(years, 0) * 12);
  const i = monthlyRate(annualReturnPct);
  if (n <= 0 || monthlyAmount <= 0) return 0;
  if (i <= 0) return monthlyAmount * n;
  return monthlyAmount * (((Math.pow(1 + i, n) - 1) / i) * (1 + i));
}

export interface YearsToTargetResult {
  years: number;
  feasible: boolean;
}

/** Safety cap, not a real limit — matches lib/goal-schedule.ts's MAX_HORIZON_MONTHS. */
const MAX_SOLVE_MONTHS = 600;

/**
 * The inverse of requiredMonthlySip: given a fixed monthly contribution
 * instead of a fixed timeline, how many years until the (inflation-growing)
 * target is reachable? Not a closed-form inversion — the target itself
 * inflates over the horizon being solved for — so this scans forward
 * month-by-month, re-evaluating the closed-form SIP formula each step and
 * stopping at the first month it fits within the given contribution.
 */
export function requiredYearsToTarget(
  targetAmountToday: number,
  inflationPct: number,
  annualReturnPct: number,
  monthlyContribution: number,
  existingSavings = 0
): YearsToTargetResult {
  for (let months = 1; months <= MAX_SOLVE_MONTHS; months++) {
    const years = months / 12;
    const target = inflatedTarget(targetAmountToday, inflationPct, years);
    if (requiredMonthlySip(target, annualReturnPct, years, existingSavings) <= monthlyContribution) {
      return { years, feasible: true };
    }
  }
  return { years: MAX_SOLVE_MONTHS / 12, feasible: false };
}
