// Compares whole plans against each other — different funds, different SIP
// amounts, different strategies — not the conservative/expected/optimistic
// band within a single plan (ScenarioTable already covers that). Reads
// straight from the saved-plans library (My Plans); this tab is purely a
// lens on it: pick a few and see which actually gets you further, and how
// much less certain that outcome is.

"use client";

import * as React from "react";
import { toast } from "sonner";
import { CartesianGrid, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Check, FolderInput, Pencil, Trash2 } from "lucide-react";

import type { Plan, SimulationResult } from "@/lib/engine";
import { diffYears, parseISO } from "@/lib/engine";
import { computePlanResults } from "@/lib/goals/compute-plan-results";
import { useSavedPlansStore, type SavedPlan } from "@/lib/stores/use-plans-store";
import { formatDate, formatINR, formatINRCompact, formatPercent } from "@/lib/format";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
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
import { cn } from "@/lib/utils";

const MAX_COMPARE = 4;
const SERIES_COLORS = ["var(--color-chart-1)", "var(--color-chart-2)", "var(--color-chart-3)", "var(--color-chart-4)"];

function planSummary(plan: Plan): string {
  const sip = plan.events.find((e) => e.type === "SIP_START");
  const amount = sip && sip.type === "SIP_START" ? formatINR(sip.amount) : "no SIP";
  const years = Math.max(0, Math.round(diffYears(parseISO(plan.startDate), parseISO(plan.endDate))));
  const fundCount = plan.allocations?.length ?? (plan.historicalScheme ? 1 : 0);
  const fundsLabel = fundCount >= 2 ? `${fundCount} funds` : fundCount === 1 ? "1 fund" : "assumption only";
  return `${amount}/mo · ${years} yrs · ${fundsLabel}`;
}

interface Compared {
  saved: SavedPlan;
  results: Record<"conservative" | "expected" | "optimistic", SimulationResult>;
  spreadPct: number;
}

