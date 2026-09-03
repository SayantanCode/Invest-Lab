// Reducing-balance EMI — the standard loan amortization formula. A fixed-rate
// loan has no scenario band (there's nothing to be "optimistic" or
// "conservative" about), so this stays outside the Plan engine entirely,
// same reasoning as fd-calc.ts/rd-calc.ts/ppf-calc.ts/epf-calc.ts.

export interface EmiYearRow {
  year: number;
  principalPaid: number;
  interestPaid: number;
  balance: number;
}

export interface EmiResult {
  emi: number;
  totalInterest: number;
  totalPayment: number;
  schedule: EmiYearRow[];
}

export function computeEmi(principal: number, annualRatePct: number, years: number): EmiResult {
  const n = Math.max(1, Math.round(years * 12));
  const r = annualRatePct / 12 / 100;
  const emi = r === 0 ? principal / n : (principal * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);

  let balance = principal;
  const schedule: EmiYearRow[] = [];
  let yearPrincipal = 0;
  let yearInterest = 0;

  for (let m = 1; m <= n; m++) {
    const interest = balance * r;
    const principalPaid = Math.min(balance, emi - interest);
    balance = Math.max(0, balance - principalPaid);
    yearPrincipal += principalPaid;
    yearInterest += interest;

    if (m % 12 === 0 || m === n) {
      schedule.push({ year: Math.ceil(m / 12), principalPaid: yearPrincipal, interestPaid: yearInterest, balance });
      yearPrincipal = 0;
      yearInterest = 0;
    }
  }

  const totalPayment = emi * n;
  return { emi, totalInterest: totalPayment - principal, totalPayment, schedule };
}
