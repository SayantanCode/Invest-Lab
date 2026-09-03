// Derives a "Regular plan" NAV series from a real Direct-plan series, by
// applying the extra expense ratio as a continuous daily drag on the same
// underlying gross-return path (see app plan doc, Section 10):
//
//   NAV_regular(t) ≈ NAV_direct(t) × (1 − Δexpense)^(t / 365)

import { diffYears, parseISO } from "./date";
import type { NavPoint } from "./historical-price-resolver";

export function deriveRegularNavSeries(direct: NavPoint[], extraExpenseRatioPct: number): NavPoint[] {
  if (direct.length === 0) return [];
  const start = parseISO(direct[0].date);
  const drag = 1 - extraExpenseRatioPct / 100;
  return direct.map((p) => {
    const years = Math.max(diffYears(start, parseISO(p.date)), 0);
    return { date: p.date, nav: p.nav * Math.pow(drag, years) };
  });
}
