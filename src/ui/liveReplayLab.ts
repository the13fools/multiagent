import "./style.css";
import { el, C, HEX, mix, Ticker, renderStats, verdict, bindDials, wireControls } from "./lab";
import pddData from "./data/pdd_results.json";
import type { Frame, Outcome, Action } from "../core/sharedResource";

const N = 8;
const GW = 760;
const GH = 200;
const ROWLAB = 34;
const TALLY = 84;
const VB_W = ROWLAB + GW + TALLY;
const VB_H = GH + 54;
const SVGNS = "http://www.w3.org/2000/svg";

const cellFill = (a: Action | null, dead: boolean) =>
  dead ? HEX.dead : a === "restore" ? HEX.good : a === "take" ? HEX.bad : HEX.line;

let out: Outcome;
let shown = 0;
let cw = 0;
let rh = GH / N;
let drawn = 0;

function loadLlmTrace(condition: string): Outcome {
  const data = (pddData as any)[condition];
  if (!data) throw new Error(`Condition ${condition} not found in JSON`);
  
  const frames: Frame[] = data.trace.map((t: any) => ({
    turn: t.round,
    pool: t.stock_before,
    alive: t.alive,
    balances: t.balances,
    actions: t.harvests.map((h: number, i: number) => {
      if (!t.alive[i]) return null;
      return h > 2 ? "take" : "restore";
    })
  }));

  let restores = 0;
  let acted = 0;
  for (const f of frames) {
    for (const a of f.actions) {
      if (a === "restore") { restores++; acted++; }
      else if (a === "take") { acted++; }
    }
  }
  const observedRestoreRate = acted ? restores / acted : 0;

  const allAlive = data.alive.every(Boolean);
  const extinctionTurn = allAlive ? null : frames.length;

  return {
    frames,
    extinctionTurn,
    survivors: data.alive.filter(Boolean).length,
    observedRestoreRate,
    restoreRateGap: observedRestoreRate - 0.5
  };
}

function buildGrid() {
  const frames = out.frames;
  cw = GW / Math.max(frames.length, 1);
  rh = GH / N;
  drawn = 0;

  const tx = ROWLAB + GW + 8 + 46 * 0.5;
  const rows: string[] = [];
  for (let i = 0; i < N; i++) {
    rows.push(
      `<text x="${ROWLAB - 6}" y="${(i * rh + rh * 0.65).toFixed(1)}" text-anchor="end"
         font-size="10" fill="${C.muted}" font-weight="400">${i}</text>`
    );
  }

  el("grid").innerHTML =
    `<g id="g-rows">${rows.join("")}</g>` +
    `<g id="g-cells"></g><g id="g-strip"></g><g id="g-tallies"></g>` +
    `<line x1="${tx.toFixed(1)}" y1="0" x2="${tx.toFixed(1)}" y2="${GH}"
       stroke="${C.ink}" stroke-width="1" stroke-dasharray="2 2"/>` +
    `<text x="${ROWLAB}" y="${GH + 32}" font-size="10" fill="${C.muted}">each turn's 'restore' share (harvest ≤ 2)</text>` +
    `<text x="${ROWLAB + GW + 8}" y="${GH + 32}" font-size="10" fill="${C.muted}">per agent</text>` +
    `<text id="g-turns" x="${ROWLAB}" y="${GH + 48}" font-size="10" fill="${C.muted}">round 1 → 0</text>`;
}

const tallyColour = (frac: number, target: number) =>
  mix(HEX.good, HEX.bad, Math.min(1, Math.abs(frac - target) / 0.5));

