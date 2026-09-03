import type { SimulationResult } from "@/lib/engine";
import { formatINRCompact, formatPercent } from "@/lib/format";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

function StatCard({
  label,
  value,
  tone,
  sub,
}: {
  label: string;
  value: string;
  tone?: "positive" | "negative" | "default";
  sub?: string;
}) {
  return (
    <Card className="gap-1.5 py-4">
      <CardContent className="px-4">
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
        <p
          className={cn(
            "mt-1 font-mono text-xl font-semibold tabular-nums tracking-tight",
            tone === "positive" && "text-positive",
            tone === "negative" && "text-negative"
          )}
        >
          {value}
        </p>
        {sub && <p className="mt-0.5 text-xs text-muted-foreground">{sub}</p>}
      </CardContent>
    </Card>
  );
}

export function SummaryCards({
  result,
  showInflation = true,
}: {
  result: SimulationResult;
  showInflation?: boolean;
}) {
  const gainPositive = result.gain >= 0;
  return (
    <div className={cn("grid grid-cols-2 gap-3 sm:grid-cols-3", showInflation && "lg:grid-cols-5")}>
      <StatCard label="Total invested" value={formatINRCompact(result.totalInvested)} />
      <StatCard
        label="Current value"
        value={formatINRCompact(result.finalValue)}
        tone={gainPositive ? "positive" : "negative"}
        sub={`${gainPositive ? "+" : ""}${formatINRCompact(result.gain)} gain`}
      />
      <StatCard
        label="XIRR"
        value={formatPercent(result.xirrPct)}
        tone={result.xirrPct != null && result.xirrPct >= 0 ? "positive" : "negative"}
      />
      {showInflation && (
        <>
          <StatCard
            label="Inflation-adjusted value"
            value={formatINRCompact(result.realFinalValue)}
            sub="In today's rupees"
          />
          <StatCard label="Real XIRR" value={formatPercent(result.realXirrPct)} sub="After inflation" />
        </>
      )}
    </div>
  );
}
