import "./style.css";
import { el, C, HEX, Ticker, renderStats, verdict, applyEmbedMode, bindDials } from "./lab";
import { splitFigure, betCurveFigure } from "./figures";
import {
  POLICIES, REFERENCE, equilibriumBetRate, pPlus, play, soloEV,
  type CardPolicy, type Result, type Rules,
} from "../core/cards";

applyEmbedMode();

/**
 * The Count.
 *
 * A sketch, and marked as one on the page. It earns its place by doing
 * something none of the other environments can: separating "did the agent read
 * the environment" from "did the agent read the room", with an answer key for
 * each.
 *
 * The view is deliberately plain. One seat is drawn as a strip along the top,
 * the rest of the table as a block beneath, and the bar height is what your seat
 * was actually paid -- so a lonely correct bet is tall and a correct bet
 * everybody made is a sliver. That comparison is the whole argument and it
 * should not need a caption to land.
 */

const SEATS = 6;
const SVGNS = "http://www.w3.org/2000/svg";

const W = 860, H = 240;
const LAB = 92;              // left gutter for row labels
const GW = W - LAB - 8;
const MINE_Y = 16, MINE_H = 34;
const TABLE_Y = 62, TABLE_H = 74;
const PAY_Y = 152, PAY_H = 60;   // payoff bars, zero line in the middle

const sel = (id: string) => (el(id) as HTMLSelectElement).value;
const num = (id: string) => Number((el(id) as HTMLInputElement).value);

const rules = (): Rules => ({ ...REFERENCE, n: SEATS });
const policies = (): CardPolicy[] => [
  POLICIES[sel("mine")]!.fn,
  ...Array.from({ length: SEATS - 1 }, () => POLICIES[sel("table")]!.fn),
];

let out: Result;
let shown = 0;
let seed = 1;
let cw = 0;

/* ------------------------------------------------------------- the shoe */

function build() {
  cw = GW / Math.max(out.rounds.length, 1);
  shown = 0;
  const label = (y: number, t: string) =>
    `<text x="${LAB - 8}" y="${y}" text-anchor="end" font-size="11" fill="${C.muted}">${t}</text>`;
  el("shoe").innerHTML =
    label(MINE_Y + 22, "your seat") +
    label(TABLE_Y + 42, "the other five") +
    label(PAY_Y + PAY_H / 2 + 4, "you were paid") +
    `<line x1="${LAB}" y1="${PAY_Y + PAY_H / 2}" x2="${LAB + GW}" y2="${PAY_Y + PAY_H / 2}"
       stroke="${C.line}"/>` +
    `<g id="c-cards"></g><g id="c-table"></g><g id="c-pay"></g>` +
    `<text id="c-axis" x="${LAB}" y="${H - 8}" font-size="10" fill="${C.muted}"></text>`;
}

/** One round, appended. Never redraw: the cells animate on entry. */
function drawRound(i: number) {
  const r = out.rounds[i]!;
  const x = LAB + i * cw;
  const w = Math.max(cw - 1.2, 0.8);
  const won = r.card === "plus";

  const mine = document.createElementNS(SVGNS, "g");
  mine.innerHTML =
    `<rect x="${x.toFixed(2)}" y="${MINE_Y}" width="${w.toFixed(2)}" height="${MINE_H}"
       rx="3" class="anim-cell"
       fill="${r.bets[0] ? (won ? HEX.good : HEX.bad) : C.line}"
       opacity="${r.bets[0] ? 1 : 0.5}"/>`;
  document.getElementById("c-cards")!.appendChild(mine);

  const others = r.bets.slice(1).filter(Boolean).length;
  const hh = TABLE_H * (others / (SEATS - 1));
  const g = document.createElementNS(SVGNS, "g");
  g.innerHTML =
    `<rect x="${x.toFixed(2)}" y="${TABLE_Y}" width="${w.toFixed(2)}" height="${TABLE_H}"
       fill="${C.line}" opacity="0.35"/>` +
    `<rect x="${x.toFixed(2)}" y="${(TABLE_Y + TABLE_H - hh).toFixed(2)}" width="${w.toFixed(2)}"
       height="${hh.toFixed(2)}" rx="2" class="anim-cell"
       fill="${won ? HEX.good : HEX.bad}" opacity="0.75"/>`;
  document.getElementById("c-table")!.appendChild(g);

  const pay = r.payoff[0]!;
  const scale = (PAY_H / 2) / rules().W;
  const hp = Math.min(PAY_H / 2, Math.abs(pay) * scale);
  const mid = PAY_Y + PAY_H / 2;
  const bar = document.createElementNS(SVGNS, "rect");
  bar.setAttribute("x", x.toFixed(2));
  bar.setAttribute("y", (pay >= 0 ? mid - hp : mid).toFixed(2));
  bar.setAttribute("width", w.toFixed(2));
  bar.setAttribute("height", hp.toFixed(2));
  bar.setAttribute("fill", pay >= 0 ? HEX.good : HEX.bad);
  bar.setAttribute("class", "anim-cell");
  document.getElementById("c-pay")!.appendChild(bar);
}

