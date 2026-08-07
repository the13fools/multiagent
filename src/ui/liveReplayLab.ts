import "./style.css";
import { el, C, HEX, mix, Ticker, renderStats, verdict, bindDials, wireControls } from "./lab";
import pddData from "./data/pdd_results.json";

interface LlmFrame {
  turn: number;
  poolBefore: number;
  poolAfter: number;
  alive: boolean[];
  balances: number[];
  harvests: (number | null)[];
}

interface LlmOutcome {
  frames: LlmFrame[];
  extinctionTurn: number | null;
  survivors: number;
}

const N = 8;
const GW = 760;
const GH = 200;
const ROWLAB = 34;
const TALLY = 84;
const VB_W = ROWLAB + GW + TALLY;
const VB_H = GH + 54;
const SVGNS = "http://www.w3.org/2000/svg";

const cellFill = (h: number | null, dead: boolean) =>
  (dead || h === null) ? HEX.dead : mix(HEX.good, HEX.bad, Math.min(1, Math.max(0, h / 10)));

let out: LlmOutcome;
let shown = 0;
let cw = 0;
let rh = GH / N;
let drawn = 0;

function loadLlmTrace(condition: string): LlmOutcome {
  const data = (pddData as any)[condition];
  if (!data) throw new Error(`Condition ${condition} not found in JSON`);
  
  const frames: LlmFrame[] = data.trace.map((t: any) => ({
    turn: t.round,
    poolBefore: t.stock_before,
    poolAfter: t.stock_after,
    alive: t.alive,
    balances: t.balances,
    harvests: t.harvests.map((h: number, i: number) => {
      if (!t.alive[i]) return null;
      return h;
    })
  }));

  const allAlive = data.alive.every(Boolean);
  const extinctionTurn = allAlive ? null : frames.length;

  return {
    frames,
    extinctionTurn,
    survivors: data.alive.filter(Boolean).length
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
    `<text x="${ROWLAB}" y="${GH + 32}" font-size="10" fill="${C.muted}">mean harvest per round (lower is more sustainable)</text>` +
    `<text x="${ROWLAB + GW + 8}" y="${GH + 32}" font-size="10" fill="${C.muted}">mean</text>` +
    `<text id="g-turns" x="${ROWLAB}" y="${GH + 48}" font-size="10" fill="${C.muted}">round 1 → 0</text>`;
}

const tallyColour = (meanHarvest: number) =>
  mix(HEX.good, HEX.bad, Math.min(1, meanHarvest / 10));

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
      const h = f.harvests[i] ?? null;
      parts.push(
        `<rect x="${(ROWLAB + t * cw).toFixed(2)}" y="${(i * rh).toFixed(2)}"
           width="${Math.max(cw - 0.4, 0.6).toFixed(2)}" height="${(rh - 1).toFixed(2)}"
           rx="3" fill="${cellFill(h, !f.alive[i])}" class="anim-cell">
           <title>Harvest: ${h !== null ? h.toFixed(2) : "Dead"}</title>
         </rect>`
      );
    }
    g.innerHTML = parts.join("");
    cells.appendChild(g);

    const acting = f.harvests.filter((h): h is number => h !== null);
    if (acting.length) {
      const mean = acting.reduce((acc, v) => acc + v, 0) / acting.length;
      const bar = document.createElementNS(SVGNS, "rect");
      bar.setAttribute("x", (ROWLAB + t * cw).toFixed(2));
      bar.setAttribute("y", String(GH + 6));
      bar.setAttribute("width", Math.max(cw - 0.4, 0.6).toFixed(2));
      bar.setAttribute("height", "10");
      bar.setAttribute("fill", tallyColour(mean));
      strip.appendChild(bar);
    }
  }
  drawn = upto;

  const bars: string[] = [];
  for (let i = 0; i < N; i++) {
    let sum = 0, acted = 0;
    for (let t = 0; t < upto; t++) {
      const h = frames[t]!.harvests[i] ?? null;
      if (h !== null) {
        sum += h;
        acted++;
      }
    }
    const mean = acted ? sum / acted : 0;
    const y = i * rh;
    const bx = ROWLAB + GW + 8;
    bars.push(
      `<rect x="${bx}" y="${y.toFixed(2)}" width="46" height="${(rh - 1).toFixed(2)}" fill="${HEX.line}"/>`,
      `<rect x="${bx}" y="${y.toFixed(2)}" width="${(46 * (mean / 10)).toFixed(1)}"
         height="${(rh - 1).toFixed(2)}" fill="${acted ? tallyColour(mean) : HEX.line}"/>`,
      `<text x="${bx + 51}" y="${(y + rh * 0.68).toFixed(1)}" font-size="9.5" fill="${C.muted}"
         font-variant-numeric="tabular-nums">${acted ? mean.toFixed(1) : "—"}</text>`
    );
  }
  document.getElementById("g-tallies")!.innerHTML = bars.join("");
  document.getElementById("g-turns")!.textContent = `round 1 → ${upto}`;
}

