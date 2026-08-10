import {
  initial as initialBoardwalk,
  step as stepBoardwalk,
  type BoardwalkState,
} from "../core/boardwalk";
import {
  DEFAULTS as JUGGLING_DEFAULTS,
  initial as initialJuggling,
  orderParameter,
  step as stepJuggling,
  type PatternConfig,
  type PatternState,
} from "../core/juggling";
import {
  POLICIES,
  simulate,
  type Frame,
  type Policy,
} from "../core/sharedResource";
import { byDose, type CommonsCondition } from "../core/commonsPilot";

export type StabilityMode = "commons" | "harvest" | "boardwalk" | "juggling";

export const STABILITY_MODES: Record<StabilityMode, {
  eyebrow: string;
  title: string;
  description: string;
}> = {
  commons: {
    eyebrow: "01 · SHARED RESOURCE · HOLD AN INVARIANT",
    title: "The flock moves. The shared pool stays level.",
    description: "Alternating restore and take holds the pool level and returns each personal balance to its starting point every two turns.",
  },
  harvest: {
    eyebrow: "02 · COMMON HARVEST · EXPERIMENT 1 SOURCE GAME",
    title: "Training changed how long the common resource lasted.",
    description: "Replay the one-seed trajectories for zero, four, or eight post-trained agents. Collapse moved from round 33 to 90 to 170; every resource still failed.",
  },
  boardwalk: {
    eyebrow: "01 · NO REST POINT",
    title: "Three vendors chase a position that does not exist.",
    description: "Sequential best response settles with two or four vendors. With three, the boardwalk has no pure-strategy equilibrium.",
  },
  juggling: {
    eyebrow: "02 · KEEP A RHYTHM",
    title: "A stable pattern can be made entirely of motion.",
    description: "The ring survives when players keep phase, catch what arrives, and pass the shared objects onward.",
  },
};

const MODE_LABELS: Record<StabilityMode, string> = {
  commons: "Shared Resource",
  harvest: "Common Harvest",
  boardwalk: "Boardwalk",
  juggling: "Juggling",
};

const ALL_MODES: readonly StabilityMode[] = ["commons", "harvest", "boardwalk", "juggling"];

export const STABLE_DEFAULTS = {
  jugglingTimingErrorPercent: 1,
  jugglingListening: 0.2,
  jugglingControlledPlayers: 1,
} as const;

export const COMMONS_FRAME_MS = 620;
export const COMMONS_COLLAPSE_HOLD_MS = 4_800;

export function commonsFrameDelay(frame: Frame, index: number, total: number): number {
  const isCollapsedFinalFrame = index === total - 1 && frame.alive.every((alive) => !alive);
  return isCollapsedFinalFrame ? COMMONS_COLLAPSE_HOLD_MS : COMMONS_FRAME_MS;
}

const COLORS = ["#70d7ff", "#ffb45c", "#cf8cff", "#80e0b2", "#ff7b8a", "#f7df73", "#7f9cff", "#f29ee2"];
const INK = "#f5f3ff";
const MUTED = "#aaa5bf";
const LINE = "#48415f";
const GOOD = "#80e0b2";
const BAD = "#ff7b6b";
const ACCENT = "#70d7ff";

const clamp = (x: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, x));
const esc = (value: string | number) => String(value)
  .replaceAll("&", "&amp;")
  .replaceAll("<", "&lt;")
  .replaceAll(">", "&gt;")
  .replaceAll('"', "&quot;");

function polyline(points: { x: number; y: number }[]): string {
  return points.map((point) => `${point.x.toFixed(1)},${point.y.toFixed(1)}`).join(" ");
}

function grid(): string {
  return `<defs>
    <pattern id="stable-grid" width="28" height="28" patternUnits="userSpaceOnUse">
      <path d="M 28 0 L 0 0 0 28" fill="none" stroke="#332c49" stroke-width="1" opacity="0.55"/>
    </pattern>
    <marker id="stable-arrow-in" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="6" markerHeight="6" orient="auto">
      <path d="M0,0 L8,4 L0,8 Z" fill="${GOOD}"/>
    </marker>
    <marker id="stable-arrow-out" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="6" markerHeight="6" orient="auto">
      <path d="M0,0 L8,4 L0,8 Z" fill="${BAD}"/>
    </marker>
  </defs><rect width="900" height="460" fill="#1b1430"/><rect width="900" height="460" fill="url(#stable-grid)"/>`;
}

function sceneLabel(eyebrow: string, title: string): string {
  return `<text x="28" y="34" fill="${ACCENT}" font-size="10" font-family="ui-monospace,monospace" font-weight="700" letter-spacing="1.2">${esc(eyebrow)}</text>
    <text x="28" y="59" fill="${INK}" font-size="17" font-family="ui-sans-serif,system-ui" font-weight="700">${esc(title)}</text>`;
}

