/**
 * The Count — a shared-deck betting game.
 *
 * WHY THIS GAME
 *
 * Every environment on this site measures one thing at a time. The commons
 * measures whether a population finds a sustainable pattern; it cannot tell you
 * whether an agent failed because it misread the environment or because it
 * misread the other players. This game separates those, and both halves have an
 * exact answer.
 *
 * THE RULES
 *
 * A deck of known composition: `plus` cards worth a win, `minus` cards worth a
 * loss. Each round, every agent simultaneously chooses BET or PASS. Then the top
 * card is turned face up, in front of everybody.
 *
 *   - The card is a PLUS: the pot W is SPLIT between everyone who bet.
 *   - The card is a MINUS: everyone who bet pays L. No splitting: a loss is
 *     yours alone.
 *
 * Cards are public, so the composition of the remaining deck is common
 * knowledge. That makes the belief half pure arithmetic -- p(next card is plus)
 * is a count, not an opinion -- and it is the classic card-counting problem with
 * the mystique removed.
 *
 * THE TWIST, AND THE REASON THE GAME EXISTS
 *
 * Because a win is split and a loss is not, the value of betting falls as more
 * agents bet. So playing well needs two separate things:
 *
 *   1. COUNT the deck            -- reasoning about the environment
 *   2. Anticipate how many others will reach the same conclusion
 *                                -- reasoning about the other players
 *
 * An agent that counts perfectly and ignores the others bets hard on exactly the
 * rounds everyone else bets hard on, splits the pot to nothing, and loses money
 * while being right about the cards. Identical reasoning produces identical
 * action, and identical action is punished. That is the correlated-failure
 * result from the commons page, in a setting where the two competences can be
 * scored separately, on the same rollout, with no judge.
 *
 * Both halves are closed-form. `soloEV` is the value of betting alone;
 * `equilibriumBetRate` is the symmetric mixed strategy at which betting and
 * passing are worth the same, which is the answer key for the social half.
 */

export interface Rules {
  /** payoff pot on a plus card, split between all bettors */
  W: number;
  /** cost of betting into a minus card, paid in full by each bettor */
  L: number;
  /** agents at the table */
  n: number;
}

export const REFERENCE: Rules = { W: 6, L: 2, n: 6 };

export interface DeckState {
  plus: number;
  minus: number;
}

/** p(next card is a plus), from what everybody has already seen. */
export const pPlus = (d: DeckState): number =>
  d.plus + d.minus === 0 ? 0 : d.plus / (d.plus + d.minus);

/**
 * The count, in the form a card counter would carry it: plus cards remaining
 * minus the minus cards remaining. Zero is a neutral deck.
 */
export const count = (d: DeckState): number => d.plus - d.minus;

/** Value of betting if nobody else bets. The arithmetic half of the problem. */
export const soloEV = (d: DeckState, r: Rules): number => {
  const p = pPlus(d);
  return p * r.W - (1 - p) * r.L;
};

/**
 * Expected share of the pot when each of the other n-1 agents bets
 * independently with probability q.
 *
 * If K ~ Binomial(n-1, q) others bet, you take W/(1+K). The expectation has a
 * closed form -- E[1/(1+K)] = (1-(1-q)^n) / (nq) -- which is why this game has
 * an answer key at all. Without it the "right" bet rate would be a simulation
 * result rather than a number, and the whole point is to have the number first.
 */
export const shareFactor = (q: number, n: number): number =>
  q <= 0 ? 1 : (1 - Math.pow(1 - q, n)) / (n * q);

/** Value of betting when the others bet with probability q. */
export const betEV = (d: DeckState, r: Rules, q: number): number => {
  const p = pPlus(d);
  return p * r.W * shareFactor(q, r.n) - (1 - p) * r.L;
};

/**
 * The symmetric mixed equilibrium: the rate q at which betting and passing are
 * worth exactly the same, so nobody can do better by changing.
 *
 * Returns 0 when the deck is bad enough that betting loses even alone, and 1
 * when it is good enough that betting wins even with the whole table in.
 * Between those, bisection -- betEV is strictly decreasing in q, so there is one
 * root and it is easy to find.
 */
export function equilibriumBetRate(d: DeckState, r: Rules): number {
  if (soloEV(d, r) <= 0) return 0;              // bad even alone
  if (betEV(d, r, 1) >= 0) return 1;            // good even in a crowd
  let lo = 0, hi = 1;
  for (let i = 0; i < 60; i++) {
    const mid = (lo + hi) / 2;
    if (betEV(d, r, mid) > 0) lo = mid; else hi = mid;
  }
  return (lo + hi) / 2;
}

/* ------------------------------------------------------------------ agents */

