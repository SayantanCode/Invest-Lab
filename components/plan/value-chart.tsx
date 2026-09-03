"use client";

import * as React from "react";
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import type { ScenarioKey } from "@/lib/engine";
import { SCENARIO_LABEL } from "@/lib/engine";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatINR, formatINRCompact, formatMonthYear } from "@/lib/format";

export interface ChartPoint {
  date: string;
  invested: number;
  conservative: number;
  expected: number;
  optimistic: number;
  real: number;
}

type Filter = "all" | ScenarioKey;

const AREA_COLOR: Record<ScenarioKey, string> = {
  expected: "var(--color-chart-1)",
  optimistic: "var(--color-chart-2)",
  conservative: "var(--color-chart-3)",
};

const AREA_GRADIENT: Record<ScenarioKey, string> = {
  expected: "url(#fillExpected)",
  optimistic: "url(#fillOptimistic)",
  conservative: "url(#fillConservative)",
};

function ChartTooltip({
  active,
  payload,
  label,
  showReal,
}: {
  active?: boolean;
  payload?: { dataKey: string; value: number; color: string }[];
  label?: string;
  showReal: boolean;
}) {
  if (!active || !payload?.length) return null;
  const rows: { key: string; name: string; color: string }[] = [
    { key: "expected", name: "Expected value", color: "var(--color-chart-1)" },
    ...(showReal ? [{ key: "real", name: "Inflation-adjusted", color: "var(--color-chart-4)" }] : []),
    { key: "optimistic", name: "Optimistic", color: "var(--color-chart-2)" },
    { key: "conservative", name: "Conservative", color: "var(--color-chart-3)" },
    { key: "invested", name: "Invested", color: "var(--color-muted-foreground)" },
  ];
  return (
    <div className="rounded-lg border bg-popover px-3 py-2 text-xs shadow-md">
      <p className="mb-1.5 font-medium text-popover-foreground">{formatMonthYear(label ?? "")}</p>
      <div className="grid gap-1">
        {rows.map((r) => {
          const item = payload.find((p) => p.dataKey === r.key);
          if (!item) return null;
          return (
            <div key={r.key} className="flex items-center justify-between gap-4">
              <span className="flex items-center gap-1.5 text-muted-foreground">
                <span className="size-2 rounded-full" style={{ background: r.color }} />
                {r.name}
              </span>
              <span className="font-mono tabular-nums text-popover-foreground">{formatINR(item.value)}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function ValueChart({
  data,
  showInflation = true,
  bare = false,
  height = 320,
}: {
  data: ChartPoint[];
  showInflation?: boolean;
  /** Skips the outer Card/title — for embedding inside a card that already has its own header. */
  bare?: boolean;
  height?: number;
}) {
  const [filter, setFilter] = React.useState<Filter>("all");
  const areaKey: ScenarioKey = filter === "all" ? "expected" : filter;
  const showOptimistic = filter === "all" || filter === "optimistic";
  const showConservative = filter === "all" || filter === "conservative";
  const showReal = showInflation && (filter === "all" || filter === "expected");

  const chart = (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3 px-4">
        <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-muted-foreground">
          <Legend swatch={AREA_COLOR[areaKey]} label={SCENARIO_LABEL[areaKey]} />
          {showReal && <Legend swatch="var(--color-chart-4)" label="Inflation-adjusted" dashed />}
          {areaKey !== "optimistic" && showOptimistic && <Legend swatch="var(--color-chart-2)" label="Optimistic" dashed />}
          {areaKey !== "conservative" && showConservative && <Legend swatch="var(--color-chart-3)" label="Conservative" dashed />}
          <Legend swatch="var(--color-muted-foreground)" label="Invested" dashed />
        </div>
        <Select value={filter} onValueChange={(v) => setFilter(v as Filter)}>
          <SelectTrigger size="sm" className="w-37.5">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Scenarios</SelectItem>
            <SelectItem value="expected">Expected only</SelectItem>
            <SelectItem value="optimistic">Optimistic only</SelectItem>
            <SelectItem value="conservative">Conservative only</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="mt-3 w-full" style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 8, right: 20, left: 4, bottom: 0 }}>
            <defs>
              <linearGradient id="fillExpected" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--color-chart-1)" stopOpacity={0.28} />
                <stop offset="95%" stopColor="var(--color-chart-1)" stopOpacity={0.02} />
              </linearGradient>
              <linearGradient id="fillOptimistic" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--color-chart-2)" stopOpacity={0.28} />
                <stop offset="95%" stopColor="var(--color-chart-2)" stopOpacity={0.02} />
              </linearGradient>
              <linearGradient id="fillConservative" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--color-chart-3)" stopOpacity={0.28} />
                <stop offset="95%" stopColor="var(--color-chart-3)" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
            <XAxis
              dataKey="date"
              tickFormatter={(v: string) => v.slice(0, 4)}
              tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }}
              axisLine={{ stroke: "var(--color-border)" }}
              tickLine={false}
              minTickGap={40}
            />
            <YAxis
              tickFormatter={(v: number) => formatINRCompact(v)}
              tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }}
              axisLine={false}
              tickLine={false}
              width={56}
            />
            <Tooltip content={<ChartTooltip showReal={showReal} />} />
            <Area
              type="monotone"
              dataKey={areaKey}
              stroke={AREA_COLOR[areaKey]}
              strokeWidth={2.25}
              fill={AREA_GRADIENT[areaKey]}
              dot={false}
              activeDot={{ r: 4 }}
            />
            {areaKey !== "optimistic" && showOptimistic && (
              <Line type="monotone" dataKey="optimistic" stroke="var(--color-chart-2)" strokeWidth={1.25} strokeDasharray="4 3" dot={false} />
            )}
            {areaKey !== "conservative" && showConservative && (
              <Line type="monotone" dataKey="conservative" stroke="var(--color-chart-3)" strokeWidth={1.25} strokeDasharray="4 3" dot={false} />
            )}
            {showReal && (
              <Line type="monotone" dataKey="real" stroke="var(--color-chart-4)" strokeWidth={1.5} strokeDasharray="1 3" dot={false} />
            )}
            <Line type="monotone" dataKey="invested" stroke="var(--color-muted-foreground)" strokeWidth={1.25} strokeDasharray="2 2" dot={false} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </>
  );

  if (bare) return chart;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Portfolio value over time</CardTitle>
      </CardHeader>
      <CardContent className="pl-0">{chart}</CardContent>
    </Card>
  );
}

function Legend({ swatch, label, dashed }: { swatch: string; label: string; dashed?: boolean }) {
  return (
    <span className="flex items-center gap-1.5">
      <span
        className="inline-block h-0.5 w-3.5 rounded-full"
        style={{ background: dashed ? "transparent" : swatch, borderTop: dashed ? `1.5px dashed ${swatch}` : undefined }}
      />
      {label}
    </span>
  );
}
