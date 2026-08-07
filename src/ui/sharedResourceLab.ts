import "./style.css";
import { el, C, HEX, mix, Ticker, renderStats, verdict, applyEmbedMode } from "./lab";
import { turnDiagram, ledgerFigure } from "./figures";
import {
  HORIZON, POLICIES, REFERENCE, carryingCapacity, pNeed, pSelf, pacemakersNeeded,
  simulate, slack, type Action, type Frame, type Outcome, type Params,
} from "../core/sharedResource";

applyEmbedMode();

const N = 8;

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

/* ------------------------------------------------------------------ grid */

function drawGrid() {
  const frames = out.frames;
  const cols = Math.max(frames.length, 1);
  const cw = GW / cols;
  const rh = GH / N;
  const target = pNeed(params());
  const upto = Math.min(shown, frames.length);
  const pinned = num("k");
  const s: string[] = [];

  // Distance from the required rate, as a colour. Plain hex interpolation, not
  // CSS color-mix, which is unreliable inside an SVG presentation attribute.
  const tally = (frac: number) =>
    mix(HEX.good, HEX.bad, Math.min(1, Math.abs(frac - target) / 0.5));

  for (let i = 0; i < N; i++) {
    const y = i * rh;
    s.push(
      `<text x="${ROWLAB - 6}" y="${(y + rh * 0.65).toFixed(1)}" text-anchor="end"
         font-size="10" fill="${C.muted}">${i}${i < pinned ? "●" : ""}</text>`,
    );
  }

  for (let t = 0; t < upto; t++) {
    const f = frames[t]!;
    for (let i = 0; i < N; i++) {
      s.push(
        `<rect x="${(ROWLAB + t * cw).toFixed(2)}" y="${(i * rh).toFixed(2)}"
           width="${Math.max(cw - 0.4, 0.6).toFixed(2)}" height="${(rh - 1).toFixed(2)}"
           fill="${cellFill(f.actions[i]!, !f.alive[i])}"/>`,
      );
    }
    const acting = f.actions.filter(Boolean);
    if (acting.length) {
      const frac = acting.filter((a) => a === "restore").length / acting.length;
      s.push(
        `<rect x="${(ROWLAB + t * cw).toFixed(2)}" y="${GH + 6}"
           width="${Math.max(cw - 0.4, 0.6).toFixed(2)}" height="10"
           fill="${tally(frac)}"/>`,
      );
    }
  }

  // per-agent tallies, against a dashed line at the rate the rules require
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
    s.push(
      `<rect x="${bx}" y="${y.toFixed(2)}" width="46" height="${(rh - 1).toFixed(2)}" fill="${HEX.line}"/>`,
      `<rect x="${bx}" y="${y.toFixed(2)}" width="${(46 * frac).toFixed(1)}"
         height="${(rh - 1).toFixed(2)}" fill="${acted ? tally(frac) : HEX.line}"/>`,
      `<text x="${bx + 51}" y="${(y + rh * 0.68).toFixed(1)}" font-size="9.5" fill="${C.muted}"
         font-variant-numeric="tabular-nums">${acted ? frac.toFixed(2) : "—"}</text>`,
    );
  }
  const tx = ROWLAB + GW + 8 + 46 * pNeed(params());
  s.push(
    `<line x1="${tx.toFixed(1)}" y1="0" x2="${tx.toFixed(1)}" y2="${GH}"
       stroke="${C.ink}" stroke-width="1" stroke-dasharray="2 2"/>`,
    `<text x="${ROWLAB}" y="${GH + 32}" font-size="10" fill="${C.muted}">each turn's restore share — every column must sit near ${target.toFixed(2)}</text>`,
    `<text x="${ROWLAB + GW + 8}" y="${GH + 32}" font-size="10" fill="${C.muted}">per agent</text>`,
    `<text x="${ROWLAB}" y="${GH + 48}" font-size="10" fill="${C.muted}">turn 1 → ${upto}</text>`,
  );
  el("grid").innerHTML = s.join("");
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
    `<table><tr><th>follower rule</th><th>pacemakers needed, of ${N}</th></tr>` +
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
}, 55);

function run() {
  ticker.stop();
  const key = (el("rule") as HTMLSelectElement).value;
  out = simulate(POLICIES[key]!.fn, options());
  shown = 0;
  verdict("verdict", "", "");
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
  .map(([k, v]) => `<option value="${k}">${v.label}</option>`).join("");
el("k").addEventListener("input", () => { el("klab").textContent = String(num("k")); });
for (const id of ["rule", "k", "G"]) {
  el(id).addEventListener("change", () => { drawTheory(); drawTable(); run(); });
}
el("go").addEventListener("click", run);

drawTheory();
drawTable();
run();
