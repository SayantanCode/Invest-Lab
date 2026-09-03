"use client";

import * as React from "react";

import { computeScss } from "@/lib/calculators/scss-calc";
import { formatINR } from "@/lib/format";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SliderField } from "@/components/plan/slider-field";

interface ScssCalculatorInitial {
  depositAmount?: number;
  ratePct?: number;
}

export function ScssCalculator({ initial }: { initial?: ScssCalculatorInitial }) {
  const [depositAmount, setDepositAmount] = React.useState(initial?.depositAmount ?? 1500000);
  const [ratePct, setRatePct] = React.useState(initial?.ratePct ?? 8.2);

  const result = React.useMemo(() => computeScss(depositAmount, ratePct), [depositAmount, ratePct]);

  return (
    <div className="grid gap-5 lg:grid-cols-[320px_1fr]">
      <Card className="h-fit">
        <CardHeader>
          <CardTitle>Your SCSS deposit</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-5">
          <SliderField
            id="scss-deposit"
            label="Deposit amount"
            value={depositAmount}
            onChange={setDepositAmount}
            min={1000}
            max={3000000}
            step={1000}
            prefix="₹"
            presets={[{ label: "Max (₹30L)", value: 3000000 }]}
          />
          <SliderField id="scss-rate" label="Interest rate" value={ratePct} onChange={setRatePct} min={5} max={10} step={0.1} suffix="%" />
          <p className="text-xs text-muted-foreground">
            5-year base tenure (extendable once, by 3 years), open to those 60+ (55+ for retirees under VRS). ₹30L is
            the current per-person deposit cap. Interest is paid out quarterly, not compounded — your principal comes
            back unchanged at maturity.
          </p>
        </CardContent>
      </Card>

      <div className="grid gap-5">
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-sm text-muted-foreground">Quarterly payout</p>
            <p className="mt-2 font-mono text-4xl font-semibold tabular-nums tracking-tight">{formatINR(result.quarterlyPayout)}</p>
            <p className="mt-2 text-xs text-muted-foreground">{formatINR(result.annualPayout)}/year at {ratePct}%</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Over the 5-year tenure</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-xs font-medium text-muted-foreground">Total interest paid out</p>
              <p className="mt-1 font-mono text-xl font-semibold tabular-nums tracking-tight text-positive">{formatINR(result.totalInterestOverTenure)}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground">Principal returned at maturity</p>
              <p className="mt-1 font-mono text-xl font-semibold tabular-nums tracking-tight">{formatINR(result.maturityValue)}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
