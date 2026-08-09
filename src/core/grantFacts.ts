/** Canonical public facts shared by the grant-reviewer v2 pages. */
export const GRANT_FACTS = {
  tier: "Tier 1",
  durationMonths: 18,
  /** Funded full-time build; the remaining 6 months are analysis at 0.4 FTE. */
  buildMonths: 12,
  totalRequest: 275_000,
  directCosts: 250_000,
  indirectCosts: 25_000,
  aaCampaigns: 30,
  pairsPerCampaign: 60,
  aaStrata: 4,
  aaUpperBound: 0.095,
  cells: 6_720,
  pairedComparisons: 3_360,
  pairsPerContrast: 70,
  horizon: 200,
  populationSizes: [8, 20, 50] as const,
} as const;

export type GrantFact = keyof typeof GRANT_FACTS;

export const formatUsd = (value: number): string =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);

export const formatInteger = (value: number): string =>
  new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(value);

export const formatPercent = (value: number): string =>
  new Intl.NumberFormat("en-US", {
    style: "percent",
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(value);
