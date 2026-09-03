"use client";

import * as React from "react";
import { useSession } from "next-auth/react";
import type { Plan } from "@/lib/engine";
import { newId } from "@/lib/id";

const STORAGE_KEY = "investlab.plans.v1";

export type PlanType = "wealth" | "goal" | "retirement";

export interface SavedPlan {
  id: string;
  name: string;
  description?: string;
  planType: PlanType;
  plan: Plan;
  notes?: string;
  whyThisExists?: string;
  /** The ₹ goal this plan is aimed at, in future (inflated) rupees — set at creation from a goal/retirement preset. Wealth-creation plans have no fixed target and leave this unset. */
  targetAmount?: number;
  createdAt: string; // ISO datetime
  updatedAt: string; // ISO datetime
}

export type SavedPlanInput = Pick<SavedPlan, "name" | "planType" | "plan"> &
  Partial<Pick<SavedPlan, "description" | "notes" | "whyThisExists" | "targetAmount">>;

const EMPTY: SavedPlan[] = [];

// ---------------------------------------------------------------------------
// Local (guest / signed-out) store — localStorage, unchanged from before.
// ---------------------------------------------------------------------------

let cachedSnapshot: SavedPlan[] | null = null;
const localListeners = new Set<() => void>();

function readFromStorage(): SavedPlan[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as SavedPlan[];
  } catch {
    // localStorage unavailable (private mode, quota) — fall through to empty.
  }
  return [];
}

function getLocalSnapshot(): SavedPlan[] {
  if (cachedSnapshot == null) cachedSnapshot = readFromStorage();
  return cachedSnapshot;
}

function getServerSnapshot(): SavedPlan[] {
  return EMPTY;
}

function subscribeLocal(callback: () => void) {
  localListeners.add(callback);
  return () => localListeners.delete(callback);
}

function writeLocalPlans(next: SavedPlan[]) {
  cachedSnapshot = next;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Plans still work for this session even if they can't persist.
  }
  localListeners.forEach((l) => l());
}

function localCreatePlan(input: SavedPlanInput): SavedPlan {
  const now = new Date().toISOString();
  const saved: SavedPlan = { id: newId(), createdAt: now, updatedAt: now, ...input };
  writeLocalPlans([...getLocalSnapshot(), saved]);
  return saved;
}

function localUpdatePlan(id: string, patch: Partial<SavedPlanInput>) {
  writeLocalPlans(
    getLocalSnapshot().map((p) => (p.id === id ? { ...p, ...patch, updatedAt: new Date().toISOString() } : p))
  );
}

function localDeletePlan(id: string) {
  writeLocalPlans(getLocalSnapshot().filter((p) => p.id !== id));
}

function localDuplicatePlan(id: string): SavedPlan | undefined {
  const source = getLocalSnapshot().find((p) => p.id === id);
  if (!source) return undefined;
  const now = new Date().toISOString();
  const copy: SavedPlan = { ...source, id: newId(), name: `${source.name} (copy)`, createdAt: now, updatedAt: now };
  writeLocalPlans([...getLocalSnapshot(), copy]);
  return copy;
}

/** Local plans that haven't been offered for import yet — read once, synchronously, by the first-login prompt. */
export function readLocalPlansForImport(): SavedPlan[] {
  return getLocalSnapshot();
}

// ---------------------------------------------------------------------------
// Remote (signed-in) store — fetch-backed, same publish/subscribe shape.
// ---------------------------------------------------------------------------

let remoteCache: SavedPlan[] | null = null;
let remoteFetchInFlight: Promise<void> | null = null;
// Bumped on every sign-out/forced refresh — an in-flight fetch that started
// before the bump is a different account's (or a now-stale) request, so its
// result is discarded on arrival instead of silently repopulating the cache
// with the wrong user's plans after a sign-out that raced it.
let remoteGeneration = 0;
/** Which generation `remoteFetchInFlight` was started for — lets ensureRemoteFetched tell a still-running stale fetch apart from a current one, and start a fresh fetch for the new generation instead of waiting on a request whose result it's about to discard. */
let remoteFetchInFlightGeneration = -1;
const remoteListeners = new Set<() => void>();

function notifyRemote() {
  remoteListeners.forEach((l) => l());
}

function getRemoteSnapshot(): SavedPlan[] {
  return remoteCache ?? EMPTY;
}

