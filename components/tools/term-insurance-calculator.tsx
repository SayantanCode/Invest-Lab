"use client";

import * as React from "react";

import { computeTermInsuranceCover } from "@/lib/calculators/term-insurance-calc";
import { useProfileStore } from "@/lib/stores/use-profile-store";
import { formatINR } from "@/lib/format";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SliderField } from "@/components/plan/slider-field";

interface TermInsuranceCalculatorInitial {
  annualIncome?: number;
  currentAge?: number;
  outstandingDebts?: number;
  futureGoalCosts?: number;
  existingInvestments?: number;
  existingCover?: number;
}

export function TermInsuranceCalculator({ initial }: { initial?: TermInsuranceCalculatorInitial }) {
  const { profile } = useProfileStore();
  const existingDebts = React.useMemo(
    () => profile?.debts.reduce((sum, d) => sum + d.outstandingAmount, 0) ?? 0,
    [profile]
  );

  const [annualIncome, setAnnualIncome] = React.useState(
    initial?.annualIncome ?? Math.max(600000, (profile?.monthlyIncome ?? 50000) * 12)
  );
  const [currentAge, setCurrentAge] = React.useState(initial?.currentAge ?? 30);
  const [outstandingDebts, setOutstandingDebts] = React.useState(initial?.outstandingDebts ?? existingDebts);
  const [futureGoalCosts, setFutureGoalCosts] = React.useState(initial?.futureGoalCosts ?? 0);
  const [existingInvestments, setExistingInvestments] = React.useState(initial?.existingInvestments ?? 0);
  const [existingCover, setExistingCover] = React.useState(initial?.existingCover ?? profile?.termInsuranceCoverAmount ?? 0);

  const result = React.useMemo(
    () => computeTermInsuranceCover(annualIncome, currentAge, outstandingDebts, futureGoalCosts, existingInvestments, existingCover),
    [annualIncome, currentAge, outstandingDebts, futureGoalCosts, existingInvestments, existingCover]
  );

  return (
    <div className="grid gap-5 lg:grid-cols-[320px_1fr]">
      <Card className="h-fit">
        <CardHeader>
          <CardTitle>Your situation</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-5">
          <SliderField id="term-income" label="Annual income" value={annualIncome} onChange={setAnnualIncome} min={100000} max={20000000} step={50000} prefix="₹" />
          <SliderField id="term-age" label="Your current age" value={currentAge} onChange={setCurrentAge} min={18} max={65} step={1} suffix="yrs" />
          <div className="grid gap-1.5 border-t pt-4">
            <SliderField id="term-debts" label="Outstanding loans (home, car, personal)" value={outstandingDebts} onChange={setOutstandingDebts} min={0} max={20000000} step={50000} prefix="₹" />
            {profile && profile.debts.length > 0 && (
              <p className="text-xs text-muted-foreground">Prefilled from your Financial Profile — {formatINR(existingDebts)} across {profile.debts.length} {profile.debts.length === 1 ? "loan" : "loans"}.</p>
            )}
          </div>
          <SliderField id="term-goals" label="Future goal costs to cover (children's education, marriage, etc.)" value={futureGoalCosts} onChange={setFutureGoalCosts} min={0} max={20000000} step={100000} prefix="₹" />
          <SliderField id="term-investments" label="Existing investments & savings" value={existingInvestments} onChange={setExistingInvestments} min={0} max={20000000} step={50000} prefix="₹" />
          <SliderField id="term-existing-cover" label="Term cover you already have" value={existingCover} onChange={setExistingCover} min={0} max={20000000} step={100000} prefix="₹" />
        </CardContent>
      </Card>

      <div className="grid gap-5">
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-sm text-muted-foreground">Recommended term cover</p>
            <p className="mt-2 font-mono text-4xl font-semibold tabular-nums tracking-tight">{formatINR(result.recommendedCover)}</p>
            <p className="mt-2 text-xs text-muted-foreground">
              {result.multiple}× annual income (age-based) + debts + future goals − existing investments
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>How this breaks down</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-2 text-sm">
            <div className="flex items-center justify-between rounded-lg border bg-muted/40 p-3">
              <span className="text-muted-foreground">Income replacement ({result.multiple}× annual income)</span>
              <span className="font-mono tabular-nums">{formatINR(result.incomeReplacementCover)}</span>
            </div>
            <div className="flex items-center justify-between rounded-lg border bg-muted/40 p-3">
              <span className="text-muted-foreground">+ Outstanding loans</span>
              <span className="font-mono tabular-nums">{formatINR(outstandingDebts)}</span>
            </div>
            <div className="flex items-center justify-between rounded-lg border bg-muted/40 p-3">
              <span className="text-muted-foreground">+ Future goal costs</span>
              <span className="font-mono tabular-nums">{formatINR(futureGoalCosts)}</span>
            </div>
            <div className="flex items-center justify-between rounded-lg border bg-muted/40 p-3">
              <span className="text-muted-foreground">− Existing investments &amp; savings</span>
              <span className="font-mono tabular-nums">{formatINR(existingInvestments)}</span>
            </div>
            <div className="flex items-center justify-between rounded-lg border border-primary/30 bg-primary/5 p-3">
              <span className="font-medium">= Recommended cover</span>
              <span className="font-mono text-lg font-semibold tabular-nums text-primary">{formatINR(result.recommendedCover)}</span>
            </div>
            <div
              className={
                result.shortfall > 0
                  ? "mt-1 flex items-center justify-between rounded-lg border border-negative/30 bg-negative/5 p-3"
                  : "mt-1 flex items-center justify-between rounded-lg border border-positive/30 bg-positive/5 p-3"
              }
            >
              <span className="font-medium">{result.shortfall > 0 ? "Shortfall vs. cover you have" : "You're fully covered"}</span>
              <span className={result.shortfall > 0 ? "font-mono text-lg font-semibold tabular-nums text-negative" : "font-mono text-lg font-semibold tabular-nums text-positive"}>
                {result.shortfall > 0 ? formatINR(result.shortfall) : "—"}
              </span>
            </div>
          </CardContent>
        </Card>

        <p className="text-xs text-muted-foreground">
          This uses the age-banded income-multiple method most insurers&apos; own &quot;human life value&quot; calculators use —
          younger earners get a bigger multiple, since more years of income are at risk. It&apos;s a planning estimate,
          not a substitute for a real needs assessment from an insurer or advisor.
        </p>
      </div>
    </div>
  );
}