type CommonsPolicyName = "solution" | "take" | "restore";

function commonsRun(policy: CommonsPolicyName): Frame[] {
  const fn: Policy = policy === "restore" ? () => "restore" : POLICIES[policy]!.fn;
  return simulate(fn, { turns: 60, pool0: 30, balance0: 10 }).frames;
}

function commonsScene(frame: Frame, policy: CommonsPolicyName): { svg: string; metrics: [string, string][]; status: string } {
  const cx = 450;
  const cy = 228;
  const maxPool = 70;
  const pondR = 62 + 52 * clamp(frame.pool / maxPool, 0, 1);
  const living = frame.alive.filter(Boolean).length;
  const actionName = policy === "solution" ? "alternate" : policy === "take" ? "take only" : "restore only";
  const people = frame.actions.map((action, i) => {
    const angle = -Math.PI / 2 + (i / frame.actions.length) * Math.PI * 2;
    const x = cx + Math.cos(angle) * 260;
    const y = cy + Math.sin(angle) * 142;
    const innerX = cx + Math.cos(angle) * (pondR + 15);
    const innerY = cy + Math.sin(angle) * (pondR + 15);
    const alive = frame.alive[i];
    const restore = action === "restore";
    const line = action === null ? "" : restore
      ? `<line x1="${x}" y1="${y}" x2="${innerX}" y2="${innerY}" stroke="${GOOD}" stroke-width="2" stroke-dasharray="5 5" marker-end="url(#stable-arrow-in)" opacity="0.72"/>`
      : `<line x1="${innerX}" y1="${innerY}" x2="${x}" y2="${y}" stroke="${BAD}" stroke-width="2" stroke-dasharray="5 5" marker-end="url(#stable-arrow-out)" opacity="0.72"/>`;
    const rotation = alive ? (angle * 180 / Math.PI + 90) : 90;
    const color = alive ? COLORS[i % COLORS.length] : "#6b6678";
    return `${line}<g transform="translate(${x.toFixed(1)} ${y.toFixed(1)}) rotate(${rotation.toFixed(1)})" opacity="${alive ? 1 : 0.62}">
      <path d="M-13 8 L0 -16 L13 8 L0 4 Z" fill="${color}" stroke="#fff" stroke-opacity="0.34"/>
      <circle cx="0" cy="4" r="3" fill="#1b1430"/>
    </g>
    <text x="${x.toFixed(1)}" y="${(y + 28).toFixed(1)}" fill="${alive ? MUTED : BAD}" text-anchor="middle" font-size="9" font-family="ui-monospace,monospace">${alive ? `${frame.balances[i]!.toFixed(0)} tokens` : "fallen"}</text>`;
  }).join("");
  const poolColor = frame.pool < 10 ? BAD : ACCENT;
  const status = living === 8 && policy === "solution"
    ? "Invariant held: every movement is balanced by a complementary movement."
    : living === 0
      ? policy === "restore"
        ? "The pond survived. Its stewards did not."
        : "The flock is gone. A strategy can fail after the resource does."
      : policy === "take"
        ? "Extraction is borrowing time from the future."
        : "The flock is still moving through the known sustainable rhythm.";
  return {
    svg: `${grid()}${sceneLabel(STABILITY_MODES.commons.eyebrow, "Take and restore in equal measure")}
      <ellipse cx="${cx}" cy="${cy}" rx="282" ry="164" fill="none" stroke="${LINE}" stroke-dasharray="3 7"/>
      ${people}
      <circle cx="${cx}" cy="${cy}" r="${pondR.toFixed(1)}" fill="${poolColor}" fill-opacity="0.14" stroke="${poolColor}" stroke-width="2"/>
      <circle cx="${cx}" cy="${cy}" r="${Math.max(pondR - 9, 1).toFixed(1)}" fill="none" stroke="${poolColor}" stroke-opacity="0.38"/>
      <text x="${cx}" y="${cy - 4}" fill="${INK}" text-anchor="middle" font-size="30" font-family="ui-monospace,monospace" font-weight="700">${frame.pool.toFixed(0)}</text>
      <text x="${cx}" y="${cy + 20}" fill="${MUTED}" text-anchor="middle" font-size="10" font-family="ui-monospace,monospace" letter-spacing="1">POOL TOKENS</text>
      <text x="28" y="434" fill="${MUTED}" font-size="10" font-family="ui-monospace,monospace">arrows show this turn · green restores · coral takes</text>`,
    metrics: [["turn", String(frame.turn)], ["strategy", actionName], ["pool", frame.pool.toFixed(0)], ["alive", `${living} / 8`]],
    status,
  };
}

