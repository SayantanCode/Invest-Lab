"use client";

import * as React from "react";
import dayjs, { type Dayjs } from "dayjs";
import { DatePicker } from "antd";
import type { EventType, PlanEvent } from "@/lib/engine";
import { diffYears, parseISO } from "@/lib/engine";
import { newId } from "@/lib/id";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SliderField } from "@/components/plan/slider-field";
import { Switch } from "@/components/ui/switch";

export const TYPE_META: Record<EventType, { title: string; hint: string }> = {
  SIP_START: { title: "Start SIP", hint: "Begin a recurring monthly investment." },
  SIP_STEPUP: { title: "Step-up SIP", hint: "Increase the running SIP amount, by percent or to a new amount." },
  SIP_PAUSE: { title: "Pause SIP", hint: "Stop contributions without ending the plan." },
  SIP_RESUME: { title: "Resume SIP", hint: "Restart contributions, optionally at a new amount." },
  SIP_STOP: { title: "Stop SIP", hint: "End recurring contributions for good." },
  LUMPSUM: { title: "Lumpsum", hint: "A one-time investment on a specific date." },
  WITHDRAWAL: { title: "One-time withdrawal", hint: "A single redemption on a specific date." },
  SWP_START: { title: "Start SWP", hint: "Begin a recurring monthly withdrawal — the mirror of a SIP, paying out instead of in." },
  SWP_STOP: { title: "Stop SWP", hint: "End the recurring withdrawal for good." },
};

// Grouped in the picker so investing and withdrawing read as equal, parallel
// options — a systematic withdrawal (SWP) is exactly as easy to set up as a
// systematic investment (SIP), not a buried afterthought.
export const TYPE_GROUPS: { label: string; types: EventType[] }[] = [
  { label: "Investing", types: ["SIP_START", "SIP_STEPUP", "SIP_PAUSE", "SIP_RESUME", "SIP_STOP", "LUMPSUM"] },
  { label: "Withdrawing", types: ["SWP_START", "SWP_STOP", "WITHDRAWAL"] },
];

export function defaultEventFor(type: EventType, date: string): PlanEvent {
  switch (type) {
    case "SIP_START":
      return { id: newId(), type, date, amount: 5000 };
    case "SIP_STEPUP":
      return { id: newId(), type, date, mode: "percent", value: 10 };
    case "SIP_PAUSE":
      return { id: newId(), type, date };
    case "SIP_RESUME":
      return { id: newId(), type, date, amount: undefined };
    case "SIP_STOP":
      return { id: newId(), type, date };
    case "LUMPSUM":
      return { id: newId(), type, date, amount: 100000 };
    case "WITHDRAWAL":
      return { id: newId(), type, date, amount: 50000 };
    case "SWP_START":
      return { id: newId(), type, date, amount: 10000 };
    case "SWP_STOP":
      return { id: newId(), type, date };
  }
}

function relativeToStart(date: string, planStart: string): string {
  if (!date || !planStart) return "";
  const years = Math.abs(diffYears(parseISO(planStart), parseISO(date)));
  const isPast = date < planStart;
  if (years < 1 / 12) return "at the start of the plan";
  const wholeYears = Math.floor(years);
  const months = Math.round((years - wholeYears) * 12);
  const parts: string[] = [];
  if (wholeYears > 0) parts.push(`${wholeYears} yr${wholeYears === 1 ? "" : "s"}`);
  if (months > 0) parts.push(`${months} mo`);
  return isPast
    ? `${parts.join(" ")} before the plan starts — already happened, and is included in the replay`
    : `${parts.join(" ")} after the plan starts`;
}

