// Hitting a retirement corpus target is only half the question — the real
// one is "how much can I actually draw every month for the rest of my
// life?" A flat nominal withdrawal is nearly meaningless over a 20-30 year
// retirement (inflation quietly guts it), so this solves for the *starting*
// monthly withdrawal of a stream that grows with inflation every month
// thereafter — sized to exactly exhaust the corpus after the chosen number
// of retirement years. Same style as lib/goal-calc.ts: pure, no React,
// CAGR-consistent monthly rate.

import { futureCost } from "@/lib/engine";

function monthlyRate(annualPct: number): number {
  return Math.pow(1 + annualPct / 100, 1 / 12) - 1;
}

/**
 * The month-1 withdrawal of a stream that grows with inflation every month
 * thereafter, sized to exhaust `corpus` after `years` of retirement — the
 * standard growing-annuity formula:
 * W0 = P(1+i)^n(i-g) / [(1+i)^n - (1+g)^n].
 */
export function sustainableMonthlyWithdrawal(
  corpus: number,
  postRetirementReturnPct: number,
  inflationPct: number,
  years: number
): number {
  const n = Math.round(Math.max(years, 0) * 12);
  const i = monthlyRate(postRetirementReturnPct);
  const g = monthlyRate(inflationPct);
  if (n <= 0 || corpus <= 0) return 0;
  if (Math.abs(i - g) < 1e-9) return (corpus * i) / n; // degenerate case, same growth both sides
  const growth = Math.pow(1 + i, n);
  const inflationGrowth = Math.pow(1 + g, n);
  return (corpus * growth * (i - g)) / (growth - inflationGrowth);
}

/**
 * The inverse of sustainableMonthlyWithdrawal: given a desired monthly
 * income in today's rupees, what corpus (at the retirement date, nominal)
 * is needed to sustain it? `monthlyIncomeToday` is inflated forward to the
 * retirement date first (same direction accumulationInflationPct/accumulationYears
 * are used elsewhere), then the growing-annuity formula is solved for P
 * directly — this is a closed-form algebraic inversion, not an approximation.
 */
export function requiredCorpusForIncome(
  monthlyIncomeToday: number,
  postRetirementReturnPct: number,
  inflationPct: number,
  retirementYears: number,
  accumulationYears: number
): number {
  const nominalAtRetirement = futureCost(monthlyIncomeToday, inflationPct, accumulationYears);
  const n = Math.round(Math.max(retirementYears, 0) * 12);
  const i = monthlyRate(postRetirementReturnPct);
  const g = monthlyRate(inflationPct);
  if (n <= 0 || nominalAtRetirement <= 0) return 0;
  if (Math.abs(i - g) < 1e-9) return (nominalAtRetirement * n) / i;
  const growth = Math.pow(1 + i, n);
  const inflationGrowth = Math.pow(1 + g, n);
  return (nominalAtRetirement * (growth - inflationGrowth)) / (growth * (i - g));
}
