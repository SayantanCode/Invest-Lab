"use client";

import * as React from "react";

import { computeNps } from "@/lib/calculators/nps-calc";
import { formatINR } from "@/lib/format";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SliderField } from "@/components/plan/slider-field";
import { BreakdownDonut } from "@/components/tools/breakdown-donut";

interface NpsCalculatorInitial {
  monthlyContribution?: number;
  returnPct?: number;
  currentAge?: number;
  retirementAge?: number;
  existingBalance?: number;
}

export function NpsCalculator({ initial }: { initial?: NpsCalculatorInitial }) {
  const [monthlyContribution, setMonthlyContribution] = React.useState(initial?.monthlyContribution ?? 5000);
  const [returnPct, setReturnPct] = React.useState(initial?.returnPct ?? 10);
  const [currentAge, setCurrentAge] = React.useState(initial?.currentAge ?? 30);
  const [retirementAge, setRetirementAge] = React.useState(initial?.retirementAge ?? 60);
  const [existingBalance, setExistingBalance] = React.useState(initial?.existingBalance ?? 0);
  const [lumpSumWithdrawalPct, setLumpSumWithdrawalPct] = React.useState(60);
  const [annuityRatePct, setAnnuityRatePct] = React.useState(6);

  const years = Math.max(1, retirementAge - currentAge);
  const result = React.useMemo(
    () => computeNps(monthlyContribution, returnPct, years, existingBalance, lumpSumWithdrawalPct, annuityRatePct),
    [monthlyContribution, returnPct, years, existingBalance, lumpSumWithdrawalPct, annuityRatePct]
  );

  return (
    <div className="grid gap-5 lg:grid-cols-[320px_1fr]">
      <Card className="h-fit">
        <CardHeader>
          <CardTitle>Your NPS account</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-5">
          <SliderField
            id="nps-contribution"
            label="Monthly contribution"
            value={monthlyContribution}
            onChange={setMonthlyContribution}
            min={500}
            max={200000}
            step={500}
            prefix="₹"
          />
          <SliderField
            id="nps-return"
            label="Expected annual return"
            value={returnPct}
            onChange={setReturnPct}
            min={5}
            max={14}
            step={0.5}
            suffix="%"
          />
          <SliderField id="nps-age" label="Your current age" value={currentAge} onChange={setCurrentAge} min={18} max={69} step={1} suffix="yrs" />
          <div className="grid gap-1.5">
            <SliderField
              id="nps-retirement-age"
              label="Exit age"
              value={retirementAge}
              onChange={setRetirementAge}
              min={Math.max(currentAge + 1, 60)}
              max={75}
              step={1}
              suffix="yrs"
            />
            <p className="text-xs text-muted-foreground">→ {years} {years === 1 ? "year" : "years"} to grow. Normal exit is 60; NPS allows deferring up to 75.</p>
          </div>
          <SliderField
            id="nps-existing"
            label="Current NPS balance (optional)"
            value={existingBalance}
            onChange={setExistingBalance}
            min={0}
            max={10000000}
            step={10000}
            prefix="₹"
          />
          <div className="grid gap-2.5 border-t pt-4">
            <SliderField
              id="nps-lumpsum-pct"
              label="Lump sum withdrawal at exit"
              value={lumpSumWithdrawalPct}
              onChange={setLumpSumWithdrawalPct}
              min={0}
              max={60}
              step={5}
              suffix="%"
              size="sm"
            />
            <p className="text-xs text-muted-foreground">
              At least 40% must go toward an annuity — the withdrawable lump sum is capped at 60%, and unlike EPF/PPF
              it&apos;s fully tax-free.
            </p>
            <SliderField
              id="nps-annuity-rate"
              label="Assumed annuity rate"
              value={annuityRatePct}
              onChange={setAnnuityRatePct}
              min={3}
              max={9}
              step={0.25}
              suffix="%"
              size="sm"
            />
            <p className="text-xs text-muted-foreground">
              Real annuity rates vary by provider and payout option (spouse cover, return of purchase price, etc.) —
              this is a rough planning assumption, not a quote.
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-5">
        <Card>
          <CardHeader>
            <CardTitle>Corpus at exit</CardTitle>
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
              <p className="text-xs font-medium text-muted-foreground">Total corpus</p>
              <p className="mt-1 font-mono text-xl font-semibold tabular-nums tracking-tight">{formatINR(result.maturityValue)}</p>
            </div>
          </CardContent>
        </Card>

        <BreakdownDonut
          title="Corpus breakdown"
          centerLabel="Total corpus"
          centerValue={result.maturityValue}
          slices={[
            { label: "Contributed", value: result.totalInvested, color: "var(--color-chart-3)" },
            { label: "Interest earned", value: result.totalInterest, color: "var(--color-chart-1)" },
          ]}
        />

        <Card>
          <CardHeader>
            <CardTitle>At exit — lump sum &amp; annuity</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              <div>
                <p className="text-xs font-medium text-muted-foreground">Tax-free lump sum</p>
                <p className="mt-1 font-mono text-xl font-semibold tabular-nums tracking-tight">{formatINR(result.lumpSumWithdrawal)}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground">Annuity purchase amount</p>
                <p className="mt-1 font-mono text-xl font-semibold tabular-nums tracking-tight">{formatINR(result.annuityPurchaseAmount)}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground">Est. monthly pension</p>
                <p className="mt-1 font-mono text-xl font-semibold tabular-nums tracking-tight text-positive">{formatINR(result.estimatedMonthlyAnnuity)}</p>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Contributions under NPS get their own tax benefit on top of the usual 80C limit — up to ₹50,000/year is
              deductible under Section 80CCD(1B), separately from EPF/PPF/ELSS.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