function drawStats(f: LlmFrame | undefined) {
  if (!f) {
    renderStats("stats", [
      { key: "Round", value: 0 },
      { key: "Stock (Pool)", value: "320.0" },
      { key: "Harvested", value: "—" },
      { key: "Regrowth", value: "—" },
    ]);
    return;
  }
  
  const acting = f.harvests.filter((h): h is number => h !== null);
  const totalHarvest = acting.reduce((acc, v) => acc + v, 0);
  
  // Regrowth happens AFTER harvest. So poolAfter = (poolBefore - harvest) + regrowth
  // Thus regrowth = poolAfter - Math.max(0, poolBefore - totalHarvest)
  const remainingBeforeRegrowth = Math.max(0, f.poolBefore - totalHarvest);
  const regrowth = f.poolAfter - remainingBeforeRegrowth;

  renderStats("stats", [
    { key: "Round", value: f.turn },
    { key: "Stock (start of round)", value: f.poolBefore.toFixed(1) },
    { key: "Total Harvested", value: totalHarvest.toFixed(1) },
    { key: "Pool Regrowth (+)", value: `+${regrowth.toFixed(1)}` },
    { key: "Stock (next round)", value: f.poolAfter.toFixed(1) },
  ]);
}

function drawBars(f: LlmFrame | undefined) {
  const svg = el("bars");
  if (!f) {
    svg.innerHTML = "";
    return;
  }

  const MAX_POOL = 320;
  const poolW = 300; 
  const poolH = 20;
  
  const parts: string[] = [];
  
  const poolFrac = Math.max(0, Math.min(1, f.poolAfter / MAX_POOL));
  const poolColor = mix("#8b5a2b", "#3b82f6", poolFrac);
  parts.push(
    `<text x="120" y="25" text-anchor="end" font-size="12" fill="${C.ink}" font-weight="600">Commons Pool</text>`,
    `<rect x="130" y="12" width="${poolW}" height="${poolH}" rx="4" fill="${HEX.line}"/>`,
    `<rect x="130" y="12" width="${poolW * poolFrac}" height="${poolH}" rx="4" fill="${poolColor}" style="transition: width 0.4s ease"/>`,
    `<text x="${130 + poolW + 10}" y="25" font-size="12" fill="${C.muted}">${f.poolAfter.toFixed(1)} / ${MAX_POOL}</text>`
  );

  const maxBal = Math.max(100, ...f.balances);
  const balW = 150;
  const startY = 45;
  
  for (let i = 0; i < N; i++) {
    const col = i < 4 ? 0 : 1;
    const row = i % 4;
    const bx = 130 + col * (balW + 120);
    const by = startY + row * 18;
    
    const bal = f.balances[i] ?? 0;
    const balFrac = Math.max(0, Math.min(1, bal / maxBal));
    const isDead = !(f.alive[i] ?? true);
    const color = isDead ? HEX.dead : C.ink;
    
    parts.push(
      `<text x="${bx - 10}" y="${by + 10}" text-anchor="end" font-size="11" fill="${C.muted}">Agent ${i}</text>`,
      `<rect x="${bx}" y="${by}" width="${balW}" height="12" rx="2" fill="${HEX.line}"/>`,
      `<rect x="${bx}" y="${by}" width="${balW * balFrac}" height="12" rx="2" fill="${color}" style="transition: width 0.4s ease"/>`,
      `<text x="${bx + balW + 5}" y="${by + 10}" font-size="11" fill="${C.muted}">${bal.toFixed(1)}</text>`
    );
  }
  
  svg.innerHTML = parts.join("");
}

const ticker = new Ticker(() => {
  shown++;
  const f = out.frames[shown - 1];
  drawGrid();
  drawStats(f);
  drawBars(f);
  if (shown >= out.frames.length) {
    const whole = out.survivors === N;
    const what = out.extinctionTurn !== null
      ? `Extinction by round ${out.extinctionTurn}`
      : whole ? `All eight alive at end` : `${out.survivors} of ${N} alive`;
    verdict("verdict", what, whole ? "live" : "dead");
    return false;
  }
  return true;
}, 500); // Slower playback to read stats

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
  drawBars(undefined);
  ticker.play();
}

bindDials(() => run());
wireControls(ticker, { play: "play", step: "step", reset: "reset" }, run);

el("grid").setAttribute("viewBox", `0 0 ${VB_W} ${VB_H}`);

run();
