// Assets held outside this app's own goals/plans — the other half of net
// worth. Liabilities aren't duplicated here; the net-worth view reads those
// straight from Profile's own `debts` (lib/use-profile-store.ts), the same
// list the Financial Profile checklist already uses, so there's exactly one
// place debts are entered, not two that could drift apart. localStorage
// only, same as goals/profile — never synced server-side.

"use client";

import * as React from "react";
import { newId } from "@/lib/id";

const STORAGE_KEY = "investlab.networth-assets.v1";

export type AssetCategory = "cash" | "investments" | "property" | "gold" | "vehicle" | "other";

export const ASSET_CATEGORY_LABELS: Record<AssetCategory, string> = {
  cash: "Cash & bank balance",
  investments: "Investments (stocks, MFs, FDs — outside this app)",
  property: "Property / real estate",
  gold: "Gold & jewelry",
  vehicle: "Vehicle",
  other: "Other",
};

export interface Asset {
  id: string;
  label: string;
  category: AssetCategory;
  value: number;
  createdAt: string;
}

export type AssetInput = Omit<Asset, "id" | "createdAt">;

let cachedSnapshot: Asset[] | null = null;
const listeners = new Set<() => void>();

function readFromStorage(): Asset[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as Asset[];
  } catch {
    // localStorage unavailable — fall through to empty.
  }
  return [];
}

const SERVER_SNAPSHOT: Asset[] = [];

function getSnapshot(): Asset[] {
  if (cachedSnapshot == null) cachedSnapshot = readFromStorage();
  return cachedSnapshot;
}

function getServerSnapshot(): Asset[] {
  return SERVER_SNAPSHOT;
}

function subscribe(callback: () => void) {
  listeners.add(callback);
  return () => listeners.delete(callback);
}

function writeAssets(next: Asset[]) {
  cachedSnapshot = next;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Assets still work for this session even if they can't persist.
  }
  listeners.forEach((l) => l());
}

export function useNetWorthStore() {
  const assets = React.useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const saveAsset = React.useCallback((input: AssetInput) => {
    const asset: Asset = { ...input, id: newId(), createdAt: new Date().toISOString() };
    writeAssets([...getSnapshot(), asset]);
    return asset;
  }, []);

  const updateAsset = React.useCallback((id: string, input: AssetInput) => {
    writeAssets(getSnapshot().map((a) => (a.id === id ? { ...a, ...input } : a)));
  }, []);

  const deleteAsset = React.useCallback((id: string) => {
    writeAssets(getSnapshot().filter((a) => a.id !== id));
  }, []);

  return { assets, saveAsset, updateAsset, deleteAsset };
}
