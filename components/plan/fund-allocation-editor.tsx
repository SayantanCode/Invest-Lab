"use client";

import * as React from "react";
import { AlertTriangle, CalendarClock, ChevronDown, Percent, Plus, Scale, Trash2 } from "lucide-react";

import type { FundAllocation, Plan, ScenarioKey } from "@/lib/engine";
import { SCENARIO_LABEL, SCENARIOS, validateAllocations } from "@/lib/engine";
import { primarySipAmount } from "@/lib/goals/plan-sip";
import { newId } from "@/lib/id";
import { formatINR } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { FundSearch } from "@/components/plan/fund-search";
import { FundDataPreview } from "@/components/plan/fund-data-preview";
import { FundSwitchDialog } from "@/components/plan/fund-switch-dialog";
import { EventTimeline } from "@/components/plan/event-timeline";
import { SliderField } from "@/components/plan/slider-field";
import type { SchemeListItem } from "@/lib/data/mfapi";
import { cn } from "@/lib/utils";

type InputMode = "percent" | "amount";
type Panel = "returns" | "events";

function evenSplit(count: number): number {
  return Math.round((100 / count) * 10) / 10;
}

/**
 * Splits `totalAmount` rupees evenly across `count` funds in whole rupees
 * (e.g. ₹6,000 / 3 → ₹2,000 each, not the 33.3/33.3/33.4% a naive percentage
 * split would produce) — any remainder from rounding goes to the last fund.
 * Falls back to a plain percentage split when there's no rupee amount yet
 * to divide (no SIP set).
 */
function evenSplitAmounts(count: number, totalAmount: number): number[] {
  if (totalAmount <= 0) {
    const weight = evenSplit(count);
    return Array.from({ length: count }, (_, i) => (i === count - 1 ? 100 - weight * (count - 1) : weight));
  }
  const share = Math.floor(totalAmount / count);
  const remainder = totalAmount - share * (count - 1);
  return Array.from({ length: count }, (_, i) => {
    const amount = i === count - 1 ? remainder : share;
    return (amount / totalAmount) * 100;
  });
}

/** Sets one fund's weight to `newWeightPct`, proportionally redistributing the rest so the total always stays at 100%. */
function rebalance(allocations: FundAllocation[], editedId: string, newWeightPct: number): FundAllocation[] {
  const clamped = Math.max(0, Math.min(100, newWeightPct));
  const others = allocations.filter((a) => a.id !== editedId);
  const remaining = Math.max(0, 100 - clamped);
  const othersTotal = others.reduce((sum, a) => sum + a.weightPct, 0);
  return allocations.map((a) => {
    if (a.id === editedId) return { ...a, weightPct: Math.round(clamped * 10) / 10 };
    if (!others.length) return a;
    const share = othersTotal > 0 ? (a.weightPct / othersTotal) * remaining : remaining / others.length;
    return { ...a, weightPct: Math.round(share * 10) / 10 };
  });
}

