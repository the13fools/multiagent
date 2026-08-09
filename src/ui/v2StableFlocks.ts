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

export type StabilityMode = "commons" | "boardwalk" | "juggling";

export const STABILITY_MODES: Record<StabilityMode, {
  eyebrow: string;
  title: string;
  description: string;
}> = {
  commons: {
    eyebrow: "01 · HOLD AN INVARIANT",
    title: "The flock moves. The commons stays level.",
    description: "Alternating restore and take holds the pool level and returns each personal balance to its starting point every two turns.",
  },
  boardwalk: {
    eyebrow: "02 · NO REST POINT",
    title: "Three vendors chase a position that does not exist.",
    description: "Sequential best response settles with two or four vendors. With three, the boardwalk has no pure-strategy equilibrium.",
  },
  juggling: {
    eyebrow: "03 · KEEP A RHYTHM",
    title: "A stable pattern can be made entirely of motion.",
    description: "The ring survives when players keep phase, catch what arrives, and pass the shared objects onward.",
  },
};

export const STABLE_DEFAULTS = {
  jugglingTimingErrorPercent: 1,
  jugglingListening: 0.2,
  jugglingControlledPlayers: 1,
} as const;

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
  root.innerHTML = `
    <div class="stable-mode-tabs" role="tablist" aria-label="Kinds of stable collective motion">
      <button type="button" role="tab" data-stable-mode="commons" aria-selected="true"><span>01</span> Commons</button>
      <button type="button" role="tab" data-stable-mode="boardwalk" aria-selected="false"><span>02</span> Boardwalk</button>
      <button type="button" role="tab" data-stable-mode="juggling" aria-selected="false"><span>03</span> Juggling</button>
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

  let mode: StabilityMode = "commons";
  let playing = !window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
  let commonsPolicy: CommonsPolicyName = "solution";
  let commonsFrames = commonsRun(commonsPolicy);
  let commonsIndex = 0;
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

  const advance = (elapsedMs = 50) => {
    accumulator += elapsedMs;
    if (mode === "commons" && accumulator >= 620) {
      accumulator = 0;
      commonsIndex = (commonsIndex + 1) % commonsFrames.length;
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
      advance(mode === "juggling" ? 50 : 700);
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
