"use client";

import * as React from "react";

import { inflatedTarget } from "@/lib/calculators/goal-calc";
import { realValue } from "@/lib/engine";
import { formatINR } from "@/lib/format";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SliderField } from "@/components/plan/slider-field";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

type Direction = "future-cost" | "todays-value";

interface InflationCalculatorInitial {
  amount?: number;
  inflationPct?: number;
  years?: number;
  direction?: Direction;
}

export function InflationCalculator({ initial }: { initial?: InflationCalculatorInitial }) {
  const [amount, setAmount] = React.useState(initial?.amount ?? 100000);
  const [inflationPct, setInflationPct] = React.useState(initial?.inflationPct ?? 6);
  const [years, setYears] = React.useState(initial?.years ?? 10);
  const [direction, setDirection] = React.useState<Direction>(initial?.direction ?? "future-cost");

  const headline =
    direction === "future-cost" ? inflatedTarget(amount, inflationPct, years) : realValue(amount, inflationPct, years);

  const rows = React.useMemo(() => {
    const out: { year: number; value: number }[] = [];
    for (let y = 1; y <= years; y++) {
      out.push({
        year: y,
        value: direction === "future-cost" ? inflatedTarget(amount, inflationPct, y) : realValue(amount, inflationPct, y),
      });
    }
    return out;
  }, [amount, inflationPct, years, direction]);

  return (
    <div className="grid gap-5 lg:grid-cols-[320px_1fr]">
      <Card className="h-fit">
        <CardHeader>
          <CardTitle>What are you comparing?</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-5">
          <Tabs value={direction} onValueChange={(v) => setDirection(v as Direction)}>
            <TabsList className="w-full">
              <TabsTrigger value="future-cost" className="flex-1">
                Future cost
              </TabsTrigger>
              <TabsTrigger value="todays-value" className="flex-1">
                Today&apos;s value
              </TabsTrigger>
            </TabsList>
          </Tabs>
          <SliderField id="inflation-amount" label="Amount" value={amount} onChange={setAmount} min={1000} max={50000000} step={1000} prefix="₹" />
          <SliderField id="inflation-rate" label="Inflation rate" value={inflationPct} onChange={setInflationPct} min={1} max={15} step={0.5} suffix="%" />
          <SliderField id="inflation-years" label="Years" value={years} onChange={setYears} min={1} max={40} step={1} suffix="yrs" />
        </CardContent>
      </Card>

      <div className="grid gap-5">
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-sm text-muted-foreground">
              {direction === "future-cost"
                ? `What ${formatINR(amount)} today will cost in ${years} year${years === 1 ? "" : "s"}`
                : `What ${formatINR(amount)} received in ${years} year${years === 1 ? "" : "s"} is worth today`}
            </p>
            <p className="mt-2 font-mono text-4xl font-semibold tabular-nums tracking-tight">{formatINR(headline)}</p>
            <p className="mt-2 text-xs text-muted-foreground">At {inflationPct}% annual inflation</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Year by year</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Year</TableHead>
                  <TableHead className="text-right">{direction === "future-cost" ? "Future cost" : "Today's value"}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r) => (
                  <TableRow key={r.year}>
                    <TableCell>Year {r.year}</TableCell>
                    <TableCell className="text-right font-mono tabular-nums">{formatINR(r.value)}</TableCell>
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
