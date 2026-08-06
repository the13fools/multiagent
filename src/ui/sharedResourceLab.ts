import "./style.css";
import { el, C, Ticker, renderStats, verdict, applyEmbedMode } from "./lab";
import {
  HORIZON,
  POLICIES,
  REFERENCE,
  carryingCapacity,
  pNeed,
  pSelf,
  pacemakersNeeded,
  simulate,
  slack,
  type Action,
  type Frame,
  type Outcome,
  type Params,
} from "../core/sharedResource";

applyEmbedMode();

const N = 8;

const colour = (a: Action | null, dead: boolean) =>
  dead ? C.dead
  : a === "restore" ? C.good
  : a === "take" ? C.bad
  : C.line;

/* --------------------------------------------------------------- config */

const num = (id: string) => Number((el(id) as HTMLInputElement).value);

function params(): Params {
  return { ...REFERENCE, G: num("G") };
}

/** Everything the animation and every table are computed against. One object,
 *  so the page cannot describe two different runs at once. */
function options() {
  return { n: N, turns: HORIZON, params: params(), pinned: num("k") };
}

let out: Outcome;
let shown = 0;

/* --------------------------------------------------------------- render */

function drawRing(f: Frame | undefined) {
  const pinned = num("k");
  const parts: string[] = [];
  for (let i = 0; i < N; i++) {
    const ang = (i / N) * 2 * Math.PI - Math.PI / 2;
    const x = 125 + 82 * Math.cos(ang);
    const y = 125 + 82 * Math.sin(ang);
    const dead = !!f && !f.alive[i];
    parts.push(
      `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="18"
         fill="${colour(f ? f.actions[i]! : null, dead)}"
         ${i < pinned ? `stroke="${C.ink}" stroke-width="3.5"` : ""}/>`,
      `<text x="${x.toFixed(1)}" y="${(y + 4).toFixed(1)}" text-anchor="middle"
         font-size="12" fill="#fff" font-weight="600">${i}</text>`,
    );
  }
  const pool = f ? f.pool : 30;
  const frac = Math.max(0, Math.min(1, pool / 60));
  parts.push(
    `<circle cx="125" cy="125" r="40" fill="none" stroke="${C.line}" stroke-width="8"/>`,
    `<circle cx="125" cy="125" r="40" fill="none" stroke="${pool <= 0 ? C.bad : C.good}"
       stroke-width="8" stroke-linecap="round" transform="rotate(-90 125 125)"
       stroke-dasharray="${(frac * 251).toFixed(1)} 251"/>`,
    `<text x="125" y="122" text-anchor="middle" font-size="17" font-weight="700"
       fill="${C.ink}">${pool.toFixed(0)}</text>`,
    `<text x="125" y="138" text-anchor="middle" font-size="10" fill="${C.muted}">pool</text>`,
  );
  el("ring").innerHTML = parts.join("");
}

/**
 * The colouring grid, with its two constraints made visible.
 *
 * The page claims the pool holds level only when every COLUMN is half restoring,
 * and an agent survives only when its own ROW is half restoring. Those are the
 * whole point, and until now the reader had to take them on trust while looking
 * at an undifferentiated field of squares. Now each row and each column carries
 * a tally that goes green when it is on target and red as it drifts off, so the
 * failure is legible: a conformist flock shows whole columns going one colour,
 * a doomed individual shows one red row.
 */
const GRID_W = 320;
const GRID_H = 112;

