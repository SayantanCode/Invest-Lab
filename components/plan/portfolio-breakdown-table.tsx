import type { PortfolioLeg } from "@/lib/engine";
import { formatINR, formatPercent } from "@/lib/format";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export function PortfolioBreakdownTable({ legs }: { legs: PortfolioLeg[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Per-fund breakdown</CardTitle>
        <CardDescription>How each fund in the portfolio is doing on its own.</CardDescription>
      </CardHeader>
      <CardContent className="px-0 sm:px-6">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Fund</TableHead>
                <TableHead className="text-right">Weight</TableHead>
                <TableHead className="text-right">Invested</TableHead>
                <TableHead className="text-right">Value</TableHead>
                <TableHead className="text-right">XIRR</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {legs.map((leg) => (
                <TableRow key={leg.allocation.id}>
                  <TableCell className="max-w-[160px] truncate" title={leg.allocation.label}>
                    {leg.allocation.label}
                  </TableCell>
                  <TableCell className="text-right font-mono tabular-nums">{leg.allocation.weightPct.toFixed(1)}%</TableCell>
                  <TableCell className="text-right font-mono tabular-nums">{formatINR(leg.result.totalInvested)}</TableCell>
                  <TableCell className="text-right font-mono tabular-nums font-medium">
                    {formatINR(leg.result.finalValue)}
                  </TableCell>
                  <TableCell className="text-right font-mono tabular-nums">{formatPercent(leg.result.xirrPct)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
