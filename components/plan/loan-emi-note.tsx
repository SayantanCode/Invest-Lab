"use client";

import { computeEmi } from "@/lib/calculators/emi-calc";
import { formatINR } from "@/lib/format";
import { cn } from "@/lib/utils";

import { SliderField } from "@/components/plan/slider-field";

/** A goal's target is the down payment being saved for — this is the loan on whatever's left, for any goal big enough that a loan usually follows (home, vehicle, bike, education, marriage). Controlled by the goal's own loanAmount/loanRatePct/loanYears so an edit here persists with the goal instead of resetting on reload. */
export function LoanEmiNote({
  idPrefix,
  loanAmount,
  ratePct,
  years,
  onChange,
  availableAfterGoal,
}: {
  /** Makes the slider ids unique per goal — this note renders once per goal on the dashboard, and SliderField's <Label htmlFor> needs a non-colliding id to focus the right input. */
  idPrefix: string;
  loanAmount: number;
  ratePct: number;
  years: number;
  onChange: (patch: { loanAmount?: number; ratePct?: number; years?: number }) => void;
  availableAfterGoal: number;
}) {
  const { emi } = computeEmi(loanAmount, ratePct, years);
  const fits = emi <= availableAfterGoal;

  return (
    <div className="grid gap-3 rounded-lg border border-dashed p-3">
      <p className="text-xs font-medium text-foreground">The down payment isn&apos;t the whole story — a loan usually follows</p>

      <div className="grid gap-1">
        <div className="flex items-center justify-between text-sm font-medium">
          <span>Estimated EMI on the rest</span>
          <span className="font-mono tabular-nums text-primary">{formatINR(emi)}/mo</span>
        </div>
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>Your surplus once this SIP ends</span>
          <span className={cn("font-mono tabular-nums", fits ? "text-foreground" : "text-negative")}>
            {formatINR(availableAfterGoal)}/mo
          </span>
        </div>
      </div>

      <SliderField
        id={`${idPrefix}-loan-amount`}
        label="Loan amount (the rest of the price)"
        value={loanAmount}
        onChange={(v) => onChange({ loanAmount: v })}
        min={10000}
        max={20000000}
        step={50000}
        prefix="₹"
        size="sm"
      />
      <SliderField id={`${idPrefix}-loan-rate`} label="Interest rate" value={ratePct} onChange={(v) => onChange({ ratePct: v })} min={6} max={18} step={0.25} suffix="%" size="sm" />
      <SliderField id={`${idPrefix}-loan-years`} label="Loan tenure" value={years} onChange={(v) => onChange({ years: v })} min={1} max={30} step={1} suffix="yrs" size="sm" />

      <p className="text-xs text-muted-foreground">
        {fits
          ? "This fits within what frees up once the down-payment SIP is done — a good sign, not a guarantee."
          : "This EMI looks tight against what frees up once the down-payment SIP is done — worth a smaller loan, a longer tenure, or a bigger down payment."}
      </p>
    </div>
  );
}
