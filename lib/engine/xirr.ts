// XIRR via Newton-Raphson with a bisection fallback. Pure function, no deps.
// See app plan doc, Section 10 ("The math").

export interface Cashflow {
  date: Date;
  amount: number; // negative = outflow (invested), positive = inflow (withdrawn / final value)
}

const MS_PER_DAY = 1000 * 60 * 60 * 24;

function daysBetween(a: Date, b: Date): number {
  return (b.getTime() - a.getTime()) / MS_PER_DAY;
}

function npv(rate: number, cashflows: Cashflow[], t0: Date): number {
  return cashflows.reduce((sum, cf) => {
    const years = daysBetween(t0, cf.date) / 365;
    return sum + cf.amount / Math.pow(1 + rate, years);
  }, 0);
}

function dNpv(rate: number, cashflows: Cashflow[], t0: Date): number {
  return cashflows.reduce((sum, cf) => {
    const years = daysBetween(t0, cf.date) / 365;
    if (years === 0) return sum;
    return sum - (years * cf.amount) / Math.pow(1 + rate, years + 1);
  }, 0);
}

/**
 * Solves for the annualized internal rate of return of a signed cashflow series.
 * Returns null if no sign change exists (can't converge) or the series is too short.
 */
export function xirr(cashflows: Cashflow[], guess = 0.12): number | null {
  const flows = cashflows.filter((cf) => cf.amount !== 0);
  if (flows.length < 2) return null;

  const hasPositive = flows.some((cf) => cf.amount > 0);
  const hasNegative = flows.some((cf) => cf.amount < 0);
  if (!hasPositive || !hasNegative) return null;

  const t0 = flows.reduce((min, cf) => (cf.date < min ? cf.date : min), flows[0].date);

  // Newton-Raphson
  let rate = guess;
  for (let i = 0; i < 60; i++) {
    const f = npv(rate, flows, t0);
    const df = dNpv(rate, flows, t0);
    if (Math.abs(df) < 1e-12) break;
    const next = rate - f / df;
    if (!Number.isFinite(next) || next <= -0.999) break;
    if (Math.abs(next - rate) < 1e-7) return next;
    rate = next;
  }
  if (Number.isFinite(rate) && Math.abs(npv(rate, flows, t0)) < 1) {
    return rate;
  }

  // Bisection fallback across a wide, sane bracket.
  let lo = -0.99;
  let hi = 10;
  let fLo = npv(lo, flows, t0);
  const fHi = npv(hi, flows, t0);
  if (Number.isNaN(fLo) || Number.isNaN(fHi) || fLo * fHi > 0) return null;

  for (let i = 0; i < 200; i++) {
    const mid = (lo + hi) / 2;
    const fMid = npv(mid, flows, t0);
    if (Math.abs(fMid) < 1e-6 || hi - lo < 1e-9) return mid;
    if (fLo * fMid < 0) {
      hi = mid;
    } else {
      lo = mid;
      fLo = fMid;
    }
  }
  return (lo + hi) / 2;
}

export function cagr(startValue: number, endValue: number, days: number): number | null {
  if (startValue <= 0 || endValue <= 0 || days <= 0) return null;
  return Math.pow(endValue / startValue, 365 / days) - 1;
}
