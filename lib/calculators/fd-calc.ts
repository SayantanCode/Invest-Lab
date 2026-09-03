// Standard fixed-deposit compounding — banks compound quarterly by
// convention. A fixed rate has no scenario band, so this stays outside the
// Plan engine (same reasoning as emi-calc.ts/rd-calc.ts/ppf-calc.ts).

export interface FdResult {
  maturityValue: number;
  totalInterest: number;
}

export function computeFd(principal: number, annualRatePct: number, years: number, compoundingPerYear = 4): FdResult {
  const maturityValue = principal * Math.pow(1 + annualRatePct / 100 / compoundingPerYear, compoundingPerYear * years);
  return { maturityValue, totalInterest: maturityValue - principal };
}
