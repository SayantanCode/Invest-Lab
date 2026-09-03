"use client";

import type { SimulationResult } from "@/lib/engine";
import { formatINR, formatPercent } from "@/lib/format";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { SliderField } from "@/components/plan/slider-field";

export function DirectVsRegularCard({
  enabled,
  onEnabledChange,
  expenseDelta,
  onExpenseDeltaChange,
  directResult,
  regularResult,
}: {
  enabled: boolean;
  onEnabledChange: (v: boolean) => void;
  expenseDelta: number;
  onExpenseDeltaChange: (v: number) => void;
  directResult: SimulationResult | null;
  regularResult: SimulationResult | null;
}) {
  const costOfRegular =
    directResult && regularResult ? directResult.finalValue - regularResult.finalValue : null;

  return (
    <Card>
      <CardHeader className="flex-row items-start justify-between space-y-0">
        <div>
          <CardTitle>Direct vs Regular</CardTitle>
          <CardDescription>The same fund, same history — just a different expense ratio.</CardDescription>
        </div>
        <Switch checked={enabled} onCheckedChange={onEnabledChange} aria-label="Compare Direct and Regular plans" />
      </CardHeader>
      {enabled && (
        <CardContent className="grid gap-4">
          <SliderField
            id="expense-delta"
            label="Extra expense ratio (Regular vs Direct)"
            value={expenseDelta}
            onChange={onExpenseDeltaChange}
            min={0.1}
            max={2}
            step={0.05}
            suffix="%"
            size="sm"
          />
          {directResult && regularResult && (
            <div className="grid gap-2 rounded-lg border bg-muted/40 p-3 text-sm">
              <Row label="Direct value" value={formatINR(directResult.finalValue)} strong />
              <Row label="Regular value" value={formatINR(regularResult.finalValue)} />
              <Row
                label="XIRR (Direct → Regular)"
                value={`${formatPercent(directResult.xirrPct)} → ${formatPercent(regularResult.xirrPct)}`}
              />
              {costOfRegular != null && costOfRegular > 0 && (
                <p className="mt-1 text-xs text-muted-foreground">
                  Over this period, the extra expense ratio alone cost{" "}
                  <span className="font-medium text-negative">{formatINR(costOfRegular)}</span> of final value.
                </p>
              )}
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className={`font-mono tabular-nums ${strong ? "font-semibold" : ""}`}>{value}</span>
    </div>
  );
}
