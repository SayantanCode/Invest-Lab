// Goal planning: reverse-solves the required monthly SIP for a target
// (inflation-adjusted) cost, rather than replaying real events forward —
// see lib/calculators/goal-calc.ts. Multiple goals can sit side by side, each with its
// own required SIP, plus a combined total across all of them so you can see
// at a glance whether marriage + education + retirement together is
// actually affordable. "Create a plan" hands a goal straight to Advanced
// mode, seeded with the right SIP and duration, so picking real funds for
// it uses the exact same machinery as any other plan.

"use client";

import * as React from "react";
import { toast } from "sonner";
import { FolderInput, Lightbulb, Pencil, Plus, Sparkles, Trash2 } from "lucide-react";

import type { Plan } from "@/lib/engine";
import { addYearsUTC, toISODate } from "@/lib/engine";
import type { View } from "@/app/page";
import { useGoalStore, type Goal } from "@/lib/stores/use-goal-store";
import { useProfileStore } from "@/lib/stores/use-profile-store";
import { useStuckNudge } from "@/lib/stores/use-stuck-nudge";
import { openAiPanel } from "@/lib/stores/use-ai-panel-store";
import { getPreset } from "@/lib/goals/goal-presets";
import { grownExistingSavings, inflatedTarget, requiredMonthlySip } from "@/lib/calculators/goal-calc";
import { suggestGoalAdjustments, type AdjustmentOption } from "@/lib/goals/goal-suggestions";
import { buildPlanFromGoal } from "@/lib/goals/build-plan-from-goal";
import { monthlySurplus } from "@/lib/goals/prioritization";
import { formatDate, formatINR } from "@/lib/format";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { GoalDialog } from "@/components/plan/goal-dialog";
import { RetirementIncomeNote } from "@/components/plan/retirement-income-note";
import { LoanEmiNote } from "@/components/plan/loan-emi-note";
import { GoalTimeline } from "@/components/plan/goal-timeline";
import { SliderField } from "@/components/plan/slider-field";
import { cn } from "@/lib/utils";

interface GoalFigures {
  goal: Goal;
  target: number;
  sip: number;
  grownSavings: number;
}

/** Presets big enough that a loan usually covers the rest, past the down payment being saved for. Retirement, travel, emergency, and custom goals aren't purchases with a "rest of the price" to finance. */
const LOAN_ELIGIBLE_PRESETS = new Set(["home", "vehicle", "bike", "education", "marriage"]);

