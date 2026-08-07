/**
 * Judge-free promotion gates, and why the obvious ones do not work.
 *
 * A promotion gate decides whether a candidate agent population may replace a
 * baseline, from matched paired cells and nothing else -- no model scores the
 * result. The question this module answers is: how often does a given gate roll
 * back a candidate that is IDENTICAL to its baseline?
 *
 * That number should be small. For the two obvious constructions it is 1.000.
 *
 *   OVERLAP RULES -- "no more than 25% of matched cells may regress", "the
 *   candidate must win at least half the pairs". These bound the proportion of
 *   individual pairs going one way, and under the null that proportion
 *   converges to 0.5. So the bound is not merely violated, it is violated MORE
 *   RELIABLY as the campaign grows. Collecting more evidence makes the gate
 *   worse, which is the opposite of how a test behaves.
 *
 *   SUPERIORITY -- "the mean must improve, significantly". Correctly sized, and
 *   wrong for the job: it demands a significant improvement in order to
 *   promote, so a clone fails by construction at every sample size.
 *
 *   NON-INFERIORITY -- "roll back only if the candidate is worse by more than a
 *   margin we stated in advance". This one works: false rejection falls with n
 *   while detection rises.
 *
 * The error in the first two is conceptual, not statistical. A promotion gate
 * asks whether a swap is safe to ship, not whether the candidate is better.
 * Only the second question makes an identical clone a failure.
 *
 * Ported from `flockbench/tools/aa_calibrate.py`; the test suite pins the two.
 */

export interface Rule {
  /** Required mean improvement. NEGATIVE makes it a tolerated-harm margin. */
  minMeanImprovement: number;
  /** Fraction of pairs the candidate must win. An overlap rule. */
  minWinRate: number;
  /** Fraction of pairs allowed to regress. An overlap rule. */
  maxRegressionRate: number;
  /** One-sided binomial test on the win rate. Null disables it. */
  maxPValue: number | null;
}

export const POLICIES: Record<string, { label: string; rule: Rule; note: string }> = {
  overlap: {
    label: "Overlap rules (the pilot's gate)",
    rule: { minMeanImprovement: 0, minWinRate: 0.5, maxRegressionRate: 0.25, maxPValue: null },
    note: "Bounds a proportion that converges to 0.5 under the null, so it gets worse with more data.",
  },
  superiority: {
    label: "Significance test (the obvious fix)",
    rule: { minMeanImprovement: 0, minWinRate: 0, maxRegressionRate: 1, maxPValue: 0.05 },
    note: "Demands a significant improvement to promote, so a clone fails by construction.",
  },
  nonInferiority: {
    label: "Non-inferiority with a stated margin",
    rule: { minMeanImprovement: -400, minWinRate: 0, maxRegressionRate: 1, maxPValue: null },
    note: "Rolls back only on harm beyond a margin fixed in advance. False rejection falls with n.",
  },
};

/** Stage Zero pilot: paired standard deviation of the welfare difference. */
export const PILOT_SD = 1180;
/** Stage Zero pilot: baseline mean welfare, for expressing margins as a share. */
export const PILOT_BASELINE = 3363;

/** One-sided binomial tail P(X >= k) at p = 0.5, exact for the n we use. */
export function binomialTail(k: number, n: number): number {
  if (n === 0) return 1;
  let logC = 0;
  let total = 0;
  for (let i = 0; i <= n; i++) {
    if (i > 0) logC += Math.log((n - i + 1) / i);
    if (i >= k) total += Math.exp(logC - n * Math.LN2);
  }
  return Math.min(1, total);
}

/** Apply a rule to a set of paired differences (candidate minus baseline). */
export function rejects(deltas: number[], rule: Rule): boolean {
  const n = deltas.length;
  if (n === 0) return true;
  const mean = deltas.reduce((a, b) => a + b, 0) / n;
  const wins = deltas.filter((d) => d > 0).length;
  const regressions = deltas.filter((d) => d < 0).length;

  if (mean < rule.minMeanImprovement) return true;
  if (wins / n < rule.minWinRate) return true;
  if (regressions / n > rule.maxRegressionRate) return true;
  if (rule.maxPValue !== null && binomialTail(wins, n) > rule.maxPValue) return true;
  return false;
}

/** Deterministic normal deviates, so a figure is reproducible. */
function makeRng(seed: number): () => number {
  let s = seed >>> 0 || 1;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    const u = (s + 0.5) / 4294967296;
    s = (s * 1664525 + 1013904223) >>> 0;
    const v = (s + 0.5) / 4294967296;
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  };
}

/**
 * Memoised, because the UI asks for the same points repeatedly.
 *
 * Without this, a figure redraw cost 1.7s and a gate-lab redraw 2.2s -- and both
 * were wired to `input`, which a slider fires about thirty times per drag. The
 * page did not look wrong so much as dead.
 */
const cache = new Map<string, number>();

export function rejectionRate(
  rule: Rule, n: number, effect = 0, trials = 3000, sd = PILOT_SD, seed = 7,
): number {
  const key = `${rule.minMeanImprovement}|${rule.minWinRate}|${rule.maxRegressionRate}|${rule.maxPValue}|${n}|${effect}|${trials}|${sd}|${seed}`;
  const hit = cache.get(key);
  if (hit !== undefined) return hit;
  const v = computeRejectionRate(rule, n, effect, trials, sd, seed);
  cache.set(key, v);
  return v;
}

/**
 * P(roll back) at sample size `n` when the candidate's true effect is `effect`.
 * `effect = 0` is the A/A case: the candidate is a clone of its baseline, and
 * this number is the gate's false-rejection rate.
 */
function computeRejectionRate(
  rule: Rule,
  n: number,
  effect = 0,
  trials = 3000,
  sd = PILOT_SD,
  seed = 7,
): number {
  const rng = makeRng(seed);
  let rejected = 0;
  for (let t = 0; t < trials; t++) {
    const deltas = Array.from({ length: n }, () => effect + rng() * sd);
    if (rejects(deltas, rule)) rejected++;
  }
  return rejected / trials;
}

/** The smallest n at which a gate's false-rejection rate drops below `alpha`. */
export function minimumCampaignSize(
  rule: Rule,
  alpha = 0.05,
  sizes = [10, 20, 30, 40, 60, 80, 100, 140, 200, 350],
): number | null {
  for (const n of sizes) if (rejectionRate(rule, n) <= alpha) return n;
  return null;
}
