// Calendar-year rollup of a plan's ledger — shared by the Cashflow Table
// (Invested/Lumpsum/Withdrawals/Growth/End Value/Return% columns) and the
// Performance tab's Annual Returns chart, so both read the same numbers.

import type { LedgerRow } from "@/lib/engine";

export interface YearlyReturn {
  year: string;
  invested: number; // regular (non-lumpsum) contributions this year
  lumpsum: number; // lumpsum contributions this year
  withdrawals: number; // withdrawals this year, as a positive number
  growth: number; // change in cumulative gain across the year boundary
  endValue: number; // portfolio value at the last row of the year
  returnPct: number | null; // growth / value at the start of the year, as a percent
}

export function computeYearlyReturns(ledger: LedgerRow[]): YearlyReturn[] {
  const byYear = new Map<string, LedgerRow[]>();
  for (const row of ledger) {
    const year = row.date.slice(0, 4);
    const bucket = byYear.get(year) ?? [];
    bucket.push(row);
    byYear.set(year, bucket);
  }

  const years = [...byYear.keys()].sort();
  let prevGain = 0;
  let prevValue = 0;

  return years.map((year) => {
    const rows = byYear.get(year)!;
    let invested = 0;
    let lumpsum = 0;
    let withdrawals = 0;
    for (const row of rows) {
      if (row.contribution > 0) {
        if (row.eventLabel.includes("Lumpsum")) lumpsum += row.contribution;
        else invested += row.contribution;
      } else if (row.contribution < 0) {
        withdrawals += Math.abs(row.contribution);
      }
    }

    const last = rows[rows.length - 1];
    const growth = last.gain - prevGain;
    const returnPct = prevValue > 0 ? (growth / prevValue) * 100 : null;

    const entry: YearlyReturn = {
      year,
      invested,
      lumpsum,
      withdrawals,
      growth,
      endValue: last.value,
      returnPct,
    };

    prevGain = last.gain;
    prevValue = last.value;
    return entry;
  });
}
