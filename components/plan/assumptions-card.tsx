"use client";

import { Check, FilePlus2 } from "lucide-react";
import type { Plan, ScenarioKey } from "@/lib/engine";
import { SCENARIO_LABEL, SCENARIOS } from "@/lib/engine";
import { primarySipAmount, withPrimarySipAmount } from "@/lib/goals/plan-sip";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SliderField } from "@/components/plan/slider-field";
import { PlanTimingField } from "@/components/plan/plan-timing-field";

export function AssumptionsCard({
  plan,
  onChange,
  onNewPlan,
  onDone,
}: {
  plan: Plan;
  onChange: (plan: Plan) => void;
  onNewPlan: () => void;
  /** When provided, shows a "Done" button that returns to the read-only plan dashboard. */
  onDone?: () => void;
}) {
  function set<K extends keyof Plan>(key: K, value: Plan[K]) {
    onChange({ ...plan, [key]: value });
  }

  function setReturn(scenario: ScenarioKey, value: number) {
    onChange({
      ...plan,
      assumptions: {
        ...plan.assumptions,
        returns: { ...plan.assumptions.returns, [scenario]: value },
      },
    });
  }

  return (
    <Card>
      <CardHeader className="flex-row flex-wrap items-start justify-between gap-3 space-y-0">
        <div>
          <CardTitle>Plan settings</CardTitle>
          <CardDescription>Assumptions only — not a guarantee. Adjust to see how sensitive your plan is.</CardDescription>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          <Button variant="ghost" size="sm" onClick={onNewPlan} className="gap-1.5 text-muted-foreground">
            <FilePlus2 className="size-3.5" />
            New plan
          </Button>
          {onDone && (
            <Button size="sm" onClick={onDone} className="gap-1.5">
              <Check className="size-3.5" />
              Done
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="grid gap-5">
        <div className="grid gap-2">
          <Label htmlFor="plan-name">Plan name</Label>
          <Input id="plan-name" value={plan.name} onChange={(e) => set("name", e.target.value)} />
        </div>

        <SliderField
          id="advanced-monthly-amount"
          label="Monthly investment"
          value={primarySipAmount(plan)}
          onChange={(v) => onChange(withPrimarySipAmount(plan, v))}
          min={500}
          max={200000}
          step={500}
          prefix="₹"
        />

        <PlanTimingField
          startDate={plan.startDate}
          endDate={plan.endDate}
          onChange={(startDate, endDate) => onChange({ ...plan, startDate, endDate })}
          variant="advanced"
        />

        <div className="grid gap-4 border-t pt-4">
          {SCENARIOS.map((s) => (
            <SliderField
              key={s}
              id={`return-${s}`}
              label={`${SCENARIO_LABEL[s]} return`}
              value={plan.assumptions.returns[s]}
              onChange={(v) => setReturn(s, v)}
              min={0}
              max={30}
              step={0.5}
              suffix="%"
              size="sm"
            />
          ))}
          <SliderField
            id="inflation"
            label="Inflation"
            value={plan.assumptions.inflation}
            onChange={(v) => onChange({ ...plan, assumptions: { ...plan.assumptions, inflation: v } })}
            min={0}
            max={15}
            step={0.5}
            suffix="%"
            size="sm"
          />
        </div>
      </CardContent>
    </Card>
  );
}
