"use client";

import * as React from "react";
import { Steps } from "antd";
import { ArrowLeft, ArrowRight, Compass, Rocket } from "lucide-react";
import { toast } from "sonner";

import { GOAL_PRESETS, getPreset } from "@/lib/goals/goal-presets";
import { inflatedTarget, requiredMonthlySip } from "@/lib/calculators/goal-calc";
import { buildPlanFromGoal } from "@/lib/goals/build-plan-from-goal";
import { buildGeneralPlan } from "@/lib/goals/build-general-plan";
import { CONSERVATIVE_RISK_NOTE, blendedReturnPct, suggestedAllocation } from "@/lib/calculators/asset-allocation";
import { useProfileStore, type RiskTolerance } from "@/lib/stores/use-profile-store";
import { useGoalStore } from "@/lib/stores/use-goal-store";
import { useSavedPlansStore } from "@/lib/stores/use-plans-store";
import { useActivityLog } from "@/lib/stores/use-activity-log-store";
import { useOnboardingStore } from "@/lib/stores/use-onboarding-store";
import { formatINR } from "@/lib/format";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { SliderField } from "@/components/plan/slider-field";
import { cn } from "@/lib/utils";

const GOAL_STEP_TITLES = ["What's this for?", "A couple of numbers", "Target & timeline", "Build it"];
const NO_GOAL_STEP_TITLES = ["What's this for?", "A couple of numbers", "How much & how comfortable", "Build it"];
const RISK_TIERS: { key: RiskTolerance; label: string }[] = [
  { key: "conservative", label: "Conservative" },
  { key: "moderate", label: "Moderate" },
  { key: "aggressive", label: "Aggressive" },
];

