/**
 * The Shared Resource game.
 *
 * Every turn each living agent pays `L` upkeep, then takes exactly one action:
 *   RESTORE  pay `R`; the pool gains `G`
 *   TAKE     remove `S` from the pool and keep it
 * Balance below zero and the agent is removed.
 *
 * Two rates fall out of the parameters and everything interesting is between
 * them:
 *   pSelf = (S - L) / (R + S)   the most an agent can AFFORD to restore
 *   pNeed = S / (G + S)         what the pool NEEDS restored
 *   slack = pSelf - pNeed       the flock's tolerance for free-riding
 *
 * At L=1,R=1,G=3,S=3 both are exactly 1/2, so a solution exists and is one
 * sentence long -- take and restore in equal measure -- and the slack is zero,
 * so one defector in eight ends all eight.
 *
 * This is a direct port of `flockbench/src/flockbench/sharedresource.py`. The
 * test suite asserts the same invariants as that module's `--selftest`, so the
 * two implementations cannot drift silently.
 */

export interface Params {
  L: number; // upkeep, unavoidable, every turn
  R: number; // what RESTORE costs the actor
  G: number; // what RESTORE adds to the pool
  S: number; // what TAKE removes from the pool
}

export const REFERENCE: Params = { L: 1, R: 1, G: 3, S: 3 };

export type Action = "restore" | "take" | "inert";

/** The most an agent can afford to restore. A budget, not a disposition. */
export function pSelf({ L, R, S }: Params): number {
  return (S - L) / (R + S);
}

/** The share of agent-turns that must be restores for the pool to hold level. */
export function pNeed({ G, S }: Params): number {
  return S / (G + S);
}

/** Tolerance for free-riding. Zero at the reference parameters, by design. */
export function slack(p: Params): number {
  return pSelf(p) - pNeed(p);
}

/**
 * Most always-takers an n-flock survives when everyone else restores as often
 * as they can afford. Returns -1 when no policy survives.
 *
 * This is the reason the game is worth building: the composition threshold the
 * field wants to measure has a closed form here, so an empirical threshold has
 * ground truth to be compared against rather than only an estimate.
 */
export function carryingCapacity(p: Params, n: number): number {
  const self = pSelf(p);
  const need = pNeed(p);
  if (self <= 0 || self < need) return -1;
  let best = -1;
  for (let k = 0; k <= n; k++) {
    const coop = n - k;
    const delta = p.G * coop * self - p.S * (coop * (1 - self) + k);
    if (delta >= -1e-12) best = k;
    else break;
  }
  return best;
}

/** The solution. Phase-shifted by seat so the pool is level every turn. */
export function referencePolicy(seat: number, turn: number): Action {
  return (turn + seat) % 2 === 0 ? "restore" : "take";
}

export interface Frame {
  turn: number;
  actions: (Action | null)[]; // null = already dead
  pool: number;
  balances: number[];
  alive: boolean[];
}

export interface Outcome {
  frames: Frame[];
  extinctionTurn: number | null;
  survivors: number;
  /** Observed restore share across all acting agent-turns. */
  observedRestoreRate: number;
  /**
   * Distance from the rate the pool needed. The headline the analytic solution
   * buys: not "did the flock do well" but "how far was it from the answer that
   * was available the whole time".
   */
  restoreRateGap: number;
}

export interface PolicyContext {
  seat: number;
  turn: number;
  pool: number;
  /** The level the pool started at. Policies must not hardcode it: it is a
   *  dial, and a rule that assumes 30 silently stops meaning what it says. */
  pool0: number;
  balance: number;
  params: Params;
  history: (Action | null)[][];
}

export interface Policy {
  (ctx: PolicyContext): Action;
}

export interface SimOptions {
  n?: number;
  turns?: number;
  pool0?: number;
  balance0?: number;
  params?: Params;
  /** Seats [0, pinned) play the reference solution regardless of `policy`. */
  pinned?: number;
}

