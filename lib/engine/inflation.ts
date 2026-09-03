// Inflation adjustment helpers. See app plan doc, Section 10.

/** Converts a future nominal value into today's purchasing power. */
export function realValue(nominalValue: number, inflationPct: number, years: number): number {
  return nominalValue / Math.pow(1 + inflationPct / 100, years);
}

/** Reverse case: what a today-priced goal will actually cost `years` from now. */
export function futureCost(todayCost: number, inflationPct: number, years: number): number {
  return todayCost * Math.pow(1 + inflationPct / 100, years);
}