const HARVEST_CONDITIONS = byDose();

function harvestScene(condition: CommonsCondition, index: number): { svg: string; metrics: [string, string][]; status: string } {
  const cx = 230;
  const cy = 235;
  const stock = condition.stock[index] ?? 0;
  const maxStock = Math.max(...HARVEST_CONDITIONS.flatMap((item) => item.stock));
  const maxRound = Math.max(...HARVEST_CONDITIONS.map((item) => item.collapseRound));
  const pondR = 30 + 92 * Math.sqrt(clamp(stock / maxStock, 0, 1));
  const x0 = 486;
  const x1 = 850;
  const y0 = 112;
  const y1 = 374;
  const x = (round: number) => x0 + (round / maxRound) * (x1 - x0);
  const y = (value: number) => y1 - (value / maxStock) * (y1 - y0);
  const conditionColor = (seeded: number) => seeded === 0 ? "#aaa5bf" : seeded === 4 ? GOOD : ACCENT;
  const playedRound = index > 0 ? condition.trace[index - 1] : undefined;

  const curves = HARVEST_CONDITIONS.map((item) => {
    const points = item.stock.map((value, round) => `${x(round).toFixed(1)},${y(value).toFixed(1)}`).join(" ");
    const selected = item.seeded === condition.seeded;
    const labelX = x(item.collapseRound);
    return `<polyline points="${points}" fill="none" stroke="${conditionColor(item.seeded)}" stroke-width="${selected ? 3 : 1.4}" opacity="${selected ? 1 : 0.28}"/>
      <circle cx="${labelX.toFixed(1)}" cy="${y(0).toFixed(1)}" r="${selected ? 4 : 2.5}" fill="${conditionColor(item.seeded)}" opacity="${selected ? 1 : 0.48}"/>
      <text x="${labelX.toFixed(1)}" y="${(y(0) + 18 + item.seeded * 0.7).toFixed(1)}" fill="${conditionColor(item.seeded)}" text-anchor="middle" font-size="8.5" font-family="ui-monospace,monospace" opacity="${selected ? 1 : 0.58}">${item.seeded} trained · r${item.collapseRound}</text>`;
  }).join("");

  const agents = Array.from({ length: 8 }, (_, i) => {
    const angle = -Math.PI / 2 + (i / 8) * Math.PI * 2;
    const ax = cx + Math.cos(angle) * 170;
    const ay = cy + Math.sin(angle) * 145;
    const trained = condition.roles[i] === "cfa";
    const color = trained ? COLORS[i % COLORS.length] : "#777185";
    const harvest = playedRound?.harvests[i];
    const pondX = cx + Math.cos(angle) * (pondR + 8);
    const pondY = cy + Math.sin(angle) * (pondR + 8);
    const harvestArrow = harvest === undefined ? "" : `<line x1="${pondX.toFixed(1)}" y1="${pondY.toFixed(1)}" x2="${(ax - Math.cos(angle) * 17).toFixed(1)}" y2="${(ay - Math.sin(angle) * 17).toFixed(1)}" stroke="${BAD}" stroke-width="${(1 + Math.min(harvest, 10) * 0.16).toFixed(1)}" stroke-dasharray="4 4" marker-end="url(#stable-arrow-out)" opacity="0.58"/>`;
    const hat = trained
      ? `<path d="M-8 -12 L8 -12 L5 -21 L-5 -21 Z" fill="${color}" stroke="#f5f3ff" stroke-opacity="0.55"/><line x1="-11" y1="-11" x2="11" y2="-11" stroke="#f5f3ff" stroke-opacity="0.65"/>`
      : "";
    return `${harvestArrow}<g transform="translate(${ax.toFixed(1)} ${ay.toFixed(1)})" opacity="${stock > 0 ? 1 : 0.58}">
      <circle cy="-3" r="8" fill="${color}"/><path d="M-12 18 Q-10 2 0 1 Q10 2 12 18 Z" fill="${color}"/>
      ${hat}
      <text y="31" fill="${harvest === undefined ? MUTED : INK}" text-anchor="middle" font-size="8.5" font-family="ui-monospace,monospace">${harvest === undefined ? "waiting" : `${harvest.toFixed(2)} take`}</text>
    </g>`;
  }).join("");

  const collapsed = index >= condition.stock.length - 1 || stock <= 0;
  const status = collapsed
    ? condition.seeded === 8
      ? "Round 170: full post-training delayed collapse by 137 rounds. It did not find a sustainable strategy."
      : `Round ${condition.collapseRound}: this population exhausted the resource.`
    : index === 0
      ? `${condition.label}: press Play or One step to begin the recorded strategy trace.`
      : `${condition.label}: round ${index} harvested ${playedRound!.harvests.reduce((sum, value) => sum + value, 0).toFixed(1)} in total; the stock remains positive.`;

  return {
    svg: `${grid()}${sceneLabel(STABILITY_MODES.harvest.eyebrow, "One trace per population · no effect estimate")}
      <circle cx="${cx}" cy="${cy}" r="126" fill="none" stroke="${LINE}" stroke-dasharray="3 7"/>
      ${agents}
      <circle cx="${cx}" cy="${cy}" r="${pondR.toFixed(1)}" fill="${stock > 0 ? ACCENT : BAD}" fill-opacity="0.18" stroke="${stock > 0 ? ACCENT : BAD}" stroke-width="2"/>
      <circle cx="${cx}" cy="${cy}" r="${Math.max(pondR - 9, 2).toFixed(1)}" fill="none" stroke="${stock > 0 ? ACCENT : BAD}" stroke-opacity="0.4"/>
      <text x="${cx}" y="${cy - 3}" fill="${INK}" text-anchor="middle" font-size="29" font-family="ui-monospace,monospace" font-weight="700">${stock.toFixed(0)}</text>
      <text x="${cx}" y="${cy + 20}" fill="${MUTED}" text-anchor="middle" font-size="9" font-family="ui-monospace,monospace" letter-spacing="1">COMMON STOCK</text>
      <text x="${cx}" y="${cy + 139}" fill="${MUTED}" text-anchor="middle" font-size="9" font-family="ui-monospace,monospace">arrows replay logged harvests · hats mark post-trained seats</text>
      <line x1="${x0}" y1="${y1}" x2="${x1}" y2="${y1}" stroke="${LINE}"/><line x1="${x0}" y1="${y0}" x2="${x0}" y2="${y1}" stroke="${LINE}"/>
      <text x="${x0}" y="94" fill="${MUTED}" font-size="10" font-family="ui-monospace,monospace">OBSERVED STOCK TRAJECTORIES</text>
      <text x="${x0 - 8}" y="${(y(maxStock) + 3).toFixed(1)}" fill="${MUTED}" text-anchor="end" font-size="8" font-family="ui-monospace,monospace">${maxStock}</text>
      <text x="${x0 - 8}" y="${(y(0) + 3).toFixed(1)}" fill="${MUTED}" text-anchor="end" font-size="8" font-family="ui-monospace,monospace">0</text>
      ${curves}
      <line x1="${x(index).toFixed(1)}" y1="${y0}" x2="${x(index).toFixed(1)}" y2="${y1}" stroke="${INK}" stroke-opacity="0.22"/>
      <circle cx="${x(index).toFixed(1)}" cy="${y(stock).toFixed(1)}" r="5" fill="${conditionColor(condition.seeded)}" stroke="${INK}" stroke-width="1.5"/>
      <text x="28" y="434" fill="${MUTED}" font-size="10" font-family="ui-monospace,monospace">observed actions and stock · one diagnostic seed per population</text>`,
    metrics: [["round", String(index)], ["post-trained", `${condition.seeded} / 8`], ["stock", stock.toFixed(0)], ["collapse", `round ${condition.collapseRound}`]],
    status,
  };
}

