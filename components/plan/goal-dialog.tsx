"use client";

import * as React from "react";
import { ArrowLeft, ChevronDown } from "lucide-react";

import type { Goal, GoalInput } from "@/lib/stores/use-goal-store";
import { useProfileStore, type Profile, type RiskTolerance } from "@/lib/stores/use-profile-store";
import { GOAL_PRESETS, getPreset, presetDefaultAmount } from "@/lib/goals/goal-presets";
import { getCity, LOCATION_SENSITIVE_PRESET_KEYS } from "@/lib/calculators/city-cost-index";
import {
  futureValueOfSip,
  grownExistingSavings,
  inflatedTarget,
  requiredMonthlySip,
  requiredYearsToTarget,
} from "@/lib/calculators/goal-calc";
import { blendedReturnPct, suggestedAllocation } from "@/lib/calculators/asset-allocation";
import { requiredCorpusForIncome } from "@/lib/calculators/retirement-income";
import { ageFromDob } from "@/lib/calculators/age";
import { GOAL_YEAR_HINT } from "@/lib/goals/goal-year-hints";
import { formatINR, formatYearsMonths } from "@/lib/format";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SliderField } from "@/components/plan/slider-field";
import { cn } from "@/lib/utils";

const RISK_LABEL: Record<RiskTolerance, string> = { conservative: "Conservative", moderate: "Moderate", aggressive: "Aggressive" };

/**
 * Age/child-aware defaults where they exist — falls back to the preset's
 * flat default otherwise. Only applies the override when it's still a
 * coherent question: retirement only makes sense to compute "years left"
 * for someone not already past 60, and only a dependent genuinely still a
 * minor should drive an education goal's timeline — otherwise this silently
 * floors to 1 year while the target amount stays unchanged, producing a
 * nonsensical SIP (e.g. a 66-year-old's ₹3Cr retirement target flooring to
 * "1 year away").
 */
function defaultYearsFor(preset: ReturnType<typeof getPreset>, profile: Profile | null | undefined): number {
  if (preset.key === "retirement" && profile?.dob) {
    const age = ageFromDob(profile.dob);
    if (age < 60) return 60 - age;
  }
  if (preset.key === "education" && profile) {
    const childAges = profile.dependents
      .filter((d) => d.relation === "child" && d.age != null && d.age < 18)
      .map((d) => d.age!);
    if (childAges.length > 0) {
      return 18 - Math.min(...childAges);
    }
  }
  return preset.defaultYears;
}

function defaultInputFor(presetKey: string, profile: Profile | null | undefined): GoalInput {
  const preset = getPreset(presetKey);
  return {
    name: preset.label,
    presetKey: preset.key,
    targetAmountToday: presetDefaultAmount(preset, profile?.city),
    years: defaultYearsFor(preset, profile),
    inflationPct: preset.defaultInflationPct,
    expectedReturnPct: 12,
    existingSavings: 0,
  };
}

