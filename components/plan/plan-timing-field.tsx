// The date/duration field — built on antd's actual DatePicker/RangePicker
// (not a lookalike), per the explicit ask. Three variants:
//   - "historical": <RangePicker />, unbounded — Historical mode needs
//     arbitrary past start dates for backtesting, and (since real data can
//     now project forward) arbitrary future end dates too.
//   - "advanced": <RangePicker /> with disabledDate rules (an investment
//     plan is forward-looking: no date before today, and the range can't
//     span more than 40 years from whichever start is picked) plus a
//     Year/Month/Day slider trio below as a second way to dial the same range.
//   - "simple": a single <DatePicker /> (same today-or-later rule) and one
//     whole-years slider — "20 years 3 months 7 days"-level precision is an
//     Advanced-only affordance.

"use client";

import dayjs, { type Dayjs } from "dayjs";
import { DatePicker } from "antd";

import { SliderField } from "@/components/plan/slider-field";
import { Label } from "@/components/ui/label";

const { RangePicker } = DatePicker;

const ISO = "YYYY-MM-DD";
const DISPLAY_FORMAT = "DD MMM YYYY";
const MAX_DURATION_YEARS = 40;
const PLAN_PRESET_YEARS = [5, 10, 15, 20, 25, 30, 40];

type Variant = "historical" | "simple" | "advanced";

interface Duration {
  years: number;
  months: number;
  days: number;
}

/** Calendar-exact breakdown of end-start into years/months/days. */
function decomposeDuration(start: Dayjs, end: Dayjs): Duration {
  const years = Math.max(0, end.diff(start, "year"));
  const afterYears = start.add(years, "year");
  const months = Math.max(0, end.diff(afterYears, "month"));
  const afterMonths = afterYears.add(months, "month");
  const days = Math.max(0, end.diff(afterMonths, "day"));
  return { years, months, days };
}

function formatDuration({ years, months, days }: Duration): string {
  const parts: string[] = [];
  if (years > 0) parts.push(`${years} yr${years === 1 ? "" : "s"}`);
  if (months > 0) parts.push(`${months} mo`);
  if (days > 0 || parts.length === 0) parts.push(`${days} day${days === 1 ? "" : "s"}`);
  return parts.join(" ");
}

function addDuration(start: Dayjs, d: Duration): Dayjs {
  return start.add(d.years, "year").add(d.months, "month").add(d.days, "day");
}

export function PlanTimingField({
  startDate,
  endDate,
  onChange,
  label = "Start date",
  variant = "historical",
}: {
  startDate: string;
  endDate: string;
  onChange: (startDate: string, endDate: string) => void;
  label?: string;
  /**
   * "historical": free past/future RangePicker, no bounds (backtesting).
   * "simple": single DatePicker (today+, capped 40yrs) + one year slider.
   * "advanced": RangePicker (today+, capped 40yrs) + Year/Month/Day sliders.
   */
  variant?: Variant;
}) {
  const isBounded = variant !== "historical";
  const start = dayjs(startDate, ISO);
  const end = dayjs(endDate, ISO);
  const today = dayjs().startOf("day");

  /** Clamps a candidate end date to this variant's max span from `s` (a no-op for Historical, which is unbounded). */
  function capEnd(s: Dayjs, candidate: Dayjs): Dayjs {
    if (!isBounded) return candidate;
    const cap = s.add(MAX_DURATION_YEARS, "year");
    return candidate.isAfter(cap) ? cap : candidate;
  }

  function disabledDate(current: Dayjs, info: { from?: Dayjs }): boolean {
    if (!isBounded || !current) return false;
    if (current.isBefore(today, "day")) return true;
    if (variant === "simple") return false; // duration is capped by the slider below instead.
    const anchor = info.from ?? start;
    return current.isAfter(anchor.add(MAX_DURATION_YEARS, "year"), "day");
  }

  if (variant === "simple") {
    const years = Math.max(1, end.diff(start, "year"));

    function handleDate(date: Dayjs | null) {
      if (!date) return;
      onChange(date.format(ISO), capEnd(date, date.add(years, "year")).format(ISO));
    }

    function handleYears(y: number) {
      onChange(startDate, capEnd(start, start.add(y, "year")).format(ISO));
    }

    return (
      <div className="grid gap-4">
        <div className="grid gap-1.5">
          <div className="flex items-baseline justify-between gap-2">
            {label && <Label>{label}</Label>}
            <p className="text-xs text-muted-foreground">Ends {end.format(DISPLAY_FORMAT)}</p>
          </div>
          <DatePicker
            value={start}
            onChange={handleDate}
            disabledDate={disabledDate}
            format={DISPLAY_FORMAT}
            className="w-full"
          />
        </div>
        <SliderField
          id="timing-years"
          label="Duration"
          value={years}
          onChange={handleYears}
          min={1}
          max={MAX_DURATION_YEARS}
          suffix="yrs"
          presets={PLAN_PRESET_YEARS.map((y) => ({ label: `${y} yrs`, value: y }))}
        />
      </div>
    );
  }

  function handleRange(dates: [Dayjs | null, Dayjs | null] | null) {
    if (!dates || !dates[0] || !dates[1]) return;
    onChange(dates[0].format(ISO), dates[1].format(ISO));
  }

  const duration = decomposeDuration(start, end);

  function commitDuration(next: Duration) {
    onChange(startDate, capEnd(start, addDuration(start, next)).format(ISO));
  }

  return (
    <div className="grid gap-4">
      <div className="grid gap-1.5">
        {label && <Label>{label}</Label>}
        <RangePicker
          value={[start, end]}
          onChange={handleRange}
          disabledDate={disabledDate}
          format={DISPLAY_FORMAT}
          className="w-full"
        />
      </div>

      {variant === "advanced" && (
        <div className="grid gap-3">
          <div className="flex items-baseline justify-between">
            <Label className="text-sm">Duration</Label>
            <p className="text-xs text-muted-foreground">{formatDuration(duration)}</p>
          </div>
          <SliderField
            id="timing-years-full"
            label="Years"
            value={duration.years}
            onChange={(y) => commitDuration({ ...duration, years: y })}
            min={0}
            max={MAX_DURATION_YEARS}
            size="sm"
          />
          <SliderField
            id="timing-months-full"
            label="Months"
            value={duration.months}
            onChange={(m) => commitDuration({ ...duration, months: m })}
            min={0}
            max={11}
            size="sm"
          />
          <SliderField
            id="timing-days-full"
            label="Days"
            value={duration.days}
            onChange={(d) => commitDuration({ ...duration, days: d })}
            min={0}
            max={30}
            size="sm"
          />
        </div>
      )}

      {variant === "historical" && (
        <p className="text-xs text-muted-foreground">
          <span className="font-medium text-foreground">{formatDuration(duration)}</span>
        </p>
      )}
    </div>
  );
}
