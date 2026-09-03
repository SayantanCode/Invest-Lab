"use client";

import * as React from "react";
import { realValue } from "@/lib/engine";
import { sustainableMonthlyWithdrawal } from "@/lib/calculators/retirement-income";
import { formatINR } from "@/lib/format";

import { SliderField } from "@/components/plan/slider-field";

export function RetirementIncomeNote({ corpus, accumulationYears, accumulationInflationPct }: {
  corpus: number;
  accumulationYears: number;
  accumulationInflationPct: number;
}) {
  const [retirementYears, setRetirementYears] = React.useState(25);
  const [postRetirementReturnPct, setPostRetirementReturnPct] = React.useState(7);

  const monthly = sustainableMonthlyWithdrawal(corpus, postRetirementReturnPct, accumulationInflationPct, retirementYears);
  const monthlyToday = realValue(monthly, accumulationInflationPct, accumulationYears);

  return (
    <div className="grid gap-3 rounded-lg border border-dashed p-3">
      <p className="text-xs font-medium text-foreground">Once retired, this could pay you</p>

      <div className="grid gap-1">
        <div className="flex items-center justify-between text-sm font-medium">
          <span>Sustainable monthly income</span>
          <span className="font-mono tabular-nums text-primary">{formatINR(monthly)}/mo</span>
        </div>
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>In today&apos;s rupees</span>
          <span className="font-mono tabular-nums text-foreground">{formatINR(monthlyToday)}/mo</span>
        </div>
      </div>

      <SliderField
        id="retirement-years"
        label="Years in retirement"
        value={retirementYears}
        onChange={setRetirementYears}
        min={10}
        max={40}
        suffix="yrs"
        size="sm"
      />
      <SliderField
        id="post-retirement-return"
        label="Return during retirement"
        value={postRetirementReturnPct}
        onChange={setPostRetirementReturnPct}
        min={4}
        max={12}
        step={0.5}
        suffix="%"
        size="sm"
      />

      <p className="text-xs text-muted-foreground">
        Assumes {retirementYears} years in retirement at {postRetirementReturnPct}% return, and that this income
        grows with inflation every year to keep pace — an estimate, not a guarantee.
      </p>
    </div>
  );
}
