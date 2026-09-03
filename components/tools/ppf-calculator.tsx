"use client";

import * as React from "react";

import { computePpf } from "@/lib/calculators/ppf-calc";
import { formatINR } from "@/lib/format";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SliderField } from "@/components/plan/slider-field";
import { BreakdownDonut } from "@/components/tools/breakdown-donut";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface PpfCalculatorInitial {
  annualContribution?: number;
  ratePct?: number;
  years?: number;
}

export function PpfCalculator({ initial }: { initial?: PpfCalculatorInitial }) {
  const [annualContribution, setAnnualContribution] = React.useState(initial?.annualContribution ?? 150000);
  const [ratePct, setRatePct] = React.useState(initial?.ratePct ?? 7.1);
  const [years, setYears] = React.useState(initial?.years ?? 15);

  const result = React.useMemo(() => computePpf(annualContribution, ratePct, years), [annualContribution, ratePct, years]);

  return (
    <div className="grid gap-5 lg:grid-cols-[320px_1fr]">
      <Card className="h-fit">
        <CardHeader>
          <CardTitle>Your PPF account</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-5">
          <SliderField
            id="ppf-contribution"
            label="Annual contribution"
            value={annualContribution}
            onChange={setAnnualContribution}
            min={500}
            max={150000}
            step={500}
            prefix="₹"
            presets={[{ label: "Max (₹1.5L)", value: 150000 }]}
          />
          <SliderField id="ppf-rate" label="Interest rate" value={ratePct} onChange={setRatePct} min={5} max={10} step={0.1} suffix="%" />
          <SliderField
            id="ppf-years"
            label="Tenure"
            value={years}
            onChange={setYears}
            min={15}
            max={30}
            step={5}
            suffix="yrs"
          />
          <p className="text-xs text-muted-foreground">
            PPF locks in for 15 years, extendable in blocks of 5. ₹1.5L/year is the current contribution cap.
          </p>
        </CardContent>
      </Card>

      <div className="grid gap-5">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <Card className="gap-1.5 py-4">
            <CardContent className="px-4">
              <p className="text-xs font-medium text-muted-foreground">Total invested</p>
              <p className="mt-1 font-mono text-xl font-semibold tabular-nums tracking-tight">{formatINR(result.totalInvested)}</p>
            </CardContent>
          </Card>
          <Card className="gap-1.5 py-4">
            <CardContent className="px-4">
              <p className="text-xs font-medium text-muted-foreground">Interest earned</p>
              <p className="mt-1 font-mono text-xl font-semibold tabular-nums tracking-tight text-positive">{formatINR(result.totalInterest)}</p>
            </CardContent>
          </Card>
          <Card className="gap-1.5 py-4">
            <CardContent className="px-4">
              <p className="text-xs font-medium text-muted-foreground">Maturity value</p>
              <p className="mt-1 font-mono text-xl font-semibold tabular-nums tracking-tight">{formatINR(result.maturityValue)}</p>
            </CardContent>
          </Card>
        </div>

        <BreakdownDonut
          title="Maturity breakdown"
          centerLabel="Maturity value"
          centerValue={result.maturityValue}
          slices={[
            { label: "Invested", value: result.totalInvested, color: "var(--color-chart-3)" },
            { label: "Interest earned", value: result.totalInterest, color: "var(--color-chart-1)" },
          ]}
        />

        <Card>
          <CardHeader>
            <CardTitle>Year-by-year growth</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Year</TableHead>
                  <TableHead className="text-right">Contribution</TableHead>
                  <TableHead className="text-right">Interest</TableHead>
                  <TableHead className="text-right">Balance</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {result.schedule.map((row) => (
                  <TableRow key={row.year}>
                    <TableCell>Year {row.year}</TableCell>
                    <TableCell className="text-right font-mono tabular-nums">{formatINR(row.contribution)}</TableCell>
                    <TableCell className="text-right font-mono tabular-nums">{formatINR(row.interest)}</TableCell>
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
