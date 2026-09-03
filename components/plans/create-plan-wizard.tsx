"use client";

import * as React from "react";
import { toast } from "sonner";
import { ArrowLeft, ArrowRight, Check, Wallet, Target, PiggyBank } from "lucide-react";

import type { Plan, PlanEvent } from "@/lib/engine";
import { addYearsUTC, parseISO, toISODate } from "@/lib/engine";
import { makeDefaultPlan, todayISO } from "@/lib/goals/default-plan";
import { newId } from "@/lib/id";
import { GOAL_PRESETS, getPreset } from "@/lib/goals/goal-presets";
import { inflatedTarget, requiredMonthlySip } from "@/lib/calculators/goal-calc";
import { computePlanResults } from "@/lib/goals/compute-plan-results";
import { useSavedPlansStore, type PlanType } from "@/lib/stores/use-plans-store";
import { useActivityLog } from "@/lib/stores/use-activity-log-store";
import { formatDate, formatINR } from "@/lib/format";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { PlanTimingField } from "@/components/plan/plan-timing-field";
import { SliderField } from "@/components/plan/slider-field";
import { EventTimeline } from "@/components/plan/event-timeline";
import { cn } from "@/lib/utils";

const STEP_LABELS = ["Basic Info", "Add Events", "Review & Save"];

const PLAN_TYPE_OPTIONS: { key: PlanType; label: string; icon: typeof Wallet; hint: string }[] = [
  { key: "wealth", label: "Wealth Creation", icon: Wallet, hint: "Grow your money over time — no specific target." },
  { key: "goal", label: "Goal Based", icon: Target, hint: "Plan for a specific goal — home, wedding, education." },
  { key: "retirement", label: "Retirement", icon: PiggyBank, hint: "Plan your retirement corpus." },
];

interface Draft {
  name: string;
  description: string;
  planType: PlanType;
  presetKey?: string;
  startDate: string;
  endDate: string;
  initialInvestment: number;
  events: PlanEvent[];
  targetAmount?: number;
}

/** Seeds sensible dates/events for a plan type, mirroring buildPlanFromGoal() in goals-dashboard.tsx. */
function seedForType(
  planType: PlanType,
  presetKey?: string
): { startDate: string; endDate: string; events: PlanEvent[]; name: string; targetAmount?: number } {
  const start = todayISO();
  if (planType === "wealth") {
    return {
      startDate: start,
      endDate: toISODate(addYearsUTC(parseISO(start), 15)),
      events: [{ id: newId(), type: "SIP_START", date: start, amount: 5000 }],
      name: "",
    };
  }
  const key = planType === "retirement" ? "retirement" : presetKey ?? "custom";
  const preset = getPreset(key);
  const target = inflatedTarget(preset.defaultAmount, preset.defaultInflationPct, preset.defaultYears);
  const rawSip = requiredMonthlySip(target, 12, preset.defaultYears);
  const sip = rawSip > 0 ? Math.max(500, Math.ceil(rawSip / 100) * 100) : 0;
  const events: PlanEvent[] = sip > 0 ? [{ id: newId(), type: "SIP_START", date: start, amount: sip }] : [];
  return {
    startDate: start,
    endDate: toISODate(addYearsUTC(parseISO(start), preset.defaultYears)),
    events,
    name: preset.label,
    targetAmount: target,
  };
}

function buildDraftPlan(draft: Draft): Plan {
  const base = makeDefaultPlan(draft.startDate);
  const events = [...draft.events];
  if (draft.initialInvestment > 0) {
    events.push({ id: newId(), type: "LUMPSUM", date: draft.startDate, amount: draft.initialInvestment, label: "Initial investment" });
  }
  return { ...base, id: newId(), name: draft.name || "Untitled plan", endDate: draft.endDate, events };
}

