// Risk & horizon-driven return suggestion. InvestLab doesn't tag individual
// mutual funds by asset class (only NAV + return assumptions, no portfolio
// composition), so a literal equity:debt:gold fund split isn't something the
// engine can act on. This computes a suggested split from a standard
// glide-path rule of thumb, then blends it into a single suggested expected
// return % — shown transparently so the user can accept or ignore it.

import type { RiskTolerance } from "@/lib/stores/use-profile-store";

export interface AllocationSplit {
  equityPct: number;
  debtPct: number;
  goldPct: number;
}

// Assumed long-run annual returns per asset class — a stated assumption like
// every other return % in this app, not a market prediction.
const ASSET_RETURN_PCT = { equity: 12, debt: 7, gold: 8 } as const;

const RISK_ADJUSTMENT_PCT: Record<RiskTolerance, number> = { conservative: -15, moderate: 0, aggressive: 15 };
const GOLD_SLEEVE_PCT = 5;

function baseEquityPct(years: number): number {
  if (years < 3) return 20;
  if (years < 7) return 50;
  if (years < 15) return 70;
  return 85;
}

export function suggestedAllocation(years: number, riskTolerance: RiskTolerance): AllocationSplit {
  const equityPct = Math.min(90, Math.max(10, baseEquityPct(years) + RISK_ADJUSTMENT_PCT[riskTolerance]));
  const goldPct = GOLD_SLEEVE_PCT;
  const debtPct = 100 - equityPct - goldPct;
  return { equityPct, debtPct, goldPct };
}

export function blendedReturnPct(split: AllocationSplit): number {
  return (split.equityPct * ASSET_RETURN_PCT.equity + split.debtPct * ASSET_RETURN_PCT.debt + split.goldPct * ASSET_RETURN_PCT.gold) / 100;
}

/** Shown wherever a risk tier is picked and "Conservative" is selected — "low-risk" here still means market-linked debt funds, not a guaranteed return. */
export const CONSERVATIVE_RISK_NOTE =
  "Even \"Conservative\" here means market-linked debt funds — lower swings, but not a guaranteed return. If you want something with a literally guaranteed return, that's a Fixed Deposit, PPF, or RD, which sit outside what this app models.";
