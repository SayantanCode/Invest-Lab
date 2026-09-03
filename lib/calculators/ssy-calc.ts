// Sukanya Samriddhi Yojana — a girl-child savings scheme with a fixed
// structure regardless of when it's opened: deposits for 15 years from
// account opening, annual compounding on the running balance, maturity 21
// years from opening (interest keeps accruing on the final 6 years even
// after deposits stop). ₹1.5L/year is the current statutory contribution
// cap, same figure PPF uses.
const CONTRIBUTION_YEARS = 15;
const MATURITY_YEARS = 21;

export interface SsyResult {
  maturityValue: number;
  totalInvested: number;
  totalInterest: number;
  maturityYear: number;
}

export function computeSsy(annualContribution: number, ratePct: number): SsyResult {
  const rate = ratePct / 100;
  let balance = 0;

  for (let year = 1; year <= MATURITY_YEARS; year++) {
    if (year <= CONTRIBUTION_YEARS) balance += annualContribution;
    balance *= 1 + rate;
  }

  const totalInvested = annualContribution * CONTRIBUTION_YEARS;
  return {
    maturityValue: balance,
    totalInvested,
    totalInterest: balance - totalInvested,
    maturityYear: MATURITY_YEARS,
  };
}