export function GoalDialog({
  goal,
  open,
  onOpenChange,
  onSave,
  onDelete,
}: {
  goal?: Goal | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (input: GoalInput) => void;
  onDelete?: (id: string) => void;
}) {
  const isEdit = !!goal;
  const { profile } = useProfileStore();
  const [step, setStep] = React.useState<"preset" | "form">(isEdit ? "form" : "preset");
  const [draft, setDraft] = React.useState<GoalInput>(goal ?? defaultInputFor("custom", profile));
  const [yearsMode, setYearsMode] = React.useState<"years" | "budget">("years");
  const [budgetAmount, setBudgetAmount] = React.useState(10000);
  const [delayOpen, setDelayOpen] = React.useState(false);
  const [delayBy, setDelayBy] = React.useState(2);
  const [retirementMode, setRetirementMode] = React.useState<"corpus" | "income">("corpus");
  const [desiredMonthlyIncome, setDesiredMonthlyIncome] = React.useState(50000);
  const [retirementYears, setRetirementYears] = React.useState(25);
  const [postRetirementReturnPct, setPostRetirementReturnPct] = React.useState(7);

  // Reset whenever the dialog transitions to open, so a stale edit from a
  // previous goal doesn't linger. Adjusting state while rendering (rather
  // than in an effect) avoids an extra render pass.
  const [prevOpen, setPrevOpen] = React.useState(open);
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) {
      setStep(goal ? "form" : "preset");
      setDraft(goal ?? defaultInputFor("custom", profile));
      setYearsMode("years");
      setDelayOpen(false);
      setRetirementMode("corpus");
    }
  }

  function pickPreset(key: string) {
    setDraft(defaultInputFor(key, profile));
    setStep("form");
  }

  function handleSave() {
    if (!draft.name.trim()) return;
    let toSave = draft;
    if (yearsMode === "budget" && !isRetirementIncomeMode) toSave = { ...toSave, years: effectiveYears };
    if (isRetirementIncomeMode) {
      toSave = { ...toSave, targetAmountToday: computedCorpus / Math.pow(1 + draft.inflationPct / 100, effectiveYears) };
    }
    onSave(toSave);
    onOpenChange(false);
  }

  const preset = getPreset(draft.presetKey);
  const isRetirementIncomeMode = preset.key === "retirement" && retirementMode === "income";

  const solvedYears =
    yearsMode === "budget" && !isRetirementIncomeMode
      ? requiredYearsToTarget(draft.targetAmountToday, draft.inflationPct, draft.expectedReturnPct, budgetAmount, draft.existingSavings)
      : null;
  const effectiveYears = solvedYears?.feasible ? solvedYears.years : draft.years;

  const computedCorpus = isRetirementIncomeMode
    ? requiredCorpusForIncome(desiredMonthlyIncome, postRetirementReturnPct, draft.inflationPct, retirementYears, effectiveYears)
    : 0;

  const target = isRetirementIncomeMode
    ? computedCorpus
    : inflatedTarget(draft.targetAmountToday, draft.inflationPct, effectiveYears);
  const grownSavings = grownExistingSavings(draft.existingSavings, draft.expectedReturnPct, effectiveYears);
  const sip =
    yearsMode === "budget" && !isRetirementIncomeMode
      ? budgetAmount
      : requiredMonthlySip(target, draft.expectedReturnPct, effectiveYears, draft.existingSavings);
  const alreadyCovered = draft.existingSavings > 0 && sip === 0;

  const delayedYears = effectiveYears + delayBy;
  const delayedTarget = inflatedTarget(draft.targetAmountToday, draft.inflationPct, delayedYears);
  const delayedSip = requiredMonthlySip(delayedTarget, draft.expectedReturnPct, delayedYears, draft.existingSavings);
  const monthlyFreed = Math.max(0, sip - delayedSip);
  const delayHorizonYears = profile?.dob ? Math.max(0, 60 - ageFromDob(profile.dob)) : 20;
  const extraWealth = futureValueOfSip(monthlyFreed, draft.expectedReturnPct, delayHorizonYears);

  const city = getCity(profile?.city);
  const isLocationSensitive = LOCATION_SENSITIVE_PRESET_KEYS.has(draft.presetKey);
  const cityAdjustedAmount = city ? presetDefaultAmount(preset, profile?.city) : null;
  const showCityNote = isLocationSensitive && !!city && cityAdjustedAmount !== preset.defaultAmount;
  const showingCityAdjusted = draft.targetAmountToday === cityAdjustedAmount;

  const allocation = profile ? suggestedAllocation(draft.years, profile.riskTolerance) : null;
  const suggestedReturn = allocation ? Math.round(blendedReturnPct(allocation) * 10) / 10 : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        {step === "preset" ? (
          <>
            <DialogHeader>
              <DialogTitle>What are you saving for?</DialogTitle>
              <DialogDescription>Pick a starting point — every number below is yours to adjust.</DialogDescription>
            </DialogHeader>
            <div className="grid grid-cols-2 gap-2.5 py-1 sm:grid-cols-3">
              {GOAL_PRESETS.map((p) => (
                <button
                  key={p.key}
                  type="button"
                  onClick={() => pickPreset(p.key)}
                  className="flex flex-col items-center gap-2 rounded-lg border p-3.5 text-center transition-colors hover:border-primary hover:bg-primary/5"
                >
                  <p.icon className="size-6 text-primary" />
                  <span className="text-xs font-medium leading-tight">{p.label}</span>
                </button>
              ))}
            </div>
          </>
        ) : (
          <>
            <DialogHeader>
              {!isEdit && (
                <button
                  type="button"
                  onClick={() => setStep("preset")}
                  className="mb-1 flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                >
                  <ArrowLeft className="size-3.5" />
                  Change goal type
                </button>
              )}
              <DialogTitle className="flex items-center gap-2">
                <preset.icon className="size-4.5 text-primary" />
                {isEdit ? "Edit goal" : preset.label}
              </DialogTitle>
              {preset.hint && <DialogDescription>{preset.hint}</DialogDescription>}
            </DialogHeader>

            <div className="grid gap-4 py-1">
              <div className="grid gap-2">
                <Label htmlFor="goal-name">Goal name</Label>
                <Input
                  id="goal-name"
                  value={draft.name}
                  onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
                />
              </div>

              {preset.key === "retirement" && (
                <div className="flex flex-wrap gap-1.5">
                  {(["corpus", "income"] as const).map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setRetirementMode(m)}
                      className={cn(
                        "rounded-full border px-2.5 py-1 text-xs transition-colors",
                        retirementMode === m
                          ? "border-primary bg-primary/10 font-medium text-primary"
                          : "border-input text-muted-foreground hover:bg-muted"
                      )}
                    >
                      {m === "corpus" ? "I know my target corpus" : "I know my desired monthly income"}
                    </button>
                  ))}
                </div>
              )}

              {preset.key === "retirement" && retirementMode === "income" ? (
                <>
                  <SliderField
                    id="goal-desired-income"
                    label="Desired monthly income in retirement, today's rupees"
                    value={desiredMonthlyIncome}
                    onChange={setDesiredMonthlyIncome}
                    min={5000}
                    max={1000000}
                    step={1000}
                    prefix="₹"
                  />
                  <SliderField
                    id="goal-retirement-years"
                    label="Years in retirement"
                    value={retirementYears}
                    onChange={setRetirementYears}
                    min={10}
                    max={40}
                    suffix="yrs"
                    size="sm"
                  />
                  <SliderField
                    id="goal-post-retirement-return"
                    label="Return during retirement"
                    value={postRetirementReturnPct}
                    onChange={setPostRetirementReturnPct}
                    min={4}
                    max={12}
                    step={0.5}
                    suffix="%"
                    size="sm"
                  />
                </>
              ) : (
                <SliderField
                  id="goal-amount"
                  label="Target amount, in today's rupees"
                  value={draft.targetAmountToday}
                  onChange={(v) => setDraft((d) => ({ ...d, targetAmountToday: v }))}
                  min={50000}
                  max={50000000}
                  step={10000}
                  prefix="₹"
                />
              )}
              {showCityNote && cityAdjustedAmount != null && (
                <p className="-mt-2 text-xs text-muted-foreground">
                  {showingCityAdjusted ? (
                    <>
                      Adjusted for {city.label} —{" "}
                      <button
                        type="button"
                        className="text-primary underline-offset-2 hover:underline"
                        onClick={() => setDraft((d) => ({ ...d, targetAmountToday: preset.defaultAmount }))}
                      >
                        use the national average instead
                      </button>
                    </>
                  ) : (
                    <>
                      Costs vary a lot by city —{" "}
                      <button
                        type="button"
                        className="text-primary underline-offset-2 hover:underline"
                        onClick={() => setDraft((d) => ({ ...d, targetAmountToday: cityAdjustedAmount }))}
                      >
                        adjust for {city.label} instead
                      </button>
                    </>
                  )}
                </p>
              )}

              {!isRetirementIncomeMode && (
                <div className="flex flex-wrap gap-1.5">
                  {(["years", "budget"] as const).map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setYearsMode(m)}
                      className={cn(
                        "rounded-full border px-2.5 py-1 text-xs transition-colors",
                        yearsMode === m
                          ? "border-primary bg-primary/10 font-medium text-primary"
                          : "border-input text-muted-foreground hover:bg-muted"
                      )}
                    >
                      {m === "years" ? "I'll set the timeline" : "I'll set my monthly budget"}
                    </button>
                  ))}
                </div>
              )}

              {yearsMode === "years" || isRetirementIncomeMode ? (
                <>
                  <SliderField
                    id="goal-years"
                    label="Years to reach it"
                    value={draft.years}
                    onChange={(v) => setDraft((d) => ({ ...d, years: v }))}
                    min={preset.defaultYears <= 2 ? 0.5 : 1}
                    max={40}
                    step={preset.defaultYears <= 2 ? 0.5 : 1}
                    suffix="yrs"
                  />
                  {GOAL_YEAR_HINT[draft.presetKey] && (
                    <p className="-mt-2 text-xs text-muted-foreground">{GOAL_YEAR_HINT[draft.presetKey]}</p>
                  )}
                </>
              ) : (
                <>
                  <SliderField
                    id="goal-budget"
                    label="Monthly amount you can invest"
                    value={budgetAmount}
                    onChange={setBudgetAmount}
                    min={500}
                    max={200000}
                    step={500}
                    prefix="₹"
                    presets={
                      profile?.monthlyIncome
                        ? [10, 15, 20].map((pct) => ({
                            label: `${pct}%`,
                            value: Math.round((profile.monthlyIncome * pct) / 100 / 500) * 500,
                          }))
                        : undefined
                    }
                  />
                  <p className="-mt-2 text-xs text-muted-foreground">
                    {solvedYears?.feasible ? (
                      <>
                        At this pace, you&apos;ll reach this goal in{" "}
                        <span className="font-medium text-foreground">{formatYearsMonths(solvedYears.years)}</span>.
                      </>
                    ) : (
                      "Even that amount won't reach this target within 50 years — try raising your monthly budget or lowering the target."
                    )}
                  </p>
                </>
              )}

              <SliderField
                id="goal-existing-savings"
                label="Already saved for this"
                value={draft.existingSavings}
                onChange={(v) => setDraft((d) => ({ ...d, existingSavings: v }))}
                min={0}
                max={Math.max(draft.targetAmountToday, 5000000)}
                step={5000}
                prefix="₹"
              />

              <SliderField
                id="goal-inflation"
                label="Expected cost inflation"
                value={draft.inflationPct}
                onChange={(v) => setDraft((d) => ({ ...d, inflationPct: v }))}
                min={0}
                max={15}
                step={0.5}
                suffix="%"
                size="sm"
              />

              <SliderField
                id="goal-return"
                label="Expected investment return"
                value={draft.expectedReturnPct}
                onChange={(v) => setDraft((d) => ({ ...d, expectedReturnPct: v }))}
                min={4}
                max={20}
                step={0.5}
                suffix="%"
                size="sm"
              />
              {allocation && suggestedReturn != null && (
                <p className="-mt-2 text-xs text-muted-foreground">
                  Based on your {profile ? RISK_LABEL[profile.riskTolerance] : ""} risk tolerance and {draft.years}-year
                  horizon: {allocation.equityPct}% equity / {allocation.debtPct}% debt / {allocation.goldPct}% gold →{" "}
                  ~{suggestedReturn}% suggested —{" "}
                  <button
                    type="button"
                    className="text-primary underline-offset-2 hover:underline"
                    onClick={() => setDraft((d) => ({ ...d, expectedReturnPct: suggestedReturn }))}
                  >
                    use this
                  </button>
                </p>
              )}

              <div className={cn("grid gap-1 rounded-lg border bg-muted/40 p-3")}>
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>Target cost by then (after inflation)</span>
                  <span className="font-mono tabular-nums text-foreground">{formatINR(target)}</span>
                </div>
                {yearsMode === "budget" && (
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>Time to reach it</span>
                    <span className="font-mono tabular-nums text-foreground">
                      {solvedYears?.feasible ? formatYearsMonths(solvedYears.years) : "Doesn't fit in 50 yrs"}
                    </span>
                  </div>
                )}
                {draft.existingSavings > 0 && (
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>Your existing savings, grown by then</span>
                    <span className="font-mono tabular-nums text-foreground">{formatINR(grownSavings)}</span>
                  </div>
                )}
                {alreadyCovered ? (
                  <div className="flex items-center justify-between text-sm font-medium text-positive">
                    <span>You&apos;re already on track</span>
                    <span>No more SIP needed</span>
                  </div>
                ) : (
                  <div className="flex items-center justify-between text-sm font-medium">
                    <span>Monthly SIP needed</span>
                    <span className="font-mono tabular-nums text-primary">{formatINR(sip)}/mo</span>
                  </div>
                )}
              </div>

              {!alreadyCovered && sip > 0 && (
                <div className="grid gap-2.5">
                  <button
                    type="button"
                    onClick={() => setDelayOpen((v) => !v)}
                    className="flex w-fit items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                  >
                    <ChevronDown className={cn("size-3.5 transition-transform", delayOpen && "rotate-180")} />
                    What if I delay this goal?
                  </button>
                  {delayOpen && (
                    <div className="grid gap-2.5 rounded-lg border p-3">
                      <SliderField
                        id="goal-delay"
                        label="Delay by"
                        value={delayBy}
                        onChange={setDelayBy}
                        min={0}
                        max={10}
                        step={0.5}
                        suffix="yrs"
                        size="sm"
                      />
                      <p className="text-xs text-muted-foreground">
                        Delaying by {formatYearsMonths(delayBy)} lowers your SIP from{" "}
                        <span className="font-medium text-foreground">{formatINR(sip)}</span> to{" "}
                        <span className="font-medium text-foreground">{formatINR(delayedSip)}</span> — freeing{" "}
                        <span className="font-medium text-foreground">{formatINR(monthlyFreed)}/mo</span>.
                        {monthlyFreed > 0 && (
                          <>
                            {" "}
                            Invested at the same return until {profile?.dob ? "age 60" : `in ${delayHorizonYears} years`}, that
                            alone could grow to{" "}
                            <span className="font-medium text-foreground">{formatINR(extraWealth)}</span>.
                          </>
                        )}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>

            <DialogFooter className="gap-2 sm:justify-between">
              {isEdit && goal && onDelete ? (
                <Button
                  variant="ghost"
                  className="text-destructive hover:text-destructive"
                  onClick={() => {
                    onDelete(goal.id);
                    onOpenChange(false);
                  }}
                >
                  Delete
                </Button>
              ) : (
                <span />
              )}
              <Button onClick={handleSave} disabled={yearsMode === "budget" && solvedYears?.feasible === false}>
                {isEdit ? "Save changes" : "Add goal"}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
