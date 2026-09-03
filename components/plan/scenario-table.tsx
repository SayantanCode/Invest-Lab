import type { ScenarioKey, SimulationResult } from "@/lib/engine";
import { SCENARIO_LABEL, SCENARIOS } from "@/lib/engine";
import { formatINR, formatPercent } from "@/lib/format";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";

export function ScenarioTable({
  results,
  showInflation = true,
}: {
  results: Record<ScenarioKey, SimulationResult>;
  showInflation?: boolean;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Scenario comparison</CardTitle>
        <CardDescription>Same plan, three return assumptions — none of them a promise.</CardDescription>
      </CardHeader>
      <CardContent className="px-0 sm:px-6">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Scenario</TableHead>
                <TableHead className="text-right">Invested</TableHead>
                <TableHead className="text-right">Final value</TableHead>
                <TableHead className="text-right">XIRR</TableHead>
                {showInflation && <TableHead className="text-right">Real value</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {SCENARIOS.map((s) => {
                const r = results[s];
                const isExpected = s === "expected";
                return (
                  <TableRow key={s} className={cn(isExpected && "bg-accent/40")}>
                    <TableCell className={cn("font-medium", isExpected && "text-accent-foreground")}>
                      {SCENARIO_LABEL[s]}
                    </TableCell>
                    <TableCell className="text-right font-mono tabular-nums">{formatINR(r.totalInvested)}</TableCell>
                    <TableCell className="text-right font-mono tabular-nums font-medium">{formatINR(r.finalValue)}</TableCell>
                    <TableCell className="text-right font-mono tabular-nums">{formatPercent(r.xirrPct)}</TableCell>
                    {showInflation && (
                      <TableCell className="text-right font-mono tabular-nums text-muted-foreground">
                        {formatINR(r.realFinalValue)}
                      </TableCell>
                    )}
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
