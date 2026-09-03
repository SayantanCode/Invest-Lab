// Senior Citizen Savings Scheme — a fixed lumpsum deposit whose interest is
// paid out quarterly to the depositor rather than reinvested, so unlike
// every other government-scheme calculator here (PPF/SSY compound; this one
// doesn't) the principal itself never grows. ₹30L is the current per-person
// deposit cap; 5 years is the base tenure (extendable once, by 3 years —
// not modeled here, same "state the base case, not every possible
// extension" simplification lib/ppf-calc.ts's 15-year lock-in uses).
const BASE_TENURE_YEARS = 5;

export interface ScssResult {
  quarterlyPayout: number;
  annualPayout: number;
  totalInterestOverTenure: number;
  maturityValue: number;
}

export function computeScss(depositAmount: number, ratePct: number, years: number = BASE_TENURE_YEARS): ScssResult {
  const principal = Math.max(0, depositAmount);
  const annualPayout = principal * (ratePct / 100);
  return {
    quarterlyPayout: annualPayout / 4,
    annualPayout,
    totalInterestOverTenure: annualPayout * years,
    maturityValue: principal,
  };
}
