"use client";

import * as React from "react";
import { ChevronRight } from "lucide-react";
import type { LedgerRow } from "@/lib/engine";
import { formatDate, formatINR } from "@/lib/format";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

interface YearGroup {
  year: string;
  months: LedgerRow[];
  contribution: number;
  totalInvested: number;
  value: number;
  gain: number;
}

function groupByYear(ledger: LedgerRow[]): YearGroup[] {
  const map = new Map<string, LedgerRow[]>();
  for (const row of ledger) {
    const year = row.date.slice(0, 4);
    const bucket = map.get(year) ?? [];
    bucket.push(row);
    map.set(year, bucket);
  }
  return [...map.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([year, months]) => {
      const last = months[months.length - 1];
      return {
        year,
        months,
        contribution: months.reduce((sum, m) => sum + Math.max(m.contribution, 0), 0),
        totalInvested: last.totalInvested,
        value: last.value,
        gain: last.gain,
      };
    });
}

export interface LedgerLeg {
  label: string;
  ledger: LedgerRow[];
}

export function LedgerTable({ ledger, legs }: { ledger: LedgerRow[]; legs?: LedgerLeg[] }) {
  const [showAllMonths, setShowAllMonths] = React.useState(false);
  const [expanded, setExpanded] = React.useState<Set<string>>(new Set());

  const years = React.useMemo(() => groupByYear(ledger), [ledger]);
  // Per-leg rows are keyed by date (not index) — each fund replays
  // independently and can have its own quiet/active months, but every leg
  // shares the same monthly calendar, so a date lookup lines them up with
  // the merged row being expanded.
  const legMaps = React.useMemo(
    () => legs?.map((leg) => ({ label: leg.label, byDate: new Map(leg.ledger.map((r) => [r.date, r])) })),
    [legs]
  );

  function toggleYear(year: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(year)) next.delete(year);
      else next.add(year);
      return next;
    });
  }

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <div>
          <CardTitle>Year-by-year report</CardTitle>
          <CardDescription>Tap a year to see the months underneath it — every number traces to units × NAV.</CardDescription>
        </div>
        <div className="flex items-center gap-2">
          <Label htmlFor="all-months" className="text-xs text-muted-foreground">
            Show quiet months too
          </Label>
          <Switch id="all-months" checked={showAllMonths} onCheckedChange={setShowAllMonths} />
        </div>
      </CardHeader>
      <CardContent className="px-0 sm:px-6">
        <div className="overflow-x-auto px-4 sm:px-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-8" />
                <TableHead>Year</TableHead>
                <TableHead className="text-right">Contributed</TableHead>
                <TableHead className="text-right">Invested to date</TableHead>
                <TableHead className="text-right">Value</TableHead>
                <TableHead className="text-right">Gain</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {years.map((y) => {
                const isOpen = expanded.has(y.year);
                const monthRows = showAllMonths ? y.months : y.months.filter((m) => m.contribution !== 0);
                return (
                  <React.Fragment key={y.year}>
                    <TableRow
                      className="cursor-pointer select-none hover:bg-muted"
                      onClick={() => toggleYear(y.year)}
                      aria-expanded={isOpen}
                    >
                      <TableCell className="w-8">
                        <ChevronRight
                          className={cn("size-4 text-muted-foreground transition-transform", isOpen && "rotate-90")}
                        />
                      </TableCell>
                      <TableCell className="font-mono font-medium tabular-nums">{y.year}</TableCell>
                      <TableCell className="text-right font-mono tabular-nums text-muted-foreground">
                        {y.contribution > 0 ? formatINR(y.contribution) : "—"}
                      </TableCell>
                      <TableCell className="text-right font-mono tabular-nums">{formatINR(y.totalInvested)}</TableCell>
                      <TableCell className="text-right font-mono font-medium tabular-nums">{formatINR(y.value)}</TableCell>
                      <TableCell
                        className={cn(
                          "text-right font-mono tabular-nums",
                          y.gain >= 0 ? "text-positive" : "text-negative"
                        )}
                      >
                        {y.gain >= 0 ? "+" : ""}
                        {formatINR(y.gain)}
                      </TableCell>
                    </TableRow>

                    {isOpen &&
                      (monthRows.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} className="bg-muted/40 text-center text-xs text-muted-foreground">
                            No activity this year.
                          </TableCell>
                        </TableRow>
                      ) : (
                        monthRows.map((row) => (
                          <TableRow key={row.date} className="bg-muted/40 hover:bg-muted/60 align-top">
                            <TableCell />
                            <TableCell colSpan={2} className="text-xs text-muted-foreground">
                              <span className="font-mono tabular-nums">{formatDate(row.date)}</span>
                              <span className="mx-1.5 text-muted-foreground/50">·</span>
                              {row.eventLabel}
                              {Number.isFinite(row.nav) && (
                                <>
                                  <span className="mx-1.5 text-muted-foreground/50">·</span>
                                  NAV <span className="font-mono tabular-nums">{row.nav.toFixed(2)}</span>
                                </>
                              )}
                              {legMaps && (
                                <ul className="mt-1 grid gap-0.5">
                                  {legMaps.map((leg) => {
                                    const legRow = leg.byDate.get(row.date);
                                    if (!legRow || (legRow.contribution === 0 && legRow.value === 0)) return null;
                                    return (
                                      <li key={leg.label} className="flex items-center justify-between gap-3 pl-3">
                                        <span className="truncate">↳ {leg.label}</span>
                                        <span className="shrink-0 font-mono tabular-nums">
                                          {legRow.contribution !== 0 && (
                                            <span className={cn(legRow.contribution < 0 && "text-negative")}>
                                              {formatINR(Math.abs(legRow.contribution))}
                                            </span>
                                          )}
                                          {legRow.contribution !== 0 && " → "}
                                          {formatINR(legRow.value)}
                                        </span>
                                      </li>
                                    );
                                  })}
                                </ul>
                              )}
                            </TableCell>
                            <TableCell
                              className={cn(
                                "text-right font-mono text-xs tabular-nums",
                                row.contribution < 0 && "text-negative"
                              )}
                            >
                              {row.contribution === 0 ? "—" : formatINR(Math.abs(row.contribution))}
                            </TableCell>
                            <TableCell className="text-right font-mono text-xs tabular-nums">{formatINR(row.value)}</TableCell>
                            <TableCell
                              className={cn(
                                "text-right font-mono text-xs tabular-nums",
                                row.gain >= 0 ? "text-positive" : "text-negative"
                              )}
                            >
                              {row.gain >= 0 ? "+" : ""}
                              {formatINR(row.gain)}
                            </TableCell>
                          </TableRow>
                        ))
                      ))}
                  </React.Fragment>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
