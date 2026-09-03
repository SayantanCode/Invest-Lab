// A flat national-average default is unrealistic either way — too low for
// Mumbai/Delhi, too high for a Tier-2 town. This is a small, explicit,
// hand-maintained multiplier table (no live pricing feed, no backend) that
// nudges the location-sensitive goal presets toward something plausible for
// where the user actually lives. Existing preset amounts in goal-presets.ts
// already sit at a reasonable Tier-2 baseline, so that tier gets 1.0x and
// every goal saved before this feature existed is completely unaffected.

export type CityTier = "metro-premium" | "metro" | "affordable-metro" | "tier2-3";

export interface CityOption {
  key: string;
  label: string;
  tier: CityTier;
}

export const CITIES: CityOption[] = [
  { key: "mumbai", label: "Mumbai", tier: "metro-premium" },
  { key: "delhi-ncr", label: "Delhi NCR", tier: "metro-premium" },
  { key: "bengaluru", label: "Bengaluru", tier: "metro" },
  { key: "pune", label: "Pune", tier: "metro" },
  { key: "hyderabad", label: "Hyderabad", tier: "metro" },
  { key: "chennai", label: "Chennai", tier: "metro" },
  { key: "kolkata", label: "Kolkata", tier: "affordable-metro" },
  { key: "ahmedabad", label: "Ahmedabad", tier: "affordable-metro" },
  { key: "other", label: "Other city / town", tier: "tier2-3" },
];

const TIER_MULTIPLIER: Record<CityTier, number> = {
  "metro-premium": 1.6,
  metro: 1.15,
  "affordable-metro": 0.85,
  "tier2-3": 0.65,
};

/** Only these are meaningfully driven by local real-estate/vehicle-market economics — education, retirement, travel etc. stay at their national-average default. */
export const LOCATION_SENSITIVE_PRESET_KEYS = new Set(["home", "vehicle", "marriage"]);

export function getCity(cityKey: string | undefined): CityOption | undefined {
  return CITIES.find((c) => c.key === cityKey);
}

export function cityMultiplier(cityKey: string | undefined): number {
  const city = getCity(cityKey);
  return city ? TIER_MULTIPLIER[city.tier] : 1;
}