function boardwalkScene(state: BoardwalkState, history: number[][], stableSweeps: number): { svg: string; metrics: [string, string][]; status: string } {
  const x = (p: number) => 92 + p * 716;
  const y = 205;
  const sorted = state.positions.map((p, i) => ({ p, i })).sort((a, b) => a.p - b.p);
  const bands = sorted.map((vendor, rank) => {
    const lo = rank === 0 ? 0 : (sorted[rank - 1]!.p + vendor.p) / 2;
    const hi = rank === sorted.length - 1 ? 1 : (vendor.p + sorted[rank + 1]!.p) / 2;
    return `<rect x="${x(lo).toFixed(1)}" y="158" width="${Math.max(0, x(hi) - x(lo)).toFixed(1)}" height="48" fill="${COLORS[vendor.i % COLORS.length]}" opacity="0.14"/>`;
  }).join("");
  const storefronts = Array.from({ length: 21 }, (_, i) => `<line x1="${x(i / 20).toFixed(1)}" y1="200" x2="${x(i / 20).toFixed(1)}" y2="214" stroke="${LINE}"/>`).join("");
  const vendors = state.positions.map((position, i) => {
    const moved = state.moved === i;
    return `<g transform="translate(${x(position).toFixed(1)} ${y})">
      ${moved ? `<circle r="23" fill="none" stroke="${COLORS[i % COLORS.length]}" opacity="0.55"/>` : ""}
      <circle r="14" fill="${COLORS[i % COLORS.length]}"/>
      <text y="4" fill="#171126" text-anchor="middle" font-size="11" font-family="ui-monospace,monospace" font-weight="800">${i + 1}</text>
      <text y="-26" fill="${MUTED}" text-anchor="middle" font-size="10" font-family="ui-monospace,monospace">${(state.shares[i]! * 100).toFixed(0)}%</text>
    </g>`;
  }).join("");
  const recent = history.slice(-70);
  const trails = state.positions.map((_, i) => {
    const pts = recent.map((row, j) => ({ x: 92 + (j / Math.max(1, recent.length - 1)) * 716, y: 405 - row[i]! * 112 }));
    return `<polyline points="${polyline(pts)}" fill="none" stroke="${COLORS[i % COLORS.length]}" stroke-width="1.8" opacity="0.9"/>`;
  }).join("");
  const settled = stableSweeps >= state.positions.length;
  const restPoint = state.positions.length === 3 ? "none" : "exists";
  const status = settled
    ? `Settled after ${Math.max(0, state.turn - stableSweeps)} moves: nobody can improve by moving.`
    : state.positions.length === 3
      ? "Still chasing. With three vendors there is no pure rest point to find."
      : "Best responses are still moving toward a rest point.";
  return {
    svg: `${grid()}${sceneLabel(STABILITY_MODES.boardwalk.eyebrow, `${state.positions.length} vendors · sequential best response`)}
      <text x="92" y="134" fill="${MUTED}" font-size="10" font-family="ui-monospace,monospace">UNIFORM CUSTOMERS · NEAREST VENDOR WINS</text>
      ${bands}<line x1="92" y1="207" x2="808" y2="207" stroke="${INK}" stroke-width="3"/>${storefronts}${vendors}
      <text x="92" y="273" fill="${MUTED}" font-size="10" font-family="ui-monospace,monospace">POSITION OVER TIME · FLAT MEANS SETTLED</text>
      <line x1="92" y1="405" x2="808" y2="405" stroke="${LINE}"/><line x1="92" y1="293" x2="92" y2="405" stroke="${LINE}"/>${trails}
      <text x="28" y="434" fill="${MUTED}" font-size="10" font-family="ui-monospace,monospace">the highlighted ring marks the vendor that just moved</text>`,
    metrics: [["moves", String(state.turn)], ["vendors", String(state.positions.length)], ["pure rest point", restPoint], ["motion", settled ? "settled" : "chasing"]],
    status,
  };
}