function ChartTooltip({
  active,
  payload,
  label,
  compared,
}: {
  active?: boolean;
  payload?: { dataKey: string; value: number; color: string }[];
  label?: number;
  compared: Compared[];
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border bg-popover px-3 py-2 text-xs shadow-md">
      <p className="mb-1.5 font-medium text-popover-foreground">Year {((label ?? 0) / 12).toFixed(1)}</p>
      <div className="grid gap-1">
        {compared.map((c, i) => {
          const item = payload.find((p) => p.dataKey === c.saved.id);
          if (!item) return null;
          return (
            <div key={c.saved.id} className="flex items-center justify-between gap-4">
              <span className="flex items-center gap-1.5 text-muted-foreground">
                <span className="size-2 rounded-full" style={{ background: SERIES_COLORS[i % SERIES_COLORS.length] }} />
                {c.saved.name}
              </span>
              <span className="font-mono tabular-nums text-popover-foreground">{formatINR(item.value)}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function ScenarioLab({ onOpenPlan }: { onOpenPlan: (id: string) => void }) {
  const { plans, updatePlan, deletePlan } = useSavedPlansStore();
  const [selected, setSelected] = React.useState<string[]>([]);
  const [deleteTarget, setDeleteTarget] = React.useState<SavedPlan | null>(null);
  const [deleting, setDeleting] = React.useState(false);

  function toggleSelect(id: string) {
    setSelected((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= MAX_COMPARE) {
        toast.error(`You can compare up to ${MAX_COMPARE} plans at once.`);
        return prev;
      }
      return [...prev, id];
    });
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deletePlan(deleteTarget.id);
      setSelected((prev) => prev.filter((x) => x !== deleteTarget.id));
      setDeleteTarget(null);
    } catch {
      toast.error("Couldn't delete this plan — check your connection and try again.");
    } finally {
      setDeleting(false);
    }
  }

  function handleRename(saved: SavedPlan) {
    const next = window.prompt("Rename plan", saved.name);
    if (next && next.trim()) {
      updatePlan(saved.id, { name: next.trim() }).catch(() => {
        toast.error("Couldn't rename this plan — check your connection and try again.");
      });
    }
  }

  const compared: Compared[] = React.useMemo(() => {
    return plans
      .filter((s) => selected.includes(s.id))
      .map((saved) => {
        const results = computePlanResults(saved.plan);
        const spreadPct =
          results.expected.finalValue > 0
            ? ((results.optimistic.finalValue - results.conservative.finalValue) / results.expected.finalValue) * 100
            : 0;
        return { saved, results, spreadPct };
      });
  }, [plans, selected]);

  const chartData = React.useMemo(() => {
    const maxLen = Math.max(0, ...compared.map((c) => c.results.expected.ledger.length));
    const points: Record<string, number>[] = [];
    for (let i = 0; i < maxLen; i++) {
      const point: Record<string, number> = { month: i };
      for (const c of compared) {
        const row = c.results.expected.ledger[i];
        if (row) point[c.saved.id] = row.value;
      }
      points.push(point);
    }
    return points;
  }, [compared]);

  const bestValue = compared.length
    ? compared.reduce((a, b) => (b.results.expected.finalValue > a.results.expected.finalValue ? b : a))
    : null;
  const steadiest = compared.length
    ? compared.reduce((a, b) => (b.spreadPct < a.spreadPct ? b : a))
    : null;

  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,360px)]">
      <div className="flex min-w-0 flex-col gap-5 lg:order-1">
        {compared.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center gap-2 py-12 text-center">
              <p className="max-w-sm text-sm text-muted-foreground">
                Nothing to compare yet. Create a couple of plans in My Plans — a different fund, a heavier mid-cap
                tilt, a smaller SIP — and pick a few here to see which actually gets you further.
              </p>
            </CardContent>
          </Card>
        ) : (
          <>
            {compared.length >= 2 && bestValue && steadiest && (
              <Card>
                <CardContent className="py-4 text-sm">
                  <span className="font-medium">{bestValue.saved.name}</span> reaches the highest expected value —{" "}
                  <span className="font-mono tabular-nums font-medium">
                    {formatINR(bestValue.results.expected.finalValue)}
                  </span>
                  .
                  {steadiest.saved.id !== bestValue.saved.id && (
                    <>
                      {" "}
                      <span className="font-medium">{steadiest.saved.name}</span> has the steadiest outcome — its
                      conservative and optimistic cases sit closest together, so less rides on which one actually
                      plays out.
                    </>
                  )}
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader>
                <CardTitle>Value over time</CardTitle>
                <CardDescription>Expected path for each plan, aligned by years since it starts.</CardDescription>
              </CardHeader>
              <CardContent className="pl-0">
                <div className="h-[320px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={chartData} margin={{ top: 8, right: 20, left: 4, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                      <XAxis
                        dataKey="month"
                        tickFormatter={(m: number) => `${Math.round(m / 12)}y`}
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
                      <Tooltip content={<ChartTooltip compared={compared} />} />
                      {compared.map((c, i) => (
                        <Line
                          key={c.saved.id}
                          type="monotone"
                          dataKey={c.saved.id}
                          stroke={SERIES_COLORS[i % SERIES_COLORS.length]}
                          strokeWidth={2.25}
                          dot={false}
                          activeDot={{ r: 4 }}
                        />
                      ))}
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
                <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5 px-4 text-xs text-muted-foreground">
                  {compared.map((c, i) => (
                    <span key={c.saved.id} className="flex items-center gap-1.5">
                      <span
                        className="inline-block size-2 rounded-full"
                        style={{ background: SERIES_COLORS[i % SERIES_COLORS.length] }}
                      />
                      {c.saved.name}
                    </span>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Plan comparison</CardTitle>
                <CardDescription>Same engine, different plans — spread is the optimistic-to-conservative gap.</CardDescription>
              </CardHeader>
              <CardContent className="px-0 sm:px-6">
                <div className="overflow-x-auto px-4 sm:px-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Plan</TableHead>
                        <TableHead className="text-right">Invested</TableHead>
                        <TableHead className="text-right">Conservative</TableHead>
                        <TableHead className="text-right">Expected</TableHead>
                        <TableHead className="text-right">Optimistic</TableHead>
                        <TableHead className="text-right">Spread</TableHead>
                        <TableHead className="text-right">XIRR</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {compared.map((c) => (
                        <TableRow key={c.saved.id}>
                          <TableCell className="max-w-[140px] truncate font-medium" title={c.saved.name}>
                            {c.saved.name}
                          </TableCell>
                          <TableCell className="text-right font-mono tabular-nums">
                            {formatINR(c.results.expected.totalInvested)}
                          </TableCell>
                          <TableCell className="text-right font-mono tabular-nums text-muted-foreground">
                            {formatINR(c.results.conservative.finalValue)}
                          </TableCell>
                          <TableCell className="text-right font-mono tabular-nums font-medium">
                            {formatINR(c.results.expected.finalValue)}
                          </TableCell>
                          <TableCell className="text-right font-mono tabular-nums text-muted-foreground">
                            {formatINR(c.results.optimistic.finalValue)}
                          </TableCell>
                          <TableCell className="text-right font-mono tabular-nums">
                            {c.spreadPct.toFixed(0)}%
                          </TableCell>
                          <TableCell className="text-right font-mono tabular-nums">
                            {formatPercent(c.results.expected.xirrPct)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      <div className="flex min-w-0 flex-col gap-5 lg:order-2">
        <Card>
          <CardHeader>
            <CardTitle>Your plans</CardTitle>
            <CardDescription>Tap up to {MAX_COMPARE} to compare.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-2">
            {plans.length === 0 ? (
              <p className="py-4 text-center text-sm text-muted-foreground">Nothing saved yet.</p>
            ) : (
              plans.map((s) => {
                const isSelected = selected.includes(s.id);
                return (
                  <div
                    key={s.id}
                    className={cn(
                      "flex min-w-0 items-start gap-2 rounded-lg border px-3 py-2.5 transition-colors",
                      isSelected ? "border-primary bg-primary/5" : "border-border"
                    )}
                  >
                    <button
                      type="button"
                      onClick={() => toggleSelect(s.id)}
                      className={cn(
                        "mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-md border transition-colors",
                        isSelected ? "border-primary bg-primary text-primary-foreground" : "border-input"
                      )}
                      aria-label={isSelected ? `Remove ${s.name} from comparison` : `Add ${s.name} to comparison`}
                    >
                      {isSelected && <Check className="size-3.5" />}
                    </button>
                    <button type="button" onClick={() => toggleSelect(s.id)} className="min-w-0 flex-1 text-left">
                      <p className="truncate text-sm font-medium">{s.name}</p>
                      <p className="truncate text-xs text-muted-foreground">{planSummary(s.plan)}</p>
                      <p className="text-xs text-muted-foreground">Updated {formatDate(s.updatedAt.slice(0, 10))}</p>
                    </button>
                    <div className="flex shrink-0 items-center gap-0.5">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-7"
                        onClick={() => handleRename(s)}
                        aria-label={`Rename ${s.name}`}
                      >
                        <Pencil className="size-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-7"
                        onClick={() => onOpenPlan(s.id)}
                        aria-label={`Open ${s.name}`}
                      >
                        <FolderInput className="size-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-7 text-destructive hover:text-destructive"
                        onClick={() => setDeleteTarget(s)}
                        aria-label={`Delete ${s.name}`}
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    </div>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>
      </div>

      <AlertDialog open={deleteTarget != null} onOpenChange={(next) => !next && !deleting && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete &quot;{deleteTarget?.name}&quot;?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently removes the plan and its full ledger — this can&apos;t be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-white hover:bg-destructive/90"
              disabled={deleting}
              onClick={(e) => {
                e.preventDefault();
                handleDelete();
              }}
            >
              {deleting ? "Deleting…" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
