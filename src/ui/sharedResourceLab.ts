import "./style.css";
import { mountArc } from "./arc";
import { el, C, HEX, mix, Ticker, renderStats, verdict, applyEmbedMode, bindDials, wireControls } from "./lab";
import { turnDiagram, ledgerFigure } from "./figures";
import {
  HORIZON, POLICIES, REFERENCE, carryingCapacity, pNeed, pSelf, pacemakersNeeded,
  simulate, slack, type Action, type Frame, type Outcome, type Params,
} from "../core/sharedResource";

applyEmbedMode();

const N = 8;

/**
 * The default run.
 *
 * It used to open on "copy the majority" with nobody pinned, which is both the
 * least informative cell in the space and a contradiction in terms: a follower
 * rule with nothing to follow. Four of eight held to the correct phase is the
 * page's actual subject -- half the grid is a perfect checkerboard, the other
 * half imitates it, and the flock still dies at turn 31. Two more controlled
 * seats and it lives, which is the thing worth discovering.
 */
const DEFAULT_RULE = "copy";

/**
 * The colouring grid is the lab, not an illustration beside it.
 *
 * It used to render into a 372x136 viewBox inside a 150px-tall box, letterboxed
 * next to a large ring diagram -- a small strip in the corner of something else.
 * It is now full width and the ring is gone, because the ring was decoration and
 * the grid is the science: the pool holds level only when every COLUMN is half
 * green, and an agent survives only when its own ROW is half green.
 */
const GW = 760;          // grid width in viewBox units
const GH = 200;          // grid height
const ROWLAB = 34;       // left gutter for agent labels
const TALLY = 84;        // right gutter for per-agent tallies
const VB_W = ROWLAB + GW + TALLY;
const VB_H = GH + 54;    // room for the per-turn strip and axis labels

const cellFill = (a: Action | null, dead: boolean) =>
  dead ? HEX.dead : a === "restore" ? HEX.good : a === "take" ? HEX.bad : HEX.line;

const num = (id: string) => Number((el(id) as HTMLInputElement).value);
const params = (): Params => ({ ...REFERENCE, G: num("G") });
const options = () => ({ n: N, turns: HORIZON, params: params(), pinned: num("k") });

let out: Outcome;
let shown = 0;

/* ------------------------------------------------------------------ grid
 *
 * The grid is drawn INCREMENTALLY: each tick appends one column and nothing
 * else moves.
 *
 * It used to rebuild the whole SVG from a string every tick. That was fine
 * while the cells were plain rects, and became a strobe light the moment they
 * were given a pop-in animation -- innerHTML replaces every node, so every one
 * of the 1,600 cells was brand new on every frame and every one of them
 * replayed its entry animation together. The page flashed rather than advanced.
 *
 * So the scaffolding is built once per run and the per-frame work is a single
 * appendChild into <g id="cells">. Only genuinely new cells animate, which is
 * what the animation was for.
 */

const SVGNS = "http://www.w3.org/2000/svg";

/** Layers, so each part of the picture can be updated on its own schedule. */
const layer = (id: string) => document.getElementById(id)!;

let cw = 0;         // column width for the run in progress
let rh = GH / N;
let drawn = 0;      // how many columns are already in the DOM

const tallyColour = (frac: number, target: number) =>
  mix(HEX.good, HEX.bad, Math.min(1, Math.abs(frac - target) / 0.5));

/** Built once per run: labels, axes, the target line, and the empty layers. */
function buildGrid() {
  const frames = out.frames;
  cw = GW / Math.max(frames.length, 1);
  rh = GH / N;
  drawn = 0;

  const target = pNeed(params());
  const pinned = num("k");
  const tx = ROWLAB + GW + 8 + 46 * target;
  const rows: string[] = [];
  for (let i = 0; i < N; i++) {
    rows.push(
      `<text x="${ROWLAB - 6}" y="${(i * rh + rh * 0.65).toFixed(1)}" text-anchor="end"
         font-size="10" fill="${C.muted}">${i}${i < pinned ? "●" : ""}</text>`,
    );
  }

  el("grid").innerHTML =
    `<g id="g-rows">${rows.join("")}</g>` +
    `<g id="g-cells"></g><g id="g-strip"></g><g id="g-tallies"></g>` +
    `<line x1="${tx.toFixed(1)}" y1="0" x2="${tx.toFixed(1)}" y2="${GH}"
       stroke="${C.ink}" stroke-width="1" stroke-dasharray="2 2"/>` +
    `<text x="${ROWLAB}" y="${GH + 32}" font-size="10" fill="${C.muted}">each turn's restore share — every column must sit near ${target.toFixed(2)}</text>` +
    `<text x="${ROWLAB + GW + 8}" y="${GH + 32}" font-size="10" fill="${C.muted}">per agent</text>` +
    `<text id="g-turns" x="${ROWLAB}" y="${GH + 48}" font-size="10" fill="${C.muted}">turn 1 → 0</text>`;
}

