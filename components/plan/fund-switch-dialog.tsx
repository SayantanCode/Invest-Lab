// A real MF "switch" — redeem a one-time amount out of one fund, invest the
// same amount into another, same date. Implemented as a WITHDRAWAL on the
// source fund's own event list and a matching LUMPSUM on the target's —
// both funds already replay independently, so this needs no new engine
// mechanics, just a pair of events.

"use client";

import * as React from "react";
import dayjs, { type Dayjs } from "dayjs";
import { DatePicker } from "antd";
import { ArrowRightLeft } from "lucide-react";

import type { FundAllocation } from "@/lib/engine";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export function FundSwitchDialog({
  source,
  otherAllocations,
  planStart,
  planEnd,
  onSwitch,
}: {
  source: FundAllocation;
  otherAllocations: FundAllocation[];
  planStart: string;
  planEnd: string;
  onSwitch: (targetId: string, date: string, amount: number) => void;
}) {
  const [open, setOpen] = React.useState(false);
  const [targetId, setTargetId] = React.useState(otherAllocations[0]?.id ?? "");
  const [date, setDate] = React.useState(planStart);
  const [amount, setAmount] = React.useState(10000);

  const [prevOpen, setPrevOpen] = React.useState(open);
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) {
      setTargetId(otherAllocations[0]?.id ?? "");
      setDate(planStart);
    }
  }

  if (otherAllocations.length === 0) return null;

  function handleSubmit() {
    if (!targetId || amount <= 0) return;
    onSwitch(targetId, date, amount);
    setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="size-8 shrink-0 text-muted-foreground"
          aria-label={`Switch out of ${source.label}`}
        >
          <ArrowRightLeft className="size-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Switch to another fund</DialogTitle>
          <DialogDescription>
            Moves a one-time amount out of {source.label} and into another fund on a specific date — a real MF
            switch, not a new SIP.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-1">
          <div className="grid gap-2">
            <Label htmlFor="switch-target">Switch into</Label>
            <Select value={targetId} onValueChange={setTargetId}>
              <SelectTrigger id="switch-target" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {otherAllocations.map((a) => (
                  <SelectItem key={a.id} value={a.id}>
                    {a.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="switch-date">Date</Label>
            <DatePicker
              id="switch-date"
              value={date ? dayjs(date, "YYYY-MM-DD") : null}
              onChange={(next: Dayjs | null) => next && setDate(next.format("YYYY-MM-DD"))}
              disabledDate={(current: Dayjs) =>
                current.isBefore(dayjs(planStart, "YYYY-MM-DD"), "day") || current.isAfter(dayjs(planEnd, "YYYY-MM-DD"), "day")
              }
              format="DD MMM YYYY"
              className="w-full"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="switch-amount">Amount</Label>
            <Input
              id="switch-amount"
              type="number"
              min={1}
              step={1000}
              value={amount}
              onChange={(e) => setAmount(Number(e.target.value))}
            />
          </div>
        </div>
        <DialogFooter>
          <Button onClick={handleSubmit}>Switch</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
