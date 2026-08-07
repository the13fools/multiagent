import "./style.css";
import { mountArc } from "./arc";
import { el, hue, C, Ticker, renderStats, verdict, linePlot, applyEmbedMode, bindDials } from "./lab";
import { initial, step, equilibriaCount, type BoardwalkState } from "../core/boardwalk";
import { beachFigure } from "./figures";

applyEmbedMode();

/**
 * Migrated to the shared harness. This was the lab the harness was extracted
 * for and then did not adopt, which is exactly the drift the harness exists to
 * prevent -- it had its own `$`, its own bare `let timer`, and four separate
 * clearInterval calls.
 */

const W = 620;
const PAD = 26;
const x = (p: number) => PAD + p * (W - 2 * PAD);

let state: BoardwalkState;
let trail: number[][] = [];

const n = () => Number((el("n") as HTMLInputElement).value);

function draw() {
  const parts: string[] = [];

  parts.push(`<rect x="${PAD}" y="54" width="${W - 2 * PAD}" height="5" rx="2.5" fill="${C.line}"/>`);
  // the storefronts. Vendors choose among these, not among the reals, which is
  // why a move is a visible jump rather than a 0.01 shuffle.
  for (let g = 0; g < 21; g++) {
    parts.push(`<rect x="${x(g / 20) - 0.5}" y="53" width="1" height="7" fill="${C.line}"/>`);
  }
  for (let i = 0; i <= 4; i++) {
    const p = i / 4;
    parts.push(`<text x="${x(p)}" y="80" text-anchor="middle" font-size="10" fill="${C.muted}">${p}</text>`);
  }

  // catchment bands, so the incentive to move is visible rather than inferred
  const sorted = state.positions.map((p, i) => ({ p, i })).sort((a, b) => a.p - b.p);
  sorted.forEach((v, j) => {
    const lo = j === 0 ? 0 : (sorted[j - 1]!.p + v.p) / 2;
    const hi = j === sorted.length - 1 ? 1 : (v.p + sorted[j + 1]!.p) / 2;
    parts.push(
      `<rect x="${x(lo)}" y="40" width="${Math.max(x(hi) - x(lo), 0)}" height="14"
         fill="${hue(v.i)}" opacity="0.16"/>`,
    );
  });

  state.positions.forEach((p, i) => {
    const justMoved = state.moved === i;
    if (justMoved) {
      parts.push(`<circle cx="${x(p)}" cy="56" r="14" fill="none" stroke="${hue(i)}"
        stroke-width="1.5" opacity="0.5"/>`);
    }
    parts.push(
      `<circle cx="${x(p)}" cy="56" r="9" fill="${hue(i)}"/>`,
      `<text x="${x(p)}" y="60" text-anchor="middle" font-size="10" fill="#fff" font-weight="700">${i + 1}</text>`,
      `<text x="${x(p)}" y="30" text-anchor="middle" font-size="10.5" fill="${C.muted}"
         font-variant-numeric="tabular-nums">${(state.shares[i]! * 100).toFixed(0)}%</text>`,
    );
  });
  el("beach").innerHTML = parts.join("");

  // position against round: a flat line is a settled market, a wave is a market
  // chasing itself. Pinned to [0,1] so runs are comparable across restarts.
  el("trail").innerHTML = linePlot(
    state.positions.map((_, i) => ({ points: trail.map((row) => row[i]!) })),
    { w: W, h: 150, yMin: 0, yMax: 1 },
  );

  const spread = Math.max(...state.positions) - Math.min(...state.positions);
  renderStats("stats", [
    { key: "Moves", value: state.turn },
    { key: "Just moved", value: state.moved === undefined ? "—" : `vendor ${state.moved + 1}` },
    { key: "Spread", value: spread.toFixed(2) },
    { key: "Vendors", value: state.positions.length },
  ]);
}

/**
 * One vendor moves per round, so "nobody wants to move" is only true after a
 * full sweep in which nobody did. The old check compared one round against the
 * previous one, which under simultaneous updates was the same question -- and
 * under sequential updates would declare victory the moment any single vendor
 * happened to stay put.
 */
let still = 0;

const ticker = new Ticker(() => {
  const before = state.positions.slice();
  state = step(state);
  trail.push(state.positions.slice());
  if (trail.length > 200) trail.shift();
  draw();

  const moved = state.positions.reduce((m, p, i) => Math.max(m, Math.abs(p - before[i]!)), 0);
  still = moved < 1e-9 ? still + 1 : 0;
  if (still >= state.positions.length) {
    verdict("verdict",
      `✓ settled after ${state.turn - still} moves — nobody wants to move`, "live");
    return false;
  }
  if (state.turn > 300) {
    verdict("verdict", "↻ still moving after 300 moves — there is no rest point to find", "dead");
    return false;
  }
  return true;
}, 260);

function reset() {
  ticker.stop();
  state = initial(n(), Math.floor(Math.random() * 1e6));
  trail = [state.positions.slice()];
  still = 0;
  verdict("verdict", "", "");
  draw();
}

function census() {
  el("census").innerHTML = `<p class="muted">counting…</p>`;
  window.setTimeout(() => {
    const rows = [2, 3, 4].map((k) => {
      const found = equilibriaCount(k, k === 4 ? 13 : 15);
      return `<tr><td>${k}</td><td class="num">${found.length === 0 ? "<b>none</b>" : found.length}</td>
        <td class="mono">${found.length ? found[0]!.map((v) => v.toFixed(2)).join(", ") : "—"}</td></tr>`;
    });
    el("census").innerHTML =
      `<table><tr><th>vendors</th><th>pure equilibria</th><th>example</th></tr>${rows.join("")}</table>`;
  }, 30);
}

bindDials(() => { reset(); ticker.play(); });
el("reset").addEventListener("click", () => { reset(); ticker.play(); });
el("play").addEventListener("click", () => ticker.toggle());
el("stepBtn").addEventListener("click", () => ticker.step());
document.getElementById("censusBtn")?.addEventListener("click", census);

// The three cases as still pictures, so the animation has something to be
// compared against rather than being the only evidence.
document.getElementById("fig-cases")!.innerHTML =
  `<div style="display:flex;gap:16px;flex-wrap:wrap;justify-content:center">` +
  beachFigure([0.5, 0.5], "two — both at the centre, settled") +
  beachFigure([0.25, 0.5, 0.75], "three — no arrangement is stable") +
  beachFigure([0.25, 0.25, 0.75, 0.75], "four — paired at the quartiles") +
  `</div>`;

reset();
ticker.play();

mountArc("boardwalk");
