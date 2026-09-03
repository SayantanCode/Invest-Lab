// EPF's declared annual rate is applied on a monthly-compounding basis
// (the common simplification every free EPF calculator uses — the real
// EPFO mechanics compute interest monthly on the running balance but credit
// it once a year). A government-declared fixed rate has no scenario band,
// so this stays outside the Plan engine, same as fd-calc.ts/ppf-calc.ts.

// By law, 8.33% of the employer's contribution is diverted to fund EPS
// (the pension scheme, eps-calc.ts) — but that diversion is capped in
// rupee terms at 8.33% of this wage ceiling, not as a flat percentage of
// whatever the actual basic is. So `employerPct` here means the employer's
// TOTAL PF contribution (typically the same 12% as the employee's), and
// only the amount above the EPS cap actually lands in this EPF corpus —
// meaning the EPF-bound share rises above the textbook "3.67%" the further
// basic climbs past the ceiling, same shape eps-calc.ts's own cap uses.
const EPS_WAGE_CEILING = 15000;
const EPS_DIVERSION_PCT = 8.33;

/** The employer's contribution actually landing in the EPF corpus this month, after the statutory EPS diversion (capped at the wage ceiling) is carved out. */
function employerEpfContribution(basic: number, employerTotalPct: number): number {
  const employerTotal = basic * (employerTotalPct / 100);
  const epsDiversion = Math.min(basic, EPS_WAGE_CEILING) * (EPS_DIVERSION_PCT / 100);
  return Math.max(0, employerTotal - epsDiversion);
}

function monthlyEpfContribution(basic: number, employeePct: number, employerTotalPct: number): number {
  return basic * (employeePct / 100) + employerEpfContribution(basic, employerTotalPct);
}

export interface EpfResult {
  monthlyContribution: number;
  finalMonthlyContribution: number;
  finalBasicSalary: number;
  maturityValue: number;
  totalInvested: number;
  totalInterest: number;
}

export function computeEpf(
  basicSalary: number,
  employeePct: number,
  employerPct: number,
  annualRatePct: number,
  years: number,
  existingBalance = 0,
  hikeSchedule: number[] = []
): EpfResult {
  const monthlyContribution = monthlyEpfContribution(basicSalary, employeePct, employerPct);
  const n = Math.max(1, Math.round(years * 12));
  const i = annualRatePct / 12 / 100;

  let balance = Math.max(0, existingBalance);
  let currentBasic = basicSalary;
  let totalContributed = 0;

  for (let m = 1; m <= n; m++) {
    // A hike lands on each work anniversary (month 13, 25, ...), never on
    // month 1 itself — the salary you entered is what you're earning right
    // now, this year's. `hikeSchedule` is indexed by completed years of
    // service (index 0 = the raise at year 2), one entry per shape from
    // lib/salary-curve.ts.
    if (m > 1 && (m - 1) % 12 === 0) {
      const anniversaryIndex = (m - 1) / 12 - 1;
      currentBasic *= 1 + (hikeSchedule[anniversaryIndex] ?? 0) / 100;
    }
    const thisMonthContribution = monthlyEpfContribution(currentBasic, employeePct, employerPct);
    balance += thisMonthContribution;
    totalContributed += thisMonthContribution;
    balance *= 1 + i;
  }

  // "Invested" here means principal, not growth — your existing balance is
  // money you already put in (even if some of it was last year's interest),
  // so it belongs on the "contributed" side of the split, not folded into
  // totalInterest, which should only ever mean growth this projection adds.
  const totalInvested = Math.max(0, existingBalance) + totalContributed;
  return {
    monthlyContribution,
    finalMonthlyContribution: monthlyEpfContribution(currentBasic, employeePct, employerPct),
    finalBasicSalary: currentBasic,
    maturityValue: balance,
    totalInvested,
    totalInterest: balance - totalInvested,
  };
}
