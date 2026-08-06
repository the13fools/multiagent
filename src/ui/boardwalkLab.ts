import "./style.css";
import { initial, step, equilibriaCount, type BoardwalkState } from "../core/boardwalk";

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;

const HUES = ["#2f5d8a", "#c2543d", "#2d8a5f", "#8a6d2f", "#6d2f8a"];
let state: BoardwalkState;
let timer: number | undefined;
let trail: number[][] = [];

function n(): number {
  return Number(($("n") as HTMLInputElement).value);
}

function draw() {
  const W = 620, pad = 26;
  const x = (p: number) => pad + p * (W - 2 * pad);
  const out: string[] = [];

  // the beach
  out.push(`<rect x="${pad}" y="54" width="${W - 2 * pad}" height="5" rx="2.5" fill="var(--line)"/>`);
  for (let i = 0; i <= 4; i++) {
    const p = i / 4;
    out.push(`<text x="${x(p)}" y="80" text-anchor="middle" font-size="10" fill="var(--muted)">${p}</text>`);
  }

  // catchment bands
  const sorted = state.positions.map((p, i) => ({ p, i })).sort((a, b) => a.p - b.p);
  for (let j = 0; j < sorted.length; j++) {
    const lo = j === 0 ? 0 : (sorted[j - 1]!.p + sorted[j]!.p) / 2;
    const hi = j === sorted.length - 1 ? 1 : (sorted[j]!.p + sorted[j + 1]!.p) / 2;
    out.push(
      `<rect x="${x(lo)}" y="40" width="${Math.max(x(hi) - x(lo), 0)}" height="14"
        fill="${HUES[sorted[j]!.i % HUES.length]}" opacity="0.16"/>`,
    );
  }

  // vendors
  state.positions.forEach((p, i) => {
    out.push(
      `<circle cx="${x(p)}" cy="56" r="9" fill="${HUES[i % HUES.length]}"/>`,
      `<text x="${x(p)}" y="60" text-anchor="middle" font-size="10" fill="#fff" font-weight="700">${i + 1}</text>`,
      `<text x="${x(p)}" y="30" text-anchor="middle" font-size="10.5" fill="var(--muted)"
        font-variant-numeric="tabular-nums">${(state.shares[i]! * 100).toFixed(0)}%</text>`,
    );
  });
  $("beach").innerHTML = out.join("");

  // trajectory: position against turn, so cycling is visible as cycling
  const TW = 620, TH = 150;
  const t: string[] = [];
  const cols = Math.max(trail.length, 2);
  for (let i = 0; i < state.positions.length; i++) {
    const pts = trail
      .map((row, k) => `${(k / (cols - 1)) * TW},${TH - row[i]! * TH}`)
      .join(" ");
    t.push(`<polyline points="${pts}" fill="none" stroke="${HUES[i % HUES.length]}" stroke-width="1.8"/>`);
  }
  $("trail").innerHTML = t.join("");

  $("turn").textContent = String(state.turn);
  const spread = Math.max(...state.positions) - Math.min(...state.positions);
  $("spread").textContent = spread.toFixed(3);
}

function reset() {
  window.clearInterval(timer);
  state = initial(n(), Math.floor(Math.random() * 1e6));
  trail = [state.positions.slice()];
  $("settled").textContent = "";
  draw();
}

function tick() {
  const before = state.positions.slice();
  state = step(state, 81);
  trail.push(state.positions.slice());
  if (trail.length > 120) trail.shift();
  const moved = state.positions.reduce((m, p, i) => Math.max(m, Math.abs(p - before[i]!)), 0);
  draw();
  if (moved < 1e-9) {
    window.clearInterval(timer);
    const el = $("settled");
    el.textContent = "✓ settled — nobody wants to move";
    el.className = "verdict live";
  } else if (state.turn > 260) {
    window.clearInterval(timer);
    const el = $("settled");
    el.textContent = "↻ still moving after 260 rounds — no rest point to find";
    el.className = "verdict dead";
  }
}

function play() {
  window.clearInterval(timer);
  timer = window.setInterval(tick, 90);
}

function census() {
  $("census").innerHTML = `<p class="muted">counting…</p>`;
  window.setTimeout(() => {
    const rows = [2, 3, 4].map((k) => {
      const found = equilibriaCount(k, k === 4 ? 13 : 15);
      return `<tr><td>${k}</td><td class="num">${found.length === 0 ? "<b>none</b>" : found.length}</td>
        <td class="mono">${found.length ? found[0]!.map((v) => v.toFixed(2)).join(", ") : "—"}</td></tr>`;
    });
    $("census").innerHTML =
      `<table><tr><th>vendors</th><th>pure equilibria</th><th>example</th></tr>${rows.join("")}</table>`;
  }, 30);
}

$("n").addEventListener("change", reset);
$("reset").addEventListener("click", reset);
$("play").addEventListener("click", play);
$("stepBtn").addEventListener("click", () => { window.clearInterval(timer); tick(); });
$("censusBtn").addEventListener("click", census);

reset();
play();
