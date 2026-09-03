"use client";

import * as React from "react";

import { computeStp } from "@/lib/calculators/stp-calc";
import { formatINR } from "@/lib/format";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SliderField } from "@/components/plan/slider-field";
import { BreakdownDonut } from "@/components/tools/breakdown-donut";

interface StpCalculatorInitial {
  sourceLumpsum?: number;
  monthlyTransfer?: number;
  sourceRatePct?: number;
  destRatePct?: number;
  transferMonths?: number;
}

export function StpCalculator({ initial }: { initial?: StpCalculatorInitial }) {
  const [sourceLumpsum, setSourceLumpsum] = React.useState(initial?.sourceLumpsum ?? 1000000);
  const [monthlyTransfer, setMonthlyTransfer] = React.useState(initial?.monthlyTransfer ?? 20000);
  const [sourceRatePct, setSourceRatePct] = React.useState(initial?.sourceRatePct ?? 6);
  const [destRatePct, setDestRatePct] = React.useState(initial?.destRatePct ?? 12);
  const [transferMonths, setTransferMonths] = React.useState(initial?.transferMonths ?? 36);

  const result = React.useMemo(
    () => computeStp(sourceLumpsum, monthlyTransfer, sourceRatePct, destRatePct, transferMonths),
    [sourceLumpsum, monthlyTransfer, sourceRatePct, destRatePct, transferMonths]
  );
  const totalValue = result.sourceRemainingValue + result.destinationValue;

  return (
    <div className="grid gap-5 lg:grid-cols-[320px_1fr]">
      <Card className="h-fit">
        <CardHeader>
          <CardTitle>Your STP</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-5">
          <SliderField id="stp-lumpsum" label="Source fund lumpsum" value={sourceLumpsum} onChange={setSourceLumpsum} min={50000} max={20000000} step={50000} prefix="₹" />
          <SliderField id="stp-transfer" label="Monthly transfer amount" value={monthlyTransfer} onChange={setMonthlyTransfer} min={1000} max={500000} step={1000} prefix="₹" />
          <SliderField id="stp-source-rate" label="Source fund return (debt/liquid)" value={sourceRatePct} onChange={setSourceRatePct} min={3} max={9} step={0.5} suffix="%" />
          <SliderField id="stp-dest-rate" label="Destination fund return (equity)" value={destRatePct} onChange={setDestRatePct} min={1} max={20} step={0.5} suffix="%" />
          <SliderField id="stp-months" label="Transfer period" value={transferMonths} onChange={setTransferMonths} min={1} max={120} step={1} suffix="mo" />
          {result.sourceDepletedEarly && (
            <p className="text-xs text-muted-foreground">
              The source fund runs out after {result.monthsTransferred} of the {transferMonths} months you set — transfers stop there.
            </p>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-5">
        <Card>
          <CardHeader>
            <CardTitle>Where the money ends up</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <div>
              <p className="text-xs font-medium text-muted-foreground">Source fund remaining</p>
              <p className="mt-1 font-mono text-xl font-semibold tabular-nums tracking-tight">{formatINR(result.sourceRemainingValue)}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground">Destination fund value</p>
              <p className="mt-1 font-mono text-xl font-semibold tabular-nums tracking-tight text-positive">{formatINR(result.destinationValue)}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground">Combined value</p>
              <p className="mt-1 font-mono text-xl font-semibold tabular-nums tracking-tight">{formatINR(totalValue)}</p>
            </div>
          </CardContent>
        </Card>

        <BreakdownDonut
          title="Destination fund breakdown"
          centerLabel="Destination value"
          centerValue={result.destinationValue}
          slices={[
            { label: "Transferred in", value: result.destinationInvested, color: "var(--color-chart-3)" },
            { label: "Growth", value: result.destinationGain, color: "var(--color-chart-1)" },
          ]}
        />

        <p className="text-xs text-muted-foreground">
          The source fund keeps earning its own return on whatever hasn&apos;t been transferred out yet — this models a
          lumpsum sitting in a debt/liquid fund while it&apos;s gradually moved into an equity fund, smoothing out the
          entry price instead of investing it all on day one.
        </p>
      </div>
    </div>
  );
}
