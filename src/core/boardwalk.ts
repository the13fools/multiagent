/**
 * The boardwalk — Hotelling's linear city.
 *
 * `n` vendors choose positions on [0,1]. Customers are uniform and walk to the
 * nearest vendor, splitting ties. Each vendor wants market share.
 *
 * The classic result is that two vendors both move to the centre: the
 * principle of minimum differentiation, and the reason competing shops cluster.
 * What makes this worth putting next to the Shared Resource game is what
 * happens at three.
 *
 *   n = 2   exactly one pure-strategy equilibrium, both at the centre
 *   n = 3   NONE. There is no arrangement from which nobody wants to move.
 *   n = 4   one again, paired at the quartiles
 *
 * Three is uniquely pathological (Eaton & Lipsey 1975), and it is the exact
 * complement to the Shared Resource game: one environment has a reachable
 * stable state, the other provably has none, so the population must cycle
 * forever. Asking whether a controlled minority can stabilise a system that
 * has no stable state to be steered into is a sharper question than it looks,
 * and "no" is as informative as "yes".
 *
 * `equilibriaCount` verifies the table above by brute force rather than
 * citation. The test suite runs it.
 */

export interface BoardwalkState {
  positions: number[];
  shares: number[];
  turn: number;
  /** which vendor moved to get here, so the view can point at it */
  moved?: number;
}

/** Market share of each vendor under uniform customers on [0,1]. */
export function shares(positions: number[], samples = 2001): number[] {
  const n = positions.length;
  const counts = new Array(n).fill(0);
  for (let j = 0; j < samples; j++) {
    const x = j / (samples - 1);
    let best = Infinity;
    for (const p of positions) best = Math.min(best, Math.abs(x - p));
    const winners: number[] = [];
    for (let i = 0; i < n; i++) {
      if (Math.abs(Math.abs(x - positions[i]!) - best) < 1e-12) winners.push(i);
    }
    for (const i of winners) counts[i] += 1 / winners.length;
  }
  return counts.map((c) => c / samples);
}

/** Best response for vendor `i`, searched on a grid. */
export function bestResponse(
  positions: number[],
  i: number,
  grid = 101,
): number {
  let bestX = positions[i]!;
  let bestShare = shares(positions)[i]!;
  for (let g = 0; g < grid; g++) {
    const x = g / (grid - 1);
    const alt = positions.slice();
    alt[i] = x;
    const s = shares(alt)[i]!;
    if (s > bestShare + 1e-9) {
      bestShare = s;
      bestX = x;
    }
  }
  return bestX;
}

/** Is this arrangement a pure-strategy Nash equilibrium in locations? */
export function isEquilibrium(positions: number[], grid = 101): boolean {
  const base = shares(positions);
  for (let i = 0; i < positions.length; i++) {
    for (let g = 0; g < grid; g++) {
      const x = g / (grid - 1);
      if (Math.abs(x - positions[i]!) < 1e-12) continue;
      const alt = positions.slice();
      alt[i] = x;
      if (shares(alt)[i]! > base[i]! + 1e-9) return false;
    }
  }
  return true;
}

/**
 * Brute-force count of pure-strategy equilibria for `n` vendors on a grid.
 * Coarse by default: the point is the zero at n=3, which is robust to
 * resolution, not a precise census.
 */
export function equilibriaCount(n: number, grid = 21): number[][] {
  const xs = Array.from({ length: grid }, (_, i) => i / (grid - 1));
  const found: number[][] = [];
  const walk = (start: number, acc: number[]) => {
    if (acc.length === n) {
      if (isEquilibrium(acc, grid)) found.push(acc.slice());
      return;
    }
    for (let i = start; i < grid; i++) walk(i, [...acc, xs[i]!]);
  };
  walk(0, []);
  return found;
}

/**
 * One vendor moves, to its best response given where everyone else is standing.
 *
 * This used to move every vendor at once, and that quietly broke all three
 * predictions the page makes. Under simultaneous updates each vendor jumps to
 * the spot that is best against the OLD arrangement, and since that spot is the
 * same for all of them, they land on top of each other: n=4 collapsed onto the
 * centre instead of pairing at the quartiles, and n=3 jittered between 0.49 and
 * 0.50 rather than cycling. The page said "two settle, three cycle, four pair"
 * and the animation showed none of it.
 *
 * Sequential best response -- one vendor per round, round-robin -- is both the
 * standard formulation and the one that reproduces the table:
 *
 *   n = 2   settles at the centre in about nine moves
 *   n = 3   never settles; the outer vendor keeps leapfrogging the middle
 *   n = 4   settles paired at 0.25 and 0.75
 *
 * The grid is coarse on purpose. Vendors choose among storefronts, not real
 * numbers, and at grid=101 every move is a 0.01 shuffle that takes hundreds of
 * rounds to show its shape.
 */
export function step(state: BoardwalkState, grid = 21): BoardwalkState {
  const who = state.turn % state.positions.length;
  const next = state.positions.slice();
  next[who] = bestResponse(next, who, grid);
  return { positions: next, shares: shares(next), turn: state.turn + 1, moved: who };
}

export function initial(n: number, seed = 1, grid = 21): BoardwalkState {
  // Deterministic spread, nudged off symmetry so n=2 does not start solved, and
  // snapped to the same grid the moves use -- starting between storefronts made
  // the first move look like a correction rather than a choice.
  let s = seed;
  const rand = () => (s = (s * 1103515245 + 12345) % 2147483648) / 2147483648;
  const snap = (x: number) => Math.round(x * (grid - 1)) / (grid - 1);
  const positions = Array.from({ length: n }, () => snap(0.1 + 0.8 * rand()));
  return { positions, shares: shares(positions), turn: 0 };
}