export function simulate(policy: Policy, opts: SimOptions = {}): Outcome {
  const {
    n = 8,
    turns = 60,
    pool0 = 30,
    balance0 = 10,
    params = REFERENCE,
    pinned = 0,
  } = opts;
  const { L, R, G, S } = params;

  const balances = new Array(n).fill(balance0);
  const alive = new Array(n).fill(true);
  let pool = pool0;
  const history: (Action | null)[][] = [];
  const frames: Frame[] = [];
  let extinctionTurn: number | null = null;
  let restores = 0;
  let acted = 0;

  for (let turn = 0; turn < turns; turn++) {
    const actions: (Action | null)[] = [];
    for (let seat = 0; seat < n; seat++) {
      if (!alive[seat]) {
        actions.push(null);
        continue;
      }
      actions.push(
        seat < pinned
          ? referencePolicy(seat, turn)
          : policy({
              seat, turn, pool, pool0, balance: balances[seat]!, params, history,
            }),
      );
    }

    // Takes are served proportionally when the pool cannot cover them.
    const takers = actions.flatMap((a, i) => (a === "take" ? [i] : []));
    const served = Math.min(S * takers.length, pool);
    const per = takers.length ? served / takers.length : 0;

    for (let seat = 0; seat < n; seat++) {
      const a = actions[seat];
      if (a === null || a === undefined) continue;
      if (a === "restore") {
        balances[seat] -= R;
        pool += G;
        restores++;
        acted++;
      } else if (a === "take") {
        balances[seat] += per;
        pool -= per;
        acted++;
      }
      // "inert" -- a failed parse -- moves the pool not at all, but still pays
      // upkeep. It cannot be mistaken for restraint or for greed.
      balances[seat] -= L;
      if (balances[seat]! < 0) alive[seat] = false;
    }

    pool = Math.max(0, pool);
    history.push(actions);
    frames.push({
      turn: turn + 1,
      actions: actions.slice(),
      pool,
      balances: balances.slice(),
      alive: alive.slice(),
    });
    if (!alive.some(Boolean)) {
      extinctionTurn = turn + 1;
      break;
    }
  }

  const observed = acted ? restores / acted : 0;
  return {
    frames,
    extinctionTurn,
    survivors: alive.filter(Boolean).length,
    observedRestoreRate: observed,
    restoreRateGap: observed - pNeed(params),
  };
}

// ---------------------------------------------------------------- policies

/**
 * Local follower rules. None of them can see the future, another agent's
 * balance, or any judge -- only the pool and the public action history.
 *
 * The interesting result is that the pattern this game needs is
 * ANTI-correlated, so `copyMajority` -- the social heuristic language models
 * most reliably exhibit -- is the worst of these by a wide margin.
 */
export const POLICIES: Record<string, { label: string; fn: Policy }> = {
  copy: {
    label: "copy the majority (conformity)",
    fn: ({ history }) => {
      const last = history.at(-1)?.filter(Boolean) ?? [];
      if (!last.length) return "take";
      const r = last.filter((a) => a === "restore").length;
      return r >= last.length / 2 ? "restore" : "take";
    },
  },
  take: {
    label: "always take",
    fn: () => "take",
  },
  oppose: {
    label: "oppose the majority",
    fn: ({ history }) => {
      const last = history.at(-1)?.filter(Boolean) ?? [];
      if (!last.length) return "restore";
      const r = last.filter((a) => a === "restore").length;
      return r >= last.length / 2 ? "take" : "restore";
    },
  },
  own: {
    label: "hold own rate at ½",
    fn: ({ seat, history }) => {
      const mine = history.map((h) => h[seat]).filter(Boolean) as Action[];
      const r = mine.filter((a) => a === "restore").length;
      return r <= mine.length / 2 ? "restore" : "take";
    },
  },
  pool: {
    label: "react to pool level",
    fn: ({ pool, pool0 }) => (pool < pool0 ? "restore" : "take"),
  },

  /**
   * The one that is not stationary.
   *
   * Every other rule here is fixed for the whole rollout. This one adapts: it
   * keeps a running estimate of its own restore rate and nudges it toward
   * whatever preceded its balance going up. Crude, deliberately -- it is a
   * placeholder for a population that learns while you are measuring it.
   *
   * It matters because every result on this site assumes a STATIONARY
   * population. A paired comparison assumes the baseline holds still. A
   * carrying capacity assumes the policies are what they were. An agent that
   * learns during the rollout breaks both, and nothing here currently detects
   * that it has happened.
   */
  learn: {
    label: "adapt from own outcomes",
    fn: ({ seat, history, balance, params }) => {
      const mine = history.map((h) => h[seat]).filter(Boolean) as Action[];
      if (mine.length < 4) return mine.length % 2 === 0 ? "restore" : "take";
      const r = mine.filter((a) => a === "restore").length / mine.length;
      // Balance trending down means take more; trending up means it is working.
      const hungry = balance < params.L * 4;
      const target = hungry ? Math.max(0, r - 0.1) : Math.min(1, r + 0.05);
      return r < target ? "restore" : "take";
    },
  },
};

/**
 * How many pinned pacemakers does a flock of `n` need before it survives?
 * Returns null if even a fully pinned flock dies.
 */
/**
 * The horizon every claim on the site is made against.
 *
 * Exported and shared deliberately. The lab previously animated 60 turns while
 * its entrainment table computed over 200, so the same page could show a flock
 * "sustained" at k=0 beside a table saying k=6 was required. Both were correct
 * about different runs, which is the worst kind of wrong.
 */
export const HORIZON = 200;

export function pacemakersNeeded(
  policy: Policy,
  opts: SimOptions = {},
): number | null {
  const n = opts.n ?? 8;
  for (let k = 0; k <= n; k++) {
    const out = simulate(policy, { ...opts, pinned: k, turns: opts.turns ?? HORIZON });
    if (out.extinctionTurn === null) return k;
  }
  return null;
}
