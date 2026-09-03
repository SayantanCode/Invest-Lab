"use client";

import * as React from "react";

import { computeEmi } from "@/lib/calculators/emi-calc";
import { formatINR } from "@/lib/format";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SliderField } from "@/components/plan/slider-field";
import { BreakdownDonut } from "@/components/tools/breakdown-donut";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface EmiCalculatorInitial {
  principal?: number;
  ratePct?: number;
  years?: number;
}

export function EmiCalculator({ initial }: { initial?: EmiCalculatorInitial }) {
  const [principal, setPrincipal] = React.useState(initial?.principal ?? 3000000);
  const [ratePct, setRatePct] = React.useState(initial?.ratePct ?? 9);
  const [years, setYears] = React.useState(initial?.years ?? 20);

  const result = React.useMemo(() => computeEmi(principal, ratePct, years), [principal, ratePct, years]);

  return (
    <div className="grid gap-5 lg:grid-cols-[320px_1fr]">
      <Card className="h-fit">
        <CardHeader>
          <CardTitle>Your loan</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-5">
          <SliderField id="emi-principal" label="Loan amount" value={principal} onChange={setPrincipal} min={50000} max={20000000} step={50000} prefix="₹" />
          <SliderField id="emi-rate" label="Interest rate" value={ratePct} onChange={setRatePct} min={1} max={20} step={0.1} suffix="%" />
          <SliderField id="emi-years" label="Loan tenure" value={years} onChange={setYears} min={1} max={30} step={1} suffix="yrs" />
        </CardContent>
      </Card>

      <div className="grid gap-5">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <Card className="gap-1.5 py-4">
            <CardContent className="px-4">
              <p className="text-xs font-medium text-muted-foreground">Monthly EMI</p>
              <p className="mt-1 font-mono text-xl font-semibold tabular-nums tracking-tight">{formatINR(result.emi)}</p>
            </CardContent>
          </Card>
          <Card className="gap-1.5 py-4">
            <CardContent className="px-4">
              <p className="text-xs font-medium text-muted-foreground">Total interest</p>
              <p className="mt-1 font-mono text-xl font-semibold tabular-nums tracking-tight">{formatINR(result.totalInterest)}</p>
            </CardContent>
          </Card>
          <Card className="gap-1.5 py-4">
            <CardContent className="px-4">
              <p className="text-xs font-medium text-muted-foreground">Total payment</p>
              <p className="mt-1 font-mono text-xl font-semibold tabular-nums tracking-tight">{formatINR(result.totalPayment)}</p>
            </CardContent>
          </Card>
        </div>

        <BreakdownDonut
          title="Payment breakdown"
          centerLabel="Total payment"
          centerValue={result.totalPayment}
          slices={[
            { label: "Principal", value: principal, color: "var(--color-chart-3)" },
            { label: "Interest", value: result.totalInterest, color: "var(--color-chart-1)" },
          ]}
        />

        <Card>
          <CardHeader>
            <CardTitle>Year-by-year amortization</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Year</TableHead>
                  <TableHead className="text-right">Principal paid</TableHead>
                  <TableHead className="text-right">Interest paid</TableHead>
                  <TableHead className="text-right">Balance</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {result.schedule.map((row) => (
                  <TableRow key={row.year}>
                    <TableCell>Year {row.year}</TableCell>
                    <TableCell className="text-right font-mono tabular-nums">{formatINR(row.principalPaid)}</TableCell>
                    <TableCell className="text-right font-mono tabular-nums">{formatINR(row.interestPaid)}</TableCell>
                    <TableCell className="text-right font-mono tabular-nums">{formatINR(row.balance)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
