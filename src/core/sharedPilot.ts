// The same file v2SharedPilot.ts and the tests read. Two copies of one run
// is how this site shipped stale numbers twice; there is now one.
import raw from "../../shared_continuous_results_transfer.json";
import { COMMONS_PILOT } from "./commonsPilot";

/**
 * A zero-shot transfer test: adapters trained on the Commons Game, dropped
 * into the Shared Resource game without retraining.
 *
 * The two games reward opposite things. In the Commons Game the good move is
 * to take LESS -- restraint is the whole lesson. In Shared Resource the
 * sustainable policy is ALTERNATION at exactly 0.5: restore on half your turns
 * and take on the other half, because restoring costs upkeep 1 plus restore 1
 * while taking returns 3. Restore every turn and you lose two tokens a turn
 * until you die, however healthy the pool is.
 *
 * The adapters did what they had learned. They restored on 100% of turns and
 * the whole population was dead by turn 6.
 *
 * Two things make this worth publishing rather than burying:
 *
 *   1. THE POOL WON. It finished at 174 tokens, roughly five times its opening
 *      30, with nobody alive to use it. The resource was never what failed.
 *
 *   2. THE ANSWER KEY ATTRIBUTED IT. Required restore rate 0.5, observed 0.98
 *      to 1.00. Not ambiguous between bad coordination and an impossible task,
 *      and not a near miss -- a sustainable policy provably existed and the
 *      population missed it by doing too MUCH of the cooperative thing. In an
 *      environment without a closed form this reads as "they all died" and
 *      nothing more.
 *
 * The base model over-restored too, at 0.98, so most of the bias belongs to
 * Qwen2.5-7B-Instruct rather than to the adapter. Training on the Commons Game
 * intensified it to 1.00 and cost two turns. That is negative transfer of a
 * learned POLICY where a PRINCIPLE was wanted, and it is the cleanest evidence
 * on this site that a composition effect measured in one environment cannot be
 * assumed in another.
 *
 * One seed per condition. Receipt not yet committed.
 */

interface RawShared {
  extinction_turn: number;
  survivors: number;
  turns_played: number;
  final_pool: number;
  min_pool: number;
  sustained: boolean;
  observed_restore_rate: number;
  required_restore_rate: number;
  restore_rate_gap: number;
  slack: number;
  carrying_capacity: number;
  total_parse_failures: number;
  mean_lifespan: number;
  trace: { round: number; pool_before: number; pool_after: number; alive: boolean[] }[];
}

const DATA = raw as unknown as Record<string, RawShared>;
const SEEDED: Record<string, number> = { base8: 0, cfa4mix: 4, cfa8: 8 };

export interface SharedCondition {
  key: string;
  seeded: number;
  extinctionTurn: number;
  survivors: number;
  /** Pool level when the last agent died. */
  finalPool: number;
  /** Fraction of turns spent restoring. The sustainable rate is 0.5. */
  observedRestoreRate: number;
  requiredRestoreRate: number;
  parseFailures: number;
  pool: number[];
  alive: number[];
}

export const SHARED_PILOT: readonly SharedCondition[] =
  Object.keys(SEEDED).filter((k) => k in DATA).map((key) => {
    const c = DATA[key]!;
    return {
      key,
      seeded: SEEDED[key]!,
      extinctionTurn: c.extinction_turn,
      survivors: c.survivors,
      finalPool: c.final_pool,
      observedRestoreRate: c.observed_restore_rate,
      requiredRestoreRate: c.required_restore_rate,
      parseFailures: c.total_parse_failures,
      pool: [c.trace[0]?.pool_before ?? 0, ...c.trace.map((f) => f.pool_after)],
      alive: c.trace.map((f) => f.alive.filter(Boolean).length),
    };
  }).sort((a, b) => a.seeded - b.seeded);

/** Nobody survived any arm. Stated as a function so the page cannot overstate it. */
export const anySurvived = (): boolean => SHARED_PILOT.some((c) => c.survivors > 0);

/**
 * The pool outlived the population in every arm.
 *
 * The single most useful sentence this run produced: the resource was never
 * the thing that failed.
 */
export const poolOutlivedEveryone = (): boolean =>
  SHARED_PILOT.every((c) => c.survivors === 0 && c.finalPool > c.pool[0]!);

/** Every arm over-restored. Positive means too cooperative, not too greedy. */
export const overRestored = (): boolean =>
  SHARED_PILOT.every((c) => c.observedRestoreRate > c.requiredRestoreRate);

/**
 * The finding that matters most for the proposal.
 *
 * One adapter, trained once on the Commons Game, evaluated in both games. In
 * the environment it was trained on, full seeding took collapse from round 33
 * to 170. Transferred untouched to Shared Resource, it took extinction from
 * turn 8 to turn 6. Same weights, opposite sign.
 *
 * A composition effect that reverses when the environment changes is not a
 * threshold anyone should carry into a deployment claim. One seed per arm is
 * nowhere near enough to say how large the reversal is -- but it is exactly the
 * disagreement the funded design measures rather than assumes away, and it was
 * produced by the instrument on itself, before any reviewer had to ask.
 */
export function crossGameSignFlip(): {
  sharedDelta: number;
  commonsDelta: number;
  flips: boolean;
} {
  const sBase = SHARED_PILOT.find((c) => c.seeded === 0)!;
  const sFull = SHARED_PILOT.find((c) => c.seeded === 8)!;
  const cBase = COMMONS_PILOT.find((c) => c.seeded === 0)!;
  const cFull = COMMONS_PILOT.find((c) => c.seeded === 8)!;
  const sharedDelta = sFull.extinctionTurn - sBase.extinctionTurn;
  const commonsDelta = cFull.collapseRound - cBase.collapseRound;
  return { sharedDelta, commonsDelta, flips: Math.sign(sharedDelta) !== Math.sign(commonsDelta) };
}
