import { describe, it, expect } from "vitest";
import {
  DEFAULTS,
  initial,
  orderParameter,
  run,
  driftTolerance,
  metronomesNeeded,
  type PatternConfig,
} from "../src/core/juggling";

const base: PatternConfig = { ...DEFAULTS };

describe("juggling — a ring that keeps time keeps its clubs", () => {
  it("starts phase-locked", () => {
    expect(orderParameter(initial(base, 7).jugglers)).toBeGreaterThan(0.99);
  });

  it("never drops when nobody drifts", () => {
    const out = run(base, 200, 7);
    expect(out.collapseTime).toBeNull();
    expect(out.drops).toBe(0);
    expect(out.clubsRemaining).toBe(base.clubs);
  });
});

describe("juggling — drift", () => {
  /**
   * The whole long-horizon argument in one table. A tiny systematic error is
   * survivable for a long time and then is not, and the transition sits well
   * past where a short run would look conclusive.
   */
  it("collapses later the smaller the bias, and never at zero", () => {
    const rows = driftTolerance(base, 200);
    expect(rows[0]!.collapseTime).toBeNull(); // bias 0
    const timed = rows.slice(1).map((r) => r.collapseTime!);
    expect(timed.every((v) => v !== null)).toBe(true);
    // strictly decreasing survival as bias grows
    for (let i = 1; i < timed.length; i++) {
      expect(timed[i]!).toBeLessThan(timed[i - 1]!);
    }
  });

  it("looks perfectly healthy at 60 beats and is dead by 120", () => {
    // This is the claim the drift panel makes, so it is a test.
    const cfg = { ...base, bias: 0.002 };
    expect(run(cfg, 60, 7).collapseTime).toBeNull();
    const long = run(cfg, 200, 7).collapseTime;
    expect(long).not.toBeNull();
    expect(long!).toBeGreaterThan(60);
    expect(long!).toBeLessThan(160);
  });
});

describe("juggling — steering", () => {
  /**
   * The sharpest result in this lab, and it mirrors the conformity finding in
   * the commons: what decides controllability is not how many seats you hold
   * but whether the others are listening at all.
   */
  it("makes pacemakers useless when nobody is coupled", () => {
    expect(metronomesNeeded({ ...base, bias: 0.01, coupling: 0 }, 200)).toBe(base.n);
  });

  it("lets a single metronome hold the ring once there is coupling", () => {
    expect(metronomesNeeded({ ...base, bias: 0.01, coupling: 0.3 }, 200)).toBe(1);
  });

  it("needs fewer metronomes as coupling rises", () => {
    const need = (c: number) =>
      metronomesNeeded({ ...base, bias: 0.01, coupling: c }, 200) ?? 99;
    expect(need(0)).toBeGreaterThan(need(0.1));
    expect(need(0.1)).toBeGreaterThanOrEqual(need(0.3));
  });
});
