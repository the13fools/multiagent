import { describe, it, expect } from "vitest";
import {
  REFERENCE,
  pSelf,
  pNeed,
  slack,
  carryingCapacity,
  referencePolicy,
  simulate,
  pacemakersNeeded,
  POLICIES,
  type Policy,
} from "../src/core/sharedResource";
import { shares, isEquilibrium, equilibriaCount, initial, step } from "../src/core/boardwalk";
import {
  soloEV as cardsSoloEV, shareFactor, equilibriumBetRate, play as cardsPlay,
  POLICIES as cardPolicies,
} from "../src/core/cards";
import {
  CONTROLS, REFERENCE_DESIGN, cells, pairedCells, requiredN, detectableEffect, evaluate,
} from "../src/core/design";
import { REFERENCE_PLAN, SIZES, budgetCurve, seedingCost } from "../src/core/seeding";

/**
 * These assertions mirror `flockbench-shared --selftest` exactly. Two
 * implementations of the same arithmetic are only useful if they are pinned to
 * each other; otherwise the lab and the testbed drift and the lab quietly
 * becomes a lie about the experiment.
 */
describe("shared resource — the arithmetic", () => {
  it("puts both rates at exactly one half at the reference parameters", () => {
    expect(pSelf(REFERENCE)).toBeCloseTo(0.5, 12);
    expect(pNeed(REFERENCE)).toBeCloseTo(0.5, 12);
    expect(slack(REFERENCE)).toBeCloseTo(0, 12);
  });

  it("treats G as a dial with closed-form carrying capacity", () => {
    const cap = (G: number) => carryingCapacity({ ...REFERENCE, G }, 8);
    expect([cap(3), cap(4), cap(6), cap(9)]).toEqual([0, 1, 2, 4]);
  });

  it("reports a negative-slack game as unwinnable", () => {
    const doomed = { L: 2, R: 1, G: 3, S: 3 };
    expect(slack(doomed)).toBeLessThan(0);
    expect(carryingCapacity(doomed, 8)).toBe(-1);
  });
});

describe("shared resource — the dynamics", () => {
  const play = (fn: Policy, turns = 200) =>
    simulate(fn, { turns, n: 8, pool0: 30, balance0: 10 });

  it("sustains the flock forever under the known solution", () => {
    const out = play(({ seat, turn }) => referencePolicy(seat, turn));
    expect(out.extinctionTurn).toBeNull();
    expect(out.survivors).toBe(8);
    expect(out.restoreRateGap).toBeCloseTo(0, 12);
  });

  it("kills the default flock at turn 14", () => {
    expect(play(() => "take").extinctionTurn).toBe(14);
  });

  it("lets a single defector end all eight", () => {
    const out = play(({ seat, turn }) =>
      seat === 0 ? "take" : referencePolicy(seat, turn),
    );
    expect(out.extinctionTurn).not.toBeNull();
  });

  it("kills a permanent restorer at turn 6 — virtue has a ceiling", () => {
    expect(play(() => "restore", 30).extinctionTurn).toBe(6);
  });

  it("moves the pool not at all on a failed parse", () => {
    const out = simulate(() => "inert", { turns: 1, n: 8, pool0: 30 });
    expect(out.frames[0]!.pool).toBe(30);
  });
});

describe("shared resource — entrainment", () => {
  /**
   * The headline result: the pattern is anti-correlated, so conformity is the
   * worst available heuristic and steering a conformist flock costs 75% of the
   * seats.
   */
  it("needs 6 of 8 pacemakers to steer a conformist flock", () => {
    expect(pacemakersNeeded(POLICIES.copy!.fn)).toBe(6);
  });

  it("cannot entrain pure defectors at all", () => {
    expect(pacemakersNeeded(POLICIES.take!.fn)).toBe(8);
  });

  it("needs none for rules that are already balanced", () => {
    for (const key of ["oppose", "own", "pool"] as const) {
      expect(pacemakersNeeded(POLICIES[key]!.fn)).toBe(0);
    }
  });
});

