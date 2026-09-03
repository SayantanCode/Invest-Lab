"use client";

import * as React from "react";
import { toast } from "sonner";

import { buildScratchPlan } from "@/lib/goals/build-scratch-plan";
import { buildChartData } from "@/lib/goals/build-chart-data";
import { computePlanResults } from "@/lib/goals/compute-plan-results";
import { useSavedPlansStore } from "@/lib/stores/use-plans-store";
import { useActivityLog } from "@/lib/stores/use-activity-log-store";
import { newId } from "@/lib/id";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SliderField } from "@/components/plan/slider-field";
import { SummaryCards } from "@/components/plan/summary-cards";
import { ValueChart } from "@/components/plan/value-chart";
import { BreakdownDonut } from "@/components/tools/breakdown-donut";

export function LumpsumCalculator({ onSaved }: { onSaved: (planId: string) => void }) {
  const [amount, setAmount] = React.useState(500000);
  const [returnPct, setReturnPct] = React.useState(12);
  const [years, setYears] = React.useState(15);
  const [saving, setSaving] = React.useState(false);
  const { createPlan } = useSavedPlansStore();
  const { logActivity } = useActivityLog();

  const plan = React.useMemo(
    () =>
      buildScratchPlan({
        years,
        expectedReturn: returnPct,
        events: (start) => [{ id: newId(), type: "LUMPSUM", date: start, amount, label: "One-time investment" }],
      }),
    [amount, returnPct, years]
  );

  const results = React.useMemo(() => computePlanResults(plan), [plan]);
  const chartData = React.useMemo(() => buildChartData(plan, results), [plan, results]);

  async function handleSave() {
    setSaving(true);
    try {
      const saved = await createPlan({ name: "Lumpsum Calculator Plan", planType: "wealth", plan });
      logActivity({ kind: "plan_created", planId: saved.id, message: `Plan "${saved.name}" created` });
      toast.success("Saved as a new plan");
      onSaved(saved.id);
    } catch {
      toast.error("Couldn't save this plan — try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="grid gap-5 lg:grid-cols-[320px_1fr]">
      <Card className="h-fit">
        <CardHeader>
          <CardTitle>Your investment</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-5">
          <SliderField id="lumpsum-amount" label="Initial amount" value={amount} onChange={setAmount} min={5000} max={10000000} step={5000} prefix="₹" />
          <SliderField id="lumpsum-return" label="Expected annual return" value={returnPct} onChange={setReturnPct} min={1} max={30} step={0.5} suffix="%" />
          <SliderField id="lumpsum-years" label="Duration" value={years} onChange={setYears} min={1} max={40} step={1} suffix="yrs" />
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Saving…" : "Save as Plan"}
          </Button>
        </CardContent>
      </Card>

      <div className="grid gap-5">
        <SummaryCards result={results.expected} showInflation={false} />
        <BreakdownDonut
          title="Investment breakdown"
          centerLabel="Total value"
          centerValue={results.expected.finalValue}
          slices={[
            { label: "Invested amount", value: results.expected.totalInvested, color: "var(--color-chart-3)" },
            { label: "Est. returns", value: results.expected.gain, color: "var(--color-chart-1)" },
          ]}
        />
        <Card>
          <CardHeader>
            <CardTitle>Projected growth</CardTitle>
          </CardHeader>
          <CardContent className="pl-0">
            <ValueChart bare data={chartData} showInflation={false} height={340} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
