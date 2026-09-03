// PPF compounds annually (unlike the engine's monthly-compounding market
// scenarios) — interest for the year is earned on the balance plus that
// year's contribution, credited at year end. A government-declared fixed
// rate has no scenario band, so this stays outside the Plan engine.

export interface PpfYearRow {
  year: number;
  contribution: number;
  interest: number;
  balance: number;
}

export interface PpfResult {
  maturityValue: number;
  totalInvested: number;
  totalInterest: number;
  schedule: PpfYearRow[];
}

export function computePpf(annualContribution: number, annualRatePct: number, years: number): PpfResult {
  let balance = 0;
  const schedule: PpfYearRow[] = [];

  for (let y = 1; y <= years; y++) {
    const interest = (balance + annualContribution) * (annualRatePct / 100);
    balance = balance + annualContribution + interest;
    schedule.push({ year: y, contribution: annualContribution, interest, balance });
  }

  const totalInvested = annualContribution * years;
  return { maturityValue: balance, totalInvested, totalInterest: balance - totalInvested, schedule };
}