function subscribeRemote(callback: () => void) {
  remoteListeners.add(callback);
  return () => remoteListeners.delete(callback);
}

async function fetchRemotePlans() {
  const generation = remoteGeneration;
  const res = await fetch("/api/plans");
  if (!res.ok) return;
  const data = (await res.json()) as SavedPlan[];
  if (generation !== remoteGeneration) return; // stale — a sign-out (or another refresh) happened while this was in flight
  remoteCache = data;
  notifyRemote();
}

function ensureRemoteFetched() {
  if (remoteCache != null) return;
  if (remoteFetchInFlight && remoteFetchInFlightGeneration === remoteGeneration) return;
  remoteFetchInFlightGeneration = remoteGeneration;
  remoteFetchInFlight = fetchRemotePlans().finally(() => {
    remoteFetchInFlight = null;
  });
}

function resetRemoteCache() {
  remoteCache = null;
  remoteGeneration++;
}

/** Forces a re-fetch of the signed-in user's plans — used after a bulk import so the store picks up the new rows. */
export function refreshRemotePlans() {
  remoteCache = null;
  remoteGeneration++;
  ensureRemoteFetched();
}

async function remoteCreatePlan(input: SavedPlanInput): Promise<SavedPlan> {
  const res = await fetch("/api/plans", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new Error(`Failed to create plan (${res.status})`);
  const saved = (await res.json()) as SavedPlan;
  remoteCache = [saved, ...(remoteCache ?? [])];
  notifyRemote();
  return saved;
}

async function remoteUpdatePlan(id: string, patch: Partial<SavedPlanInput>) {
  const res = await fetch(`/api/plans/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(patch),
  });
  if (!res.ok) throw new Error(`Failed to update plan (${res.status})`);
  const updated = (await res.json()) as SavedPlan;
  remoteCache = (remoteCache ?? []).map((p) => (p.id === id ? updated : p));
  notifyRemote();
}

async function remoteDeletePlan(id: string) {
  const res = await fetch(`/api/plans/${id}`, { method: "DELETE" });
  if (!res.ok) throw new Error(`Failed to delete plan (${res.status})`);
  remoteCache = (remoteCache ?? []).filter((p) => p.id !== id);
  notifyRemote();
}

async function remoteDuplicatePlan(id: string): Promise<SavedPlan | undefined> {
  const source = (remoteCache ?? []).find((p) => p.id === id);
  if (!source) return undefined;
  return remoteCreatePlan({
    name: `${source.name} (copy)`,
    planType: source.planType,
    plan: source.plan,
    description: source.description,
    notes: source.notes,
    whyThisExists: source.whyThisExists,
  });
}

// ---------------------------------------------------------------------------
// Public hook — same shape for every caller; branches on sign-in state.
// ---------------------------------------------------------------------------

export function useSavedPlansStore() {
  const { status } = useSession();
  const isSignedIn = status === "authenticated";

  const localPlans = React.useSyncExternalStore(subscribeLocal, getLocalSnapshot, getServerSnapshot);
  const remotePlans = React.useSyncExternalStore(subscribeRemote, getRemoteSnapshot, getServerSnapshot);

  React.useEffect(() => {
    if (isSignedIn) ensureRemoteFetched();
    else resetRemoteCache();
  }, [isSignedIn]);

  const plans = isSignedIn ? remotePlans : localPlans;

  const createPlan = React.useCallback(
    (input: SavedPlanInput): Promise<SavedPlan> =>
      isSignedIn ? remoteCreatePlan(input) : Promise.resolve(localCreatePlan(input)),
    [isSignedIn]
  );

  const updatePlan = React.useCallback(
    (id: string, patch: Partial<SavedPlanInput>): Promise<void> =>
      isSignedIn ? remoteUpdatePlan(id, patch) : Promise.resolve(localUpdatePlan(id, patch)),
    [isSignedIn]
  );

  const deletePlan = React.useCallback(
    (id: string): Promise<void> => (isSignedIn ? remoteDeletePlan(id) : Promise.resolve(localDeletePlan(id))),
    [isSignedIn]
  );

  const duplicatePlan = React.useCallback(
    (id: string): Promise<SavedPlan | undefined> =>
      isSignedIn ? remoteDuplicatePlan(id) : Promise.resolve(localDuplicatePlan(id)),
    [isSignedIn]
  );

  return { plans, createPlan, updatePlan, deletePlan, duplicatePlan };
}
