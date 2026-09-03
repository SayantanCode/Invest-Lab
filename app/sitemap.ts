import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site-config";

// Two real routes exist to list — every other "page" (calculators, Goal
// Planner, Net Worth, etc.) is client-side view state inside "/" (app/page.tsx's
// `view` union), not a distinct server route a crawler could index separately.
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: SITE_URL,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: `${SITE_URL}/privacy`,
      lastModified: new Date(),
      changeFrequency: "yearly",
      priority: 0.3,
    },
  ];
}