function drawGrid() {
  // Sized to the run that actually happened, not to a fixed horizon, so a
  // 14-turn collapse reads as 14 wide columns rather than a sliver against 200
  // turns of empty space.
  const frames = out.frames;
  const cols = Math.max(frames.length, 1);
  const cw = GRID_W / cols;
  const rh = GRID_H / N;
  const target = pNeed(params());
  const upto = Math.min(shown, frames.length);
  const parts: string[] = [];

  // how close a tally is to the required rate, as a 0..1 badness
  const bad = (frac: number) => Math.min(1, Math.abs(frac - target) / 0.5);
  const tallyFill = (frac: number) =>
    `color-mix(in srgb, ${C.good} ${((1 - bad(frac)) * 100).toFixed(0)}%, ${C.bad})`;

  for (let t = 0; t < upto; t++) {
    const f = frames[t]!;
    for (let i = 0; i < N; i++) {
      parts.push(
        `<rect x="${(t * cw).toFixed(2)}" y="${(i * rh).toFixed(2)}"
           width="${Math.max(cw - 0.3, 0.5).toFixed(2)}" height="${(rh - 0.8).toFixed(2)}"
           fill="${colour(f.actions[i]!, !f.alive[i])}"/>`,
      );
    }
    // column tally: share of this turn's actors that restored
    const acting = f.actions.filter(Boolean);
    if (acting.length) {
      const frac = acting.filter((a) => a === "restore").length / acting.length;
      parts.push(
        `<rect x="${(t * cw).toFixed(2)}" y="${GRID_H + 4}"
           width="${Math.max(cw - 0.3, 0.5).toFixed(2)}" height="7"
           fill="${tallyFill(frac)}"/>`,
      );
    }
  }

  // row tallies: each agent's own restore share so far
  for (let i = 0; i < N; i++) {
    let r = 0;
    let acted = 0;
    for (let t = 0; t < upto; t++) {
      const a = frames[t]!.actions[i];
      if (a === "restore") r++;
      if (a) acted++;
    }
    const frac = acted ? r / acted : 0;
    const y = i * rh;
    parts.push(
      `<rect x="${GRID_W + 5}" y="${y.toFixed(2)}" width="30" height="${(rh - 0.8).toFixed(2)}"
         fill="${C.line}"/>`,
      `<rect x="${GRID_W + 5}" y="${y.toFixed(2)}" width="${(30 * frac).toFixed(1)}"
         height="${(rh - 0.8).toFixed(2)}" fill="${acted ? tallyFill(frac) : C.line}"/>`,
      `<text x="${GRID_W + 39}" y="${(y + rh - 3).toFixed(1)}" font-size="8"
         fill="${C.muted}" font-variant-numeric="tabular-nums">${
           acted ? frac.toFixed(2) : "—"
         }</text>`,
    );
  }

  // the target line on the row tallies
  parts.push(
    `<line x1="${GRID_W + 5 + 30 * target}" y1="0" x2="${GRID_W + 5 + 30 * target}"
       y2="${GRID_H}" stroke="${C.ink}" stroke-width="1" stroke-dasharray="2 2"/>`,
    `<text x="0" y="${GRID_H + 20}" font-size="8" fill="${C.muted}">per-turn restore share</text>`,
    `<text x="${GRID_W + 5}" y="${GRID_H + 20}" font-size="8" fill="${C.muted}">per-agent</text>`,
  );
  el("grid").innerHTML = parts.join("");
}

function drawStats(f: Frame | undefined) {
  const acting = f ? f.actions.filter(Boolean) : [];
  const r = acting.filter((a) => a === "restore").length;
  renderStats("stats", [
    { key: "Turn", value: f ? f.turn : 0 },
    { key: "Pool", value: f ? f.pool.toFixed(0) : "30" },
    { key: "Alive", value: f ? f.alive.filter(Boolean).length : N },
    { key: "Restore rate", value: acting.length ? (r / acting.length).toFixed(2) : "—" },
  ]);
}

/* --------------------------------------------------------------- theory */

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

/**
 * Recomputed on every parameter change, against the same options the animation
 * uses. It previously ran once at load, so raising G updated the theory box and
 * the simulation while the table went on describing G=3.
 */
function drawTable() {
  const o = options();
  const rows = Object.values(POLICIES).map(({ label, fn }) => ({
    label,
    k: pacemakersNeeded(fn, { n: o.n, turns: o.turns, params: o.params }),
  }));
  rows.sort((a, b) => (b.k ?? 99) - (a.k ?? 99));
  el("entrain").innerHTML =
    `<table><tr><th>follower rule</th><th>pacemakers needed, of ${N}</th></tr>` +
    rows
      .map(
        (r) =>
          `<tr><td>${r.label}</td><td class="num">${
            r.k === null ? "never survives"
            : r.k === N ? `${N} — no entrainment`
            : r.k === 0 ? "0 — survives alone"
            : r.k
          }</td></tr>`,
      )
      .join("") +
    `</table><p class="muted">Computed over ${HORIZON} turns at G=${o.params.G} — the same
     horizon and parameters the animation above runs.</p>`;
}

/* ------------------------------------------------------------------ loop */

const ticker = new Ticker(() => {
  shown++;
  const f = out.frames[shown - 1];
  drawRing(f);
  drawGrid();
  drawStats(f);
  if (shown >= out.frames.length) {
    const died = out.extinctionTurn !== null;
    verdict(
      "verdict",
      died
        ? `✕ extinct at turn ${out.extinctionTurn}`
        : `✓ sustained ${HORIZON} turns — ${out.survivors}/${N} alive`,
      died ? "dead" : "live",
    );
    return false;
  }
  return true;
}, 45);

function run() {
  ticker.stop();
  const key = (el("rule") as HTMLSelectElement).value;
  out = simulate(POLICIES[key]!.fn, options());
  shown = 0;
  verdict("verdict", "", "");
  drawRing(undefined);
  drawGrid();
  drawStats(undefined);
  ticker.play();
}

/* ---------------------------------------------------------------- wiring */

(el("rule") as HTMLSelectElement).innerHTML = Object.entries(POLICIES)
  .map(([k, v]) => `<option value="${k}">${v.label}</option>`)
  .join("");

el("k").addEventListener("input", () => {
  el("klab").textContent = String(num("k"));
});

for (const id of ["rule", "k", "G"]) {
  el(id).addEventListener("change", () => {
    drawTheory();
    drawTable();
    run();
  });
}
el("go").addEventListener("click", run);

drawTheory();
drawTable();
run();