export function EventDialog({
  event,
  planStart,
  planEnd,
  trigger,
  open,
  onOpenChange,
  onSave,
  onDelete,
  initialType = "SIP_START",
}: {
  event?: PlanEvent | null;
  planStart: string;
  planEnd: string;
  trigger?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  onSave: (event: PlanEvent) => void;
  onDelete?: (id: string) => void;
  /** Which type the picker starts on when adding (not editing) a new event — lets a quick-add button jump straight to SIP or SWP instead of always opening on SIP. */
  initialType?: EventType;
}) {
  const isEdit = !!event;
  const [draft, setDraft] = React.useState<PlanEvent>(
    () => event ?? defaultEventFor(initialType, planStart)
  );

  // Reset the draft whenever the dialog transitions to open, so a stale edit
  // from a previous event doesn't linger. Adjusting state while rendering
  // (rather than in an effect) avoids an extra render pass — see
  // https://react.dev/learn/you-might-not-need-an-effect#adjusting-some-state-when-a-prop-changes.
  const [prevOpen, setPrevOpen] = React.useState(open);
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) setDraft(event ?? defaultEventFor(initialType, planStart));
  }

  function setType(type: EventType) {
    setDraft((prev) => defaultEventFor(type, prev.date));
  }

  function handleSave() {
    onSave(draft);
    onOpenChange?.(false);
  }

  const meta = TYPE_META[draft.type];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit event" : "Add event"}</DialogTitle>
          <DialogDescription>{meta.hint}</DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-1">
          <div className="grid gap-2">
            <Label htmlFor="evt-type">Event type</Label>
            <Select value={draft.type} onValueChange={(v) => setType(v as EventType)}>
              <SelectTrigger id="evt-type" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TYPE_GROUPS.map((group) => (
                  <SelectGroup key={group.label}>
                    <SelectLabel>{group.label}</SelectLabel>
                    {group.types.map((t) => (
                      <SelectItem key={t} value={t}>
                        {TYPE_META[t].title}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="evt-date">Date</Label>
            <DatePicker
              id="evt-date"
              value={draft.date ? dayjs(draft.date, "YYYY-MM-DD") : null}
              onChange={(date: Dayjs | null) => date && setDraft((prev) => ({ ...prev, date: date.format("YYYY-MM-DD") }))}
              disabledDate={(current: Dayjs) => current.isAfter(dayjs(planEnd, "YYYY-MM-DD"), "day")}
              format="DD MMM YYYY"
              className="w-full"
            />
            <p className="text-xs text-muted-foreground">{relativeToStart(draft.date, planStart)}</p>
            {draft.type === "SIP_START" && draft.date < planStart && (
              <p className="text-xs text-muted-foreground">
                Already investing? Backdate this to when the SIP actually started — the plan will include what
                it&apos;s assumed to have grown to by today, then keep going from there.
              </p>
            )}
          </div>

          {draft.type === "SIP_START" && (
            <SliderField
              id="evt-amount"
              label="Monthly amount"
              value={draft.amount}
              onChange={(v) =>
                setDraft((prev) => (prev.type === "SIP_START" ? { ...prev, amount: v } : prev))
              }
              min={500}
              max={100000}
              step={500}
              prefix="₹"
            />
          )}

          {draft.type === "SIP_STEPUP" && (
            <>
              <div className="grid gap-2">
                <Label>Step-up type</Label>
                <Select
                  value={draft.mode}
                  onValueChange={(v) =>
                    setDraft((prev) =>
                      prev.type === "SIP_STEPUP" ? { ...prev, mode: v as "percent" | "amount" } : prev
                    )
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percent">Percent increase</SelectItem>
                    <SelectItem value="amount">New fixed amount</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <SliderField
                id="evt-value"
                label={draft.mode === "percent" ? "Increase by" : "New monthly amount"}
                value={draft.value}
                onChange={(v) =>
                  setDraft((prev) => (prev.type === "SIP_STEPUP" ? { ...prev, value: v } : prev))
                }
                min={draft.mode === "percent" ? 1 : 500}
                max={draft.mode === "percent" ? 100 : 100000}
                step={draft.mode === "percent" ? 1 : 500}
                prefix={draft.mode === "percent" ? undefined : "₹"}
                suffix={draft.mode === "percent" ? "%" : undefined}
              />
            </>
          )}

          {draft.type === "SIP_RESUME" && (
            <div className="grid gap-3">
              <div className="flex items-center justify-between">
                <Label htmlFor="evt-resume-toggle" className="text-sm font-normal">
                  Resume at a different amount
                </Label>
                <Switch
                  id="evt-resume-toggle"
                  checked={draft.amount != null}
                  onCheckedChange={(checked) =>
                    setDraft((prev) =>
                      prev.type === "SIP_RESUME" ? { ...prev, amount: checked ? 5000 : undefined } : prev
                    )
                  }
                />
              </div>
              {draft.amount != null && (
                <SliderField
                  id="evt-resume-amount"
                  label="New monthly amount"
                  value={draft.amount}
                  onChange={(v) =>
                    setDraft((prev) => (prev.type === "SIP_RESUME" ? { ...prev, amount: v } : prev))
                  }
                  min={500}
                  max={100000}
                  step={500}
                  prefix="₹"
                />
              )}
            </div>
          )}

          {(draft.type === "LUMPSUM" || draft.type === "WITHDRAWAL") && (
            <SliderField
              id="evt-lump-amount"
              label="Amount"
              value={draft.amount}
              onChange={(v) =>
                setDraft((prev) =>
                  prev.type === "LUMPSUM" || prev.type === "WITHDRAWAL" ? { ...prev, amount: v } : prev
                )
              }
              min={1000}
              max={2000000}
              step={1000}
              prefix="₹"
            />
          )}

          {draft.type === "SWP_START" && (
            <SliderField
              id="evt-swp-amount"
              label="Monthly withdrawal amount"
              value={draft.amount}
              onChange={(v) => setDraft((prev) => (prev.type === "SWP_START" ? { ...prev, amount: v } : prev))}
              min={500}
              max={200000}
              step={500}
              prefix="₹"
            />
          )}

          <div className="grid gap-2">
            <Label htmlFor="evt-label">Note (optional)</Label>
            <Input
              id="evt-label"
              placeholder="e.g. Annual raise"
              value={draft.label ?? ""}
              onChange={(e) => setDraft((prev) => ({ ...prev, label: e.target.value }))}
            />
          </div>
        </div>

        <DialogFooter className="gap-2 sm:justify-between">
          {isEdit && onDelete ? (
            <Button
              variant="ghost"
              className="text-destructive hover:text-destructive"
              onClick={() => {
                onDelete(draft.id);
                onOpenChange?.(false);
              }}
            >
              Delete
            </Button>
          ) : (
            <span />
          )}
          <Button onClick={handleSave}>{isEdit ? "Save changes" : "Add event"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
