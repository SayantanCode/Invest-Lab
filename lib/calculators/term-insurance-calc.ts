// How much term cover is actually enough — the age-banded-income-multiple
// method most Indian insurers' own "human life value" calculators use
// (younger earners need a bigger multiple, since more years of income are
// at risk), adjusted for what's already owed and already saved. This is
// deliberately more than the flat 12x-income check lib/prioritization.ts
// uses for the Financial Profile checklist — that one only flags whether
// cover looks roughly adequate; this solves for an actual rupee target.

/** Younger earners have more future income at risk, so a bigger multiple — same age-banding shape real insurer calculators use. */
function incomeMultiple(age: number): number {
  if (age < 30) return 20;
  if (age < 40) return 15;
  if (age < 50) return 10;
  return 5;
}

export interface TermInsuranceResult {
  incomeReplacementCover: number;
  recommendedCover: number;
  shortfall: number;
  multiple: number;
}

export function computeTermInsuranceCover(
  annualIncome: number,
  currentAge: number,
  outstandingDebts: number,
  futureGoalCosts: number,
  existingInvestments: number,
  existingCover: number
): TermInsuranceResult {
  const multiple = incomeMultiple(Math.max(18, currentAge));
  const incomeReplacementCover = annualIncome * multiple;
  const recommendedCover = Math.max(
    0,
    incomeReplacementCover + Math.max(0, outstandingDebts) + Math.max(0, futureGoalCosts) - Math.max(0, existingInvestments)
  );
  return {
    incomeReplacementCover,
    recommendedCover,
    shortfall: Math.max(0, recommendedCover - Math.max(0, existingCover)),
    multiple,
  };
}