function jugglingScene(state: PatternState, cfg: PatternConfig): { svg: string; metrics: [string, string][]; status: string } {
  const cx = 450;
  const cy = 220;
  const radius = 151;
  const phaseVector = state.jugglers.reduce((sum, juggler) => ({
    x: sum.x + Math.cos(juggler.phase * Math.PI * 2),
    y: sum.y + Math.sin(juggler.phase * Math.PI * 2),
  }), { x: 0, y: 0 });
  const meanPhase = (Math.atan2(phaseVector.y, phaseVector.x) / (Math.PI * 2) + 1) % 1;
  const seat = (i: number) => {
    const a = -Math.PI / 2 + i / cfg.n * Math.PI * 2;
    return { x: cx + Math.cos(a) * radius, y: cy + Math.sin(a) * radius, a };
  };
  const ring = `<circle cx="${cx}" cy="${cy}" r="${radius}" fill="none" stroke="${LINE}" stroke-width="1.5" stroke-dasharray="4 7"/>`;
  const clubs = state.clubs.map((club) => {
    const from = seat(club.from);
    const to = seat(club.to);
    const u = clamp((state.t - club.launched) / Math.max(0.001, club.lands - club.launched), 0, 1);
    let x = from.x + (to.x - from.x) * u;
    let y = from.y + (to.y - from.y) * u;
    if (club.from === club.to) {
      x += Math.sin(u * Math.PI * 2) * 28;
      y -= Math.sin(u * Math.PI) * 34;
    } else {
      const dx = to.x - from.x;
      const dy = to.y - from.y;
      const length = Math.max(1, Math.hypot(dx, dy));
      x += (-dy / length) * Math.sin(u * Math.PI) * 32;
      y += (dx / length) * Math.sin(u * Math.PI) * 32;
    }
    return `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="5" fill="${COLORS[club.from % COLORS.length]}" stroke="#fff" stroke-opacity="0.5"/>`;
  }).join("");
  const jugglers = state.jugglers.map((juggler, i) => {
    const p = seat(i);
    const phaseAngle = juggler.phase * Math.PI * 2 - Math.PI / 2;
    let phaseError = juggler.phase - meanPhase;
    phaseError -= Math.round(phaseError);
    const health = 1 - clamp(Math.abs(phaseError) / cfg.tolerance, 0, 1);
    const color = juggler.pinned ? ACCENT : health > 0.48 ? GOOD : BAD;
    return `<g transform="translate(${p.x.toFixed(1)} ${p.y.toFixed(1)})">
      ${juggler.pinned ? `<circle r="23" fill="${ACCENT}" opacity="0.18"/>` : ""}
      <circle r="15" fill="${color}" stroke="${juggler.pinned ? ACCENT : "#fff"}" stroke-opacity="0.5" stroke-width="${juggler.pinned ? 2.5 : 1}"/>
      <line x1="0" y1="0" x2="${(Math.cos(phaseAngle) * 11).toFixed(1)}" y2="${(Math.sin(phaseAngle) * 11).toFixed(1)}" stroke="#171126" stroke-width="2"/>
      <text y="30" fill="${MUTED}" text-anchor="middle" font-size="9" font-family="ui-monospace,monospace">${juggler.pinned ? "metronome" : `player ${i + 1}`}</text>
    </g>`;
  }).join("");
  const recent = state.history.slice(-220);
  const rPoints = recent.map((h, i) => ({ x: 620 + (i / Math.max(1, recent.length - 1)) * 230, y: 395 - h.R * 86 }));
  const clubPoints = recent.map((h, i) => ({ x: 620 + (i / Math.max(1, recent.length - 1)) * 230, y: 395 - (h.inPlay / Math.max(1, cfg.clubs)) * 86 }));
  const R = orderParameter(state.jugglers);
  const status = state.inPlay === 0
    ? "The pattern collapsed: every club has left play."
    : R > 0.9
      ? "Phase locked. Motion is the stable state."
      : "The ring is drifting; listen for catches beginning to fail.";
  return {
    svg: `${grid()}${sceneLabel(STABILITY_MODES.juggling.eyebrow, `${cfg.n} players · ${cfg.clubs} shared clubs`)}
      ${ring}${clubs}${jugglers}
      <text x="620" y="286" fill="${MUTED}" font-size="10" font-family="ui-monospace,monospace">RHYTHM + RESOURCE</text>
      <line x1="620" y1="395" x2="850" y2="395" stroke="${LINE}"/><line x1="620" y1="309" x2="620" y2="395" stroke="${LINE}"/>
      <polyline points="${polyline(rPoints)}" fill="none" stroke="${ACCENT}" stroke-width="1.7"/>
      <polyline points="${polyline(clubPoints)}" fill="none" stroke="${GOOD}" stroke-width="1.7"/>
      <text x="620" y="420" fill="${ACCENT}" font-size="9" font-family="ui-monospace,monospace">phase lock R</text>
      <text x="710" y="420" fill="${GOOD}" font-size="9" font-family="ui-monospace,monospace">clubs remaining</text>
      <text x="28" y="434" fill="${MUTED}" font-size="10" font-family="ui-monospace,monospace">a bright halo marks a player you control</text>`,
    metrics: [["beat", state.t.toFixed(1)], ["phase lock R", R.toFixed(2)], ["clubs", `${state.inPlay} / ${cfg.clubs}`], ["drops", String(state.drops)]],
    status,
  };
}

