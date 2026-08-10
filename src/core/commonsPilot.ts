import raw from "../ui/data/commons_pilot.json";

/**
 * The Commons Game pilot, read from the runner's own output file.
 *
 * This module exists to fix a coherence problem a reader would otherwise find
 * on their own. The theory, the closed form and every interactive on this site
 * are the SHARED RESOURCE game -- a worked example with an answer key. Every
 * live language-model run is the COMMONS GAME, which has DIFFERENT RULES: a
 * stock with nonlinear regrowth, harvested continuously, with no closed form.
 * It is the gen 0 experimental platform. Presenting either as the other would
 * be the exact thing this project claims not to do.
 *
 * Derived from the JSON rather than transcribed, because the data file and the
 * page have already drifted apart twice. The current run uses a 0.75
 * restoration rate over a 200-round horizon.
 *
 * One seed per condition. Descriptive numbers from a single run, not an effect
 * size, and the receipt is not yet committed.
 */

interface RawCondition {
  rounds: number;
  stock_by_round: number[];
  roles: string[];
  trace: Array<{
    round: number;
    harvests: number[];
    alive: boolean[];
  }>;
  total_welfare: number;
  restraint_under_scarcity: number;
  total_parse_failures: number;
  survival_rate: number;
  time_to_collapse: number | null;
}

const DATA = raw as unknown as Record<string, RawCondition>;

/** Seeded (CFA) seats out of eight, by condition key. */
const SEEDED: Record<string, number> = { base8: 0, cfa4mix: 4, cfa8: 8 };
const LABEL: Record<string, string> = {
  base8: "8 base agents",
  cfa4mix: "4 seeded + 4 base",
  cfa8: "8 seeded agents",
};

export interface CommonsCondition {
  key: string;
  label: string;
  seeded: number;
  stock: number[];
  roles: string[];
  trace: Array<{
    round: number;
    harvests: number[];
    alive: boolean[];
  }>;
  /** Read from the stock series, not from `time_to_collapse` -- see KNOWN_DEFECT. */
  collapseRound: number;
  totalWelfare: number;
  restraintUnderScarcity: number;
  parseFailures: number;
  /** Every agent survived in all three conditions. The RESOURCE is what died. */
  agentSurvivalRate: number;
}

/** First round at which stock reaches zero, 1-indexed. */
const collapseFromStock = (stock: number[]): number => {
  const i = stock.findIndex((s, idx) => idx > 0 && s <= 0);
  return i < 0 ? stock.length - 1 : i;
};

export const COMMONS_PILOT: readonly CommonsCondition[] =
  Object.keys(SEEDED)
    .filter((k) => k in DATA)
    .map((key) => {
      const c = DATA[key]!;
      return {
        key,
        label: LABEL[key] ?? key,
        seeded: SEEDED[key]!,
        stock: c.stock_by_round,
        roles: c.roles,
        trace: c.trace,
        collapseRound: collapseFromStock(c.stock_by_round),
        totalWelfare: c.total_welfare,
        restraintUnderScarcity: c.restraint_under_scarcity,
        parseFailures: c.total_parse_failures ?? 0,
        agentSurvivalRate: c.survival_rate,
      };
    });

/** Ordered by seeded fraction, which is how a dose-response is read. */
export const byDose = (): readonly CommonsCondition[] =>
  [...COMMONS_PILOT].sort((a, b) => a.seeded - b.seeded);

/**
 * True when collapse round rises with the seeded fraction. In the gen 0 run at
 * a 0.75 restoration rate over 200 rounds, it does: 33 -> 90 -> 170.
 *
 * An earlier run at a different restoration rate was NOT monotone -- the
 * half-seeded arm died before the unseeded one. Both were single seeds, which
 * is the entire point: the ordering flipped when a environment parameter moved,
 * so neither run is evidence of an effect. The funded campaign is what turns an
 * ordering into an estimate, and this function is here so the page reports
 * whichever shape the current data actually has.
 */
export function isMonotoneInDose(): boolean {
  const order = byDose();
  return order.every((c, i) => i === 0 || c.collapseRound >= order[i - 1]!.collapseRound);
}

/** Fully seeded arm against the unseeded baseline. */
export function seededDelta(): { rounds: number; welfare: number } {
  const base = COMMONS_PILOT.find((c) => c.seeded === 0)!;
  const full = COMMONS_PILOT.find((c) => c.seeded === 8)!;
  return {
    rounds: full.collapseRound - base.collapseRound,
    welfare: full.totalWelfare - base.totalWelfare,
  };
}

/** Conditions whose `time_to_collapse` field disagrees with their stock series. */
export function conditionsWithBrokenCollapseField(): string[] {
  return Object.keys(SEEDED).filter((k) => {
    const c = DATA[k];
    if (!c) return false;
    return c.time_to_collapse === null && collapseFromStock(c.stock_by_round) > 0;
  });
}

/**
 * An instrumentation defect the write-up surfaced.
 *
 * The runner logged "Resource collapsed at Round 19" and, on the same
 * condition, `time_to_collapse: null`. Only the unseeded arm populated the
 * field. Whatever writes it disagrees with the collapse detector, so every
 * collapse round on this site is derived from the stock series instead.
 * Recorded because a metric that is silently null on two arms out of three is
 * how a wrong headline gets made later.
 */
export const KNOWN_DEFECT =
  `The runner left \`time_to_collapse\` null for ${conditionsWithBrokenCollapseField().length} ` +
  "of the three conditions while logging a collapse round for each. Collapse rounds here " +
  "are derived from the stock series instead, and the metric needs fixing before any " +
  "scored campaign relies on it.";
