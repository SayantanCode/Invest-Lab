// Turns a few calculator inputs into a full Plan object, so the standalone
// Tools calculators can reuse the exact same simulation engine every saved
// plan runs through, instead of a second, potentially-diverging model.

import { makeDefaultPlan, todayISO } from "@/lib/goals/default-plan";
import { deriveReturnBand } from "@/components/plan/simple-plan-card";
import { addYearsUTC, parseISO, toISODate, type Plan, type PlanEvent } from "@/lib/engine";

export function buildScratchPlan({
  years,
  events,
  expectedReturn,
  inflation,
  inflationEnabled,
}: {
  years: number;
  /** Receives the plan's start date, so event dates never risk drifting from it. */
  events: (start: string) => PlanEvent[];
  expectedReturn: number;
  inflation?: number;
  inflationEnabled?: boolean;
}): Plan {
  const start = todayISO();
  const band = deriveReturnBand(expectedReturn);
  return {
    ...makeDefaultPlan(start),
    endDate: toISODate(addYearsUTC(parseISO(start), Math.max(years, 1))),
    events: events(start),
    assumptions: {
      returns: { conservative: band.conservative, expected: expectedReturn, optimistic: band.optimistic },
      inflation: inflation ?? 6,
      inflationEnabled: inflationEnabled ?? false,
      stepUp: { enabled: false, percent: 10 },
    },
  };
}
