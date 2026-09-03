"use client";

import * as React from "react";
import type { DropdownProps } from "react-day-picker";
import { ChevronDown, ChevronsLeft, ChevronsRight } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

// react-day-picker's dropdown captionLayout renders a native <select> by
// default. This replaces it with an Ant-Design-style grid picker (click the
// month/year label, pick from a grid) while still going through the same
// onChange(event) contract DayPicker expects — MonthsDropdown/YearsDropdown
// are documented override points for exactly this kind of replacement.
function fireChange(onChange: DropdownProps["onChange"], value: number) {
  onChange?.({ target: { value: String(value) } } as React.ChangeEvent<HTMLSelectElement>);
}

export function CalendarGridDropdown({ options, value, onChange }: DropdownProps) {
  const [open, setOpen] = React.useState(false);
  const opts = React.useMemo(() => options ?? [], [options]);
  const isYear = opts.length > 12;
  const numericValue = Number(value);
  const current = opts.find((o) => o.value === numericValue);

  const [decadeStart, setDecadeStart] = React.useState(() => Math.floor(numericValue / 10) * 10);

  // Re-center the decade page on the current value each time the popover
  // opens. Adjusting state while rendering (rather than in an effect) avoids
  // an extra render pass — see https://react.dev/learn/you-might-not-need-an-effect.
  const [prevOpen, setPrevOpen] = React.useState(open);
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open && isYear) setDecadeStart(Math.floor(numericValue / 10) * 10);
  }

  function select(v: number) {
    fireChange(onChange, v);
    setOpen(false);
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={isYear ? "Choose the year" : "Choose the month"}
          className="flex items-center gap-1 rounded-md px-1.5 py-0.5 text-sm font-medium tabular-nums hover:bg-accent"
        >
          {current?.label ?? value}
          <ChevronDown className="size-3.5 text-muted-foreground" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-52 gap-0 p-2" align="center">
        {isYear ? (
          <>
            <div className="mb-1.5 flex items-center justify-between px-0.5">
              <button
                type="button"
                aria-label="Previous decade"
                onClick={() => setDecadeStart((d) => d - 10)}
                className="rounded-md p-1 text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              >
                <ChevronsLeft className="size-4" />
              </button>
              <span className="text-xs font-medium text-muted-foreground">
                {decadeStart}–{decadeStart + 9}
              </span>
              <button
                type="button"
                aria-label="Next decade"
                onClick={() => setDecadeStart((d) => d + 10)}
                className="rounded-md p-1 text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              >
                <ChevronsRight className="size-4" />
              </button>
            </div>
            <div className="grid grid-cols-3 gap-1">
              {Array.from({ length: 12 }, (_, i) => decadeStart - 1 + i).map((y) => {
                const opt = opts.find((o) => o.value === y);
                const outside = y < decadeStart || y > decadeStart + 9;
                return (
                  <button
                    key={y}
                    type="button"
                    disabled={!opt || opt.disabled}
                    onClick={() => select(y)}
                    className={cn(
                      "rounded-md py-1.5 text-sm tabular-nums hover:bg-accent disabled:pointer-events-none disabled:opacity-40",
                      outside && "text-muted-foreground",
                      y === numericValue && "bg-primary text-primary-foreground hover:bg-primary"
                    )}
                  >
                    {y}
                  </button>
                );
              })}
            </div>
          </>
        ) : (
          <div className="grid grid-cols-3 gap-1">
            {opts.map((opt) => (
              <button
                key={opt.value}
                type="button"
                disabled={opt.disabled}
                onClick={() => select(opt.value)}
                className={cn(
                  "rounded-md py-1.5 text-sm hover:bg-accent disabled:pointer-events-none disabled:opacity-40",
                  opt.value === numericValue && "bg-primary text-primary-foreground hover:bg-primary"
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
