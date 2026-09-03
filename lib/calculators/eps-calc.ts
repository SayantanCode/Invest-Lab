// EPS (Employee Pension Scheme) is a defined-benefit formula, not a
// compounding calculation like EPF — the monthly pension depends on your
// pensionable salary and years of service, not on how much was actually
// contributed, so it doesn't touch the EPF corpus math at all.
//
// Pensionable salary is capped at ₹15,000/month by default — the statutory
// cap that applies unless you've specifically opted into EPFO's 2023
// "higher pension" scheme (opt-in, requires extra contribution), so the
// cap stays the honest default for most members.
//
// The 58-is-normal, ±4%/year adjustment mirrors EPS's own early/deferred
// claim rule: claim from as early as 50 at a permanent 4%-per-year-short
// reduction, or defer up to 60 for a 4%-per-year bonus.

const PENSIONABLE_SALARY_CAP = 15000;
const EPS_DIVISOR = 70;
const NORMAL_PENSION_AGE = 58;
const ADJUSTMENT_PCT_PER_YEAR = 4;

export interface EpsResult {
  pensionableServiceYears: number;
  pensionableSalary: number;
  basePension: number;
  monthlyPension: number;
}

export function computeEps(basicSalary: number, jobStartAge: number, retirementAge: number): EpsResult {
  const pensionableServiceYears = Math.max(0, retirementAge - jobStartAge);
  const pensionableSalary = Math.min(Math.max(0, basicSalary), PENSIONABLE_SALARY_CAP);
  const basePension = (pensionableSalary * pensionableServiceYears) / EPS_DIVISOR;
  const adjustmentPct = (retirementAge - NORMAL_PENSION_AGE) * ADJUSTMENT_PCT_PER_YEAR;
  const monthlyPension = Math.max(0, basePension * (1 + adjustmentPct / 100));
  return { pensionableServiceYears, pensionableSalary, basePension, monthlyPension };
}
