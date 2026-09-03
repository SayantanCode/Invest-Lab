// One place for everything SEO/metadata touches — title, description, and
// the site's real deployed URL, which og/twitter tags, the sitemap, robots.txt,
// and the JSON-LD block all need as an absolute base. Set NEXT_PUBLIC_SITE_URL
// in production (Vercel) to the real domain once it's known; falls back to
// localhost for dev so none of this breaks before that's set.

export const SITE_NAME = "InvestLab";
export const SITE_TITLE = "InvestLab — Model your money before you invest it";
export const SITE_DESCRIPTION =
  "A free, transparent investment simulation and planning tool for Indian retail investors — SIP, EMI, PPF, NPS, retirement and 15+ other calculators, goal planning, and real historical fund backtesting. No signup required to try it.";
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3001").replace(/\/$/, "");
