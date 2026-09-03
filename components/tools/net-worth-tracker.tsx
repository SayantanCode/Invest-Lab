"use client";

import * as React from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";

import { useNetWorthStore, ASSET_CATEGORY_LABELS, type Asset, type AssetCategory } from "@/lib/stores/use-networth-store";
import { useProfileStore } from "@/lib/stores/use-profile-store";
import { formatINR } from "@/lib/format";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
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
import { BreakdownDonut } from "@/components/tools/breakdown-donut";

const CATEGORY_COLORS: Record<AssetCategory, string> = {
  cash: "var(--color-chart-1)",
  investments: "var(--color-chart-2)",
  property: "var(--color-chart-3)",
  gold: "var(--color-chart-4)",
  vehicle: "var(--color-chart-5)",
  other: "var(--color-muted-foreground)",
};

const CATEGORIES = Object.keys(ASSET_CATEGORY_LABELS) as AssetCategory[];

interface Draft {
  label: string;
  category: AssetCategory;
  value: string;
}

const EMPTY_DRAFT: Draft = { label: "", category: "cash", value: "" };

export function NetWorthTracker() {
  const { assets, saveAsset, updateAsset, deleteAsset } = useNetWorthStore();
  const { profile } = useProfileStore();
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<Asset | null>(null);
  const [draft, setDraft] = React.useState<Draft>(EMPTY_DRAFT);
  const [deleteTarget, setDeleteTarget] = React.useState<Asset | null>(null);

  const totalAssets = assets.reduce((sum, a) => sum + a.value, 0);
  const totalLiabilities = profile?.debts.reduce((sum, d) => sum + d.outstandingAmount, 0) ?? 0;
  const netWorth = totalAssets - totalLiabilities;

  const slices = CATEGORIES.map((category) => ({
    label: ASSET_CATEGORY_LABELS[category],
    value: assets.filter((a) => a.category === category).reduce((sum, a) => sum + a.value, 0),
    color: CATEGORY_COLORS[category],
  })).filter((s) => s.value > 0);

  function openAdd() {
    setEditing(null);
    setDraft(EMPTY_DRAFT);
    setDialogOpen(true);
  }

  function openEdit(asset: Asset) {
    setEditing(asset);
    setDraft({ label: asset.label, category: asset.category, value: String(asset.value) });
    setDialogOpen(true);
  }

  function handleSave() {
    const value = Number(draft.value);
    if (!draft.label.trim() || !Number.isFinite(value) || value < 0) return;
    const input = { label: draft.label.trim(), category: draft.category, value };
    if (editing) updateAsset(editing.id, input);
    else saveAsset(input);
    setDialogOpen(false);
  }

  return (
    <div className="grid gap-5">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Card className="gap-1.5 py-4">
          <CardContent className="px-4">
            <p className="text-xs font-medium text-muted-foreground">Total assets</p>
            <p className="mt-1 font-mono text-xl font-semibold tabular-nums tracking-tight text-positive">{formatINR(totalAssets)}</p>
          </CardContent>
        </Card>
        <Card className="gap-1.5 py-4">
          <CardContent className="px-4">
            <p className="text-xs font-medium text-muted-foreground">Total liabilities</p>
            <p className="mt-1 font-mono text-xl font-semibold tabular-nums tracking-tight text-negative">{formatINR(totalLiabilities)}</p>
          </CardContent>
        </Card>
        <Card className="gap-1.5 py-4">
          <CardContent className="px-4">
            <p className="text-xs font-medium text-muted-foreground">Net worth</p>
            <p className="mt-1 font-mono text-xl font-semibold tabular-nums tracking-tight">{formatINR(netWorth)}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle>Assets</CardTitle>
            <Button size="sm" onClick={openAdd} className="gap-1.5">
              <Plus className="size-3.5" />
              Add asset
            </Button>
          </CardHeader>
          <CardContent className="grid gap-2">
            {assets.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                Nothing added yet — bank balances, investments held outside this app, property, gold, whatever you
                own that isn&apos;t already a Goal or Plan here.
              </p>
            ) : (
              assets.map((asset) => (
                <div key={asset.id} className="flex items-center justify-between gap-3 rounded-lg border bg-muted/40 p-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{asset.label}</p>
                    <p className="text-xs text-muted-foreground">{ASSET_CATEGORY_LABELS[asset.category]}</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <span className="font-mono text-sm tabular-nums">{formatINR(asset.value)}</span>
                    <Button variant="ghost" size="icon" className="size-7" onClick={() => openEdit(asset)} aria-label={`Edit ${asset.label}`}>
                      <Pencil className="size-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-7 text-destructive hover:text-destructive"
                      onClick={() => setDeleteTarget(asset)}
                      aria-label={`Delete ${asset.label}`}
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </div>
                </div>
              ))
            )}

            {profile && profile.debts.length > 0 && (
              <div className="mt-3 grid gap-2 border-t pt-3">
                <p className="text-xs font-medium text-muted-foreground">Liabilities (from your Financial Profile)</p>
                {profile.debts.map((debt) => (
                  <div key={debt.id} className="flex items-center justify-between gap-3 rounded-lg border bg-negative/5 p-3">
                    <p className="truncate text-sm font-medium">{debt.label || "Debt"}</p>
                    <span className="font-mono text-sm tabular-nums text-negative">{formatINR(debt.outstandingAmount)}</span>
                  </div>
                ))}
                <p className="text-xs text-muted-foreground">Edit these from Financial Profile — this page only reads them.</p>
              </div>
            )}
          </CardContent>
        </Card>

        {slices.length > 0 && (
          <BreakdownDonut title="Asset breakdown" centerLabel="Total assets" centerValue={totalAssets} slices={slices} />
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Edit asset" : "Add asset"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4">
            <div className="grid gap-1.5">
              <Label htmlFor="asset-label">Name</Label>
              <Input
                id="asset-label"
                value={draft.label}
                onChange={(e) => setDraft((d) => ({ ...d, label: e.target.value }))}
                placeholder="e.g. HDFC savings account"
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="asset-category">Category</Label>
              <Select value={draft.category} onValueChange={(v) => setDraft((d) => ({ ...d, category: v as AssetCategory }))}>
                <SelectTrigger id="asset-category" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c}>
                      {ASSET_CATEGORY_LABELS[c]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="asset-value">Current value (₹)</Label>
              <Input
                id="asset-value"
                type="number"
                min={0}
                value={draft.value}
                onChange={(e) => setDraft((d) => ({ ...d, value: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={!draft.label.trim() || !Number.isFinite(Number(draft.value)) || Number(draft.value) < 0}>
              {editing ? "Save changes" : "Add asset"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteTarget != null} onOpenChange={(next) => !next && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete &quot;{deleteTarget?.label}&quot;?</AlertDialogTitle>
            <AlertDialogDescription>This removes it from your net worth — this can&apos;t be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-white hover:bg-destructive/90"
              onClick={() => {
                if (deleteTarget) deleteAsset(deleteTarget.id);
                setDeleteTarget(null);
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
