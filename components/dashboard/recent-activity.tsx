"use client";

import { PlusCircle, Pencil, Copy, Trash2, Upload, ArrowUpCircle, ArrowDownCircle, History } from "lucide-react";
import { useActivityLog, type ActivityKind } from "@/lib/stores/use-activity-log-store";
import { formatRelativeTime } from "@/lib/format";
import { cn } from "@/lib/utils";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const KIND_META: Record<ActivityKind, { icon: typeof PlusCircle; tone: string }> = {
  plan_created: { icon: PlusCircle, tone: "bg-emerald-500/15 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400" },
  plan_imported: { icon: Upload, tone: "bg-emerald-500/15 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400" },
  plan_updated: { icon: Pencil, tone: "bg-blue-500/15 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400" },
  plan_duplicated: { icon: Copy, tone: "bg-violet-500/15 text-violet-600 dark:bg-violet-500/20 dark:text-violet-400" },
  plan_deleted: { icon: Trash2, tone: "bg-rose-500/15 text-rose-600 dark:bg-rose-500/20 dark:text-rose-400" },
  event_added: { icon: ArrowUpCircle, tone: "bg-emerald-500/15 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400" },
  event_removed: { icon: ArrowDownCircle, tone: "bg-rose-500/15 text-rose-600 dark:bg-rose-500/20 dark:text-rose-400" },
};

export function RecentActivity() {
  const { entries } = useActivityLog();
  const recent = entries.slice(0, 6);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent activity</CardTitle>
      </CardHeader>
      <CardContent>
        {recent.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-8 text-center">
            <History className="size-6 text-muted-foreground" />
            <p className="max-w-xs text-sm text-muted-foreground">No activity yet — create or edit a plan to see it here.</p>
          </div>
        ) : (
          <ul className="grid gap-3">
            {recent.map((entry) => {
              const meta = KIND_META[entry.kind];
              return (
                <li key={entry.id} className="flex items-start gap-2.5">
                  <span className={cn("flex size-6 shrink-0 items-center justify-center rounded-full", meta.tone)}>
                    <meta.icon className="size-3.5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm leading-snug">{entry.message}</p>
                    <p className="text-xs text-muted-foreground">{formatRelativeTime(entry.at)}</p>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