export function FundAllocationEditor({
  plan,
  allocations,
  onChange,
  mode,
}: {
  plan: Plan;
  allocations: FundAllocation[];
  onChange: (allocations: FundAllocation[]) => void;
  mode: "forecast" | "historical";
}) {
  const [inputMode, setInputMode] = React.useState<InputMode>("percent");
  const [openPanels, setOpenPanels] = React.useState<Set<string>>(new Set());

  const totalMonthlyAmount = primarySipAmount(plan);
  const total = allocations.reduce((sum, a) => sum + a.weightPct, 0);
  const error = validateAllocations(allocations, { requireHistoricalScheme: mode === "historical" });
  const zeroFunds = allocations.filter((a) => a.weightPct === 0);
  const showZeroWarning = !error && zeroFunds.length > 0 && zeroFunds.length < allocations.length;

  function togglePanel(id: string, panel: Panel) {
    const key = `${id}:${panel}`;
    setOpenPanels((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function addFund() {
    const next: FundAllocation[] = [
      ...allocations,
      { id: newId(), label: `Fund ${allocations.length + 1}`, weightPct: 0 },
    ];
    onChange(splitEvenly(next));
  }

  function removeFund(id: string) {
    const next = allocations.filter((a) => a.id !== id);
    onChange(next.length ? splitEvenly(next) : next);
  }

  function splitEvenly(list: FundAllocation[]): FundAllocation[] {
    const weights = evenSplitAmounts(list.length, totalMonthlyAmount);
    return list.map((a, i) => ({ ...a, weightPct: weights[i] }));
  }

  function updateWeightPct(id: string, weightPct: number) {
    onChange(rebalance(allocations, id, weightPct));
  }

  function updateWeightAmount(id: string, amount: number) {
    const clampedAmount = Math.max(0, Math.min(totalMonthlyAmount, amount));
    const weightPct = totalMonthlyAmount > 0 ? (clampedAmount / totalMonthlyAmount) * 100 : 0;
    onChange(rebalance(allocations, id, weightPct));
  }

  function updateScheme(id: string, scheme: SchemeListItem) {
    onChange(allocations.map((a) => (a.id === id ? { ...a, label: scheme.schemeName, historicalScheme: scheme } : a)));
  }

  function updateFundReturn(id: string, scenario: ScenarioKey, value: number) {
    onChange(
      allocations.map((a) => {
        if (a.id !== id) return a;
        const base = a.returns ?? plan.assumptions.returns;
        return { ...a, returns: { ...base, [scenario]: value } };
      })
    );
  }

  function setUsesFundReturns(id: string, on: boolean) {
    onChange(
      allocations.map((a) =>
        a.id === id ? { ...a, returns: on ? { ...plan.assumptions.returns } : undefined } : a
      )
    );
  }

  function updateExtraEvents(id: string, extraEvents: FundAllocation["extraEvents"]) {
    onChange(allocations.map((a) => (a.id === id ? { ...a, extraEvents } : a)));
  }

  function handleSwitch(sourceId: string, targetId: string, date: string, amount: number) {
    const source = allocations.find((a) => a.id === sourceId);
    const target = allocations.find((a) => a.id === targetId);
    onChange(
      allocations.map((a) => {
        if (a.id === sourceId) {
          return {
            ...a,
            extraEvents: [
              ...(a.extraEvents ?? []),
              { id: newId(), type: "WITHDRAWAL", date, amount, label: `Switch to ${target?.label ?? "another fund"}` },
            ],
          };
        }
        if (a.id === targetId) {
          return {
            ...a,
            extraEvents: [
              ...(a.extraEvents ?? []),
              { id: newId(), type: "LUMPSUM", date, amount, label: `Switch from ${source?.label ?? "another fund"}` },
            ],
          };
        }
        return a;
      })
    );
  }

  return (
    <div className="grid gap-3">
      {allocations.length > 0 && totalMonthlyAmount > 0 && (
        <div className="flex items-center justify-end gap-1">
          <button
            type="button"
            onClick={() => setInputMode("percent")}
            className={cn(
              "flex items-center gap-1 rounded-l-md border px-2 py-1 text-xs transition-colors",
              inputMode === "percent" ? "border-primary bg-primary/10 text-primary" : "border-input text-muted-foreground"
            )}
          >
            <Percent className="size-3" />%
          </button>
          <button
            type="button"
            onClick={() => setInputMode("amount")}
            className={cn(
              "-ml-px flex items-center gap-1 rounded-r-md border px-2 py-1 text-xs transition-colors",
              inputMode === "amount" ? "border-primary bg-primary/10 text-primary" : "border-input text-muted-foreground"
            )}
          >
            ₹ amount
          </button>
        </div>
      )}

      <div className="grid gap-2.5">
        {allocations.map((alloc) => {
          const amount = totalMonthlyAmount > 0 ? (alloc.weightPct / 100) * totalMonthlyAmount : 0;
          const usesFundReturns = alloc.returns != null;
          const returnsOpen = openPanels.has(`${alloc.id}:returns`);
          const eventsOpen = openPanels.has(`${alloc.id}:events`);
          const eventCount = alloc.extraEvents?.length ?? 0;
          const otherAllocations = allocations.filter((a) => a.id !== alloc.id);

          return (
            <div key={alloc.id} className="rounded-lg border p-2.5">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <div className="min-w-0 flex-1">
                  <FundSearch
                    selected={
                      alloc.historicalScheme
                        ? { schemeCode: alloc.historicalScheme.schemeCode, schemeName: alloc.historicalScheme.schemeName }
                        : null
                    }
                    onSelect={(scheme) => updateScheme(alloc.id, scheme)}
                  />
                  {alloc.historicalScheme && (
                    <div className="mt-1.5 px-1">
                      <FundDataPreview schemeCode={alloc.historicalScheme.schemeCode} />
                    </div>
                  )}
                </div>

                <div className="flex shrink-0 items-center gap-2">
                  {inputMode === "percent" || totalMonthlyAmount <= 0 ? (
                    <div className="flex w-24 shrink-0 items-center gap-1 rounded-md border border-input px-2">
                      <Input
                        type="number"
                        min={0}
                        max={100}
                        step={0.5}
                        value={alloc.weightPct}
                        onChange={(e) => updateWeightPct(alloc.id, Number(e.target.value))}
                        className="h-8 border-0 px-0 text-right shadow-none focus-visible:ring-0"
                      />
                      <span className="text-xs text-muted-foreground">%</span>
                    </div>
                  ) : (
                    <div className="flex w-28 shrink-0 items-center gap-1 rounded-md border border-input px-2">
                      <span className="text-xs text-muted-foreground">₹</span>
                      <Input
                        type="number"
                        min={0}
                        max={totalMonthlyAmount}
                        step={100}
                        value={Math.round(amount)}
                        onChange={(e) => updateWeightAmount(alloc.id, Number(e.target.value))}
                        className="h-8 border-0 px-0 text-right shadow-none focus-visible:ring-0"
                      />
                    </div>
                  )}

                  <FundSwitchDialog
                    source={alloc}
                    otherAllocations={otherAllocations}
                    planStart={plan.startDate}
                    planEnd={plan.endDate}
                    onSwitch={(targetId, date, switchAmount) => handleSwitch(alloc.id, targetId, date, switchAmount)}
                  />

                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-8 shrink-0 text-muted-foreground hover:text-destructive"
                    onClick={() => removeFund(alloc.id)}
                    aria-label={`Remove ${alloc.label}`}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              </div>

              <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 px-1">
                {mode === "forecast" && (
                  <button
                    type="button"
                    onClick={() => togglePanel(alloc.id, "returns")}
                    className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                  >
                    <ChevronDown className={cn("size-3 transition-transform", returnsOpen && "rotate-180")} />
                    {usesFundReturns ? "Own return assumptions" : "Return assumptions"}
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => togglePanel(alloc.id, "events")}
                  className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                >
                  <CalendarClock className="size-3" />
                  {eventCount > 0 ? `Fund events (${eventCount})` : "Fund-specific events"}
                </button>
              </div>

              {returnsOpen && mode === "forecast" && (
                <div className="mt-2 grid gap-3 rounded-md border border-dashed bg-muted/30 p-3">
                  <div className="flex items-center justify-between">
                    <Label htmlFor={`use-returns-${alloc.id}`} className="text-xs font-normal">
                      Use this fund&apos;s own return assumptions instead of the plan&apos;s
                    </Label>
                    <Switch
                      id={`use-returns-${alloc.id}`}
                      checked={usesFundReturns}
                      onCheckedChange={(on) => setUsesFundReturns(alloc.id, on)}
                    />
                  </div>
                  {usesFundReturns && (
                    <div className="grid gap-3">
                      {SCENARIOS.map((s) => (
                        <SliderField
                          key={s}
                          id={`fund-${alloc.id}-return-${s}`}
                          label={`${SCENARIO_LABEL[s]} return`}
                          value={alloc.returns?.[s] ?? plan.assumptions.returns[s]}
                          onChange={(v) => updateFundReturn(alloc.id, s, v)}
                          min={0}
                          max={30}
                          step={0.5}
                          suffix="%"
                          size="sm"
                        />
                      ))}
                    </div>
                  )}
                </div>
              )}

              {eventsOpen && (
                <div className="mt-2">
                  <EventTimeline
                    events={alloc.extraEvents ?? []}
                    planStart={plan.startDate}
                    planEnd={plan.endDate}
                    onChange={(events) => updateExtraEvents(alloc.id, events)}
                    title={`${alloc.label} — fund-specific events`}
                    emptyLabel="No fund-specific events — pauses, extra lumpsums, or withdrawals just for this fund."
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={addFund} className="gap-1.5">
            <Plus className="size-3.5" />
            Add fund
          </Button>
          {allocations.length > 1 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onChange(splitEvenly(allocations))}
              className="gap-1.5 text-muted-foreground"
            >
              <Scale className="size-3.5" />
              Split evenly
            </Button>
          )}
        </div>
        <Label className={cn("text-xs tabular-nums", Math.abs(total - 100) > 0.5 ? "text-negative" : "text-muted-foreground")}>
          {total.toFixed(1)}% allocated
          {totalMonthlyAmount > 0 && ` · ${formatINR(totalMonthlyAmount)}/mo total`}
        </Label>
      </div>

      {error && (
        <div className="flex items-start gap-2 rounded-md border border-dashed bg-muted/50 px-3 py-2 text-xs">
          <AlertTriangle className="mt-0.5 size-3.5 shrink-0 text-amber-600 dark:text-amber-500" />
          <span>{error}</span>
        </div>
      )}
      {showZeroWarning && (
        <div className="flex items-start gap-2 rounded-md border border-dashed bg-muted/50 px-3 py-2 text-xs">
          <AlertTriangle className="mt-0.5 size-3.5 shrink-0 text-amber-600 dark:text-amber-500" />
          <span>
            {zeroFunds.length === 1 ? `"${zeroFunds[0].label}" is` : `${zeroFunds.length} funds are`} allocated 0% —
            {zeroFunds.length === 1 ? " it" : " they"} won&apos;t receive any contribution. Give
            {zeroFunds.length === 1 ? " it" : " them"} a share or remove{zeroFunds.length === 1 ? " it" : " them"}.
          </span>
        </div>
      )}
    </div>
  );
}