function drawStats(i: number) {
  const upto = i + 1;
  const seen = out.rounds.slice(0, upto);
  const r = out.rounds[Math.max(0, i)]!;
  const total = seen.reduce((t, x) => t + x.payoff[0]!, 0);
  const mine = seen.filter((x) => x.bets[0]).length;
  renderStats("stats", [
    { key: "Round", value: `${upto}/${out.rounds.length}` },
    { key: "Deck", value: `+${r.deck.plus} / −${r.deck.minus}` },
    { key: "Chance next wins", value: `${(pPlus(r.deck) * 100).toFixed(0)}%` },
    { key: "You should bet", value: `${(r.target * 100).toFixed(0)}%` },
    { key: "You have bet", value: `${((mine / upto) * 100).toFixed(0)}%` },
    { key: "Your take", value: total.toFixed(1) },
  ]);
}

const ticker = new Ticker(() => {
  drawRound(shown);
  drawStats(shown);
  shown++;
  if (shown >= out.rounds.length) {
    const total = out.totals[0]!;
    const others = out.totals.slice(1).reduce((a, b) => a + b, 0) / (SEATS - 1);
    verdict("verdict",
      `${total >= 0 ? "✓" : "✕"} you ${total >= 0 ? "took" : "lost"} ${Math.abs(total).toFixed(1)}` +
      ` · the rest of the table averaged ${others.toFixed(1)}`,
      total >= others ? "live" : "dead");
    return false;
  }
  return true;
}, 90);

function run() {
  ticker.stop();
  const size = num("size");
  out = play({ policies: policies(), rules: rules(), plus: size, minus: size, seed });
  verdict("verdict", "", "");
  build();
  document.getElementById("c-axis")!.textContent =
    `round 1 → ${out.rounds.length} · the equilibrium asked for ${(out.targetRate * 100).toFixed(0)}% bets`;
  drawStats(0);
  ticker.play();
}

/* ------------------------------------------------------- the whole grid */

/**
 * Every pairing, averaged. One shoe is noise, and the interesting claims here
 * are about which rule beats which -- which is a table, not an anecdote.
 */
function drawMatrix() {
  const keys = Object.keys(POLICIES);
  const size = num("size");
  const SEEDS = 60;
  const cell = (mine: string, table: string) => {
    let sum = 0;
    for (let s = 1; s <= SEEDS; s++) {
      const r = play({
        policies: [POLICIES[mine]!.fn,
          ...Array.from({ length: SEATS - 1 }, () => POLICIES[table]!.fn)],
        rules: rules(), plus: size, minus: size, seed: s,
      });
      sum += r.totals[0]!;
    }
    return sum / SEEDS;
  };

  const vals = keys.map((m) => keys.map((t) => cell(m, t)));
  const max = Math.max(...vals.flat().map(Math.abs), 1);
  const short = (k: string) => POLICIES[k]!.label.replace(/^(count|bet|copy|always).*/, (m) => m)
    .replace("count the deck, ", "").replace("count the deck and ", "and ");

  const head = `<tr><th>you play ↓ &nbsp; they play →</th>` +
    keys.map((k) => `<th class="num">${short(k)}</th>`).join("") + `</tr>`;
  const body = keys.map((m, i) =>
    `<tr><td><b>${short(m)}</b></td>` +
    keys.map((_, j) => {
      const v = vals[i]![j]!;
      const a = Math.min(0.55, Math.abs(v) / max * 0.55);
      return `<td class="num" style="background:${v >= 0 ? HEX.good : HEX.bad};
        --a:${a};box-shadow:inset 0 0 0 999px rgba(255,255,255,${1 - a})">${v.toFixed(1)}</td>`;
    }).join("") + `</tr>`).join("");

  el("matrix").innerHTML =
    `<table>${head}${body}</table>` +
    `<p class="muted">Mean take per shoe for your seat, over ${SEEDS} shuffles of a
     ${size}+${size} deck. Green is profit.</p>` +
    Object.entries(POLICIES).map(([k, v]) =>
      `<p class="muted" style="margin:6px 0"><b>${v.label}</b> — ${v.note}</p>`).join("");
}

/* ---------------------------------------------------------------- wiring */

for (const id of ["mine", "table"]) {
  (el(id) as HTMLSelectElement).innerHTML = Object.entries(POLICIES)
    .map(([k, v]) => `<option value="${k}">${v.label}</option>`).join("");
}
(el("mine") as HTMLSelectElement).value = "respond";
(el("table") as HTMLSelectElement).value = "counter";

el("fig-split").innerHTML = splitFigure(REFERENCE.W, REFERENCE.L);

// The curve is sampled from the same functions the simulation calls, so the
// figure is the closed form rather than a drawing of it.
const curve = [];
for (let c = -18; c <= 18; c++) {
  const plus = 10 + c / 2, minus = 10 - c / 2;
  const deck = { plus, minus };
  curve.push({
    count: c,
    solo: soloEV(deck, rules()) > 0 ? 1 : 0,
    eq: equilibriumBetRate(deck, rules()),
  });
}
el("fig-curve").innerHTML = betCurveFigure(curve);

function setup() {
  el("setup").textContent =
    `You: ${POLICIES[sel("mine")]!.label}. The other five: ${POLICIES[sel("table")]!.label}.`;
}

bindDials(() => { seed++; setup(); drawMatrix(); run(); });
el("go").addEventListener("click", () => { seed++; run(); });

setup();
drawMatrix();
run();
