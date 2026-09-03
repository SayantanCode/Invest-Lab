"use client";

import * as React from "react";
import { Table } from "antd";
import type { ColumnsType } from "antd/es/table";

import type { LedgerRow } from "@/lib/engine";
import { computeYearlyReturns, type YearlyReturn } from "@/lib/calculators/yearly-returns";
import { formatINR, formatDate } from "@/lib/format";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

function Pct({ value }: { value: number | null }) {
  if (value == null) return <span className="text-muted-foreground">—</span>;
  return <span className={cn(value >= 0 ? "text-positive" : "text-negative")}>{value >= 0 ? "+" : ""}{value.toFixed(2)}%</span>;
}

export function CashflowTable({ ledger }: { ledger: LedgerRow[] }) {
  const years = React.useMemo(() => computeYearlyReturns(ledger), [ledger]);
  const monthsByYear = React.useMemo(() => {
    const map = new Map<string, LedgerRow[]>();
    for (const row of ledger) {
      const y = row.date.slice(0, 4);
      const bucket = map.get(y) ?? [];
      bucket.push(row);
      map.set(y, bucket);
    }
    return map;
  }, [ledger]);

  const columns: ColumnsType<YearlyReturn> = [
    { title: "Year", dataIndex: "year", key: "year", width: 90 },
    {
      title: "Invested (₹)",
      dataIndex: "invested",
      key: "invested",
      align: "right",
      render: (v: number) => (v > 0 ? formatINR(v) : "—"),
    },
    {
      title: "Lumpsum (₹)",
      dataIndex: "lumpsum",
      key: "lumpsum",
      align: "right",
      render: (v: number) => (v > 0 ? formatINR(v) : "—"),
    },
    {
      title: "Withdrawals (₹)",
      dataIndex: "withdrawals",
      key: "withdrawals",
      align: "right",
      render: (v: number) => (v > 0 ? formatINR(v) : "—"),
    },
    {
      title: "Growth (₹)",
      dataIndex: "growth",
      key: "growth",
      align: "right",
      render: (v: number) => <span className={cn(v >= 0 ? "text-positive" : "text-negative")}>{v >= 0 ? "+" : ""}{formatINR(v)}</span>,
    },
    {
      title: "End Value (₹)",
      dataIndex: "endValue",
      key: "endValue",
      align: "right",
      render: (v: number) => <span className="font-medium">{formatINR(v)}</span>,
    },
    {
      title: "Return (%)",
      dataIndex: "returnPct",
      key: "returnPct",
      align: "right",
      render: (v: number | null) => <Pct value={v} />,
    },
  ];

  const totals = years.reduce(
    (acc, y) => ({
      invested: acc.invested + y.invested,
      lumpsum: acc.lumpsum + y.lumpsum,
      withdrawals: acc.withdrawals + y.withdrawals,
      growth: acc.growth + y.growth,
    }),
    { invested: 0, lumpsum: 0, withdrawals: 0, growth: 0 }
  );
  const finalValue = years.length ? years[years.length - 1].endValue : 0;
  const overallReturnPct = totals.invested + totals.lumpsum > 0 ? (totals.growth / (totals.invested + totals.lumpsum)) * 100 : null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Cashflow Table</CardTitle>
        <CardDescription>Year by year — tap a row for the months underneath it.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table<YearlyReturn>
            columns={columns}
            dataSource={years}
            rowKey="year"
            pagination={false}
            size="middle"
            expandable={{
              expandedRowRender: (record) => {
                const months = (monthsByYear.get(record.year) ?? []).filter((m) => m.contribution !== 0);
                if (months.length === 0) {
                  return <p className="py-2 text-xs text-muted-foreground">No activity this year.</p>;
                }
                return (
                  <ul className="grid gap-1 py-1 text-xs">
                    {months.map((m) => (
                      <li key={m.date} className="flex items-center justify-between gap-3">
                        <span className="text-muted-foreground">
                          {formatDate(m.date)} · {m.eventLabel}
                        </span>
                        <span className={cn("font-mono tabular-nums", m.contribution < 0 && "text-negative")}>
                          {m.contribution === 0 ? "—" : formatINR(Math.abs(m.contribution))}
                        </span>
                      </li>
                    ))}
                  </ul>
                );
              },
            }}
            summary={() => (
              <Table.Summary.Row>
                <Table.Summary.Cell index={0}>
                  <span className="font-semibold">Total</span>
                </Table.Summary.Cell>
                <Table.Summary.Cell index={1} align="right">
                  <span className="font-semibold">{formatINR(totals.invested)}</span>
                </Table.Summary.Cell>
                <Table.Summary.Cell index={2} align="right">
                  <span className="font-semibold">{formatINR(totals.lumpsum)}</span>
                </Table.Summary.Cell>
                <Table.Summary.Cell index={3} align="right">
                  <span className="font-semibold">{formatINR(totals.withdrawals)}</span>
                </Table.Summary.Cell>
                <Table.Summary.Cell index={4} align="right">
                  <span className={cn("font-semibold", totals.growth >= 0 ? "text-positive" : "text-negative")}>
                    {totals.growth >= 0 ? "+" : ""}
                    {formatINR(totals.growth)}
                  </span>
                </Table.Summary.Cell>
                <Table.Summary.Cell index={5} align="right">
                  <span className="font-semibold">{formatINR(finalValue)}</span>
                </Table.Summary.Cell>
                <Table.Summary.Cell index={6} align="right">
                  <span className="font-semibold">
                    <Pct value={overallReturnPct} />
                  </span>
                </Table.Summary.Cell>
              </Table.Summary.Row>
            )}
          />
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          All values are in ₹. Growth is the change in total gain within the year — units × NAV, nothing modeled on
          top.
        </p>
      </CardContent>
    </Card>
  );
}
