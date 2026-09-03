"use client";

import * as React from "react";

import { futureCost } from "@/lib/engine";
import { grownExistingSavings, requiredMonthlySip } from "@/lib/calculators/goal-calc";
import { requiredCorpusForIncome } from "@/lib/calculators/retirement-income";
import { formatINR } from "@/lib/format";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SliderField } from "@/components/plan/slider-field";
import { BreakdownDonut } from "@/components/tools/breakdown-donut";

interface RetirementCalculatorInitial {
  presentMonthlyExpense?: number;
  inflationPct?: number;
  currentAge?: number;
  retirementAge?: number;
  lifeExpectancy?: number;
  preRetirementReturnPct?: number;
  postRetirementReturnPct?: number;
  currentCorpus?: number;
}

export function RetirementCalculator({ initial }: { initial?: RetirementCalculatorInitial }) {
  const [presentMonthlyExpense, setPresentMonthlyExpense] = React.useState(initial?.presentMonthlyExpense ?? 50000);
  const [inflationPct, setInflationPct] = React.useState(initial?.inflationPct ?? 6);
  const [currentAge, setCurrentAge] = React.useState(initial?.currentAge ?? 30);
  const [retirementAge, setRetirementAge] = React.useState(initial?.retirementAge ?? 60);
  const [lifeExpectancy, setLifeExpectancy] = React.useState(initial?.lifeExpectancy ?? 85);
  const [preRetirementReturnPct, setPreRetirementReturnPct] = React.useState(initial?.preRetirementReturnPct ?? 12);
  const [postRetirementReturnPct, setPostRetirementReturnPct] = React.useState(initial?.postRetirementReturnPct ?? 7);
  const [currentCorpus, setCurrentCorpus] = React.useState(initial?.currentCorpus ?? 0);

  const accumulationYears = Math.max(1, retirementAge - currentAge);
  const retirementYears = Math.max(1, lifeExpectancy - retirementAge);

  const monthlyExpenseAtRetirement = React.useMemo(
    () => futureCost(presentMonthlyExpense, inflationPct, accumulationYears),
    [presentMonthlyExpense, inflationPct, accumulationYears]
  );

  const requiredCorpus = React.useMemo(
    () => requiredCorpusForIncome(presentMonthlyExpense, postRetirementReturnPct, inflationPct, retirementYears, accumulationYears),
    [presentMonthlyExpense, postRetirementReturnPct, inflationPct, retirementYears, accumulationYears]
  );

  const requiredSip = React.useMemo(
    () => requiredMonthlySip(requiredCorpus, preRetirementReturnPct, accumulationYears, currentCorpus),
    [requiredCorpus, preRetirementReturnPct, accumulationYears, currentCorpus]
  );

  const grownExisting = React.useMemo(
    () => grownExistingSavings(currentCorpus, preRetirementReturnPct, accumulationYears),
    [currentCorpus, preRetirementReturnPct, accumulationYears]
  );

  const totalContributed = requiredSip * accumulationYears * 12;
  const totalInvested = currentCorpus + totalContributed;
  const totalInterest = Math.max(0, requiredCorpus - totalInvested);

  return (
    <div className="grid gap-5 lg:grid-cols-[320px_1fr]">
      <Card className="h-fit">
        <CardHeader>
          <CardTitle>Your retirement</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-5">
          <SliderField
            id="retirement-expense"
            label="Present monthly expense"
            value={presentMonthlyExpense}
            onChange={setPresentMonthlyExpense}
            min={5000}
            max={1000000}
            step={1000}
            prefix="₹"
          />
          <SliderField id="retirement-inflation" label="Inflation rate" value={inflationPct} onChange={setInflationPct} min={1} max={15} step={0.5} suffix="%" />
          <SliderField id="retirement-current-age" label="Current age" value={currentAge} onChange={setCurrentAge} min={18} max={65} step={1} suffix="yrs" />
          <SliderField
            id="retirement-age"
            label="Retirement age"
            value={retirementAge}
            onChange={setRetirementAge}
            min={Math.max(currentAge + 1, 45)}
            max={75}
            step={1}
            suffix="yrs"
          />
          <div className="grid gap-1.5">
            <SliderField
              id="retirement-life-expectancy"
              label="Life expectancy"
              value={lifeExpectancy}
              onChange={setLifeExpectancy}
              min={Math.max(retirementAge + 1, 70)}
              max={100}
              step={1}
              suffix="yrs"
            />
            <p className="text-xs text-muted-foreground">
              → {accumulationYears} {accumulationYears === 1 ? "year" : "years"} to save, {retirementYears} {retirementYears === 1 ? "year" : "years"} in retirement.
            </p>
          </div>
          <SliderField
            id="retirement-pre-return"
            label="Expected return before retirement"
            value={preRetirementReturnPct}
            onChange={setPreRetirementReturnPct}
            min={1}
            max={20}
            step={0.5}
            suffix="%"
          />
          <SliderField
            id="retirement-post-return"
            label="Expected return during retirement"
            value={postRetirementReturnPct}
            onChange={setPostRetirementReturnPct}
            min={1}
            max={15}
            step={0.5}
            suffix="%"
          />
          <SliderField
            id="retirement-corpus"
            label="Current retirement savings (optional)"
            value={currentCorpus}
            onChange={setCurrentCorpus}
            min={0}
            max={50000000}
            step={50000}
            prefix="₹"
          />
        </CardContent>
      </Card>

      <div className="grid gap-5">
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-sm text-muted-foreground">Retirement corpus you&apos;ll need</p>
            <p className="mt-2 font-mono text-4xl font-semibold tabular-nums tracking-tight">{formatINR(requiredCorpus)}</p>
            <p className="mt-2 text-xs text-muted-foreground">
              To sustain {formatINR(presentMonthlyExpense)}/mo (today&apos;s ₹) — {formatINR(monthlyExpenseAtRetirement)}/mo by the time you retire — growing
              with inflation for {retirementYears} years after.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>What it takes to get there</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <div>
              <p className="text-xs font-medium text-muted-foreground">Required monthly SIP</p>
              <p className="mt-1 font-mono text-xl font-semibold tabular-nums tracking-tight text-primary">{formatINR(requiredSip)}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground">Existing savings, grown</p>
              <p className="mt-1 font-mono text-xl font-semibold tabular-nums tracking-tight">{formatINR(grownExisting)}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground">Years to save</p>
              <p className="mt-1 font-mono text-xl font-semibold tabular-nums tracking-tight">{accumulationYears}</p>
            </div>
          </CardContent>
        </Card>

        <BreakdownDonut
          title="Corpus breakdown"
          centerLabel="Required corpus"
          centerValue={requiredCorpus}
          slices={[
            { label: "Contributed (incl. existing)", value: totalInvested, color: "var(--color-chart-3)" },
            { label: "Interest earned", value: totalInterest, color: "var(--color-chart-1)" },
          ]}
        />

        <p className="text-xs text-muted-foreground">
          Assumes your monthly expense grows with inflation every year, both before and during retirement, and that
          the corpus itself earns a lower, steadier return once you&apos;re drawing it down. This is a planning
          estimate — for goal-based tracking (SIP progress, loan-financed goals, etc.), use the &quot;Retirement
          corpus&quot; preset in Goal Planner instead, which this calculator shares its math with.
        </p>
      </div>
    </div>
  );
}