/** Per tick: append the columns that are new, then refresh the tallies. */
function drawGrid() {
  const frames = out.frames;
  const target = pNeed(params());
  const upto = Math.min(shown, frames.length);
  if (upto < drawn) buildGrid();      // a run restarted under us

  const cells = layer("g-cells");
  const strip = layer("g-strip");

  for (let t = drawn; t < upto; t++) {
    const f = frames[t]!;
    const g = document.createElementNS(SVGNS, "g");
    const parts: string[] = [];
    for (let i = 0; i < N; i++) {
      parts.push(
        `<rect x="${(ROWLAB + t * cw).toFixed(2)}" y="${(i * rh).toFixed(2)}"
           width="${Math.max(cw - 0.4, 0.6).toFixed(2)}" height="${(rh - 1).toFixed(2)}"
           rx="3" fill="${cellFill(f.actions[i]!, !f.alive[i])}" class="anim-cell"/>`,
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
      bar.setAttribute("fill", tallyColour(frac, target));
      strip.appendChild(bar);
    }
  }
  drawn = upto;

  // Running tallies change every turn, so these are rewritten rather than
  // appended -- but they carry no entry animation, so a rewrite is invisible.
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
         height="${(rh - 1).toFixed(2)}" fill="${acted ? tallyColour(frac, target) : HEX.line}"/>`,
      `<text x="${bx + 51}" y="${(y + rh * 0.68).toFixed(1)}" font-size="9.5" fill="${C.muted}"
         font-variant-numeric="tabular-nums">${acted ? frac.toFixed(2) : "—"}</text>`,
    );
  }
  layer("g-tallies").innerHTML = bars.join("");
  layer("g-turns").textContent = `turn 1 → ${upto}`;
}

function drawStats(f: Frame | undefined) {
  const acting = f ? f.actions.filter(Boolean) : [];
  const r = acting.filter((a) => a === "restore").length;
  renderStats("stats", [
    { key: "Turn", value: f ? f.turn : 0 },
    { key: "Pool", value: f ? f.pool.toFixed(0) : "30" },
    { key: "Alive", value: f ? f.alive.filter(Boolean).length : N },
    { key: "Restore rate", value: acting.length ? (r / acting.length).toFixed(2) : "—" },
    { key: "Required", value: pNeed(params()).toFixed(2) },
  ]);
}

function drawTheory() {
  const p = params();
  const cap = carryingCapacity(p, N);
  el("theory").innerHTML = `
    <code>p_self = (S−L)/(R+S) = ${pSelf(p).toFixed(3)}</code> &nbsp;
    <code>p_need = S/(G+S) = ${pNeed(p).toFixed(3)}</code> &nbsp;
    <code>slack = ${slack(p).toFixed(3)}</code><br>
    <span class="muted">Closed form: a flock of ${N} survives
    <b>${cap < 0 ? "nothing — the game is unwinnable at these numbers"
        : `${cap} permanent defector${cap === 1 ? "" : "s"}`}</b>.
    Ground truth for the empirical threshold, not an estimate.</span>`;
}

function drawTable() {
  const o = options();
  const rows = Object.values(POLICIES).map(({ label, fn }) => ({
    label,
    k: pacemakersNeeded(fn, { n: o.n, turns: o.turns, params: o.params }),
  }));
  rows.sort((a, b) => (b.k ?? 99) - (a.k ?? 99));
  el("entrain").innerHTML =
    `<table><tr><th>if the others decide by</th><th>agents you must control, of ${N}</th></tr>` +
    rows.map((r) =>
      `<tr><td>${r.label}</td><td class="num">${
        r.k === null ? "never survives"
        : r.k === N ? `${N} — no entrainment`
        : r.k === 0 ? "0 — survives alone" : r.k}</td></tr>`).join("") +
    `</table><p class="muted">Computed over ${HORIZON} turns at G=${o.params.G} — the same
     horizon and parameters the grid above runs.</p>`;
}

/* ------------------------------------------------------------------ loop */

const ticker = new Ticker(() => {
  shown++;
  const f = out.frames[shown - 1];
  drawGrid();
  drawStats(f);
  if (shown >= out.frames.length) {
    const died = out.extinctionTurn !== null;
    verdict("verdict",
      died ? `✕ extinct at turn ${out.extinctionTurn}`
           : `✓ sustained ${HORIZON} turns — ${out.survivors}/${N} alive`,
      died ? "dead" : "live");
    return false;
  }
  return true;
}, 250);

function run() {
  ticker.stop();
  const key = (el("rule") as HTMLSelectElement).value;
  out = simulate(POLICIES[key]!.fn, options());
  shown = 0;
  verdict("verdict", "", "");
  buildGrid();
  drawGrid();
  drawStats(undefined);
  ticker.play();
}

/* ---------------------------------------------------------------- wiring */

// Static explainers first: the rules, then why alternating closes both ledgers.
// A reader arriving cold should not have to infer the mechanics from a moving
// grid.
el("fig-turn").innerHTML = turnDiagram();
el("fig-ledger").innerHTML = ledgerFigure();

el("grid").setAttribute("viewBox", `0 0 ${VB_W} ${VB_H}`);
(el("rule") as HTMLSelectElement).innerHTML = Object.entries(POLICIES)
  .map(([k, v]) => `<option value="${k}"${k === DEFAULT_RULE ? " selected" : ""}>${v.label}</option>`)
  .join("");

/**
 * Says the current setup back to you in words.
 *
 * The dials read "4 of 8" and "copy the majority", which is precise and tells
 * you nothing about what you are about to watch. This is the same state as a
 * sentence, and it changes when the dials do.
 */
function drawSetup() {
  const k = num("k");
  const label = POLICIES[(el("rule") as HTMLSelectElement).value]!.label;
  el("setup").textContent =
    k === 0
      ? `Nobody is being steered. All 8 agents ${label}.`
      : k === N
        ? `All 8 agents alternate correctly. This is the solution, running.`
        : `${k} of 8 agents alternate correctly, whatever happens. The other ${N - k} ${label}.`;
}

bindDials(() => { drawSetup(); drawTheory(); drawTable(); run(); });
wireControls(ticker, { play: "play", step: "step", reset: "reset" }, run);

drawSetup();
drawTheory();
drawTable();
run();

mountArc("shared-resource");
