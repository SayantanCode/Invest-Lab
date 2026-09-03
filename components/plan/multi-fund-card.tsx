"use client";

import type { Plan } from "@/lib/engine";
import { newId } from "@/lib/id";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { FundAllocationEditor } from "@/components/plan/fund-allocation-editor";

export function MultiFundCard({
  plan,
  onChange,
  mode,
}: {
  plan: Plan;
  onChange: (plan: Plan) => void;
  mode: "forecast" | "historical";
}) {
  const enabled = (plan.allocations?.length ?? 0) >= 2;

  function setEnabled(on: boolean) {
    if (on) {
      const existing =
        plan.allocations && plan.allocations.length >= 2
          ? plan.allocations
          : [
              { id: newId(), label: "Fund 1", weightPct: 50 },
              { id: newId(), label: "Fund 2", weightPct: 50 },
            ];
      onChange({ ...plan, allocations: existing });
    } else {
      onChange({ ...plan, allocations: undefined });
    }
  }

  return (
    <Card>
      <CardHeader className="flex-row items-start justify-between space-y-0">
        <div>
          <CardTitle>Multiple funds</CardTitle>
          <CardDescription>Split every contribution across more than one fund.</CardDescription>
        </div>
        <Switch checked={enabled} onCheckedChange={setEnabled} aria-label="Split across multiple funds" />
      </CardHeader>
      {enabled && (
        <CardContent>
          <FundAllocationEditor
            plan={plan}
            allocations={plan.allocations ?? []}
            onChange={(allocations) => onChange({ ...plan, allocations })}
            mode={mode}
          />
        </CardContent>
      )}
    </Card>
  );
}