describe("boardwalk — Hotelling", () => {
  it("splits the beach evenly when vendors coincide", () => {
    const s = shares([0.5, 0.5]);
    expect(s[0]).toBeCloseTo(0.5, 2);
    expect(s[1]).toBeCloseTo(0.5, 2);
  });

  it("finds both vendors at the centre to be an equilibrium at n=2", () => {
    expect(isEquilibrium([0.5, 0.5], 21)).toBe(true);
  });

  it("finds NO pure-strategy equilibrium at n=3", () => {
    // The claim the proposal makes. Verified, not cited.
    expect(equilibriaCount(3, 15)).toHaveLength(0);
  });

  it("finds equilibria again at n=2 and n=4", () => {
    expect(equilibriaCount(2, 15).length).toBeGreaterThan(0);
    expect(equilibriaCount(4, 13).length).toBeGreaterThan(0);
  });
});

/**
 * The three claims the boardwalk page makes, run rather than cited.
 *
 * The page shipped with simultaneous best response, under which every vendor
 * jumps to the same spot and all three predictions fail: n=4 piled onto the
 * centre, n=3 jittered in the fourth decimal. None of the tests noticed,
 * because they all tested `isEquilibrium` -- the static question -- and nothing
 * tested the dynamics the reader actually watches.
 */
describe("boardwalk — the dynamics the page animates", () => {
  const settle = (n: number, rounds: number) => {
    let st = initial(n, 7);
    const seen: string[] = [];
    for (let t = 0; t < rounds; t++) {
      st = step(st);
      if (t >= rounds - n) seen.push(st.positions.map((v) => v.toFixed(2)).sort().join(","));
    }
    return { st, settled: new Set(seen).size === 1 };
  };

  it("settles two vendors at the centre", () => {
    const { st, settled } = settle(2, 40);
    expect(settled).toBe(true);
    for (const p of st.positions) expect(p).toBeCloseTo(0.5, 2);
  });

  it("never settles three", () => {
    const { settled } = settle(3, 200);
    expect(settled).toBe(false);
  });

  it("settles four, paired at the quartiles", () => {
    const { st, settled } = settle(4, 60);
    expect(settled).toBe(true);
    const sorted = st.positions.slice().sort((a, b) => a - b);
    expect(sorted[0]).toBeCloseTo(0.25, 2);
    expect(sorted[1]).toBeCloseTo(0.25, 2);
    expect(sorted[2]).toBeCloseTo(0.75, 2);
    expect(sorted[3]).toBeCloseTo(0.75, 2);
  });

  it("moves exactly one vendor per round", () => {
    let st = initial(3, 7);
    for (let t = 0; t < 12; t++) {
      const before = st.positions.slice();
      st = step(st);
      const changed = st.positions.filter((p, i) => p !== before[i]).length;
      expect(changed).toBeLessThanOrEqual(1);
      expect(st.moved).toBe(t % 3);
    }
  });
});

/**
 * The closed form, checked against the simulator rather than quoted at it.
 *
 * carryingCapacity is arithmetic and simulate is a loop, and until now nothing
 * asserted they agree. The shared-resource page shows both on screen at once,
 * so a disagreement would be a lie told twice on the same page.
 */
