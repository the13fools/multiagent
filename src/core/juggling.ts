/**
 * The passing pattern — juggling as a shared-resource game.
 *
 * Not a metaphor. The same object as the Shared Resource commons, with
 * intuitions people already have: many players, rules a child can state, a
 * pattern that exists only while everyone keeps time, and a failure mode
 * everyone has watched. "Take and restore in equal measure" is a two-beat
 * pattern.
 *
 * THE MODEL
 *
 * N jugglers stand in a ring. Time is continuous but throws land on beats. Each
 * juggler `i` carries a phase `φ_i` and a rate `ω_i`; when its phase crosses 1
 * it throws, either to itself or across the ring, and the club lands `flight`
 * beats later.
 *
 * A club arrives at juggler `j` at some absolute time. If `j`'s own phase is
 * within `tolerance` of a beat at that moment, the catch succeeds. If not, the
 * club drops and **leaves play permanently**.
 *
 * THE CLUBS IN THE AIR ARE THE SHARED RESOURCE.
 *
 * Nobody replenishes them. A drop is irreversible, exactly as pool tokens taken
 * from the commons do not come back on their own, and the pattern degrades until
 * there is nothing left to pass.
 *
 * WHY IT SHOWS WHAT THE COMMONS SHOWS
 *
 * - **Drift.** Each juggler's rate carries a small error. Being 4% fast drops
 *   nothing for dozens of beats -- the pattern only breathes -- and then it goes.
 *   The long-horizon argument, made visible rather than argued.
 * - **Entrainment.** Pin `k` jugglers as perfect metronomes and the rest may or
 *   may not lock on. Same question as pacemakers in the commons; here you can
 *   watch the phases pull together.
 * - **Virtue has a ceiling.** A juggler can correct its own phase but cannot
 *   catch a club that was thrown late. Individual effort does not repair a
 *   collective rhythm.
 *
 * The natural health measure is Kuramoto's order parameter R = |mean(e^{2πiφ})|:
 * 1 when the ring is perfectly phase-locked, ~0 when it is incoherent. It is not
 * an imported analogy -- it is the obvious quantity to plot, and it happens to be
 * the coupled-oscillator statistic the coupling framing predicts.
 */

export interface JugglerState {
  phase: number; // in [0,1); crosses 1 to throw
  rate: number; // phase units per unit time; 1.0 is nominal
  bias: number; // this juggler's systematic timing error
  dropped: number;
  caught: number;
  pinned: boolean; // a metronome: perfect rate, no bias, no correction
}

export interface Club {
  from: number;
  to: number;
  launched: number; // absolute time
  lands: number; // absolute time
}

export interface PatternState {
  t: number;
  jugglers: JugglerState[];
  clubs: Club[];
  inPlay: number;
  drops: number;
  history: { t: number; inPlay: number; R: number; spread: number }[];
}

export interface PatternConfig {
  n: number;
  clubs: number;
  /** Beats a club spends in the air. */
  flight: number;
  /** How far off-beat a catch can be and still succeed, in phase units. */
  tolerance: number;
  /** Systematic rate error applied to unpinned jugglers. */
  bias: number;
  /** How strongly a juggler corrects toward what it observes. 0 = no coupling. */
  coupling: number;
  /** Jugglers 0..pinned-1 are perfect metronomes. */
  pinned: number;
  /** Every `passEvery`-th throw goes across the ring rather than to self. */
  passEvery: number;
}

export const DEFAULTS: PatternConfig = {
  n: 6,
  clubs: 12,
  flight: 2,
  tolerance: 0.16,
  bias: 0.0,
  coupling: 0.0,
  pinned: 0,
  passEvery: 2,
};

const TAU = Math.PI * 2;

/**
 * Kuramoto order parameter: 1 is perfect phase lock, 0 is incoherent.
 * Only living jugglers -- ones still holding or expecting clubs -- count.
 */
export function orderParameter(jugglers: JugglerState[]): number {
  if (!jugglers.length) return 0;
  let x = 0;
  let y = 0;
  for (const j of jugglers) {
    x += Math.cos(TAU * j.phase);
    y += Math.sin(TAU * j.phase);
  }
  return Math.hypot(x, y) / jugglers.length;
}

/** Largest pairwise phase gap, as a plain-language companion to R. */
export function phaseSpread(jugglers: JugglerState[]): number {
  const ps = jugglers.map((j) => j.phase).sort((a, b) => a - b);
  if (ps.length < 2) return 0;
  let worst = 0;
  for (let i = 0; i < ps.length; i++) {
    const next = i === ps.length - 1 ? ps[0]! + 1 : ps[i + 1]!;
    worst = Math.max(worst, next - ps[i]!);
  }
  return worst;
}

