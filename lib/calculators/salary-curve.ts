// Real careers rarely grow at one constant % forever. This generates a
// year-by-year hike schedule for a handful of common lifetime-compensation
// shapes, so the EPF projection can model something closer to how basic
// salary actually moves instead of a single flat compounding rate applied
// for decades straight.

export type SalaryCurveType = "steady" | "scurve" | "step" | "peak";

export interface SalaryCurveParams {
  type: SalaryCurveType;
  /** Meaning depends on `type`: steady = flat annual %, scurve = early-career %,
   *  step = promotion jump size %, peak = pre-peak annual growth %. */
  rate: number;
  /** scurve only — years until growth decays down to the inflation-level floor. */
  plateauYears?: number;
  /** step only — years between promotion jumps. */
  stepIntervalYears?: number;
  /** peak only — years until earnings peak, after which they decline. */
  peakYears?: number;
}

// Once an S-curve career flattens out, raises don't stop entirely — they
// settle near a typical cost-of-living/inflation-linked increment.
const SCURVE_FLOOR_PCT = 2;

/**
 * One entry per work anniversary: index 0 is the raise applied at the start
 * of year 2 (1 year of service completed), index 1 at year 3, and so on —
 * matching how computeEpf's loop fires a hike on each 12-month boundary.
 */
export function buildHikeSchedule(params: SalaryCurveParams, years: number): number[] {
  const n = Math.max(0, Math.ceil(years) - 1);
  const schedule: number[] = [];
  for (let k = 0; k < n; k++) {
    schedule.push(hikeForYear(params, k + 1));
  }
  return schedule;
}

// One fixed, illustrative parameter set per shape — used only to draw a
// preview curve (e.g. a sparkline next to each option in a picker), which
// needs a shape regardless of whatever the user's own sliders are
// currently set to.
const PREVIEW_PARAMS: Record<SalaryCurveType, SalaryCurveParams> = {
  steady: { type: "steady", rate: 8 },
  scurve: { type: "scurve", rate: 12, plateauYears: 10 },
  step: { type: "step", rate: 25, stepIntervalYears: 3 },
  peak: { type: "peak", rate: 10, peakYears: 15 },
};

/** A normalized salary index over `years` (starting at 1), tracing the shape of one curve type for preview purposes. */
export function previewCurvePath(type: SalaryCurveType, years = 30): number[] {
  const schedule = buildHikeSchedule(PREVIEW_PARAMS[type], years);
  const path = [1];
  let value = 1;
  for (const hikePct of schedule) {
    value *= 1 + hikePct / 100;
    path.push(value);
  }
  return path;
}

function hikeForYear(params: SalaryCurveParams, yearsCompleted: number): number {
  switch (params.type) {
    case "steady":
      return params.rate;

    case "scurve": {
      const plateau = Math.max(1, params.plateauYears ?? 10);
      if (yearsCompleted >= plateau) return SCURVE_FLOOR_PCT;
      const decayed = params.rate - ((params.rate - SCURVE_FLOOR_PCT) * yearsCompleted) / plateau;
      return Math.max(SCURVE_FLOOR_PCT, decayed);
    }

    case "step": {
      const interval = Math.max(1, Math.round(params.stepIntervalYears ?? 3));
      return yearsCompleted % interval === 0 ? params.rate : 0;
    }

    case "peak": {
      const peak = Math.max(1, params.peakYears ?? 15);
      return yearsCompleted <= peak ? params.rate : -(params.rate / 2);
    }

    default:
      return 0;
  }
}
