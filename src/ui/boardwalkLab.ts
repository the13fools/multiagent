import "./style.css";
import { el, hue, C, Ticker, renderStats, verdict, linePlot, applyEmbedMode } from "./lab";
import { initial, step, equilibriaCount, type BoardwalkState } from "../core/boardwalk";

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
    { key: "Round", value: state.turn },
    { key: "Spread", value: spread.toFixed(3) },
    { key: "Vendors", value: state.positions.length },
  ]);
}

const ticker = new Ticker(() => {
  const before = state.positions.slice();
  state = step(state, 81);
  trail.push(state.positions.slice());
  if (trail.length > 120) trail.shift();
  draw();

  const moved = state.positions.reduce((m, p, i) => Math.max(m, Math.abs(p - before[i]!)), 0);
  if (moved < 1e-9) {
    verdict("verdict", "✓ settled — nobody wants to move", "live");
    return false;
  }
  if (state.turn > 260) {
    verdict("verdict", "↻ still moving after 260 rounds — no rest point to find", "dead");
    return false;
  }
  return true;
}, 90);

function reset() {
  ticker.stop();
  state = initial(n(), Math.floor(Math.random() * 1e6));
  trail = [state.positions.slice()];
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

el("n").addEventListener("change", () => { reset(); ticker.play(); });
el("reset").addEventListener("click", () => { reset(); ticker.play(); });
el("play").addEventListener("click", () => ticker.toggle());
el("stepBtn").addEventListener("click", () => ticker.step());
document.getElementById("censusBtn")?.addEventListener("click", census);

reset();
ticker.play();
