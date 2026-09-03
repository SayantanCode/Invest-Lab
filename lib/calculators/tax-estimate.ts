// A read-only pass over a finished ledger — reconstructs FIFO purchase lots
// from the ledger's own units/nav/date columns after the fact, rather than
// tracking cost basis inside the core replay engine (lib/engine/replay.ts).
// That engine is the most load-bearing code in the app; this keeps tax
// estimation fully additive, with zero risk of perturbing the already-correct
// value/XIRR numbers everywhere else.

import type { LedgerRow } from "@/lib/engine";
import { parseISO } from "@/lib/engine";

export type AssetClass = "equity" | "debt";

interface Lot {
  date: Date;
  units: number;
  costPerUnit: number;
}

export interface TaxEstimate {
  /** Gains already realized by WITHDRAWAL/SWP events in the ledger. */
  stcgEquity: number;
  ltcgEquity: number;
  debtGain: number;
  /** Tax on the realized gains above. */
  taxOwedDuringPlan: number;
  /** Gains on whatever's still held, if it were all redeemed on the ledger's last date. */
  hypoStcgEquity: number;
  hypoLtcgEquity: number;
  hypoDebtGain: number;
  /** Tax on the hypothetical gains above. */
  hypotheticalExitTax: number;
  /** The last row's value, minus hypotheticalExitTax. */
  postTaxFinalValue: number;
}

// Current FY24-25 equity rates and the post-April-2023 debt-fund rule (all
// gains at slab rate, no indexation) — stated as constants so they're easy
// to find and update if rates change.
const EQUITY_STCG_PCT = 20;
const EQUITY_LTCG_PCT = 12.5;
const EQUITY_LTCG_EXEMPTION = 125000; // ₹1.25L — one plan-lifetime bucket, not the real per-financial-year rule.
const LTCG_HOLDING_DAYS = 365;

function taxOnEquityGains(stcg: number, ltcg: number): number {
  return (
    Math.max(0, stcg) * (EQUITY_STCG_PCT / 100) +
    Math.max(0, Math.max(0, ltcg) - EQUITY_LTCG_EXEMPTION) * (EQUITY_LTCG_PCT / 100)
  );
}

export function estimateTax(ledger: LedgerRow[], assetClass: AssetClass, taxSlabPct: number): TaxEstimate {
  const lots: Lot[] = [];
  let stcgEquity = 0;
  let ltcgEquity = 0;
  let debtGain = 0;

  for (const row of ledger) {
    if (row.units > 1e-9) {
      lots.push({ date: parseISO(row.date), units: row.units, costPerUnit: row.nav });
    } else if (row.units < -1e-9) {
      let toSell = -row.units;
      while (toSell > 1e-9 && lots.length) {
        const lot = lots[0];
        const sold = Math.min(lot.units, toSell);
        const gain = sold * (row.nav - lot.costPerUnit);
        const daysHeld = (parseISO(row.date).getTime() - lot.date.getTime()) / 86_400_000;
        if (assetClass === "debt") debtGain += gain;
        else if (daysHeld >= LTCG_HOLDING_DAYS) ltcgEquity += gain;
        else stcgEquity += gain;
        lot.units -= sold;
        toSell -= sold;
        if (lot.units <= 1e-9) lots.shift();
      }
    }
  }

  const taxOwedDuringPlan =
    taxOnEquityGains(stcgEquity, ltcgEquity) + (assetClass === "debt" ? debtGain * (taxSlabPct / 100) : 0);

  const last = ledger[ledger.length - 1];
  let hypoStcg = 0;
  let hypoLtcg = 0;
  let hypoDebtGain = 0;
  if (last) {
    for (const lot of lots) {
      const gain = lot.units * (last.nav - lot.costPerUnit);
      const daysHeld = (parseISO(last.date).getTime() - lot.date.getTime()) / 86_400_000;
      if (assetClass === "debt") hypoDebtGain += gain;
      else if (daysHeld >= LTCG_HOLDING_DAYS) hypoLtcg += gain;
      else hypoStcg += gain;
    }
  }
  const hypotheticalExitTax =
    taxOnEquityGains(hypoStcg, hypoLtcg) + (assetClass === "debt" ? hypoDebtGain * (taxSlabPct / 100) : 0);

  return {
    stcgEquity,
    ltcgEquity,
    debtGain,
    taxOwedDuringPlan,
    hypoStcgEquity: hypoStcg,
    hypoLtcgEquity: hypoLtcg,
    hypoDebtGain,
    hypotheticalExitTax,
    postTaxFinalValue: (last?.value ?? 0) - hypotheticalExitTax,
  };
}
