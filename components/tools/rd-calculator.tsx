"use client";

import * as React from "react";

import { computeRd } from "@/lib/calculators/rd-calc";
import { formatINR } from "@/lib/format";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SliderField } from "@/components/plan/slider-field";
import { BreakdownDonut } from "@/components/tools/breakdown-donut";

interface RdCalculatorInitial {
  monthlyDeposit?: number;
  ratePct?: number;
  years?: number;
}

export function RdCalculator({ initial }: { initial?: RdCalculatorInitial }) {
  const [monthlyDeposit, setMonthlyDeposit] = React.useState(initial?.monthlyDeposit ?? 5000);
  const [ratePct, setRatePct] = React.useState(initial?.ratePct ?? 6.5);
  const [years, setYears] = React.useState(initial?.years ?? 5);

  const result = React.useMemo(() => computeRd(monthlyDeposit, ratePct, years), [monthlyDeposit, ratePct, years]);

  return (
    <div className="grid gap-5 lg:grid-cols-[320px_1fr]">
      <Card className="h-fit">
        <CardHeader>
          <CardTitle>Your recurring deposit</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-5">
          <SliderField id="rd-deposit" label="Monthly deposit" value={monthlyDeposit} onChange={setMonthlyDeposit} min={500} max={200000} step={500} prefix="₹" />
          <SliderField id="rd-rate" label="Interest rate" value={ratePct} onChange={setRatePct} min={1} max={12} step={0.1} suffix="%" />
          <SliderField id="rd-years" label="Tenure" value={years} onChange={setYears} min={1} max={10} step={1} suffix="yrs" />
          <p className="text-xs text-muted-foreground">Assumes quarterly compounding, the standard bank RD convention.</p>
        </CardContent>
      </Card>

      <div className="grid gap-5">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <Card className="gap-1.5 py-4">
            <CardContent className="px-4">
              <p className="text-xs font-medium text-muted-foreground">Total deposited</p>
              <p className="mt-1 font-mono text-xl font-semibold tabular-nums tracking-tight">{formatINR(result.totalInvested)}</p>
            </CardContent>
          </Card>
          <Card className="gap-1.5 py-4">
            <CardContent className="px-4">
              <p className="text-xs font-medium text-muted-foreground">Interest earned</p>
              <p className="mt-1 font-mono text-xl font-semibold tabular-nums tracking-tight text-positive">{formatINR(result.totalInterest)}</p>
            </CardContent>
          </Card>
          <Card className="gap-1.5 py-4">
            <CardContent className="px-4">
              <p className="text-xs font-medium text-muted-foreground">Maturity value</p>
              <p className="mt-1 font-mono text-xl font-semibold tabular-nums tracking-tight">{formatINR(result.maturityValue)}</p>
            </CardContent>
          </Card>
        </div>

        <BreakdownDonut
          title="Maturity breakdown"
          centerLabel="Maturity value"
          centerValue={result.maturityValue}
          slices={[
            { label: "Deposited", value: result.totalInvested, color: "var(--color-chart-3)" },
            { label: "Interest earned", value: result.totalInterest, color: "var(--color-chart-1)" },
          ]}
        />
      </div>
    </div>
  );
}
