"use client";

import * as React from "react";
import dayjs, { type Dayjs } from "dayjs";
import { DatePicker, Steps } from "antd";
import { ArrowLeft, ArrowRight, Plus, Rocket, Scale, Shield, Trash2 } from "lucide-react";

import type { DependentRelation, Profile, ProfileInput, RiskTolerance } from "@/lib/stores/use-profile-store";
import { newDebt, newDependent } from "@/lib/stores/use-profile-store";
import { CITIES } from "@/lib/calculators/city-cost-index";
import { ageFromDob } from "@/lib/calculators/age";
import { formatINR } from "@/lib/format";
import { totalMonthlyEMI, monthlySurplus } from "@/lib/goals/prioritization";
import { CONSERVATIVE_RISK_NOTE } from "@/lib/calculators/asset-allocation";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SliderField } from "@/components/plan/slider-field";
import { cn } from "@/lib/utils";

const STEP_TITLES = ["Income & expenses", "Dependents & debts", "Protection", "Risk tolerance", "Review"];

const RISK_OPTIONS: { key: RiskTolerance; label: string; icon: typeof Shield; hint: string }[] = [
  { key: "conservative", label: "Conservative", icon: Shield, hint: "Steady, lower swings — favors debt-heavy funds." },
  { key: "moderate", label: "Moderate", icon: Scale, hint: "A balanced mix — most goals default here." },
  { key: "aggressive", label: "Aggressive", icon: Rocket, hint: "Higher swings for higher long-term growth." },
];

const RELATION_OPTIONS: { key: DependentRelation; label: string }[] = [
  { key: "spouse", label: "Spouse" },
  { key: "child", label: "Child" },
  { key: "parent", label: "Parent" },
  { key: "other", label: "Other" },
];

function defaultProfileInput(): ProfileInput {
  return {
    monthlyIncome: 50000,
    monthlyExpenses: 25000,
    monthlyCaregivingExpenses: 0,
    dependents: [],
    hasHealthInsurance: false,
    hasTermLifeInsurance: false,
    emergencyFundSaved: 0,
    debts: [],
    riskTolerance: "moderate",
    city: "",
  };
}

function toInput(profile: Profile | null): ProfileInput {
  if (!profile) return defaultProfileInput();
  const {
    monthlyIncome,
    monthlyExpenses,
    monthlyCaregivingExpenses,
    dependents,
    hasHealthInsurance,
    healthInsuranceCoverAmount,
    hasTermLifeInsurance,
    termInsuranceCoverAmount,
    emergencyFundSaved,
    debts,
    riskTolerance,
    city,
    dob,
  } = profile;
  return {
    monthlyIncome,
    monthlyExpenses,
    monthlyCaregivingExpenses,
    dependents,
    hasHealthInsurance,
    healthInsuranceCoverAmount,
    hasTermLifeInsurance,
    termInsuranceCoverAmount,
    emergencyFundSaved,
    debts,
    riskTolerance,
    city,
    dob,
  };
}

/** A compact labeled number field for a debt row — SliderField is too tall to repeat three times per row. */
function MiniNumberField({
  label,
  value,
  onChange,
  prefix,
  suffix,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  prefix?: string;
  suffix?: string;
}) {
  return (
    <div className="grid gap-1">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <div className="flex items-center gap-1 rounded-md border border-input bg-transparent px-1.5 focus-within:border-ring focus-within:ring-[3px] focus-within:ring-ring/50">
        {prefix && <span className="text-xs text-muted-foreground">{prefix}</span>}
        <Input
          type="number"
          min={0}
          value={value}
          onChange={(e) => {
            const n = Number(e.target.value);
            if (!Number.isNaN(n)) onChange(n);
          }}
          className="h-7 border-0 px-1 text-right font-mono tabular-nums shadow-none focus-visible:ring-0"
        />
        {suffix && <span className="text-xs text-muted-foreground">{suffix}</span>}
      </div>
    </div>
  );
}

