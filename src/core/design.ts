/**
 * Campaign arithmetic.
 *
 * Two questions decide whether a multi-agent experiment is worth running, and
 * both are arithmetic that nobody shows:
 *
 *   1. How many cells does this design cost?
 *   2. How many does it need to detect the effect you care about?
 *
 * A design where (1) is affordable and (2) is larger produces a null you cannot
 * interpret -- the most common way compute gets spent for nothing. Putting both
 * on one page, wired to the same dials, makes the trade visible: raise the
 * seeds, watch the cost; lower the margin, watch the requirement outrun it.
 *
 * These are the same formulas the proposal's budget section uses.
 */

export interface Design {
  families: number;      // model families
  environments: number;
  fractions: number;     // seeded fractions swept
  arms: number;          // baseline and candidate
  salt: number;          // role-mapping salt levels
  seeds: number;         // seeds per configuration
  hoursPerCell: number;
  pricePerHour: number;
}

export const REFERENCE_DESIGN: Design = {
  families: 2,
  environments: 4,
  fractions: 8,
  arms: 2,
  salt: 2,
  seeds: 69,
  hoursPerCell: 1.5,
  pricePerHour: 1.39,
};

export const cells = (d: Design): number =>
  d.families * d.environments * d.fractions * d.arms * d.salt * d.seeds;

export const gpuHours = (d: Design): number => cells(d) * d.hoursPerCell;

export const cost = (d: Design): number => gpuHours(d) * d.pricePerHour;

/** Paired cells per contrast: one baseline run and one candidate run. */
export const pairedCells = (d: Design): number => d.salt * d.seeds;

/**
 * Sample size for a paired comparison at 80% power, 5% two-sided.
 *
 * n = (z(1-α/2) + z(1-β))² · (SD/Δ)², which is 7.849·(SD/Δ)² at those levels.
 * The only thing that matters is the RATIO: doubling both the margin and the
 * standard deviation leaves the requirement untouched, which is exactly the
 * mistake the budget nearly shipped when the welfare scale moved and the margin
 * did not.
 */
export const Z_FACTOR = 7.849;

export const requiredN = (marginDelta: number, pairedSd: number): number =>
  marginDelta <= 0 ? Infinity : Math.ceil(Z_FACTOR * (pairedSd / marginDelta) ** 2);

/** Smallest detectable effect if you can only afford `n` paired cells. */
export const detectableEffect = (n: number, pairedSd: number): number =>
  n <= 0 ? Infinity : pairedSd * Math.sqrt(Z_FACTOR / n);

export interface Verdict {
  cells: number;
  paired: number;
  need: number;
  gpuHours: number;
  cost: number;
  /** true when the campaign can actually see the effect it is sized for */
  powered: boolean;
}

export function evaluate(d: Design, marginDelta: number, pairedSd: number): Verdict {
  const need = requiredN(marginDelta, pairedSd);
  return {
    cells: cells(d),
    paired: pairedCells(d),
    need,
    gpuHours: gpuHours(d),
    cost: cost(d),
    powered: pairedCells(d) >= need,
  };
}

/**
 * The controls that make a cell interpretable.
 *
 * Kept as data rather than prose because the page renders them and the test
 * asserts none of them quietly disappears. Every one of these exists because a
 * specific alternative explanation would otherwise survive.
 */
export const CONTROLS: { name: string; against: string; how: string }[] = [
  {
    name: "A/A at f = 0",
    against: "The gate rejects things for no reason and nobody notices",
    how: "At a seeded fraction of zero the two arms describe the same population, so every difference is noise and every rejection is a false one. Gives a measured error rate rather than an assumed one.",
  },
  {
    name: "Mimic arm",
    against: "The effect is the specification's vocabulary, not its content",
    how: "An arm carrying the specification's wording with its decision rules stripped. If seeded and mimic are indistinguishable, the effect was style.",
  },
  {
    name: "Style positive control",
    against: "Training silently installed nothing, making every null uninterpretable",
    how: "Train toward something objectively checkable and behaviourally irrelevant — write the reasoning in snake_case. Conformance is a regex. If the adapter does not produce it, the channel is broken.",
  },
  {
    name: "Known-bad candidate",
    against: "A gate that promotes everything looks like a gate that works",
    how: "Push the style far off-distribution until competence degrades. A gate that promotes that candidate has rejections that mean nothing.",
  },
  {
    name: "Unwinnable condition",
    against: "Cheerful cooperation is scored as competence",
    how: "Parameters where slack is negative and no policy survives. The correct behaviour is to recognise futility, which is checkable without a judge.",
  },
  {
    name: "Two model families",
    against: "The result is a fact about one model",
    how: "One dense and one mixture-of-experts, served through the same interface, with the disagreement reported rather than averaged away.",
  },
];
