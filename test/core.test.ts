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
import { shares, isEquilibrium, equilibriaCount } from "../src/core/boardwalk";

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
