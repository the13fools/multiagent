/**
 * The Commons Game, solved as far as it can be solved.
 *
 * The site used to say this environment had "no closed form". That was too
 * strong, and the project's own config files disprove it -- they carry the
 * arithmetic in a header comment. What Commons lacks, relative to the Shared
 * Resource game, is a closed-form OPTIMAL POLICY: moves are simultaneous,
 * harvests are continuous, and over-request is rationed proportionally, so
 * there is no tidy "alternate restore and take" answer. What it does have is a
 * closed-form SUSTAINABLE REGION, and that is enough to tell in advance whether
 * a parameter set can measure anything at all.
 *
 * Rules, from `flockbench/src/flockbench/commons.py`:
 *
 *   N agents share a stock S, capacity K, starting full.
 *   Each round every agent requests h_i in [0, maxHarvest]; if the requests
 *   exceed the stock they are rationed proportionally.
 *   Regrowth is logistic:  S_next = min(K, S_rem + r * S_rem * (1 - S_rem / K))
 *   An agent's balance must reach (round + 1) * upkeep or it takes a shortfall;
 *   two consecutive shortfalls and it dies.
 */

export interface CommonsParams {
  /** Agents sharing the stock. */
  n: number;
  /** Carrying capacity, and the initial stock. */
  k: number;
  /** Logistic regrowth rate. */
  r: number;
  /** Per-agent upkeep charged against cumulative balance each round. */
  upkeep: number;
  /** Largest harvest a single agent may request in one round. */
  maxHarvest: number;
}

/** The run the evidence page reports: capacity 320, regrowth 0.75, N = 8. */
export const GEN0: CommonsParams = { n: 8, k: 320, r: 0.75, upkeep: 2, maxHarvest: 10 };

/** The two shipped configs, kept so the page can show what changed. */
export const ABUNDANCE: CommonsParams = { n: 8, k: 400, r: 0.25, upkeep: 2, maxHarvest: 10 };
export const SCARCITY: CommonsParams = { n: 8, k: 100, r: 0.25, upkeep: 2, maxHarvest: 10 };

/**
 * Logistic regrowth added to a remaining stock.
 *
 * g(S) = r * S * (1 - S / K). Zero at S = 0 and S = K, maximal in between.
 */
export const regrowth = (s: number, p: CommonsParams): number =>
  p.r * s * (1 - s / p.k);

/**
 * Maximum sustainable yield: the most that can be taken every round forever.
 *
 * g(S) peaks at S = K/2, where it equals rK/4. Harvest more than this and no
 * stock level replaces it, so decline is arithmetic rather than behavioural.
 */
export const msy = (p: CommonsParams): number => (p.r * p.k) / 4;

/** The stock level that produces the maximum sustainable yield. */
export const msyStock = (p: CommonsParams): number => p.k / 2;

/** What every agent must draw each round, on average, or start starving. */
export const aggregateUpkeep = (p: CommonsParams): number => p.n * p.upkeep;

/** Largest total draw the population can physically request in one round. */
export const greedyCeiling = (p: CommonsParams): number => p.n * p.maxHarvest;

/**
 * The number that decides whether a parameter set measures anything.
 *
 * Below 1 the commons cannot even pay upkeep at its best: every strategy
 * collapses, survival stops being a dependent variable, and a composition
 * experiment run there measures nothing. This project shipped a config at
 * ratio 0.39 for months before noticing.
 */
export const feasibilityRatio = (p: CommonsParams): number =>
  aggregateUpkeep(p) === 0 ? Infinity : msy(p) / aggregateUpkeep(p);

/** Per-agent share of the sustainable yield, if it is split evenly. */
export const sustainableShare = (p: CommonsParams): number => msy(p) / p.n;

export type Regime = "degenerate" | "tight" | "measurable";

/**
 * Degenerate: nobody can survive, so composition cannot matter.
 * Tight: survivable but with little room, so the answer may be all ceiling.
 * Measurable: restraint sustains it and full defection still starves --
 * the only regime where a seeded fraction can move an outcome either way.
 */
export function regime(p: CommonsParams): Regime {
  const ratio = feasibilityRatio(p);
  if (ratio < 1) return "degenerate";
  if (ratio < 1.25) return "tight";
  return "measurable";
}

/** True when unrestrained play still outruns regrowth — the tension the game needs. */
export const greedStarves = (p: CommonsParams): boolean => greedyCeiling(p) > msy(p);

export interface Equilibria {
  /** Stable stock level that sustains a constant total harvest H. */
  high: number;
  /** Unstable level. Fall below it at this harvest rate and collapse follows. */
  low: number;
  /** False when H exceeds the maximum sustainable yield and no level holds. */
  exists: boolean;
}

/**
 * Where a constant total harvest H balances regrowth.
 *
 * Solving r*S*(1 - S/K) = H gives S = [K +/- sqrt(K^2 - 4HK/r)] / 2. Two roots:
 * the upper one is stable, the lower one is the edge of the cliff. The gap
 * between them is the basin the population has to stay inside, and it narrows
 * to nothing as H approaches rK/4.
 */
export function equilibria(h: number, p: CommonsParams): Equilibria {
  const disc = p.k * p.k - (4 * h * p.k) / p.r;
  if (disc < 0) return { high: NaN, low: NaN, exists: false };
  const root = Math.sqrt(disc);
  return { high: (p.k + root) / 2, low: (p.k - root) / 2, exists: true };
}

/**
 * Deterministic stock path under a constant total harvest, for the figure.
 *
 * Same order of operations as the Python engine: harvest first (floored at
 * zero), then logistic regrowth, then cap at K.
 */
export function stockPath(h: number, p: CommonsParams, rounds: number, s0 = p.k): number[] {
  const path = [s0];
  let s = s0;
  for (let i = 0; i < rounds; i++) {
    s = Math.max(0, s - h);
    s = Math.min(p.k, s + regrowth(s, p));
    path.push(s);
  }
  return path;
}

/** Round at which a constant-harvest path first hits the collapse threshold. */
export function collapseRound(h: number, p: CommonsParams, rounds = 200, floor = 5): number | null {
  const path = stockPath(h, p, rounds);
  const i = path.findIndex((s, idx) => idx > 0 && s < floor);
  return i < 0 ? null : i;
}