function drawGrid() {
  const frames = out.frames;
  const upto = Math.min(shown, frames.length);
  if (upto < drawn) buildGrid();

  const cells = document.getElementById("g-cells")!;
  const strip = document.getElementById("g-strip")!;

  for (let t = drawn; t < upto; t++) {
    const f = frames[t]!;
    const g = document.createElementNS(SVGNS, "g");
    const parts: string[] = [];
    for (let i = 0; i < N; i++) {
      parts.push(
        `<rect x="${(ROWLAB + t * cw).toFixed(2)}" y="${(i * rh).toFixed(2)}"
           width="${Math.max(cw - 0.4, 0.6).toFixed(2)}" height="${(rh - 1).toFixed(2)}"
           rx="3" fill="${cellFill(f.actions[i]!, !f.alive[i])}" class="anim-cell"/>`
      );
    }
    g.innerHTML = parts.join("");
    cells.appendChild(g);

    const acting = f.actions.filter(Boolean);
    if (acting.length) {
      const frac = acting.filter((a) => a === "restore").length / acting.length;
      const bar = document.createElementNS(SVGNS, "rect");
      bar.setAttribute("x", (ROWLAB + t * cw).toFixed(2));
      bar.setAttribute("y", String(GH + 6));
      bar.setAttribute("width", Math.max(cw - 0.4, 0.6).toFixed(2));
      bar.setAttribute("height", "10");
      bar.setAttribute("fill", tallyColour(frac, 0.5));
      strip.appendChild(bar);
    }
  }
  drawn = upto;

  const bars: string[] = [];
  for (let i = 0; i < N; i++) {
    let r = 0, acted = 0;
    for (let t = 0; t < upto; t++) {
      const a = frames[t]!.actions[i];
      if (a === "restore") r++;
      if (a) acted++;
    }
    const frac = acted ? r / acted : 0;
    const y = i * rh;
    const bx = ROWLAB + GW + 8;
    bars.push(
      `<rect x="${bx}" y="${y.toFixed(2)}" width="46" height="${(rh - 1).toFixed(2)}" fill="${HEX.line}"/>`,
      `<rect x="${bx}" y="${y.toFixed(2)}" width="${(46 * frac).toFixed(1)}"
         height="${(rh - 1).toFixed(2)}" fill="${acted ? tallyColour(frac, 0.5) : HEX.line}"/>`,
      `<text x="${bx + 51}" y="${(y + rh * 0.68).toFixed(1)}" font-size="9.5" fill="${C.muted}"
         font-variant-numeric="tabular-nums">${acted ? frac.toFixed(2) : "—"}</text>`
    );
  }
  document.getElementById("g-tallies")!.innerHTML = bars.join("");
  document.getElementById("g-turns")!.textContent = `round 1 → ${upto}`;
}

function drawStats(f: Frame | undefined) {
  const acting = f ? f.actions.filter(Boolean) : [];
  const r = acting.filter((a) => a === "restore").length;
  renderStats("stats", [
    { key: "Round", value: f ? f.turn : 0 },
    { key: "Stock (Pool)", value: f ? f.pool.toFixed(1) : "320.0" },
    { key: "Alive", value: f ? f.alive.filter(Boolean).length : N },
    { key: "Restraint ('restore') rate", value: acting.length ? (r / acting.length).toFixed(2) : "—" },
  ]);
}

const ticker = new Ticker(() => {
  shown++;
  const f = out.frames[shown - 1];
  drawGrid();
  drawStats(f);
  if (shown >= out.frames.length) {
    const whole = out.survivors === N;
    const what = out.extinctionTurn !== null
      ? `Extinction by round ${out.extinctionTurn}`
      : whole ? `All eight alive at end` : `${out.survivors} of ${N} alive`;
    verdict("verdict", what, whole ? "live" : "dead");
    return false;
  }
  return true;
}, 250);

function run() {
  ticker.stop();
  const key = (el("run-select") as HTMLSelectElement).value;
  out = loadLlmTrace(key);
  shown = 0;
  verdict("verdict", "", "");
  el("setup").innerHTML = key === "cfa8" 
    ? "<b>Trained LLM (8 CFA):</b> The agents start cautiously, then experience reward collapse and become hyper-greedy, extracting maximum profit until the pool is destroyed."
    : key === "cfa4mix"
    ? "<b>Mixed (4 CFA, 4 Base):</b> The trained agents attempt to maximize their harvest, competing with the baseline agents."
    : "<b>Base Qwen2.5-7B (0 CFA):</b> Baseline agents take moderate harvests, steadily draining the pool until it collapses.";
  buildGrid();
  drawGrid();
  drawStats(undefined);
  ticker.play();
}

bindDials(() => run());
wireControls(ticker, { play: "play", step: "step", reset: "reset" }, run);

el("grid").setAttribute("viewBox", `0 0 ${VB_W} ${VB_H}`);

run();