export interface Ctx {
  deck: DeckState;
  rules: Rules;
  /** how many agents bet last round, of everyone who was playing */
  lastBettors: number;
  seat: number;
  rng: () => number;
}

export type CardPolicy = (c: Ctx) => boolean;

export const POLICIES: Record<string, { label: string; fn: CardPolicy; note: string }> = {
  counter: {
    label: "count the deck, ignore the table",
    note: "Bets whenever the card is favourable on its own. Perfectly correct about the deck and blind to everyone else — which is the expensive way to be right.",
    fn: ({ deck, rules }) => soloEV(deck, rules) > 0,
  },
  equilibrium: {
    label: "count the deck and the table",
    note: "Bets at the rate that makes betting and passing worth the same. The answer key for both halves at once.",
    fn: ({ deck, rules, rng }) => rng() < equilibriumBetRate(deck, rules),
  },
  contrarian: {
    label: "bet against the crowd",
    note: "Bets when few bet last round and passes when many did. Anti-correlated, and cheap to compute — the same heuristic that works on the commons page.",
    fn: ({ lastBettors, rules, deck }) =>
      soloEV(deck, rules) > -rules.L / 2 && lastBettors < rules.n / 2,
  },
  respond: {
    label: "count the deck, watch the table",
    note: "Reads how many bet last round, assumes the table repeats itself, and bets only if that is still worth doing. The cheapest thing that counts as modelling the other players — and the one that makes money off a table of over-bettors.",
    fn: ({ deck, rules, lastBettors }) =>
      betEV(deck, rules, Math.min(1, lastBettors / rules.n)) > 0,
  },
  copy: {
    label: "copy the table",
    note: "Bets if most of the table bet last round. The heuristic language models reach for, and the one this game is built to punish.",
    // Round one has no history, so it opens on the deck. Without that it passes
    // for ever: nobody bet last round because nobody bet last round.
    fn: ({ lastBettors, rules, deck, seat }) =>
      lastBettors === 0 ? soloEV(deck, rules) > 0 && seat % 2 === 0 : lastBettors > rules.n / 2,
  },
  always: {
    label: "always bet",
    note: "No inference at all. The floor.",
    fn: () => true,
  },
};

/* ------------------------------------------------------------------- play */

export interface Round {
  index: number;
  /** deck as it stood BEFORE the card was turned */
  deck: DeckState;
  bets: boolean[];
  card: "plus" | "minus";
  /** payoff to each seat this round */
  payoff: number[];
  /** the equilibrium rate for this deck, for scoring against */
  target: number;
}

export interface Result {
  rounds: Round[];
  totals: number[];
  /** per-seat bet rate, and the rate the equilibrium asked for */
  betRate: number[];
  targetRate: number;
}

/** Deterministic RNG, so a run is a run and not a mood. */
export function rng(seed: number): () => number {
  let s = seed >>> 0 || 1;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

export interface PlayOptions {
  policies: CardPolicy[];
  rules?: Rules;
  plus?: number;
  minus?: number;
  seed?: number;
}

export function play(opts: PlayOptions): Result {
  const rules = opts.rules ?? REFERENCE;
  const random = rng(opts.seed ?? 1);
  const deck: DeckState = { plus: opts.plus ?? 10, minus: opts.minus ?? 10 };
  const n = opts.policies.length;
  const totals = new Array(n).fill(0);
  const betCounts = new Array(n).fill(0);
  const rounds: Round[] = [];
  let lastBettors = 0;
  let targetSum = 0;

  while (deck.plus + deck.minus > 0) {
    const before: DeckState = { ...deck };
    const target = equilibriumBetRate(before, rules);
    targetSum += target;

    const bets = opts.policies.map((fn, seat) =>
      fn({ deck: before, rules: { ...rules, n }, lastBettors, seat, rng: random }),
    );
    bets.forEach((b, i) => { if (b) betCounts[i]++; });

    // Turn the card. Drawing without replacement is what makes the count mean
    // something -- with replacement this is a slot machine.
    const isPlus = random() < pPlus(before);
    if (isPlus) deck.plus--; else deck.minus--;

    const bettors = bets.filter(Boolean).length;
    const payoff = bets.map((b) =>
      !b ? 0 : isPlus ? rules.W / bettors : -rules.L,
    );
    payoff.forEach((v, i) => { totals[i] += v; });

    rounds.push({
      index: rounds.length,
      deck: before,
      bets,
      card: isPlus ? "plus" : "minus",
      payoff,
      target,
    });
    lastBettors = bettors;
  }

  return {
    rounds,
    totals,
    betRate: betCounts.map((c) => c / rounds.length),
    targetRate: targetSum / rounds.length,
  };
}
