// Client for mfapi.in — a free, no-key community wrapper over AMFI's daily
// NAV data (CORS-open, verified directly against the live API). See the
// InvestLab research doc, Section 9, for why this is the MVP data source
// and what its limitations are (single-maintainer, no SLA).
//
// Data is not redistributed or cached server-side here — every fetch goes
// straight from the visitor's browser to mfapi.in, matching the "personal,
// non-commercial use" posture the underlying AMFI terms call for.

import type { NavPoint } from "@/lib/engine";

const BASE_URL = "https://api.mfapi.in/mf";

export interface SchemeListItem {
  schemeCode: number;
  schemeName: string;
}

export interface SchemeNavData {
  schemeCode: number;
  schemeName: string;
  fundHouse: string;
  navs: NavPoint[]; // ascending by date
}

// Session-lifetime caches only — the scheme list is ~5-6MB, too large to
// justify persisting in localStorage. One re-fetch per fresh page load is an
// acceptable cost for a feature used only when someone opens fund search.
let schemeListCache: Promise<SchemeListItem[]> | null = null;
const navCache = new Map<number, Promise<SchemeNavData>>();

export function fetchSchemeList(): Promise<SchemeListItem[]> {
  if (!schemeListCache) {
    schemeListCache = fetch(BASE_URL)
      .then((res) => {
        if (!res.ok) throw new Error(`mfapi.in scheme list failed: ${res.status}`);
        return res.json();
      })
      .then((data: { schemeCode: number; schemeName: string }[]) =>
        data.map((d) => ({ schemeCode: d.schemeCode, schemeName: d.schemeName }))
      )
      .catch((err) => {
        schemeListCache = null; // allow retry on next call
        throw err;
      });
  }
  return schemeListCache;
}

function parseMfapiDate(d: string): string {
  // mfapi.in dates are "DD-MM-YYYY"
  const [dd, mm, yyyy] = d.split("-");
  return `${yyyy}-${mm}-${dd}`;
}

export function fetchSchemeNav(schemeCode: number): Promise<SchemeNavData> {
  const cached = navCache.get(schemeCode);
  if (cached) return cached;

  const promise = fetch(`${BASE_URL}/${schemeCode}`)
    .then((res) => {
      if (!res.ok) throw new Error(`mfapi.in NAV history failed: ${res.status}`);
      return res.json();
    })
    .then(
      (data: {
        meta: { scheme_name: string; fund_house: string };
        data: { date: string; nav: string }[];
      }) => {
        const navs: NavPoint[] = data.data
          .map((d) => ({ date: parseMfapiDate(d.date), nav: Number(d.nav) }))
          .filter((p) => Number.isFinite(p.nav) && p.nav > 0)
          .sort((a, b) => a.date.localeCompare(b.date));
        return {
          schemeCode,
          schemeName: data.meta.scheme_name,
          fundHouse: data.meta.fund_house,
          navs,
        };
      }
    )
    .catch((err) => {
      navCache.delete(schemeCode);
      throw err;
    });

  navCache.set(schemeCode, promise);
  return promise;
}
