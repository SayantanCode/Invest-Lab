"use client";

import * as React from "react";
import { Area, CartesianGrid, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatINR, formatINRCompact, formatMonthYear } from "@/lib/format";

export interface HistoricalChartPoint {
  date: string;
  invested: number;
  value?: number;
  projectedValue?: number;
  real?: number;
  regularValue?: number;
}

function ChartTooltip({
  active,
  payload,
  label,
  showRegular,
}: {
  active?: boolean;
  payload?: { dataKey: string; value: number; color: string }[];
  label?: string;
  showRegular: boolean;
}) {
  if (!active || !payload?.length) return null;
  const rows: { key: string; name: string; color: string }[] = [
    { key: "value", name: "Value (Direct)", color: "var(--color-chart-1)" },
    { key: "projectedValue", name: "Value (Projected)", color: "var(--color-chart-1)" },
    ...(showRegular ? [{ key: "regularValue", name: "Value (Regular)", color: "var(--color-chart-3)" }] : []),
    { key: "real", name: "Inflation-adjusted", color: "var(--color-chart-4)" },
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

export function HistoricalChart({
  data,
  fundName,
  showRegular = false,
  isProjected = false,
}: {
  data: HistoricalChartPoint[];
  fundName: string;
  showRegular?: boolean;
  isProjected?: boolean;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{isProjected ? "What happened — and what's projected" : "What actually happened"}</CardTitle>
        <CardDescription className="truncate">
          {isProjected
            ? `Real traded NAV for ${fundName}, continued forward on its own historical CAGR where real data runs out.`
            : `Real traded NAV for ${fundName} — nothing here is projected.`}
        </CardDescription>
      </CardHeader>
      <CardContent className="pl-0">
        <div className="h-[320px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={data} margin={{ top: 8, right: 20, left: 4, bottom: 0 }}>
              <defs>
                <linearGradient id="fillHistorical" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--color-chart-1)" stopOpacity={0.28} />
                  <stop offset="95%" stopColor="var(--color-chart-1)" stopOpacity={0.02} />
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
              <Tooltip content={<ChartTooltip showRegular={showRegular} />} />
              <Area
                type="monotone"
                dataKey="value"
                stroke="var(--color-chart-1)"
                strokeWidth={2.25}
                fill="url(#fillHistorical)"
                dot={false}
                activeDot={{ r: 4 }}
              />
              {isProjected && (
                <Line
                  type="monotone"
                  dataKey="projectedValue"
                  stroke="var(--color-chart-1)"
                  strokeWidth={2.25}
                  strokeDasharray="5 4"
                  dot={false}
                  activeDot={{ r: 4 }}
                />
              )}
              {showRegular && (
                <Line
                  type="monotone"
                  dataKey="regularValue"
                  stroke="var(--color-chart-3)"
                  strokeWidth={1.5}
                  strokeDasharray="4 3"
                  dot={false}
                />
              )}
              <Line
                type="monotone"
                dataKey="real"
                stroke="var(--color-chart-4)"
                strokeWidth={1.5}
                strokeDasharray="1 3"
                dot={false}
              />
              <Line
                type="monotone"
                dataKey="invested"
                stroke="var(--color-muted-foreground)"
                strokeWidth={1.25}
                strokeDasharray="2 2"
                dot={false}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5 px-4 text-xs text-muted-foreground">
          <Legend swatch="var(--color-chart-1)" label="Value (Direct)" />
          {isProjected && <Legend swatch="var(--color-chart-1)" label="Value (Projected)" dashed />}
          {showRegular && <Legend swatch="var(--color-chart-3)" label="Value (Regular)" dashed />}
          <Legend swatch="var(--color-chart-4)" label="Inflation-adjusted" dashed />
          <Legend swatch="var(--color-muted-foreground)" label="Invested" dashed />
        </div>
      </CardContent>
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
