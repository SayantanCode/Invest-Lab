"use client";

import * as React from "react";
import type { LedgerRow } from "@/lib/engine";
import { estimateTax, type AssetClass } from "@/lib/calculators/tax-estimate";
import { formatINR } from "@/lib/format";
import { cn } from "@/lib/utils";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { SliderField } from "@/components/plan/slider-field";

export function TaxSummaryCard({ ledger }: { ledger: LedgerRow[] }) {
  const [assetClass, setAssetClass] = React.useState<AssetClass>("equity");
  const [taxSlabPct, setTaxSlabPct] = React.useState(30);

  const estimate = React.useMemo(() => estimateTax(ledger, assetClass, taxSlabPct), [ledger, assetClass, taxSlabPct]);
  const finalValue = ledger.length ? ledger[ledger.length - 1].value : 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Post-tax value</CardTitle>
        <CardDescription>What you&apos;d actually have in hand after capital gains tax — not just the raw corpus.</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4">
        <div className="flex items-center justify-end gap-1">
          <button
            type="button"
            onClick={() => setAssetClass("equity")}
            className={cn(
              "flex items-center gap-1 rounded-l-md border px-2.5 py-1 text-xs transition-colors",
              assetClass === "equity" ? "border-primary bg-primary/10 text-primary" : "border-input text-muted-foreground"
            )}
          >
            Mostly equity funds
          </button>
          <button
            type="button"
            onClick={() => setAssetClass("debt")}
            className={cn(
              "-ml-px flex items-center gap-1 rounded-r-md border px-2.5 py-1 text-xs transition-colors",
              assetClass === "debt" ? "border-primary bg-primary/10 text-primary" : "border-input text-muted-foreground"
            )}
          >
            Mostly debt funds
          </button>
        </div>

        {assetClass === "debt" && (
          <SliderField
            id="tax-slab"
            label="Your income tax slab"
            value={taxSlabPct}
            onChange={setTaxSlabPct}
            min={0}
            max={42.74}
            step={0.25}
            suffix="%"
            size="sm"
          />
        )}

        {estimate.taxOwedDuringPlan > 0 && (
          <div className="grid gap-1 rounded-lg border bg-muted/40 p-3">
            <p className="text-xs font-medium text-foreground">Already realized during the plan (withdrawals)</p>
            {assetClass === "equity" ? (
              <>
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>Short-term gains (STCG, taxed @ 20%)</span>
                  <span className="font-mono tabular-nums text-foreground">{formatINR(estimate.stcgEquity)}</span>
                </div>
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>Long-term gains (LTCG, taxed @ 12.5% above ₹1.25L)</span>
                  <span className="font-mono tabular-nums text-foreground">{formatINR(estimate.ltcgEquity)}</span>
                </div>
              </>
            ) : (
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Debt fund gains (taxed @ your slab rate)</span>
                <span className="font-mono tabular-nums text-foreground">{formatINR(estimate.debtGain)}</span>
              </div>
            )}
            <div className="flex items-center justify-between border-t pt-1.5 text-xs font-medium">
              <span>Tax owed on withdrawals so far</span>
              <span className="font-mono tabular-nums text-negative">{formatINR(estimate.taxOwedDuringPlan)}</span>
            </div>
          </div>
        )}

        <div className="grid gap-1 rounded-lg border bg-muted/40 p-3">
          <p className="text-xs font-medium text-foreground">If you redeemed everything held today</p>
          {assetClass === "equity" ? (
            <>
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Short-term gains (STCG, taxed @ 20%)</span>
                <span className="font-mono tabular-nums text-foreground">{formatINR(estimate.hypoStcgEquity)}</span>
              </div>
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Long-term gains (LTCG, taxed @ 12.5% above ₹1.25L)</span>
                <span className="font-mono tabular-nums text-foreground">{formatINR(estimate.hypoLtcgEquity)}</span>
              </div>
            </>
          ) : (
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Debt fund gains (taxed @ your slab rate)</span>
              <span className="font-mono tabular-nums text-foreground">{formatINR(estimate.hypoDebtGain)}</span>
            </div>
          )}

          <div className="mt-1 flex items-center justify-between border-t pt-1.5 text-xs text-muted-foreground">
            <span>Corpus before tax</span>
            <span className="font-mono tabular-nums text-foreground">{formatINR(finalValue)}</span>
          </div>
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Estimated exit tax</span>
            <span className="font-mono tabular-nums text-negative">-{formatINR(estimate.hypotheticalExitTax)}</span>
          </div>
          <div className="flex items-center justify-between text-sm font-semibold">
            <span>Post-tax value</span>
            <span className="font-mono text-lg tabular-nums text-primary">{formatINR(estimate.postTaxFinalValue)}</span>
          </div>
        </div>

        <p className="text-xs text-muted-foreground">
          Educational estimate — assumes current FY24-25 equity rates, a single ₹1.25L LTCG exemption for the whole
          plan (the real rule is per financial year), and your own tax slab for debt gains. Not tax advice.
        </p>
      </CardContent>
    </Card>
  );
}