describe("carrying capacity predicts what actually happens", () => {
  const run = (G: number, defectors: number) =>
    simulate(POLICIES.solution!.fn, {
      n: 8, turns: 200, params: { ...REFERENCE, G }, defectors,
    });

  for (const G of [3, 4, 6, 9]) {
    it(`G=${G}`, () => {
      const cap = carryingCapacity({ ...REFERENCE, G }, 8);
      // "Capacity" means the flock stays WHOLE. Past it, the defectors starve
      // themselves first and some cooperators can outlive them -- at G=6 with 3
      // defectors, six of eight are still standing at turn 200. Reading
      // survival as "somebody made it" would have called that a pass.
      expect(run(G, cap).survivors, `all 8 should survive ${cap} defectors`).toBe(8);
      if (cap < 7) {
        expect(run(G, cap + 1).survivors, `${cap + 1} defectors should break the flock`)
          .toBeLessThan(8);
      }
    });
  }

  it("kills the whole flock slowly at zero slack, which is the horizon argument", () => {
    // One permanent defector at the reference parameters is fatal to everyone --
    // at turn 118. A 20-turn evaluation sees a healthy population.
    const out = run(3, 1);
    expect(out.extinctionTurn).toBeGreaterThan(60);
    expect(out.frames[19]!.alive.filter(Boolean).length).toBe(8);
  });

  it("a defector takes the seat, whatever else it was told to do", () => {
    const out = simulate(POLICIES.solution!.fn, { n: 8, turns: 4, pinned: 8, defectors: 2 });
    expect(out.frames[0]!.actions.slice(6)).toEqual(["take", "take"]);
  });
});

/**
 * The Count.
 *
 * A sketch, but the arithmetic is the point of it, so the arithmetic is tested:
 * both answer keys, and the behavioural claim the page is built on.
 */
describe("the card game has two answer keys and they disagree", () => {
  const R = { W: 6, L: 2, n: 6 };

  it("prices a bet correctly when you are alone", () => {
    // p=1/2, W=6, L=2 -> 0.5*6 - 0.5*2 = 2
    expect(cardsSoloEV({ plus: 10, minus: 10 }, R)).toBeCloseTo(2, 10);
    expect(cardsSoloEV({ plus: 0, minus: 5 }, R)).toBeCloseTo(-2, 10);
  });

  it("splits the pot the way the closed form says", () => {
    // nobody else bets: you take the whole pot
    expect(shareFactor(0, 6)).toBeCloseTo(1, 10);
    // everybody bets: one sixth each
    expect(shareFactor(1, 6)).toBeCloseTo(1 / 6, 10);
  });

  it("puts the equilibrium rate below the solo rule, always", () => {
    for (let c = -8; c <= 8; c++) {
      const deck = { plus: 10 + c / 2, minus: 10 - c / 2 };
      const solo = cardsSoloEV(deck, R) > 0 ? 1 : 0;
      const eq = equilibriumBetRate(deck, R);
      expect(eq, `count ${c}: equilibrium above the solo rule`).toBeLessThanOrEqual(solo + 1e-9);
    }
    // and strictly below somewhere, or the game has no social half at all
    expect(equilibriumBetRate({ plus: 10, minus: 10 }, R)).toBeLessThan(1);
  });

  it("bankrupts a table of perfect counters", () => {
    // The claim the page is built on: everybody right about the cards, everybody
    // betting together, the pot split six ways and every loss paid in full.
    const mean = (keys: string[]) => {
      let t = 0;
      for (let s = 1; s <= 40; s++) {
        t += cardsPlay({ policies: keys.map((k) => cardPolicies[k]!.fn), rules: R, seed: s })
          .totals[0]!;
      }
      return t / 40;
    };
    const allCounters = mean(new Array(6).fill("counter"));
    expect(allCounters).toBeLessThan(0);

    // and one agent that watches the table takes money off exactly that room
    const responder = mean(["respond", ...new Array(5).fill("counter")]);
    expect(responder).toBeGreaterThan(0);
    expect(responder - allCounters).toBeGreaterThan(3);
  });
});

/**
 * Campaign arithmetic.
 *
 * The two numbers that decide whether an experiment is worth running, and the
 * relationship between them that a budget gets wrong.
 */
