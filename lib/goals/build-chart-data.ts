// Shared "value over time" series builder — same shape ValueChart has always
// consumed, factored out so both a single plan's Overview tab and the
// Dashboard's top-plan preview can build it from a plan + its results.

import { diffYears, parseISO, realValue, type Plan, type ScenarioKey, type SimulationResult } from "@/lib/engine";
import type { ChartPoint } from "@/components/plan/value-chart";

export function buildChartData(plan: Plan, results: Record<ScenarioKey, SimulationResult>): ChartPoint[] {
  const { conservative, expected, optimistic } = results;
  const start = expected.ledger.length ? parseISO(expected.ledger[0].date) : parseISO(plan.startDate);
  return expected.ledger.map((row, i) => {
    const years = diffYears(start, parseISO(row.date));
    return {
      date: row.date,
      invested: row.totalInvested,
      conservative: conservative.ledger[i]?.value ?? 0,
      expected: row.value,
      optimistic: optimistic.ledger[i]?.value ?? 0,
      real: realValue(row.value, plan.assumptions.inflation, Math.max(years, 0)),
    };
  });
}
