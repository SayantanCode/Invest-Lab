"use client";

import * as React from "react";

import { computeSsy } from "@/lib/calculators/ssy-calc";
import { formatINR } from "@/lib/format";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SliderField } from "@/components/plan/slider-field";
import { BreakdownDonut } from "@/components/tools/breakdown-donut";

interface SsyCalculatorInitial {
  annualContribution?: number;
  ratePct?: number;
}

export function SsyCalculator({ initial }: { initial?: SsyCalculatorInitial }) {
  const [annualContribution, setAnnualContribution] = React.useState(initial?.annualContribution ?? 150000);
  const [ratePct, setRatePct] = React.useState(initial?.ratePct ?? 8.2);
  const [girlCurrentAge, setGirlCurrentAge] = React.useState(2);

  const result = React.useMemo(() => computeSsy(annualContribution, ratePct), [annualContribution, ratePct]);
  const maturityAge = girlCurrentAge + result.maturityYear;

  return (
    <div className="grid gap-5 lg:grid-cols-[320px_1fr]">
      <Card className="h-fit">
        <CardHeader>
          <CardTitle>Your SSY account</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-5">
          <SliderField
            id="ssy-contribution"
            label="Annual contribution"
            value={annualContribution}
            onChange={setAnnualContribution}
            min={250}
            max={150000}
            step={250}
            prefix="₹"
            presets={[{ label: "Max (₹1.5L)", value: 150000 }]}
          />
          <SliderField id="ssy-rate" label="Interest rate" value={ratePct} onChange={setRatePct} min={6} max={10} step={0.1} suffix="%" />
          <SliderField id="ssy-girl-age" label="Girl's current age" value={girlCurrentAge} onChange={setGirlCurrentAge} min={0} max={10} step={1} suffix="yrs" />
          <p className="text-xs text-muted-foreground">
            Deposits run for 15 years from account opening; the account matures 21 years from opening (or on
            marriage after 18), with interest still accruing in the years after deposits stop. ₹1.5L/year is the
            current contribution cap — same as PPF.
          </p>
        </CardContent>
      </Card>

      <div className="grid gap-5">
        <Card>
          <CardHeader>
            <CardTitle>At maturity (age {maturityAge})</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <div>
              <p className="text-xs font-medium text-muted-foreground">Total invested</p>
              <p className="mt-1 font-mono text-xl font-semibold tabular-nums tracking-tight">{formatINR(result.totalInvested)}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground">Interest earned</p>
              <p className="mt-1 font-mono text-xl font-semibold tabular-nums tracking-tight text-positive">{formatINR(result.totalInterest)}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground">Maturity value</p>
              <p className="mt-1 font-mono text-xl font-semibold tabular-nums tracking-tight">{formatINR(result.maturityValue)}</p>
            </div>
          </CardContent>
        </Card>

        <BreakdownDonut
          title="Maturity breakdown"
          centerLabel="Maturity value"
          centerValue={result.maturityValue}
          slices={[
            { label: "Invested", value: result.totalInvested, color: "var(--color-chart-3)" },
            { label: "Interest earned", value: result.totalInterest, color: "var(--color-chart-1)" },
          ]}
        />
      </div>
    </div>
  );
}