describe("the campaign planner", () => {
  it("multiplies the factors out", () => {
    const d = { ...REFERENCE_DESIGN, families: 2, environments: 4, fractions: 8, arms: 2,
                salt: 2, seeds: 69 };
    expect(cells(d)).toBe(2 * 4 * 8 * 2 * 2 * 69);
    expect(pairedCells(d)).toBe(2 * 69);
  });

  it("reproduces the sample sizes the proposal quotes", () => {
    expect(requiredN(400, 1180)).toBe(69);
    expect(requiredN(200, 1180)).toBe(274);
    // The case that nearly shipped: variance scaled with the welfare mean and
    // the margin did not, and the requirement more than doubled.
    expect(requiredN(400, 1820)).toBe(163);
    // and the case where both scale, where it does not move at all
    expect(requiredN(620, 1820)).toBeLessThan(70);
  });

  it("depends only on the ratio", () => {
    expect(requiredN(400, 1180)).toBe(requiredN(800, 2360));
  });

  it("inverts: what can this many cells see", () => {
    const n = requiredN(400, 1180);
    expect(detectableEffect(n, 1180)).toBeLessThanOrEqual(400);
    expect(detectableEffect(n - 20, 1180)).toBeGreaterThan(400);
  });

  it("calls a campaign underpowered when it is", () => {
    const small = { ...REFERENCE_DESIGN, salt: 1, seeds: 10 };
    expect(evaluate(small, 400, 1180).powered).toBe(false);
    expect(evaluate(REFERENCE_DESIGN, 400, 1180).powered).toBe(true);
  });

  it("keeps every control, and says what each is against", () => {
    // A control nobody can name an alternative explanation for is decoration.
    expect(CONTROLS.length).toBeGreaterThanOrEqual(6);
    for (const c of CONTROLS) {
      expect(c.against.length, `${c.name} does not say what it rules out`).toBeGreaterThan(20);
      expect(c.how.length).toBeGreaterThan(40);
    }
    expect(CONTROLS.map((c) => c.name).join(" ")).toMatch(/A\/A/);
  });
});

/**
 * What a population costs.
 *
 * The claim is not that a price is right, it is that the price is low enough
 * for population size to be a dial. That is arithmetic, so it is testable.
 */
describe("seeding cost", () => {
  it("amortises the teacher pass across the population", () => {
    const one = seedingCost({ ...REFERENCE_PLAN, agents: 1 });
    const thirty = seedingCost({ ...REFERENCE_PLAN, agents: 30 });
    expect(one.perAgent).toBeGreaterThan(thirty.perAgent);
    // and the marginal agent is the same price whatever the population size
    expect(one.marginal).toBeCloseTo(thirty.marginal, 6);
  });

  it("lands in the right order of magnitude at the reference plan", () => {
    // The essay's "about $50" was a receipt at the spot price we paid. The model
    // now runs at Lambda's current on-demand rate, which is higher, and the
    // per-agent figure moves with it — which is the point of exposing the price
    // as a dial rather than quoting a constant.
    const c = seedingCost(REFERENCE_PLAN);
    expect(c.perAgent).toBeGreaterThan(40);
    expect(c.perAgent).toBeLessThan(90);
    expect(c.total).toBeGreaterThan(1200);
    expect(c.total).toBeLessThan(2400);
  });

  it("scales with model size, and says so as a multiplier rather than a promise", () => {
    const small = seedingCost({ ...REFERENCE_PLAN, multiplier: 1 });
    const big = seedingCost({ ...REFERENCE_PLAN, multiplier: 10 });
    expect(big.total / small.total).toBeCloseTo(10, 6);
    expect(SIZES.find((s) => s.label === "7B")!.multiplier).toBe(1);
    expect(SIZES.find((s) => s.label === "70B")!.multiplier).toBe(10);
  });

  it("shows the trade: more agents, less training each", () => {
    const p = REFERENCE_PLAN;
    const budget = seedingCost(p).total;
    const curve = budgetCurve(budget, p, [10, 30, 60]);
    expect(curve[0]!.hoursEach).toBeGreaterThan(curve[1]!.hoursEach);
    expect(curve[1]!.hoursEach).toBeGreaterThan(curve[2]!.hoursEach);
    // at its own budget, the reference population gets back what it started with
    expect(curve[1]!.hoursEach).toBeCloseTo(p.trainHours, 4);
  });
});
