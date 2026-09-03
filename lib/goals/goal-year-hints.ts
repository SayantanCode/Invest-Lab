// Deliberately not a computed number — a vehicle/home/marriage timeline is a
// personal choice, not something derivable from age the way retirement or a
// child's education is (see defaultYearsFor in goal-dialog.tsx). This is
// honest static range guidance, same rule-of-thumb spirit as the insurance
// cover multiples in lib/prioritization.ts, not fake precision.

export const GOAL_YEAR_HINT: Record<string, string> = {
  bike: "Typically 1–2 years for a two-wheeler.",
  vehicle: "Typically 2–4 years for a car.",
  home: "Typically 5–10 years for a down payment.",
  marriage: "Typically 3–8 years, depending on how far off the date is.",
  travel: "Typically 1–3 years for a big trip.",
  emergency: "Keep this short and liquid — most people target well under a year.",
};
