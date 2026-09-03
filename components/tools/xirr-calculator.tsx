"use client";

import * as React from "react";
import dayjs, { type Dayjs } from "dayjs";
import { DatePicker } from "antd";
import { Plus, Trash2 } from "lucide-react";

import { xirr, type Cashflow } from "@/lib/engine";
import { newId } from "@/lib/id";
import { formatINR, formatPercent } from "@/lib/format";
import { todayISO } from "@/lib/goals/default-plan";
import { cn } from "@/lib/utils";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface Row {
  id: string;
  date: string;
  amount: number;
}

function starterRows(): Row[] {
  const today = todayISO();
  const oneYearAgo = new Date();
  oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
  return [
    { id: newId(), date: oneYearAgo.toISOString().slice(0, 10), amount: -100000 },
    { id: newId(), date: today, amount: 115000 },
  ];
}

interface XirrCalculatorInitial {
  cashflows?: { date: string; amount: number }[];
}

export function XirrCalculator({ initial }: { initial?: XirrCalculatorInitial }) {
  const [rows, setRows] = React.useState<Row[]>(() =>
    initial?.cashflows?.length ? initial.cashflows.map((cf) => ({ id: newId(), ...cf })) : starterRows()
  );

  function addRow() {
    setRows((r) => [...r, { id: newId(), date: todayISO(), amount: 0 }]);
  }

  function updateRow(id: string, patch: Partial<Row>) {
    setRows((r) => r.map((row) => (row.id === id ? { ...row, ...patch } : row)));
  }

  function removeRow(id: string) {
    setRows((r) => r.filter((row) => row.id !== id));
  }

  const result = React.useMemo(() => {
    const cashflows: Cashflow[] = rows
      .filter((r) => r.amount !== 0 && r.date)
      .map((r) => ({ date: new Date(r.date), amount: r.amount }));
    const rate = xirr(cashflows);
    return rate != null ? rate * 100 : null;
  }, [rows]);

  const totalOut = rows.filter((r) => r.amount < 0).reduce((sum, r) => sum + Math.abs(r.amount), 0);
  const totalIn = rows.filter((r) => r.amount > 0).reduce((sum, r) => sum + r.amount, 0);

  return (
    <div className="grid gap-5 lg:grid-cols-[400px_1fr]">
      <Card className="h-fit">
        <CardHeader>
          <CardTitle>Your cashflows</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3">
          <p className="text-xs text-muted-foreground">
            Enter every date money moved. Negative = money out (invested), positive = money in (withdrawn or the
            current value).
          </p>
          {rows.map((row) => (
            <div key={row.id} className="grid grid-cols-[1fr_1fr_auto] items-end gap-2">
              <div className="grid gap-1">
                <Label className="text-xs text-muted-foreground">Date</Label>
                <DatePicker
                  value={row.date ? dayjs(row.date, "YYYY-MM-DD") : null}
                  onChange={(date: Dayjs | null) => updateRow(row.id, { date: date ? date.format("YYYY-MM-DD") : "" })}
                  format="DD MMM YYYY"
                  className="h-8 w-full"
                />
              </div>
              <div className="grid gap-1">
                <Label className="text-xs text-muted-foreground">Amount (₹)</Label>
                <Input
                  type="number"
                  value={row.amount}
                  onChange={(e) => {
                    const n = Number(e.target.value);
                    if (!Number.isNaN(n)) updateRow(row.id, { amount: n });
                  }}
                  className="h-8 font-mono tabular-nums"
                />
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="size-8 shrink-0 text-muted-foreground hover:text-destructive"
                onClick={() => removeRow(row.id)}
                aria-label="Remove cashflow"
              >
                <Trash2 className="size-4" />
              </Button>
            </div>
          ))}
          <Button variant="outline" size="sm" onClick={addRow} className="w-fit gap-1.5">
            <Plus className="size-3.5" />
            Add cashflow
          </Button>
        </CardContent>
      </Card>

      <div className="grid gap-5">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <Card className="gap-1.5 py-4">
            <CardContent className="px-4">
              <p className="text-xs font-medium text-muted-foreground">Total invested</p>
              <p className="mt-1 font-mono text-xl font-semibold tabular-nums tracking-tight">{formatINR(totalOut)}</p>
            </CardContent>
          </Card>
          <Card className="gap-1.5 py-4">
            <CardContent className="px-4">
              <p className="text-xs font-medium text-muted-foreground">Total received</p>
              <p className="mt-1 font-mono text-xl font-semibold tabular-nums tracking-tight">{formatINR(totalIn)}</p>
            </CardContent>
          </Card>
          <Card className="gap-1.5 py-4">
            <CardContent className="px-4">
              <p className="text-xs font-medium text-muted-foreground">XIRR</p>
              <p
                className={cn(
                  "mt-1 font-mono text-xl font-semibold tabular-nums tracking-tight",
                  result != null && result >= 0 ? "text-positive" : "text-negative"
                )}
              >
                {formatPercent(result)}
              </p>
            </CardContent>
          </Card>
        </div>

        {result == null && (
          <Card>
            <CardContent className="py-8 text-center text-sm text-muted-foreground">
              XIRR needs at least one outflow and one inflow with different signs to solve for a rate — check your
              cashflows above.
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