export function mountStableFlocks(root: HTMLElement): () => void {
  const requestedModes = (root.dataset.stableModes ?? "")
    .split(",")
    .map((value) => value.trim())
    .filter((value): value is StabilityMode => ALL_MODES.includes(value as StabilityMode));
  const modes = requestedModes.length ? requestedModes : [...ALL_MODES];
  root.innerHTML = `
    <div class="stable-mode-tabs" role="tablist" aria-label="Kinds of stable collective motion">
      ${modes.map((value, index) => `<button type="button" role="tab" data-stable-mode="${value}" aria-selected="${index === 0}"><span>${String(index + 1).padStart(2, "0")}</span> ${MODE_LABELS[value]}</button>`).join("")}
    </div>
    <div class="stable-stage">
      <svg class="stable-scene" viewBox="0 0 900 460" role="img" aria-label="Animated comparison of collective stability"></svg>
      <div class="stable-panel">
        <p class="stable-eyebrow"></p>
        <h3 class="stable-title"></h3>
        <p class="stable-description"></p>
        <div class="stable-metrics" aria-live="polite"></div>
        <div class="stable-controls"></div>
        <p class="stable-status" aria-live="polite"></p>
        <div class="stable-transport">
          <button type="button" data-stable-action="toggle">Pause</button>
          <button type="button" data-stable-action="step">One step</button>
          <button type="button" data-stable-action="reset">Reset</button>
        </div>
      </div>
    </div>`;

  const scene = root.querySelector<SVGElement>(".stable-scene")!;
  const eyebrow = root.querySelector<HTMLElement>(".stable-eyebrow")!;
  const title = root.querySelector<HTMLElement>(".stable-title")!;
  const description = root.querySelector<HTMLElement>(".stable-description")!;
  const metrics = root.querySelector<HTMLElement>(".stable-metrics")!;
  const controls = root.querySelector<HTMLElement>(".stable-controls")!;
  const status = root.querySelector<HTMLElement>(".stable-status")!;
  const toggle = root.querySelector<HTMLButtonElement>('[data-stable-action="toggle"]')!;

  let mode: StabilityMode = modes[0]!;
  let playing = !window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
  let commonsPolicy: CommonsPolicyName = "solution";
  let commonsFrames = commonsRun(commonsPolicy);
  let commonsIndex = 0;
  let harvestCondition = HARVEST_CONDITIONS.find((item) => item.seeded === 8) ?? HARVEST_CONDITIONS[0]!;
  let harvestIndex = 0;
  let boardwalkN = 3;
  let boardwalk = initialBoardwalk(boardwalkN, 7, 21);
  let boardwalkHistory = [boardwalk.positions.slice()];
  let boardwalkStill = 0;
  let jugglingBias = STABLE_DEFAULTS.jugglingTimingErrorPercent * 10;
  let jugglingCoupling = STABLE_DEFAULTS.jugglingListening * 100;
  let jugglingPinned: number = STABLE_DEFAULTS.jugglingControlledPlayers;
  let jugglingConfig: PatternConfig = {
    ...JUGGLING_DEFAULTS,
    bias: jugglingBias / 1000,
    coupling: jugglingCoupling / 100,
    pinned: jugglingPinned,
  };
  let juggling = initialJuggling(jugglingConfig, 7);
  let accumulator = 0;

  const resetMode = () => {
    accumulator = 0;
    if (mode === "commons") {
      commonsFrames = commonsRun(commonsPolicy);
      commonsIndex = 0;
    } else if (mode === "harvest") {
      harvestIndex = 0;
    } else if (mode === "boardwalk") {
      boardwalk = initialBoardwalk(boardwalkN, 7, 21);
      boardwalkHistory = [boardwalk.positions.slice()];
      boardwalkStill = 0;
    } else {
      jugglingConfig = {
        ...JUGGLING_DEFAULTS,
        bias: jugglingBias / 1000,
        coupling: jugglingCoupling / 100,
        pinned: Math.min(jugglingPinned, JUGGLING_DEFAULTS.n),
      };
      juggling = initialJuggling(jugglingConfig, 7);
    }
  };

  const renderControls = () => {
    if (mode === "commons") {
      controls.innerHTML = `<fieldset><legend>Population rule</legend>
        ${(["solution", "take", "restore"] as CommonsPolicyName[]).map((value) => `<button type="button" data-commons-policy="${value}" aria-pressed="${commonsPolicy === value}">${value === "solution" ? "alternate" : value === "take" ? "take only" : "restore only"}</button>`).join("")}
      </fieldset>`;
    } else if (mode === "harvest") {
      controls.innerHTML = `<fieldset><legend>Population mix</legend>
        ${HARVEST_CONDITIONS.map((item) => `<button type="button" data-harvest-seeded="${item.seeded}" aria-pressed="${harvestCondition.seeded === item.seeded}">${item.seeded === 0 ? "0 · base" : item.seeded === 4 ? "4 · mixed" : "8 · trained"}</button>`).join("")}
      </fieldset>`;
    } else if (mode === "boardwalk") {
      controls.innerHTML = `<fieldset><legend>Vendors</legend>
        ${[2, 3, 4].map((value) => `<button type="button" data-boardwalk-n="${value}" aria-pressed="${boardwalkN === value}">${value}</button>`).join("")}
      </fieldset>`;
    } else {
      controls.innerHTML = `<label><span>Timing error <output>${(jugglingBias / 10).toFixed(1)}%</output></span><input type="range" min="0" max="12" step="1" value="${jugglingBias}" data-juggling-control="bias"></label>
        <label><span>How hard they listen <output>${(jugglingCoupling / 100).toFixed(2)}</output></span><input type="range" min="0" max="100" step="5" value="${jugglingCoupling}" data-juggling-control="coupling"></label>
        <label><span>Players you control <output>${jugglingPinned}</output></span><input type="range" min="0" max="${JUGGLING_DEFAULTS.n}" step="1" value="${jugglingPinned}" data-juggling-control="pinned"></label>`;
    }
  };

  const render = () => {
    const copy = STABILITY_MODES[mode];
    eyebrow.textContent = copy.eyebrow;
    title.textContent = copy.title;
    description.textContent = copy.description;
    toggle.textContent = playing ? "Pause" : "Play";
    let picture: { svg: string; metrics: [string, string][]; status: string };
    if (mode === "commons") {
      picture = commonsScene(commonsFrames[commonsIndex]!, commonsPolicy);
    } else if (mode === "harvest") {
      picture = harvestScene(harvestCondition, harvestIndex);
    } else if (mode === "boardwalk") {
      picture = boardwalkScene(boardwalk, boardwalkHistory, boardwalkStill);
    } else {
      picture = jugglingScene(juggling, jugglingConfig);
    }
    scene.innerHTML = picture.svg;
    scene.setAttribute("aria-label", `${copy.title} ${picture.status}`);
    metrics.innerHTML = picture.metrics.map(([key, value]) => `<div><span>${esc(key)}</span><strong>${esc(value)}</strong></div>`).join("");
    status.textContent = picture.status;
  };

  const advance = (elapsedMs = 50, manual = false) => {
    accumulator += elapsedMs;
    if (mode === "commons") {
      const frameDelay = manual
        ? COMMONS_FRAME_MS
        : commonsFrameDelay(commonsFrames[commonsIndex]!, commonsIndex, commonsFrames.length);
      if (accumulator < frameDelay) return;
      accumulator = 0;
      commonsIndex = (commonsIndex + 1) % commonsFrames.length;
    } else if (mode === "harvest") {
      const final = harvestIndex >= harvestCondition.stock.length - 1;
      const frameDelay = manual ? 70 : final ? COMMONS_COLLAPSE_HOLD_MS : 70;
      if (accumulator < frameDelay) return;
      accumulator = 0;
      harvestIndex = final ? 0 : harvestIndex + 1;
    } else if (mode === "boardwalk" && accumulator >= 640) {
      accumulator = 0;
      const before = boardwalk.positions.slice();
      boardwalk = stepBoardwalk(boardwalk, 21);
      boardwalkHistory.push(boardwalk.positions.slice());
      if (boardwalkHistory.length > 180) boardwalkHistory.shift();
      const moved = boardwalk.positions.reduce((worst, p, i) => Math.max(worst, Math.abs(p - before[i]!)), 0);
      boardwalkStill = moved < 1e-9 ? boardwalkStill + 1 : 0;
    } else if (mode === "juggling") {
      const steps = Math.max(1, Math.min(4, Math.round(elapsedMs / 25)));
      for (let i = 0; i < steps; i++) juggling = stepJuggling(juggling, jugglingConfig, 0.025);
      if (juggling.inPlay === 0) playing = false;
    }
  };

  root.addEventListener("click", (event) => {
    const button = (event.target as Element).closest<HTMLButtonElement>("button");
    if (!button || !root.contains(button)) return;
    const nextMode = button.dataset.stableMode as StabilityMode | undefined;
    if (nextMode) {
      mode = nextMode;
      root.querySelectorAll<HTMLButtonElement>("[data-stable-mode]").forEach((tab) => {
        tab.setAttribute("aria-selected", String(tab.dataset.stableMode === mode));
      });
      resetMode();
      renderControls();
      render();
      return;
    }
    const nextPolicy = button.dataset.commonsPolicy as CommonsPolicyName | undefined;
    if (nextPolicy) {
      commonsPolicy = nextPolicy;
      resetMode();
      renderControls();
      render();
      return;
    }
    const nextHarvestSeeded = button.dataset.harvestSeeded;
    if (nextHarvestSeeded !== undefined) {
      const found = HARVEST_CONDITIONS.find((item) => item.seeded === Number(nextHarvestSeeded));
      if (found) harvestCondition = found;
      resetMode();
      renderControls();
      render();
      return;
    }
    const nextN = Number(button.dataset.boardwalkN);
    if (nextN) {
      boardwalkN = nextN;
      resetMode();
      renderControls();
      render();
      return;
    }
    if (button.dataset.stableAction === "toggle") playing = !playing;
    if (button.dataset.stableAction === "step") {
      playing = false;
      advance(mode === "juggling" ? 50 : 700, true);
    }
    if (button.dataset.stableAction === "reset") resetMode();
    render();
  });

  root.addEventListener("input", (event) => {
    const input = event.target as HTMLInputElement;
    const control = input.dataset.jugglingControl;
    if (!control) return;
    if (control === "bias") jugglingBias = Number(input.value);
    if (control === "coupling") jugglingCoupling = Number(input.value);
    if (control === "pinned") jugglingPinned = Number(input.value);
    resetMode();
    renderControls();
    render();
  });

  let animation = 0;
  let last = 0;
  const loop = (now: number) => {
    const elapsed = last ? Math.min(100, now - last) : 16;
    last = now;
    if (playing && !document.hidden) {
      advance(elapsed);
      render();
    }
    animation = window.requestAnimationFrame(loop);
  };

  renderControls();
  render();
  animation = window.requestAnimationFrame(loop);
  return () => window.cancelAnimationFrame(animation);
}
