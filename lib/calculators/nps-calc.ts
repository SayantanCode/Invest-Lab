// NPS (National Pension System, Tier-I) — monthly compounding on a
// user-chosen blended return, same simplification epf-calc.ts/ppf-calc.ts
// use for every other government-linked scheme this app models: a real NPS
// account's return depends on the subscriber's own fund-manager and
// equity/corporate-debt/gilt split (Active Choice) or a glide path by age
// (Auto Choice), neither of which this app tracks fund-by-fund — so the
// return is a stated assumption the user sets, not a market prediction.
//
// At exit, PFRDA rules require at least 40% of the corpus go toward buying
// an annuity (a fixed monthly pension for life); up to 60% can be withdrawn
// as a lump sum, and — unlike EPF/PPF withdrawals — that lump sum is fully
// tax-free. (If the total corpus is small, 100% lump-sum withdrawal is
// allowed instead; that threshold isn't modeled here, same spirit as EPS's
// own simplifications elsewhere in this app.) The resulting monthly pension
// is only ever a rough estimate — real annuity rates vary by provider, payout
// option (with/without spouse cover, return-of-purchase-price, etc.) and
// change over time; this uses a single flat assumed rate the user can adjust.

export interface NpsResult {
  maturityValue: number;
  totalInvested: number;
  totalInterest: number;
  lumpSumWithdrawal: number;
  annuityPurchaseAmount: number;
  estimatedMonthlyAnnuity: number;
}

export function computeNps(
  monthlyContribution: number,
  annualRatePct: number,
  years: number,
  existingBalance = 0,
  lumpSumWithdrawalPct = 60,
  annuityRatePct = 6
): NpsResult {
  const n = Math.max(1, Math.round(years * 12));
  const i = annualRatePct / 12 / 100;

  let balance = Math.max(0, existingBalance);
  for (let m = 1; m <= n; m++) {
    balance += monthlyContribution;
    balance *= 1 + i;
  }

  const totalContributed = monthlyContribution * n;
  const totalInvested = Math.max(0, existingBalance) + totalContributed;
  const clampedLumpSumPct = Math.min(60, Math.max(0, lumpSumWithdrawalPct));
  const lumpSumWithdrawal = balance * (clampedLumpSumPct / 100);
  const annuityPurchaseAmount = balance - lumpSumWithdrawal;

  return {
    maturityValue: balance,
    totalInvested,
    totalInterest: balance - totalInvested,
    lumpSumWithdrawal,
    annuityPurchaseAmount,
    estimatedMonthlyAnnuity: (annuityPurchaseAmount * (annuityRatePct / 100)) / 12,
  };
}