export function GoalsDashboard({
  onCreatePlan,
  onNavigate,
  focusGoalId,
}: {
  onCreatePlan: (plan: Plan) => void;
  onNavigate?: (view: View) => void;
  /** Scrolls to and briefly highlights this goal's card on mount — e.g. arriving here from a chat message about a specific goal. */
  focusGoalId?: string;
}) {
  const { goals, saveGoal, updateGoal, deleteGoal } = useGoalStore();
  const { profile } = useProfileStore();
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<Goal | null>(null);
  const [deleteTarget, setDeleteTarget] = React.useState<Goal | null>(null);
  const [highlightedGoalId, setHighlightedGoalId] = React.useState(focusGoalId);

  // Runs after Home's own scrollTo(0, 0) effect (a child's effect commits
  // before its parent's on the same render, so without the delay this would
  // scroll into view and immediately get overridden back to the page top).
  React.useEffect(() => {
    if (!focusGoalId) return;
    const id = setTimeout(() => {
      document.getElementById(`goal-card-${focusGoalId}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 50);
    const clearHighlight = setTimeout(() => setHighlightedGoalId(undefined), 2500);
    return () => {
      clearTimeout(id);
      clearTimeout(clearHighlight);
    };
  }, [focusGoalId]);
  // A quick what-if, not a data record — intentionally not persisted. Anyone
  // who wants this to stick around fills in the real Profile instead.
  const [manualBudget, setManualBudget] = React.useState(0);
  const [expenseInflationEnabled, setExpenseInflationEnabled] = React.useState(false);
  const [expenseInflationPct, setExpenseInflationPct] = React.useState(6);

  useStuckNudge(goals.length === 0, 40000, () => {
    if (!onNavigate) return;
    toast("Not sure what to save for? Let's figure it out together.", {
      action: { label: "Get started", onClick: () => onNavigate({ kind: "onboarding" }) },
      duration: 10000,
    });
  });

  const figures: GoalFigures[] = React.useMemo(
    () =>
      goals.map((goal) => {
        const target = inflatedTarget(goal.targetAmountToday, goal.inflationPct, goal.years);
        const sip = requiredMonthlySip(target, goal.expectedReturnPct, goal.years, goal.existingSavings);
        const grownSavings = grownExistingSavings(goal.existingSavings, goal.expectedReturnPct, goal.years);
        return { goal, target, sip, grownSavings };
      }),
    [goals]
  );

  const totalMonthly = figures.reduce((sum, f) => sum + f.sip, 0);
  const surplus = profile ? monthlySurplus(profile) : null;
  const hasTenuredDebt = profile ? profile.debts.some((d) => d.tenureMonths != null) : false;

  const surplusAt = React.useCallback(
    (month: number) => {
      if (!profile) return 0;
      const expenseFactor = expenseInflationEnabled ? Math.pow(1 + expenseInflationPct / 100, month / 12) : 1;
      const activeEmi = profile.debts.reduce(
        (sum, d) => sum + (d.tenureMonths != null && month >= d.tenureMonths ? 0 : d.monthlyEMI),
        0
      );
      return profile.monthlyIncome - profile.monthlyExpenses * expenseFactor - profile.monthlyCaregivingExpenses - activeEmi;
    },
    [profile, expenseInflationEnabled, expenseInflationPct]
  );

  function openNew() {
    setEditing(null);
    setDialogOpen(true);
  }

  function openEdit(goal: Goal) {
    setEditing(goal);
    setDialogOpen(true);
  }

  function handleSave(input: Parameters<typeof saveGoal>[0]) {
    if (editing) {
      updateGoal(editing.id, input);
      toast.success(`Updated "${input.name}"`);
    } else {
      saveGoal(input);
      toast.success(`Added "${input.name}"`);
    }
  }

  function handleCreatePlan(goal: Goal) {
    const plan = buildPlanFromGoal(goal);
    onCreatePlan(plan);
    toast(`Created a plan for "${goal.name}" — pick real funds for it in Advanced.`);
  }

  /** Persists an edit to a goal's loan fields — same explicit-field pattern as applyOption below. */
  function updateGoalLoan(goal: Goal, patch: { loanAmount?: number; ratePct?: number; years?: number }) {
    updateGoal(goal.id, {
      name: goal.name,
      presetKey: goal.presetKey,
      targetAmountToday: goal.targetAmountToday,
      years: goal.years,
      inflationPct: goal.inflationPct,
      expectedReturnPct: goal.expectedReturnPct,
      existingSavings: goal.existingSavings,
      loanAmount: patch.loanAmount ?? goal.loanAmount,
      loanRatePct: patch.ratePct ?? goal.loanRatePct,
      loanYears: patch.years ?? goal.loanYears,
    });
  }

  const effectiveBudget = profile ? surplusAt(0) : manualBudget;
  const suggestions = React.useMemo(
    () => (figures.length >= 1 ? suggestGoalAdjustments(goals, effectiveBudget) : []),
    [goals, effectiveBudget, figures.length]
  );

  function applyOption(goal: Goal, option: AdjustmentOption) {
    if (option.kind === "drop") {
      deleteGoal(goal.id);
      toast.success(`Dropped "${goal.name}"`);
      return;
    }
    updateGoal(goal.id, {
      name: goal.name,
      presetKey: goal.presetKey,
      targetAmountToday: option.newTargetAmountToday ?? goal.targetAmountToday,
      years: option.newYears ?? goal.years,
      inflationPct: goal.inflationPct,
      expectedReturnPct: goal.expectedReturnPct,
      existingSavings: goal.existingSavings,
    });
    toast.success(`Updated "${goal.name}"`);
  }

  return (
    <div className="grid gap-5">
      {figures.length >= 1 && !profile && (
        <Card>
          <CardContent className="grid gap-4 py-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm text-muted-foreground">
                  {figures.length === 1 ? "This goal needs" : `${figures.length} goals combined need, all together`}
                </p>
                <p className="font-mono text-2xl font-semibold tabular-nums">{formatINR(totalMonthly)}/mo</p>
              </div>
              <Button variant="outline" size="sm" onClick={() => onNavigate?.({ kind: "profile" })} className="gap-1.5">
                Set up your Profile
              </Button>
            </div>
            <div className="border-t pt-3">
              <SliderField
                id="goals-manual-budget"
                label="Or just tell us your monthly budget"
                value={manualBudget}
                onChange={setManualBudget}
                min={0}
                max={200000}
                step={500}
                prefix="₹"
                size="sm"
              />
            </div>
          </CardContent>
        </Card>
      )}

      {figures.length >= 1 && profile && (
        <div className="flex flex-wrap items-center gap-3 rounded-lg border bg-muted/40 p-3">
          <button
            type="button"
            onClick={() => setExpenseInflationEnabled((v) => !v)}
            className={cn(
              "text-xs transition-colors",
              expenseInflationEnabled ? "font-medium text-primary" : "text-muted-foreground hover:text-foreground"
            )}
          >
            Account for expenses growing over time
          </button>
          {expenseInflationEnabled && (
            <div className="min-w-50 flex-1">
              <SliderField
                id="goals-expense-inflation"
                label="Annual expense growth"
                value={expenseInflationPct}
                onChange={setExpenseInflationPct}
                min={0}
                max={15}
                step={0.5}
                suffix="%"
                size="sm"
              />
            </div>
          )}
          {hasTenuredDebt && (
            <p className="w-full text-xs text-muted-foreground">Your loans&apos; payoff dates are already factored in.</p>
          )}
        </div>
      )}

      {figures.length >= 1 && (profile || manualBudget > 0) && (
        <GoalTimeline goals={goals} monthlySurplus={profile ? surplusAt : manualBudget} />
      )}

      {suggestions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Lightbulb className="size-4 text-primary" />
              Suggestions to make this fit
            </CardTitle>
            <CardDescription>
              Your goals need more than your current budget — here&apos;s what could close the gap, least essential
              first.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3">
            {suggestions.slice(0, 2).map((s) => (
              <div key={s.goal.id} className="grid gap-2 rounded-lg border p-3">
                <p className="text-sm font-medium">
                  {s.goal.name}{" "}
                  <span className="font-mono text-xs font-normal text-muted-foreground">
                    — currently {formatINR(s.currentSip)}/mo
                  </span>
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {s.options.map((opt) => (
                    <button
                      key={opt.kind}
                      type="button"
                      onClick={() => applyOption(s.goal, opt)}
                      className="rounded-full border px-2.5 py-1 text-xs text-muted-foreground transition-colors hover:border-primary hover:bg-primary/5 hover:text-primary"
                    >
                      {opt.description} — frees {formatINR(opt.monthlyFreed)}/mo
                    </button>
                  ))}
                </div>
              </div>
            ))}
            <Button
              variant="ghost"
              size="sm"
              className="w-fit gap-1.5 text-muted-foreground"
              onClick={() => openAiPanel()}
            >
              <Sparkles className="size-3.5" />
              Ask AI for other ideas
            </Button>
          </CardContent>
        </Card>
      )}

      {figures.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-14 text-center">
            <p className="max-w-sm text-sm text-muted-foreground">
              A home, a wedding, your child&apos;s education, retirement — set a target and see exactly what monthly
              SIP gets you there, in today&apos;s and tomorrow&apos;s rupees.
            </p>
            <Button onClick={openNew} className="gap-1.5">
              <Plus className="size-3.5" />
              Add your first goal
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {figures.map(({ goal, target, sip, grownSavings }) => {
            const preset = getPreset(goal.presetKey);
            const targetDate = toISODate(addYearsUTC(new Date(), goal.years));
            const alreadyCovered = goal.existingSavings > 0 && sip === 0;
            return (
              <Card
                key={goal.id}
                id={`goal-card-${goal.id}`}
                className={cn(
                  "flex flex-col transition-shadow duration-500",
                  highlightedGoalId === goal.id && "ring-2 ring-primary"
                )}
              >
                <CardHeader className="flex-row items-start justify-between space-y-0">
                  <div className="flex items-start gap-2.5">
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                      <preset.icon className="size-4.5" />
                    </span>
                    <div>
                      <CardTitle className="text-base leading-tight">{goal.name}</CardTitle>
                      <CardDescription>By {formatDate(targetDate)} · {goal.years} yrs</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="flex flex-1 flex-col gap-3">
                  <div className="grid gap-1 rounded-lg border bg-muted/40 p-3">
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>Target cost then</span>
                      <span className="font-mono tabular-nums text-foreground">{formatINR(target)}</span>
                    </div>
                    {goal.existingSavings > 0 && (
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>Already saved, grown by then</span>
                        <span className="font-mono tabular-nums text-foreground">{formatINR(grownSavings)}</span>
                      </div>
                    )}
                    {alreadyCovered ? (
                      <div className="flex items-center justify-between text-sm font-medium text-positive">
                        <span>Already on track</span>
                        <span>No SIP needed</span>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between text-sm font-medium">
                        <span>Needs</span>
                        <span className="font-mono tabular-nums text-primary">{formatINR(sip)}/mo</span>
                      </div>
                    )}
                  </div>
                  {goal.presetKey === "retirement" && (
                    <RetirementIncomeNote
                      corpus={target}
                      accumulationYears={goal.years}
                      accumulationInflationPct={goal.inflationPct}
                    />
                  )}
                  {LOAN_ELIGIBLE_PRESETS.has(goal.presetKey) && surplus != null && (
                    <LoanEmiNote
                      idPrefix={goal.id}
                      loanAmount={goal.loanAmount ?? preset.defaultAmount}
                      ratePct={goal.loanRatePct ?? 9}
                      years={goal.loanYears ?? preset.defaultYears}
                      onChange={(patch) => updateGoalLoan(goal, patch)}
                      availableAfterGoal={surplus - sip}
                    />
                  )}
                  <div className="mt-auto flex items-center gap-1.5 pt-1">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 gap-1.5"
                      onClick={() => handleCreatePlan(goal)}
                    >
                      <FolderInput className="size-3.5" />
                      Create a plan
                    </Button>
                    <Button variant="ghost" size="icon" className="size-8" onClick={() => openEdit(goal)} aria-label={`Edit ${goal.name}`}>
                      <Pencil className="size-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-8 text-destructive hover:text-destructive"
                      onClick={() => setDeleteTarget(goal)}
                      aria-label={`Delete ${goal.name}`}
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}

          <button
            type="button"
            onClick={openNew}
            className="flex min-h-[180px] flex-col items-center justify-center gap-2 rounded-lg border border-dashed text-muted-foreground transition-colors hover:border-primary hover:text-primary"
          >
            <Plus className="size-5" />
            <span className="text-sm font-medium">Add another goal</span>
          </button>
        </div>
      )}

      <GoalDialog
        goal={editing}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSave={handleSave}
        onDelete={(id) => {
          const target = goals.find((g) => g.id === id);
          if (target) setDeleteTarget(target);
          setDialogOpen(false);
        }}
      />

      <AlertDialog open={deleteTarget != null} onOpenChange={(next) => !next && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete &quot;{deleteTarget?.name}&quot;?</AlertDialogTitle>
            <AlertDialogDescription>
              This removes the goal and its required-SIP figure from your Goal Planner. It won&apos;t touch any saved
              Plan you already created from it — this can&apos;t be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-white hover:bg-destructive/90"
              onClick={() => {
                if (deleteTarget) deleteGoal(deleteTarget.id);
                setDeleteTarget(null);
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