export function ProfileWizard({ initialProfile, onDone }: { initialProfile: Profile | null; onDone: (input: ProfileInput) => void }) {
  const [stepIndex, setStepIndex] = React.useState(0);
  const [draft, setDraft] = React.useState<ProfileInput>(() => toInput(initialProfile));

  const surplus = monthlySurplus(draft);
  const emi = totalMonthlyEMI(draft);

  function addDebt() {
    setDraft((d) => ({ ...d, debts: [...d.debts, newDebt()] }));
  }

  function updateDebt(id: string, patch: Partial<(typeof draft.debts)[number]>) {
    setDraft((d) => ({ ...d, debts: d.debts.map((debt) => (debt.id === id ? { ...debt, ...patch } : debt)) }));
  }

  function removeDebt(id: string) {
    setDraft((d) => ({ ...d, debts: d.debts.filter((debt) => debt.id !== id) }));
  }

  function next() {
    setStepIndex((i) => Math.min(STEP_TITLES.length - 1, i + 1));
  }

  function back() {
    setStepIndex((i) => Math.max(0, i - 1));
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{initialProfile ? "Edit your financial profile" : "Let's build your financial profile"}</CardTitle>
        <CardDescription>
          A few honest numbers — income, expenses, what you already owe and own — so the recommendations below are
          actually based on your situation, not a guess.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-6">
        <Steps current={stepIndex} size="small" items={STEP_TITLES.map((title) => ({ title }))} />

        {stepIndex === 0 && (
          <div className="grid gap-5">
            <div className="grid gap-2">
              <Label htmlFor="profile-dob">Date of birth</Label>
              <DatePicker
                id="profile-dob"
                value={draft.dob ? dayjs(draft.dob, "YYYY-MM-DD") : null}
                onChange={(date: Dayjs | null) => setDraft((d) => ({ ...d, dob: date ? date.format("YYYY-MM-DD") : undefined }))}
                disabledDate={(current: Dayjs) => current.isAfter(dayjs(), "day")}
                format="DD MMM YYYY"
                className="w-full"
              />
              <p className="text-xs text-muted-foreground">
                Optional — lets goals like retirement default their timeline off your actual age instead of a flat
                guess.
              </p>
            </div>
            <SliderField
              id="profile-income"
              label="Monthly income (in-hand)"
              value={draft.monthlyIncome}
              onChange={(v) => setDraft((d) => ({ ...d, monthlyIncome: v }))}
              min={0}
              max={500000}
              step={1000}
              prefix="₹"
            />
            <SliderField
              id="profile-expenses"
              label="Monthly living expenses"
              value={draft.monthlyExpenses}
              onChange={(v) => setDraft((d) => ({ ...d, monthlyExpenses: v }))}
              min={0}
              max={300000}
              step={500}
              prefix="₹"
            />
            <SliderField
              id="profile-caregiving"
              label="Medical / caregiving costs for parents or dependents"
              value={draft.monthlyCaregivingExpenses}
              onChange={(v) => setDraft((d) => ({ ...d, monthlyCaregivingExpenses: v }))}
              min={0}
              max={100000}
              step={500}
              prefix="₹"
            />
            <p className="text-xs text-muted-foreground">
              Don&apos;t include EMIs here — you&apos;ll add those as debts next. Keep caregiving costs separate from
              your own living expenses so they stay visible.
            </p>
            <div className="grid gap-2">
              <Label htmlFor="profile-city">Which city do you live in?</Label>
              <Select value={draft.city} onValueChange={(v) => setDraft((d) => ({ ...d, city: v }))}>
                <SelectTrigger id="profile-city" className="w-full">
                  <SelectValue placeholder="Not set — goal costs stay at the national average" />
                </SelectTrigger>
                <SelectContent>
                  {CITIES.map((c) => (
                    <SelectItem key={c.key} value={c.key}>
                      {c.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Used only to nudge home/vehicle/marriage goal suggestions toward realistic local costs — optional.
              </p>
            </div>
          </div>
        )}

        {stepIndex === 1 && (
          <div className="grid gap-5">
            <div className="grid gap-2.5">
              <Label>Who depends on your income?</Label>
              {draft.dependents.map((dep) => (
                <div key={dep.id} className="flex items-center gap-2 rounded-lg border p-2.5">
                  <Select
                    value={dep.relation}
                    onValueChange={(v) =>
                      setDraft((d) => ({
                        ...d,
                        dependents: d.dependents.map((x) => (x.id === dep.id ? { ...x, relation: v as DependentRelation } : x)),
                      }))
                    }
                  >
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {RELATION_OPTIONS.map((r) => (
                        <SelectItem key={r.key} value={r.key}>
                          {r.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <div className="w-24">
                    <MiniNumberField
                      label="Age (optional)"
                      value={dep.age ?? 0}
                      onChange={(v) =>
                        setDraft((d) => ({
                          ...d,
                          dependents: d.dependents.map((x) => (x.id === dep.id ? { ...x, age: v || undefined } : x)),
                        }))
                      }
                    />
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="ml-auto size-8 shrink-0 text-muted-foreground hover:text-destructive"
                    onClick={() => setDraft((d) => ({ ...d, dependents: d.dependents.filter((x) => x.id !== dep.id) }))}
                    aria-label="Remove dependent"
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              ))}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setDraft((d) => ({ ...d, dependents: [...d.dependents, newDependent()] }))}
                className="w-fit gap-1.5"
              >
                <Plus className="size-3.5" />
                Add a dependent
              </Button>
              <p className="text-xs text-muted-foreground">
                A child&apos;s age can auto-suggest an education goal timeline; a parent unlocks a caregiving-cost
                nudge below.
              </p>
            </div>

            <div className="grid gap-2.5">
              <div className="flex items-center justify-between">
                <Label>Debts &amp; loans (EMIs)</Label>
                {draft.debts.length > 0 && (
                  <span className="font-mono text-xs text-muted-foreground tabular-nums">{formatINR(emi)}/mo total EMI</span>
                )}
              </div>
              {draft.debts.map((debt) => (
                <div key={debt.id} className="grid gap-2 rounded-lg border p-2.5">
                  <div className="flex items-center gap-2">
                    <Input
                      placeholder="e.g. Credit card, Car loan"
                      value={debt.label}
                      onChange={(e) => updateDebt(debt.id, { label: e.target.value })}
                      className="flex-1"
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-8 shrink-0 text-muted-foreground hover:text-destructive"
                      onClick={() => removeDebt(debt.id)}
                      aria-label="Remove debt"
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                    <MiniNumberField
                      label="Outstanding"
                      prefix="₹"
                      value={debt.outstandingAmount}
                      onChange={(v) => updateDebt(debt.id, { outstandingAmount: v })}
                    />
                    <MiniNumberField
                      label="Interest"
                      suffix="%"
                      value={debt.interestRatePct}
                      onChange={(v) => updateDebt(debt.id, { interestRatePct: v })}
                    />
                    <MiniNumberField
                      label="Monthly EMI"
                      prefix="₹"
                      value={debt.monthlyEMI}
                      onChange={(v) => updateDebt(debt.id, { monthlyEMI: v })}
                    />
                    <MiniNumberField
                      label="Remaining (months)"
                      value={debt.tenureMonths ?? 0}
                      onChange={(v) => updateDebt(debt.id, { tenureMonths: v > 0 ? v : undefined })}
                    />
                  </div>
                </div>
              ))}
              <Button variant="outline" size="sm" onClick={addDebt} className="w-fit gap-1.5">
                <Plus className="size-3.5" />
                Add a debt
              </Button>
            </div>
          </div>
        )}

        {stepIndex === 2 && (
          <div className="grid gap-5">
            <div className="grid gap-3 rounded-lg border p-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <Label className="text-sm font-medium">Health insurance</Label>
                  <p className="text-xs text-muted-foreground">Covers you (and dependents) for hospitalization.</p>
                </div>
                <Button
                  type="button"
                  variant={draft.hasHealthInsurance ? "default" : "outline"}
                  size="sm"
                  onClick={() => setDraft((d) => ({ ...d, hasHealthInsurance: !d.hasHealthInsurance }))}
                >
                  {draft.hasHealthInsurance ? "Yes, I have it" : "Not yet"}
                </Button>
              </div>
              {draft.hasHealthInsurance && (
                <SliderField
                  id="profile-health-cover"
                  label="Total cover amount"
                  value={draft.healthInsuranceCoverAmount ?? 0}
                  onChange={(v) => setDraft((d) => ({ ...d, healthInsuranceCoverAmount: v }))}
                  min={0}
                  max={5000000}
                  step={50000}
                  prefix="₹"
                  size="sm"
                />
              )}
            </div>
            <div className="grid gap-3 rounded-lg border p-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <Label className="text-sm font-medium">Term life insurance</Label>
                  <p className="text-xs text-muted-foreground">Replaces your income for dependents if something happens to you.</p>
                </div>
                <Button
                  type="button"
                  variant={draft.hasTermLifeInsurance ? "default" : "outline"}
                  size="sm"
                  onClick={() => setDraft((d) => ({ ...d, hasTermLifeInsurance: !d.hasTermLifeInsurance }))}
                >
                  {draft.hasTermLifeInsurance ? "Yes, I have it" : "Not yet"}
                </Button>
              </div>
              {draft.hasTermLifeInsurance && (
                <SliderField
                  id="profile-term-cover"
                  label="Total cover amount"
                  value={draft.termInsuranceCoverAmount ?? 0}
                  onChange={(v) => setDraft((d) => ({ ...d, termInsuranceCoverAmount: v }))}
                  min={0}
                  max={20000000}
                  step={100000}
                  prefix="₹"
                  size="sm"
                />
              )}
            </div>
            <SliderField
              id="profile-emergency-fund"
              label="Already saved as an emergency fund"
              value={draft.emergencyFundSaved}
              onChange={(v) => setDraft((d) => ({ ...d, emergencyFundSaved: v }))}
              min={0}
              max={2000000}
              step={5000}
              prefix="₹"
            />
          </div>
        )}

        {stepIndex === 3 && (
          <div className="grid gap-2.5 sm:grid-cols-3">
            {RISK_OPTIONS.map((opt) => (
              <button
                key={opt.key}
                type="button"
                onClick={() => setDraft((d) => ({ ...d, riskTolerance: opt.key }))}
                className={cn(
                  "flex flex-col items-center gap-2 rounded-lg border p-3.5 text-center transition-colors hover:border-primary hover:bg-primary/5",
                  draft.riskTolerance === opt.key && "border-primary bg-primary/5"
                )}
              >
                <opt.icon className="size-6 text-primary" />
                <span className="text-sm font-medium">{opt.label}</span>
                <span className="text-xs text-muted-foreground">{opt.hint}</span>
              </button>
            ))}
            {draft.riskTolerance === "conservative" && (
              <p className="text-xs text-muted-foreground sm:col-span-3">{CONSERVATIVE_RISK_NOTE}</p>
            )}
          </div>
        )}

        {stepIndex === 4 && (
          <div className="grid gap-1 rounded-lg border bg-muted/40 p-3 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Monthly income</span>
              <span className="font-mono tabular-nums">{formatINR(draft.monthlyIncome)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Monthly expenses</span>
              <span className="font-mono tabular-nums">{formatINR(draft.monthlyExpenses)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">EMIs ({draft.debts.length})</span>
              <span className="font-mono tabular-nums">{formatINR(emi)}</span>
            </div>
            <div className="flex items-center justify-between font-medium">
              <span>Monthly surplus</span>
              <span className={cn("font-mono tabular-nums", surplus < 0 && "text-negative")}>{formatINR(surplus)}</span>
            </div>
            <div className="mt-2 flex items-center justify-between border-t pt-2 text-xs text-muted-foreground">
              <span>Dependents · Health cover · Term cover · Risk tolerance · City</span>
              <span>
                {draft.dependents.length} · {draft.hasHealthInsurance ? "Yes" : "No"} · {draft.hasTermLifeInsurance ? "Yes" : "No"} ·{" "}
                {RISK_OPTIONS.find((o) => o.key === draft.riskTolerance)?.label} ·{" "}
                {CITIES.find((c) => c.key === draft.city)?.label ?? "Not set"}
              </span>
            </div>
            {draft.dob && (
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Age</span>
                <span>{ageFromDob(draft.dob)}</span>
              </div>
            )}
          </div>
        )}

        <div className="flex items-center justify-between border-t pt-4">
          <Button variant="ghost" size="sm" onClick={back} disabled={stepIndex === 0} className="gap-1.5">
            <ArrowLeft className="size-3.5" />
            Back
          </Button>
          {stepIndex < STEP_TITLES.length - 1 ? (
            <Button size="sm" onClick={next} className="gap-1.5">
              Next
              <ArrowRight className="size-3.5" />
            </Button>
          ) : (
            <Button size="sm" onClick={() => onDone(draft)}>
              Save profile
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