export function CreatePlanWizard({ onCancel, onCreated }: { onCancel: () => void; onCreated: (id: string) => void }) {
  const { createPlan } = useSavedPlansStore();
  const { logActivity } = useActivityLog();
  const [step, setStep] = React.useState(0);
  const [saving, setSaving] = React.useState(false);
  const [draft, setDraft] = React.useState<Draft>(() => ({
    description: "",
    planType: "wealth",
    initialInvestment: 0,
    ...seedForType("wealth"),
    name: "",
  }));

  function applyPlanType(planType: PlanType, presetKey?: string) {
    const seed = seedForType(planType, presetKey);
    setDraft((d) => ({
      ...d,
      planType,
      presetKey,
      startDate: seed.startDate,
      endDate: seed.endDate,
      events: seed.events,
      name: d.name || seed.name,
      targetAmount: seed.targetAmount,
    }));
  }

  const draftPlan = React.useMemo(() => buildDraftPlan(draft), [draft]);
  const results = React.useMemo(() => computePlanResults(draftPlan), [draftPlan]);

  async function handleSave() {
    setSaving(true);
    try {
      const saved = await createPlan({
        name: draft.name.trim() || "Untitled plan",
        description: draft.description.trim() || undefined,
        planType: draft.planType,
        plan: draftPlan,
        targetAmount: draft.targetAmount,
      });
      logActivity({ kind: "plan_created", planId: saved.id, message: `Plan "${saved.name}" created` });
      onCreated(saved.id);
    } catch {
      toast.error("Couldn't save this plan — check your connection and try again.");
      setSaving(false);
    }
  }

  const canProceedStep0 = draft.name.trim().length > 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Create New Plan</CardTitle>
        <CardDescription>
          Step {step + 1} of {STEP_LABELS.length}: {STEP_LABELS[step]}
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-6">
        <div className="flex items-center gap-2">
          {STEP_LABELS.map((label, i) => (
            <React.Fragment key={label}>
              <div className="flex items-center gap-1.5">
                <span
                  className={cn(
                    "flex size-5 shrink-0 items-center justify-center rounded-full text-[11px] font-medium",
                    i < step ? "bg-primary text-primary-foreground" : i === step ? "border-2 border-primary text-primary" : "border border-input text-muted-foreground"
                  )}
                >
                  {i < step ? <Check className="size-3" /> : i + 1}
                </span>
                <span className={cn("text-xs font-medium", i === step ? "text-foreground" : "text-muted-foreground")}>{label}</span>
              </div>
              {i < STEP_LABELS.length - 1 && <div className="h-px flex-1 bg-border" />}
            </React.Fragment>
          ))}
        </div>

        {step === 0 && (
          <div className="grid gap-5">
            <div className="grid gap-2">
              <Label htmlFor="wizard-name">Plan name</Label>
              <Input
                id="wizard-name"
                placeholder="e.g. My Dream Retirement Plan"
                value={draft.name}
                onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="wizard-description">Description (optional)</Label>
              <Textarea
                id="wizard-description"
                placeholder="What's this plan for?"
                value={draft.description}
                onChange={(e) => setDraft((d) => ({ ...d, description: e.target.value }))}
              />
            </div>

            <div className="grid gap-2">
              <Label>Plan type</Label>
              <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
                {PLAN_TYPE_OPTIONS.map((opt) => (
                  <button
                    key={opt.key}
                    type="button"
                    onClick={() => applyPlanType(opt.key)}
                    className={cn(
                      "flex flex-col items-start gap-1.5 rounded-lg border p-3.5 text-left transition-colors hover:border-primary hover:bg-primary/5",
                      draft.planType === opt.key && "border-primary bg-primary/5"
                    )}
                  >
                    <opt.icon className="size-5 text-primary" />
                    <span className="text-sm font-medium">{opt.label}</span>
                    <span className="text-xs text-muted-foreground">{opt.hint}</span>
                  </button>
                ))}
              </div>
            </div>

            {draft.planType === "goal" && (
              <div className="grid gap-2">
                <Label>What&apos;s the goal?</Label>
                <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
                  {GOAL_PRESETS.filter((p) => p.key !== "retirement").map((p) => (
                    <button
                      key={p.key}
                      type="button"
                      onClick={() => applyPlanType("goal", p.key)}
                      className={cn(
                        "flex flex-col items-center gap-1.5 rounded-lg border p-3 text-center transition-colors hover:border-primary hover:bg-primary/5",
                        draft.presetKey === p.key && "border-primary bg-primary/5"
                      )}
                    >
                      <p.icon className="size-5 text-primary" />
                      <span className="text-xs font-medium leading-tight">{p.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            <PlanTimingField
              startDate={draft.startDate}
              endDate={draft.endDate}
              onChange={(startDate, endDate) => setDraft((d) => ({ ...d, startDate, endDate }))}
              variant="advanced"
            />

            <SliderField
              id="wizard-initial-investment"
              label="Initial investment (optional)"
              value={draft.initialInvestment}
              onChange={(v) => setDraft((d) => ({ ...d, initialInvestment: v }))}
              min={0}
              max={2000000}
              step={5000}
              prefix="₹"
            />
          </div>
        )}

        {step === 1 && (
          <EventTimeline
            events={draft.events}
            planStart={draft.startDate}
            planEnd={draft.endDate}
            onChange={(events) => setDraft((d) => ({ ...d, events }))}
            title="Your timeline"
            emptyLabel="No events yet — add a SIP to begin."
          />
        )}

        {step === 2 && (
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-1 rounded-lg border bg-muted/40 p-3 text-sm">
              <p className="mb-1 text-xs font-medium text-foreground">Plan summary</p>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Name</span>
                <span className="font-medium">{draft.name || "Untitled plan"}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Type</span>
                <span>{PLAN_TYPE_OPTIONS.find((o) => o.key === draft.planType)?.label}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Start date</span>
                <span className="font-mono tabular-nums">{formatDate(draft.startDate)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">End date</span>
                <span className="font-mono tabular-nums">{formatDate(draft.endDate)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Events</span>
                <span>{draft.events.length + (draft.initialInvestment > 0 ? 1 : 0)}</span>
              </div>
            </div>

            <div className="grid gap-1 rounded-lg border bg-muted/40 p-3 text-sm">
              <p className="mb-1 text-xs font-medium text-foreground">Projected summary (assuming 12% return)</p>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Total invested</span>
                <span className="font-mono tabular-nums">{formatINR(results.expected.totalInvested)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Projected value</span>
                <span className="font-mono tabular-nums font-medium text-primary">{formatINR(results.expected.finalValue)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">XIRR</span>
                <span className="font-mono tabular-nums">{results.expected.xirrPct?.toFixed(2) ?? "—"}%</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Inflation-adjusted</span>
                <span className="font-mono tabular-nums">{formatINR(results.expected.realFinalValue)}</span>
              </div>
            </div>

            <p className="text-xs text-muted-foreground sm:col-span-2">
              These are projections based on assumed returns. Actual results may vary.
            </p>
          </div>
        )}

        <div className="flex items-center justify-between border-t pt-4">
          <Button variant="ghost" onClick={step === 0 ? onCancel : () => setStep((s) => s - 1)} className="gap-1.5">
            <ArrowLeft className="size-3.5" />
            {step === 0 ? "Cancel" : "Back"}
          </Button>
          {step < STEP_LABELS.length - 1 ? (
            <Button onClick={() => setStep((s) => s + 1)} disabled={step === 0 && !canProceedStep0} className="gap-1.5">
              Next: {STEP_LABELS[step + 1]}
              <ArrowRight className="size-3.5" />
            </Button>
          ) : (
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "Saving…" : "Save Plan"}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
