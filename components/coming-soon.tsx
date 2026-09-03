"use client";

import type { LucideIcon } from "lucide-react";
import { Construction } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export function ComingSoon({
  title,
  description,
  icon: Icon = Construction,
}: {
  title: string;
  description: string;
  icon?: LucideIcon;
}) {
  return (
    <Card>
      <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
        <span className="flex size-12 items-center justify-center rounded-full bg-muted">
          <Icon className="size-6 text-muted-foreground" />
        </span>
        <div className="grid gap-1">
          <p className="font-medium">{title}</p>
          <p className="max-w-sm text-sm text-muted-foreground">{description}</p>
        </div>
        <p className="text-xs text-muted-foreground">Part of the next build pass — not wired up yet.</p>
      </CardContent>
    </Card>
  );
}
