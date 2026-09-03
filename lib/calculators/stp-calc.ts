// STP (Systematic Transfer Plan): a lumpsum sits in a source fund (usually
// debt/liquid — modest, steadier return) while a fixed amount moves out of
// it each month into a destination fund (usually equity), which compounds
// on its own. Simulated month by month rather than closed-form, since the
// source can run dry before the requested transfer window ends — same
// contribute-then-grow (annuity-due) order lib/goal-calc.ts and the core
// engine use everywhere else in this app, for consistent numbers.

export interface StpResult {
  monthsTransferred: number;
  sourceDepletedEarly: boolean;
  totalTransferred: number;
  sourceRemainingValue: number;
  destinationValue: number;
  destinationInvested: number;
  destinationGain: number;
}

export function computeStp(
  sourceLumpsum: number,
  monthlyTransfer: number,
  sourceRatePct: number,
  destRatePct: number,
  transferMonths: number
): StpResult {
  const sourceMonthlyRate = sourceRatePct / 12 / 100;
  const destMonthlyRate = destRatePct / 12 / 100;
  const n = Math.max(0, Math.round(transferMonths));

  let sourceBalance = Math.max(0, sourceLumpsum);
  let destBalance = 0;
  let totalTransferred = 0;
  let monthsTransferred = 0;

  for (let m = 0; m < n; m++) {
    if (sourceBalance <= 0) break;
    const transfer = Math.min(monthlyTransfer, sourceBalance);
    sourceBalance -= transfer;
    destBalance += transfer;
    totalTransferred += transfer;
    monthsTransferred++;

    sourceBalance *= 1 + sourceMonthlyRate;
    destBalance *= 1 + destMonthlyRate;
  }

  return {
    monthsTransferred,
    sourceDepletedEarly: monthsTransferred < n,
    totalTransferred,
    sourceRemainingValue: sourceBalance,
    destinationValue: destBalance,
    destinationInvested: totalTransferred,
    destinationGain: destBalance - totalTransferred,
  };
}
