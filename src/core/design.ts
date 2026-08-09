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
  // Environment x resource-regime strata. The two core environments are the
  // SHARED RESOURCE game, which has a closed form and therefore an answer key,
  // and COMMONS HARVEST, which does not but is where the Stage 0 language-model
  // pilots actually ran. Running only the solvable one invites the objection
  // that the result is an artifact of solvability; running only the realistic
  // one is what makes collective failures unattributable everywhere else.
  // Crossed with two regimes (zero slack, positive slack). The unwinnable
  // regime is a control, not a stratum, and the tool-mediated key-value store
  // is a separately budgeted boundary test rather than one of the core two.
  environments: 4,
  fractions: 6,
  arms: 2,
  salt: 2,
  // 2 salt x 35 seeds = 70 paired cells per contrast, against the 69 the
  // margin requires. Sized to clear the requirement, not to look large.
  seeds: 35,
  // A budget rate, not a measurement: the pilot's per-cell time predates the
  // deliberation span, and Phase 0 measures it. Price is Lambda's on-demand
  // 40GB A100 rate, checked August 2026.
  hoursPerCell: 1.0,
  pricePerHour: 1.99,
};

export const cells = (d: Design): number =>
  d.families * d.environments * d.fractions * d.arms * d.salt * d.seeds;

export const gpuHours = (d: Design): number => cells(d) * d.hoursPerCell;

export const cost = (d: Design): number => gpuHours(d) * d.pricePerHour;

/** Paired cells per contrast: one baseline run and one candidate run. */
export const pairedCells = (d: Design): number => d.salt * d.seeds;

/** Total paired comparisons in the campaign — half the cells, by definition. */
export const pairedComparisons = (d: Design): number => cells(d) / 2;

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

/* ---------------------------------------------------------------------------
 * What happens to the budget when the variance moves.
 *
 * The proposal promises a fixed envelope and an ORDERED descope: if Phase 0
 * measures worse variance than the pilot, named things get dropped in a stated
 * sequence rather than the ask going up. That promise is cheap to write and
 * hard to believe, so the arithmetic behind it lives here and the page runs it.
 *
 * The requirement grows with the SQUARE of the SD-to-margin ratio, so this is
 * not a gentle slope. It is the reason Phase 0 comes before the powered spend.
 * ------------------------------------------------------------------------- */

/** Core cells added per extra seed: families x strata x fractions x salt x arms. */
export const CORE_CELLS_PER_SEED = 2 * 4 * 6 * 2 * 2;

/** Seeds in the reference core, and the paired cells per contrast they buy. */
export const CORE_SEEDS = REFERENCE_DESIGN.seeds;

export interface DescopeLine {
  name: string;
  hours: number;
  why: string;
}

/**
 * Dropped in this order, declared in advance so the choice is not made later
 * by whoever is holding the budget.
 */
export const DESCOPE_ORDER: readonly DescopeLine[] = [
  { name: "Contingency reserve", hours: 2709, why: "Held for exactly this. Spent before anything scientific is cut." },
  { name: "N = 50 replication", hours: 1500, why: "The largest population check. Costs the most per answer and N = 20 still tests whether f* moves with size." },
  { name: "Unwinnable-regime control", hours: 480, why: "The impossible-regime arm. Valuable, but the closed form already tells us no policy survives there." },
  { name: "Two non-informative fraction points", hours: 2240, why: "Sweep resolution, not sweep range. The curve keeps its endpoints and loses detail in the middle." },
] as const;

export const descopeBudget = (): number =>
  DESCOPE_ORDER.reduce((total, line) => total + line.hours, 0);

export interface DescopePlan {
  /** Paired cells per contrast the margin now demands. */
  need: number;
  /** Seeds required to reach it, given two salt levels. */
  seeds: number;
  /** Extra GPU-hours the core needs beyond the reference design. */
  extraHours: number;
  /** Lines given up, in the declared order, until the extra is paid for. */
  dropped: DescopeLine[];
  /** Hours still missing after everything droppable is gone. */
  shortfall: number;
  /** False means the campaign must be redesigned, not squeezed. */
  fits: boolean;
}

export function descopePlan(marginDelta: number, pairedSd: number): DescopePlan {
  const need = requiredN(marginDelta, pairedSd);
  if (!Number.isFinite(need)) {
    return { need, seeds: Infinity, extraHours: Infinity, dropped: [...DESCOPE_ORDER],
             shortfall: Infinity, fits: false };
  }
  const seeds = Math.ceil(need / REFERENCE_DESIGN.salt);
  const extraHours = Math.max(0, (seeds - CORE_SEEDS) * CORE_CELLS_PER_SEED *
    REFERENCE_DESIGN.hoursPerCell);

  const dropped: DescopeLine[] = [];
  let remaining = extraHours;
  for (const line of DESCOPE_ORDER) {
    if (remaining <= 0) break;
    dropped.push(line);
    remaining -= line.hours;
  }
  return { need, seeds, extraHours, dropped, shortfall: Math.max(0, remaining),
           fits: remaining <= 0 };
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