export function OnboardingWizard({ onDone }: { onDone: (planId: string) => void }) {
  const { saveProfile } = useProfileStore();
  const { saveGoal } = useGoalStore();
  const { createPlan } = useSavedPlansStore();
  const { logActivity } = useActivityLog();
  const { markCompleted } = useOnboardingStore();

  const [stepIndex, setStepIndex] = React.useState(0);
  const [noGoal, setNoGoal] = React.useState(false);
  const [presetKey, setPresetKey] = React.useState<string>("custom");
  const [wantsProfile, setWantsProfile] = React.useState(true);
  const [income, setIncome] = React.useState(50000);
  const [expenses, setExpenses] = React.useState(25000);
  const [building, setBuilding] = React.useState(false);

  const preset = getPreset(presetKey);
  const [targetAmount, setTargetAmount] = React.useState(preset.defaultAmount);
  const [years, setYears] = React.useState(preset.defaultYears);
  const [existingSavings, setExistingSavings] = React.useState(0);

  // "Not sure yet" path — no target, just a monthly amount (and/or a lump
  // sum) plus a risk tier, landing on an open-ended plan instead of a Goal.
  const [monthlyAmount, setMonthlyAmount] = React.useState(5000);
  const [lumpsum, setLumpsum] = React.useState(0);
  const [riskTolerance, setRiskTolerance] = React.useState<RiskTolerance>("moderate");

  const stepTitles = noGoal ? NO_GOAL_STEP_TITLES : GOAL_STEP_TITLES;
  const allocation = suggestedAllocation(15, riskTolerance);
  const suggestedReturn = Math.round(blendedReturnPct(allocation) * 10) / 10;

  function pickPreset(key: string) {
    const p = getPreset(key);
    setNoGoal(false);
    setPresetKey(key);
    setTargetAmount(p.defaultAmount);
    setYears(p.defaultYears);
  }

  function pickNoGoal() {
    setNoGoal(true);
  }

  function next() {
    setStepIndex((i) => Math.min(stepTitles.length - 1, i + 1));
  }
  function back() {
    setStepIndex((i) => Math.max(0, i - 1));
  }

  const inflationPct = preset.defaultInflationPct;
  const expectedReturnPct = 12;
  const target = inflatedTarget(targetAmount, inflationPct, years);
  const sip = requiredMonthlySip(target, expectedReturnPct, years, existingSavings);

  async function handleBuild() {
    setBuilding(true);
    try {
      if (wantsProfile) {
        saveProfile({
          monthlyIncome: income,
          monthlyExpenses: expenses,
          monthlyCaregivingExpenses: 0,
          dependents: [],
          hasHealthInsurance: false,
          hasTermLifeInsurance: false,
          emergencyFundSaved: 0,
          debts: [],
          riskTolerance,
          city: "",
        });
      }

      const plan = noGoal
        ? buildGeneralPlan({ monthlyAmount, lumpsum, expectedReturnPct: suggestedReturn })
        : buildPlanFromGoal(
            saveGoal({
              name: preset.label,
              presetKey: preset.key,
              targetAmountToday: targetAmount,
              years,
              inflationPct,
              expectedReturnPct,
              existingSavings,
            })
          );
      const saved = await createPlan({ name: plan.name, planType: noGoal ? "wealth" : "goal", plan });
      logActivity({ kind: "plan_created", planId: saved.id, message: `Plan "${saved.name}" created` });
      markCompleted();
      toast.success("Your plan is ready");
      onDone(saved.id);
    } catch {
      toast.error("Something went wrong building your plan — try again.");
    } finally {
      setBuilding(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Let&apos;s build your investment plan</CardTitle>
        <CardDescription>
          A handful of simple questions — we&apos;ll turn them into a real, working plan using the exact same
          engine every other plan in this app runs on.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-6">
        <Steps current={stepIndex} size="small" items={stepTitles.map((title) => ({ title }))} />

        {stepIndex === 0 && (
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
            {GOAL_PRESETS.map((p) => (
              <button
                key={p.key}
                type="button"
                onClick={() => pickPreset(p.key)}
                className={cn(
                  "flex flex-col items-center gap-2 rounded-lg border p-3.5 text-center transition-colors hover:border-primary hover:bg-primary/5",
                  !noGoal && presetKey === p.key && "border-primary bg-primary/5"
                )}
              >
                <p.icon className="size-6 text-primary" />
                <span className="text-xs font-medium leading-tight">{p.label}</span>
              </button>
            ))}
            <button
              type="button"
              onClick={pickNoGoal}
              className={cn(
                "flex flex-col items-center gap-2 rounded-lg border p-3.5 text-center transition-colors hover:border-primary hover:bg-primary/5",
                noGoal && "border-primary bg-primary/5"
              )}
            >
              <Compass className="size-6 text-primary" />
              <span className="text-xs font-medium leading-tight">Not sure yet — just invest</span>
            </button>
          </div>
        )}

        {stepIndex === 1 && (
          <div className="grid gap-5">
            <SliderField id="onb-income" label="Monthly income (in-hand)" value={income} onChange={setIncome} min={0} max={500000} step={1000} prefix="₹" />
            <SliderField id="onb-expenses" label="Monthly living expenses" value={expenses} onChange={setExpenses} min={0} max={300000} step={500} prefix="₹" />
            <button
              type="button"
              onClick={() => setWantsProfile(false)}
              className="w-fit text-xs text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
            >
              {wantsProfile ? "I'd rather set this up later — skip" : "Skipped — using this goal on its own"}
            </button>
          </div>
        )}

        {stepIndex === 2 && (noGoal ? (
          <div className="grid gap-5">
            <SliderField
              id="onb-monthly"
              label="How much can you invest every month?"
              value={monthlyAmount}
              onChange={setMonthlyAmount}
              min={0}
              max={200000}
              step={500}
              prefix="₹"
              presets={[10, 15, 20].map((pct) => ({
                label: `${pct}%`,
                value: Math.round((income * pct) / 100 / 500) * 500,
              }))}
            />
            <SliderField
              id="onb-lumpsum"
              label="Any lump sum to invest right now? (optional)"
              value={lumpsum}
              onChange={setLumpsum}
              min={0}
              max={5000000}
              step={5000}
              prefix="₹"
            />
            <div className="grid gap-2">
              <span className="text-sm font-medium">How comfortable are you with risk?</span>
              <div className="grid grid-cols-3 gap-2">
                {RISK_TIERS.map((tier) => (
                  <button
                    key={tier.key}
                    type="button"
                    onClick={() => setRiskTolerance(tier.key)}
                    className={cn(
                      "rounded-lg border p-2.5 text-center text-sm transition-colors hover:border-primary hover:bg-primary/5",
                      riskTolerance === tier.key && "border-primary bg-primary/5 font-medium"
                    )}
                  >
                    {tier.label}
                  </button>
                ))}
              </div>
              {riskTolerance === "conservative" && (
                <p className="text-xs text-muted-foreground">{CONSERVATIVE_RISK_NOTE}</p>
              )}
              <p className="text-xs text-muted-foreground">
                Suggested split: {allocation.equityPct}% equity / {allocation.debtPct}% debt / {allocation.goldPct}%
                gold — ~{suggestedReturn}% blended expected return.
              </p>
            </div>
          </div>
        ) : (
          <div className="grid gap-5">
            <SliderField
              id="onb-amount"
              label={`${preset.label} — target amount, in today's rupees`}
              value={targetAmount}
              onChange={setTargetAmount}
              min={50000}
              max={50000000}
              step={10000}
              prefix="₹"
            />
            <SliderField
              id="onb-years"
              label="Years to reach it"
              value={years}
              onChange={setYears}
              min={preset.defaultYears <= 2 ? 0.5 : 1}
              max={40}
              step={preset.defaultYears <= 2 ? 0.5 : 1}
              suffix="yrs"
            />
            <SliderField
              id="onb-existing"
              label="Already saved for this"
              value={existingSavings}
              onChange={setExistingSavings}
              min={0}
              max={Math.max(targetAmount, 5000000)}
              step={5000}
              prefix="₹"
            />
          </div>
        ))}

        {stepIndex === 3 && (noGoal ? (
          <div className="grid gap-1 rounded-lg border bg-muted/40 p-3 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Plan</span>
              <span className="font-medium">General investing</span>
            </div>
            <div className="flex items-center justify-between font-medium">
              <span>Monthly investment</span>
              <span className="font-mono tabular-nums text-primary">{formatINR(monthlyAmount)}/mo</span>
            </div>
            {lumpsum > 0 && (
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Starting lump sum</span>
                <span className="font-mono tabular-nums">{formatINR(lumpsum)}</span>
              </div>
            )}
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Suggested allocation</span>
              <span className="font-mono tabular-nums">
                {allocation.equityPct}/{allocation.debtPct}/{allocation.goldPct} · ~{suggestedReturn}%
              </span>
            </div>
            {wantsProfile && (
              <div className="mt-2 flex items-center justify-between border-t pt-2 text-xs text-muted-foreground">
                <span>Profile</span>
                <span>
                  {formatINR(income)}/mo income · {formatINR(expenses)}/mo expenses
                </span>
              </div>
            )}
            <p className="mt-2 text-xs text-muted-foreground">
              This creates a real plan you can edit, compare, or delete afterward — nothing here is final. Once you
              know what you&apos;re saving for, add a real goal anytime from Goal Planner.
            </p>
          </div>
        ) : (
          <div className="grid gap-1 rounded-lg border bg-muted/40 p-3 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Goal</span>
              <span className="font-medium">{preset.label}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Target cost by then (after inflation)</span>
              <span className="font-mono tabular-nums">{formatINR(target)}</span>
            </div>
            <div className="flex items-center justify-between font-medium">
              <span>Monthly SIP needed</span>
              <span className="font-mono tabular-nums text-primary">{formatINR(sip)}/mo</span>
            </div>
            {wantsProfile && (
              <div className="mt-2 flex items-center justify-between border-t pt-2 text-xs text-muted-foreground">
                <span>Profile</span>
                <span>
                  {formatINR(income)}/mo income · {formatINR(expenses)}/mo expenses
                </span>
              </div>
            )}
            <p className="mt-2 text-xs text-muted-foreground">
              This creates a real plan you can edit, compare, or delete afterward — nothing here is final. Add more
              goals anytime from Goal Planner.
            </p>
          </div>
        ))}

        <div className="flex items-center justify-between border-t pt-4">
          <Button variant="ghost" size="sm" onClick={back} disabled={stepIndex === 0} className="gap-1.5">
            <ArrowLeft className="size-3.5" />
            Back
          </Button>
          {stepIndex < stepTitles.length - 1 ? (
            <Button size="sm" onClick={next} className="gap-1.5">
              Next
              <ArrowRight className="size-3.5" />
            </Button>
          ) : (
            <Button size="sm" onClick={handleBuild} disabled={building} className="gap-1.5">
              <Rocket className="size-3.5" />
              {building ? "Building…" : "Build my plan"}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
