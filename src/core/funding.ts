/**
 * A planning interpolation between the three funding scopes used on the site.
 *
 * This is deliberately not a burn-rate model. The $200 anchor includes donated
 * research time, while the two funded anchors describe programmes that pay for
 * sustained work. The interpolation only makes the proposed change in scope
 * visible; it must not be read as a wage or compute quote.
 */
export interface FundingAnchor {
  position: number;
  budget: number;
  months: number;
  scale: string;
}

export const FUNDING_ANCHORS: readonly FundingAnchor[] = [
  { position: 0, budget: 200, months: 1, scale: "prototype" },
  { position: 50, budget: 300_000, months: 12, scale: "programme" },
  { position: 100, budget: 1_000_000, months: 24, scale: "small team" },
];

export interface FundingScenario {
  position: number;
  budget: number;
  months: number;
  lower: FundingAnchor;
  upper: FundingAnchor;
}

/** Piecewise-linear so all three declared anchors remain exact and reachable. */
export function interpolateFunding(position: number): FundingScenario {
  const p = Math.max(0, Math.min(100, position));
  const lower = p <= 50 ? FUNDING_ANCHORS[0]! : FUNDING_ANCHORS[1]!;
  const upper = p <= 50 ? FUNDING_ANCHORS[1]! : FUNDING_ANCHORS[2]!;
  const t = (p - lower.position) / (upper.position - lower.position);

  return {
    position: p,
    budget: lower.budget + (upper.budget - lower.budget) * t,
    months: lower.months + (upper.months - lower.months) * t,
    lower,
    upper,
  };
}
