"use client";

import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { SliderField } from "@/components/plan/slider-field";

export function ToggleSliderField({
  id,
  title,
  description,
  valueLabel,
  enabled,
  onEnabledChange,
  value,
  onValueChange,
  min,
  max,
  step = 1,
  suffix = "%",
}: {
  id: string;
  title: string;
  description?: string;
  valueLabel: string;
  enabled: boolean;
  onEnabledChange: (enabled: boolean) => void;
  value: number;
  onValueChange: (value: number) => void;
  min: number;
  max: number;
  step?: number;
  suffix?: string;
}) {
  return (
    <div className="grid min-w-0 gap-3">
      <div className="flex min-w-0 items-center justify-between gap-3">
        <div className="min-w-0">
          <Label htmlFor={id} className="text-sm font-medium">
            {title}
          </Label>
          {description && <p className="text-xs text-muted-foreground">{description}</p>}
        </div>
        <Switch id={id} checked={enabled} onCheckedChange={onEnabledChange} className="shrink-0" />
      </div>
      {enabled && (
        <SliderField
          id={`${id}-value`}
          label={valueLabel}
          value={value}
          onChange={onValueChange}
          min={min}
          max={max}
          step={step}
          suffix={suffix}
          size="sm"
        />
      )}
    </div>
  );
}
