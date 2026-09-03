// Runs a plan's three return scenarios through whichever engine path applies
// — a plain single-fund forecast, or a multi-fund portfolio forecast when
// the plan has 2+ valid allocations. Shared by the main plan view and
// Scenario Lab so both compare plans the exact same way.

import {
  simulateAllScenarios,
  simulatePortfolioForecast,
  validateAllocations,
  type Plan,
  type ScenarioKey,
  type SimulationResult,
} from "@/lib/engine";

export function isPortfolioPlan(plan: Plan): boolean {
  const allocations = plan.allocations;
  return (allocations?.length ?? 0) >= 2 && !validateAllocations(allocations ?? []);
}

export function computePlanResults(plan: Plan): Record<ScenarioKey, SimulationResult> {
  const allocations = plan.allocations;
  if (isPortfolioPlan(plan) && allocations) {
    return {
      conservative: simulatePortfolioForecast(plan, "conservative", allocations).overall,
      expected: simulatePortfolioForecast(plan, "expected", allocations).overall,
      optimistic: simulatePortfolioForecast(plan, "optimistic", allocations).overall,
    };
  }
  return simulateAllScenarios(plan);
}
