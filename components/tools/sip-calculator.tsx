"use client";

import * as React from "react";
import { toast } from "sonner";
import { ChevronDown, ChevronUp } from "lucide-react";

import { buildScratchPlan } from "@/lib/goals/build-scratch-plan";
import { buildChartData } from "@/lib/goals/build-chart-data";
import { computePlanResults } from "@/lib/goals/compute-plan-results";
import { useSavedPlansStore } from "@/lib/stores/use-plans-store";
import { useActivityLog } from "@/lib/stores/use-activity-log-store";
import { newId } from "@/lib/id";
import { addYearsUTC, parseISO, toISODate, type PlanEvent } from "@/lib/engine";
import { formatDate, formatINR } from "@/lib/format";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { SliderField } from "@/components/plan/slider-field";
import { SummaryCards } from "@/components/plan/summary-cards";
import { ValueChart } from "@/components/plan/value-chart";
import { BreakdownDonut } from "@/components/tools/breakdown-donut";

/** One SIP_STEPUP event per anniversary year (year 1 through years-1) — the same "raise the SIP by X% every year" pattern lib/goals/default-plan.ts's own example plan uses. */
function buildStepUpEvents(start: string, years: number, stepUpPercent: number): PlanEvent[] {
  const events: PlanEvent[] = [];
  for (let y = 1; y < years; y++) {
    events.push({
      id: newId(),
      type: "SIP_STEPUP",
      date: toISODate(addYearsUTC(parseISO(start), y)),
      mode: "percent",
      value: stepUpPercent,
      label: "Annual step-up",
    });
  }
  return events;
}

interface SipCalculatorInitial {
  monthly?: number;
  returnPct?: number;
  years?: number;
}

export function SipCalculator({
  initial,
  onSaved,
}: {
  initial?: SipCalculatorInitial;
  onSaved: (planId: string) => void;
}) {
  const [monthly, setMonthly] = React.useState(initial?.monthly ?? 10000);
  const [returnPct, setReturnPct] = React.useState(initial?.returnPct ?? 12);
  const [years, setYears] = React.useState(initial?.years ?? 15);
  const [stepUpEnabled, setStepUpEnabled] = React.useState(false);
  const [stepUpPercent, setStepUpPercent] = React.useState(10);
  const [inflationEnabled, setInflationEnabled] = React.useState(false);
  const [inflationPct, setInflationPct] = React.useState(6);
  const [showBreakdown, setShowBreakdown] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const { createPlan } = useSavedPlansStore();
  const { logActivity } = useActivityLog();

  const plan = React.useMemo(
    () =>
      buildScratchPlan({
        years,
        expectedReturn: returnPct,
        inflation: inflationPct,
        inflationEnabled,
        events: (start) => [
          { id: newId(), type: "SIP_START", date: start, amount: monthly, label: "Monthly SIP" },
          ...(stepUpEnabled ? buildStepUpEvents(start, years, stepUpPercent) : []),
        ],
      }),
    [monthly, returnPct, years, stepUpEnabled, stepUpPercent, inflationEnabled, inflationPct]
  );

  const results = React.useMemo(() => computePlanResults(plan), [plan]);
  const chartData = React.useMemo(() => buildChartData(plan, results), [plan, results]);

  async function handleSave() {
    setSaving(true);
    try {
      const saved = await createPlan({ name: "SIP Calculator Plan", planType: "wealth", plan });
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
          <CardTitle>Your SIP</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-5">
          <SliderField id="sip-monthly" label="Monthly investment" value={monthly} onChange={setMonthly} min={500} max={200000} step={500} prefix="₹" />
          <SliderField id="sip-return" label="Expected annual return" value={returnPct} onChange={setReturnPct} min={1} max={30} step={0.5} suffix="%" />
          <SliderField id="sip-years" label="Duration" value={years} onChange={setYears} min={1} max={40} step={1} suffix="yrs" />

          <div className="grid gap-2.5 border-t pt-4">
            <div className="flex items-center justify-between gap-3">
              <Label htmlFor="sip-stepup-toggle" className="text-sm font-normal">
                Annual step-up
              </Label>
              <Switch id="sip-stepup-toggle" checked={stepUpEnabled} onCheckedChange={setStepUpEnabled} />
            </div>
            {stepUpEnabled && (
              <SliderField
                id="sip-stepup-percent"
                label="Increase SIP by"
                value={stepUpPercent}
                onChange={setStepUpPercent}
                min={1}
                max={25}
                step={1}
                suffix="%/yr"
                size="sm"
              />
            )}
          </div>

          <div className="grid gap-2.5 border-t pt-4">
            <div className="flex items-center justify-between gap-3">
              <Label htmlFor="sip-inflation-toggle" className="text-sm font-normal">
                Adjust for inflation
              </Label>
              <Switch id="sip-inflation-toggle" checked={inflationEnabled} onCheckedChange={setInflationEnabled} />
            </div>
            {inflationEnabled && (
              <SliderField
                id="sip-inflation-percent"
                label="Inflation rate"
                value={inflationPct}
                onChange={setInflationPct}
                min={0}
                max={12}
                step={0.5}
                suffix="%"
                size="sm"
              />
            )}
          </div>

          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Saving…" : "Save as Plan"}
          </Button>
        </CardContent>
      </Card>

      <div className="grid gap-5">
        <SummaryCards result={results.expected} showInflation={inflationEnabled} />
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
            <ValueChart bare data={chartData} showInflation={inflationEnabled} height={340} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle>Monthly breakdown</CardTitle>
            <Button variant="outline" size="sm" onClick={() => setShowBreakdown((v) => !v)} className="gap-1.5">
              {showBreakdown ? <ChevronUp className="size-3.5" /> : <ChevronDown className="size-3.5" />}
              {showBreakdown ? "Hide" : "Show"}
            </Button>
          </CardHeader>
          {showBreakdown && (
            <CardContent className="max-h-105 overflow-y-auto pt-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Month</TableHead>
                    <TableHead className="text-right">Contribution</TableHead>
                    <TableHead className="text-right">Total invested</TableHead>
                    <TableHead className="text-right">Value</TableHead>
                    <TableHead className="text-right">Gain</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {results.expected.ledger.map((row, i) => (
                    <TableRow key={i}>
                      <TableCell>{formatDate(row.date)}</TableCell>
                      <TableCell className="text-right font-mono tabular-nums">{formatINR(row.contribution)}</TableCell>
                      <TableCell className="text-right font-mono tabular-nums">{formatINR(row.totalInvested)}</TableCell>
                      <TableCell className="text-right font-mono tabular-nums">{formatINR(row.value)}</TableCell>
                      <TableCell className="text-right font-mono tabular-nums">{formatINR(row.gain)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          )}
        </Card>
      </div>
    </div>
  );
}