export function initial(cfg: PatternConfig, seed = 1): PatternState {
  let s = seed >>> 0 || 1;
  const rand = () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };

  // A passing pattern runs on a SHARED CLOCK with COMPLEMENTARY ROLES: everyone
  // is on the same beat, and each juggler alternates passing across the ring
  // with throwing to itself. That is the same structure as the commons -- one
  // clock, and "take and restore in equal measure" as the role alternation --
  // and it is why an in-phase ring is the healthy state here rather than the
  // anti-phase arrangement the action pattern uses.
  const jugglers: JugglerState[] = Array.from({ length: cfg.n }, (_, i) => {
    const pinned = i < cfg.pinned;
    return {
      phase: pinned ? 0 : ((rand() - 0.5) * 0.02 + 1) % 1,
      rate: 1,
      bias: pinned ? 0 : cfg.bias * (rand() * 2 - 1),
      dropped: 0,
      caught: 0,
      pinned,
    };
  });

  // Clubs land on integer beats, so a ring that keeps perfect time never drops.
  const clubs: Club[] = [];
  for (let c = 0; c < cfg.clubs; c++) {
    const to = c % cfg.n;
    clubs.push({
      from: to,
      to,
      launched: 0,
      lands: 1 + Math.floor(c / cfg.n),
    });
  }

  return {
    t: 0,
    jugglers,
    clubs,
    inPlay: clubs.length,
    drops: 0,
    history: [{ t: 0, inPlay: clubs.length, R: orderParameter(jugglers), spread: phaseSpread(jugglers) }],
  };
}

/** Advance the pattern by `dt` (in beats). */
export function step(
  state: PatternState,
  cfg: PatternConfig,
  dt = 0.05,
): PatternState {
  const t = state.t + dt;
  const jugglers = state.jugglers.map((j) => ({ ...j }));

  // Phase advance. Pinned jugglers keep perfect time; the rest carry their bias
  // and, if coupling > 0, nudge toward the ring's mean phase.
  const meanPhase = (() => {
    let x = 0;
    let y = 0;
    for (const j of jugglers) {
      x += Math.cos(TAU * j.phase);
      y += Math.sin(TAU * j.phase);
    }
    return (Math.atan2(y, x) / TAU + 1) % 1;
  })();

  for (const j of jugglers) {
    let rate = j.pinned ? 1 : 1 + j.bias;
    if (!j.pinned && cfg.coupling > 0) {
      // shortest signed distance to the mean phase, on the circle
      let d = meanPhase - j.phase;
      d -= Math.round(d);
      rate += cfg.coupling * d;
    }
    j.rate = rate;
    j.phase = (j.phase + rate * dt) % 1;
    if (j.phase < 0) j.phase += 1;
  }

  // Resolve landings.
  const clubs: Club[] = [];
  let drops = state.drops;
  // Epsilon, because t accumulates in dt-sized floating point steps and a
  // landing scheduled for beat 3 arrives at 3.0000000000000004. Without it a
  // perfect ring drops clubs for arithmetic reasons, which would make the whole
  // lab a demonstration of float error rather than of drift.
  const EPS = 1e-9;
  for (const club of state.clubs) {
    if (club.lands > t + EPS) {
      clubs.push(club);
      continue;
    }
    const receiver = jugglers[club.to]!;
    // A catch succeeds when the receiver is near a beat -- phase close to 0 or 1.
    const off = Math.min(receiver.phase, 1 - receiver.phase);
    if (off <= cfg.tolerance) {
      receiver.caught++;
      const throwIndex = receiver.caught;
      const pass = cfg.passEvery > 0 && throwIndex % cfg.passEvery === 0;
      const to = pass ? (club.to + 1 + (throwIndex % (cfg.n - 1))) % cfg.n : club.to;
      clubs.push({ from: club.to, to, launched: t, lands: t + cfg.flight });
    } else {
      // Dropped. It leaves play permanently: the shared resource shrinks.
      receiver.dropped++;
      drops++;
    }
  }

  const R = orderParameter(jugglers);
  const history = state.history.concat({
    t,
    inPlay: clubs.length,
    R,
    spread: phaseSpread(jugglers),
  });
  if (history.length > 1200) history.shift();

  return { t, jugglers, clubs, inPlay: clubs.length, drops, history };
}

export interface RunSummary {
  /** Beats until every club has been dropped, or null if the pattern held. */
  collapseTime: number | null;
  clubsRemaining: number;
  finalR: number;
  drops: number;
}

export function run(
  cfg: PatternConfig,
  beats = 120,
  seed = 1,
  dt = 0.05,
): RunSummary {
  let s = initial(cfg, seed);
  const steps = Math.round(beats / dt);
  for (let k = 0; k < steps; k++) {
    s = step(s, cfg, dt);
    if (s.inPlay === 0) {
      return { collapseTime: s.t, clubsRemaining: 0, finalR: orderParameter(s.jugglers), drops: s.drops };
    }
  }
  return {
    collapseTime: null,
    clubsRemaining: s.inPlay,
    finalR: orderParameter(s.jugglers),
    drops: s.drops,
  };
}

/**
 * The drift result, as a function rather than a claim: at what bias does the
 * pattern still survive `beats`? Returns the largest tested bias that holds.
 *
 * The point is not the number but its shape -- survival is fine, fine, fine,
 * then gone, and the transition is nowhere near where a short run would suggest.
 */
export function driftTolerance(
  base: PatternConfig,
  beats = 120,
  biases = [0, 0.001, 0.002, 0.005, 0.01, 0.02],
): { bias: number; collapseTime: number | null }[] {
  return biases.map((bias) => ({
    bias,
    collapseTime: run({ ...base, bias }, beats, 7).collapseTime,
  }));
}

/** How many metronomes does a drifting ring need before the pattern holds? */
export function metronomesNeeded(
  base: PatternConfig,
  beats = 120,
): number | null {
  for (let k = 0; k <= base.n; k++) {
    if (run({ ...base, pinned: k }, beats, 7).collapseTime === null) return k;
  }
  return null;
}
