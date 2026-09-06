"use client";

import * as React from "react";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

export function SliderField({
  id,
  label,
  value,
  onChange,
  min,
  max,
  step = 1,
  prefix,
  suffix,
  presets,
  size = "default",
}: {
  id: string;
  label: string;
  value: number;
  onChange: (value: number) => void;
  min: number;
  max: number;
  step?: number;
  prefix?: string;
  suffix?: string;
  presets?: { label: string; value: number }[];
  size?: "default" | "sm";
}) {
  return (
    <div className="grid min-w-0 gap-2.5">
      <div className="flex items-center justify-between gap-3">
        <Label
          htmlFor={id}
          className={cn(
            "whitespace-normal wrap-break-word",
            size === "sm" && "text-xs text-muted-foreground"
          )}
        >
          {label}
        </Label>
        <div className="flex shrink-0 items-center gap-1 rounded-md border border-input bg-transparent px-1.5 focus-within:border-ring focus-within:ring-[3px] focus-within:ring-ring/50">
          {prefix && <span className="text-xs text-muted-foreground">{prefix}</span>}
          <Input
            id={id}
            type="number"
            min={min}
            max={max}
            step={step}
            value={value}
            onChange={(e) => {
              const n = Number(e.target.value);
              if (!Number.isNaN(n)) onChange(n);
            }}
            className="h-7 w-20 border-0 px-1 text-right font-mono tabular-nums shadow-none focus-visible:ring-0"
          />
          {suffix && <span className="text-xs text-muted-foreground">{suffix}</span>}
        </div>
      </div>
      <Slider
        value={[value]}
        min={min}
        max={max}
        step={step}
        onValueChange={([v]) => onChange(v)}
        aria-label={label}
      />
      {presets && (
        <div className="flex flex-wrap gap-1.5">
          {presets.map((p) => (
            <button
              key={p.label}
              type="button"
              onClick={() => onChange(p.value)}
              className={cn(
                "rounded-full border px-2.5 py-0.5 text-xs transition-colors",
                value === p.value
                  ? "border-primary bg-primary/10 text-primary font-medium"
                  : "border-input text-muted-foreground hover:bg-muted"
              )}
            >
              {p.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}