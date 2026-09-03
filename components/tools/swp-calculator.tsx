"use client";

import * as React from "react";
import { toast } from "sonner";

import { buildScratchPlan } from "@/lib/goals/build-scratch-plan";
import { buildChartData } from "@/lib/goals/build-chart-data";
import { computePlanResults } from "@/lib/goals/compute-plan-results";
import { useSavedPlansStore } from "@/lib/stores/use-plans-store";
import { useActivityLog } from "@/lib/stores/use-activity-log-store";
import { newId } from "@/lib/id";
import { formatINRCompact } from "@/lib/format";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SliderField } from "@/components/plan/slider-field";
import { SummaryCards } from "@/components/plan/summary-cards";
import { ValueChart } from "@/components/plan/value-chart";
import { BreakdownDonut } from "@/components/tools/breakdown-donut";
import { cn } from "@/lib/utils";

export function SwpCalculator({ onSaved }: { onSaved: (planId: string) => void }) {
  const [corpus, setCorpus] = React.useState(2000000);
  const [withdrawal, setWithdrawal] = React.useState(15000);
  const [returnPct, setReturnPct] = React.useState(8);
  const [years, setYears] = React.useState(15);
  const [saving, setSaving] = React.useState(false);
  const { createPlan } = useSavedPlansStore();
  const { logActivity } = useActivityLog();

  const plan = React.useMemo(
    () =>
      buildScratchPlan({
        years,
        expectedReturn: returnPct,
        events: (start) => [
          { id: newId(), type: "LUMPSUM", date: start, amount: corpus, label: "Starting corpus" },
          { id: newId(), type: "SWP_START", date: start, amount: withdrawal, label: "Monthly withdrawal" },
        ],
      }),
    [corpus, withdrawal, returnPct, years]
  );

  const results = React.useMemo(() => computePlanResults(plan), [plan]);
  const chartData = React.useMemo(() => buildChartData(plan, results), [plan, results]);
  const expected = results.expected;

  async function handleSave() {
    setSaving(true);
    try {
      const saved = await createPlan({ name: "SWP Calculator Plan", planType: "retirement", plan });
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
          <CardTitle>Your withdrawal plan</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-5">
          <SliderField id="swp-corpus" label="Starting corpus" value={corpus} onChange={setCorpus} min={100000} max={50000000} step={50000} prefix="₹" />
          <SliderField id="swp-withdrawal" label="Monthly withdrawal" value={withdrawal} onChange={setWithdrawal} min={1000} max={500000} step={1000} prefix="₹" />
          <SliderField id="swp-return" label="Expected annual return" value={returnPct} onChange={setReturnPct} min={1} max={30} step={0.5} suffix="%" />
          <SliderField id="swp-years" label="Duration" value={years} onChange={setYears} min={1} max={40} step={1} suffix="yrs" />
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Saving…" : "Save as Plan"}
          </Button>
        </CardContent>
      </Card>

      <div className="grid gap-5">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-2">
          <Card className="gap-1.5 py-4">
            <CardContent className="px-4">
              <p className="text-xs font-medium text-muted-foreground">Total withdrawn</p>
              <p className="mt-1 font-mono text-xl font-semibold tabular-nums tracking-tight">
                {formatINRCompact(expected.totalWithdrawn)}
              </p>
            </CardContent>
          </Card>
          <Card className="gap-1.5 py-4">
            <CardContent className="px-4">
              <p className="text-xs font-medium text-muted-foreground">Ending balance</p>
              <p
                className={cn(
                  "mt-1 font-mono text-xl font-semibold tabular-nums tracking-tight",
                  expected.finalValue > 0 ? "text-positive" : "text-negative"
                )}
              >
                {formatINRCompact(expected.finalValue)}
              </p>
            </CardContent>
          </Card>
        </div>
        <SummaryCards result={expected} showInflation={false} />
        <BreakdownDonut
          title="Withdrawal breakdown"
          slices={[
            { label: "Invested amount", value: expected.totalInvested, color: "var(--color-chart-3)" },
            { label: "Total withdrawn", value: expected.totalWithdrawn, color: "var(--color-chart-4)" },
            { label: "Ending balance", value: Math.max(0, expected.finalValue), color: "var(--color-chart-1)" },
          ]}
        />
        <Card>
          <CardHeader>
            <CardTitle>Corpus over time</CardTitle>
          </CardHeader>
          <CardContent className="pl-0">
            <ValueChart bare data={chartData} showInflation={false} height={340} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
