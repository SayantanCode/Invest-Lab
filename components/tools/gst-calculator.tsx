"use client";

import * as React from "react";

import { addGst, removeGst } from "@/lib/calculators/gst-calc";
import { formatINR } from "@/lib/format";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SliderField } from "@/components/plan/slider-field";

type Direction = "add" | "remove";

const GST_PRESETS = [
  { label: "5%", value: 5 },
  { label: "12%", value: 12 },
  { label: "18%", value: 18 },
  { label: "28%", value: 28 },
];

interface GstCalculatorInitial {
  amount?: number;
  gstPct?: number;
  direction?: Direction;
}

export function GstCalculator({ initial }: { initial?: GstCalculatorInitial }) {
  const [amount, setAmount] = React.useState(initial?.amount ?? 10000);
  const [gstPct, setGstPct] = React.useState(initial?.gstPct ?? 18);
  const [direction, setDirection] = React.useState<Direction>(initial?.direction ?? "add");

  const addResult = React.useMemo(() => addGst(amount, gstPct), [amount, gstPct]);
  const removeResult = React.useMemo(() => removeGst(amount, gstPct), [amount, gstPct]);

  const baseAmount = direction === "add" ? amount : removeResult.baseAmount;
  const gstAmount = direction === "add" ? addResult.gstAmount : removeResult.gstAmount;
  const totalAmount = direction === "add" ? addResult.totalAmount : amount;

  return (
    <div className="grid gap-5 lg:grid-cols-[320px_1fr]">
      <Card className="h-fit">
        <CardHeader>
          <CardTitle>What are you calculating?</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-5">
          <Tabs value={direction} onValueChange={(v) => setDirection(v as Direction)}>
            <TabsList className="w-full">
              <TabsTrigger value="add" className="flex-1">
                Add GST
              </TabsTrigger>
              <TabsTrigger value="remove" className="flex-1">
                Remove GST
              </TabsTrigger>
            </TabsList>
          </Tabs>
          <SliderField
            id="gst-amount"
            label={direction === "add" ? "Amount (before GST)" : "Amount (GST-inclusive)"}
            value={amount}
            onChange={setAmount}
            min={1}
            max={10000000}
            step={100}
            prefix="₹"
          />
          <SliderField id="gst-rate" label="GST rate" value={gstPct} onChange={setGstPct} min={0} max={28} step={1} suffix="%" presets={GST_PRESETS} />
        </CardContent>
      </Card>

      <Card>
        <CardContent className="grid gap-4 py-6">
          <div className="flex items-center justify-between rounded-lg border bg-muted/40 p-3.5">
            <span className="text-sm text-muted-foreground">Base amount</span>
            <span className="font-mono text-lg font-semibold tabular-nums">{formatINR(baseAmount)}</span>
          </div>
          <div className="flex items-center justify-between rounded-lg border bg-muted/40 p-3.5">
            <span className="text-sm text-muted-foreground">GST ({gstPct}%)</span>
            <span className="font-mono text-lg font-semibold tabular-nums">{formatINR(gstAmount)}</span>
          </div>
          <div className="flex items-center justify-between rounded-lg border border-primary/30 bg-primary/5 p-3.5">
            <span className="text-sm font-medium">Total amount</span>
            <span className="font-mono text-xl font-semibold tabular-nums text-primary">{formatINR(totalAmount)}</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
