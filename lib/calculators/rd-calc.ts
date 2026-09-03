// Recurring deposit — a monthly deposit into a balance that compounds
// quarterly, matching how Indian banks actually credit RD interest. Tenure
// is always a whole number of years so every quarter is complete; no
// fabricated interest on a partial quarter at maturity.

export interface RdResult {
  maturityValue: number;
  totalInvested: number;
  totalInterest: number;
}

export function computeRd(monthlyDeposit: number, annualRatePct: number, years: number): RdResult {
  const months = Math.max(1, Math.round(years * 12));
  const quarterlyRate = annualRatePct / 4 / 100;

  let balance = 0;
  for (let m = 1; m <= months; m++) {
    balance += monthlyDeposit;
    if (m % 3 === 0) balance *= 1 + quarterlyRate;
  }

  const totalInvested = monthlyDeposit * months;
  return { maturityValue: balance, totalInvested, totalInterest: balance - totalInvested };
}
