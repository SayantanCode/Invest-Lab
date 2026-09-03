"use client";

import * as React from "react";
import { Timeline } from "antd";
import {
  PlayCircle,
  TrendingUp,
  PauseCircle,
  RotateCcw,
  StopCircle,
  Banknote,
  MinusCircle,
  Plus,
  Pencil,
  ArrowDownCircle,
  CircleSlash,
} from "lucide-react";

import type { EventType, PlanEvent } from "@/lib/engine";
import { formatDate, formatINR } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EventDialog } from "@/components/plan/event-dialog";
import { cn } from "@/lib/utils";

const ICON: Record<EventType, React.ComponentType<{ className?: string }>> = {
  SIP_START: PlayCircle,
  SIP_STEPUP: TrendingUp,
  SIP_PAUSE: PauseCircle,
  SIP_RESUME: RotateCcw,
  SIP_STOP: StopCircle,
  LUMPSUM: Banknote,
  WITHDRAWAL: MinusCircle,
  SWP_START: ArrowDownCircle,
  SWP_STOP: CircleSlash,
};

const TONE: Record<EventType, string> = {
  SIP_START: "text-positive bg-positive/10",
  SIP_STEPUP: "text-positive bg-positive/10",
  SIP_PAUSE: "text-muted-foreground bg-muted",
  SIP_RESUME: "text-primary bg-primary/10",
  SIP_STOP: "text-negative bg-negative/10",
  LUMPSUM: "text-primary bg-primary/10",
  WITHDRAWAL: "text-negative bg-negative/10",
  SWP_START: "text-negative bg-negative/10",
  SWP_STOP: "text-muted-foreground bg-muted",
};

function describeEvent(evt: PlanEvent): string {
  switch (evt.type) {
    case "SIP_START":
      return `Start SIP · ${formatINR(evt.amount)}/mo`;
    case "SIP_STEPUP":
      return evt.mode === "percent"
        ? `Step-up · +${evt.value}%`
        : `Step-up · to ${formatINR(evt.value)}/mo`;
    case "SIP_PAUSE":
      return "Pause SIP";
    case "SIP_RESUME":
      return evt.amount ? `Resume SIP · ${formatINR(evt.amount)}/mo` : "Resume SIP";
    case "SIP_STOP":
      return "Stop SIP";
    case "LUMPSUM":
      return `Lumpsum · ${formatINR(evt.amount)}`;
    case "WITHDRAWAL":
      return `Withdrawal · ${formatINR(evt.amount)}`;
    case "SWP_START":
      return `Start SWP · ${formatINR(evt.amount)}/mo`;
    case "SWP_STOP":
      return "Stop SWP";
  }
}

export function EventTimeline({
  events,
  planStart,
  planEnd,
  onChange,
  title = "Investment journey",
  emptyLabel = "No events yet — add a SIP start to begin.",
}: {
  events: PlanEvent[];
  planStart: string;
  planEnd: string;
  onChange: (events: PlanEvent[]) => void;
  title?: string;
  emptyLabel?: string;
}) {
  const [editing, setEditing] = React.useState<PlanEvent | null>(null);
  const [addOpen, setAddOpen] = React.useState(false);
  const [addType, setAddType] = React.useState<EventType>("SIP_START");

  function quickAdd(type: EventType) {
    setAddType(type);
    setAddOpen(true);
  }

  const sorted = React.useMemo(
    () => [...events].sort((a, b) => a.date.localeCompare(b.date)),
    [events]
  );

  function handleSave(evt: PlanEvent) {
    const exists = events.some((e) => e.id === evt.id);
    onChange(exists ? events.map((e) => (e.id === evt.id ? evt : e)) : [...events, evt]);
  }

  function handleDelete(id: string) {
    onChange(events.filter((e) => e.id !== id));
  }

  return (
    <Card>
      <CardHeader className="flex-row items-start justify-between space-y-0">
        <div>
          <CardTitle>{title}</CardTitle>
          <CardDescription>Invest monthly with a SIP, or draw down monthly with a SWP — same engine, either direction.</CardDescription>
        </div>
        <div className="flex shrink-0 flex-wrap items-center justify-end gap-1.5">
          <Button size="sm" variant="outline" className="gap-1.5" onClick={() => quickAdd("SIP_START")}>
            <PlayCircle className="size-3.5" />
            SIP
          </Button>
          <Button size="sm" variant="outline" className="gap-1.5" onClick={() => quickAdd("SWP_START")}>
            <ArrowDownCircle className="size-3.5" />
            SWP
          </Button>
          <Button size="sm" variant="ghost" className="gap-1.5" onClick={() => quickAdd("LUMPSUM")}>
            <Plus className="size-3.5" />
            More
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {sorted.length === 0 ? (
          <p className="text-sm text-muted-foreground py-6 text-center">{emptyLabel}</p>
        ) : (
          <Timeline
            className="pt-2"
            items={sorted.map((evt) => {
              const Icon = ICON[evt.type];
              return {
                key: evt.id,
                icon: (
                  <span className={cn("flex size-6 items-center justify-center rounded-full", TONE[evt.type])}>
                    <Icon className="size-3.5" />
                  </span>
                ),
                content: (
                  <button
                    type="button"
                    onClick={() => setEditing(evt)}
                    className="group -mt-0.5 flex w-full items-start justify-between gap-3 rounded-lg px-2 py-1.5 text-left transition-colors hover:bg-muted"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium leading-tight">{describeEvent(evt)}</p>
                      <p className="mt-0.5 font-mono text-xs text-muted-foreground tabular-nums">
                        {formatDate(evt.date)}
                        {evt.date < planStart && " · already started"}
                        {evt.label && ` · ${evt.label}`}
                      </p>
                    </div>
                    <Pencil className="mt-0.5 size-3.5 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
                  </button>
                ),
              };
            })}
          />
        )}
      </CardContent>

      <EventDialog
        event={editing}
        open={!!editing}
        onOpenChange={(o) => !o && setEditing(null)}
        planStart={planStart}
        planEnd={planEnd}
        onSave={handleSave}
        onDelete={handleDelete}
      />

      <EventDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        planStart={planStart}
        planEnd={planEnd}
        onSave={handleSave}
        initialType={addType}
      />
    </Card>
  );
}
