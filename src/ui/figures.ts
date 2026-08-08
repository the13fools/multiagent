/**
 * Static explanatory figures.
 *
 * Every page had an interactive and no picture of what the interactive was
 * about. A reader arriving cold had to infer the mechanics from a paragraph and
 * then watch something move. These go first: pure functions returning SVG, no
 * state, no animation. A figure that moves cannot be glanced at.
 */
import { C, HEX } from "./lab";

const F = 'font-family="inherit"';
const txt = (
  x: number, y: number, s: string,
  o: { size?: number; fill?: string; weight?: number; anchor?: string } = {},
) =>
  `<text x="${x}" y="${y}" ${F} font-size="${o.size ?? 12}" fill="${o.fill ?? C.ink}"
     ${o.weight ? `font-weight="${o.weight}"` : ""}
     ${o.anchor ? `text-anchor="${o.anchor}"` : ""}>${s}</text>`;

const wrap = (w: number, h: number, body: string, label: string) =>
  `<svg viewBox="0 0 ${w} ${h}" style="width:100%;height:auto;display:block;max-width:${w}px;margin:0 auto"
     role="img" aria-label="${label}">
     <defs><marker id="ar" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6"
       orient="auto-start-reverse"><path d="M0 0 L10 5 L0 10 z" fill="${C.muted}"/></marker></defs>
     ${body}</svg>`;

/**
 * One turn, both choices, with the token flows drawn.
 *
 * The rules are four numbers and two arrows. Written as a paragraph they take
 * three sentences and a re-read; drawn, they take a glance. Note the upkeep
 * arrow appears on both sides -- it is unavoidable, and that is the whole reason
 * a permanent restorer dies.
 */
export function turnDiagram(L = 1, R = 1, G = 3, S = 3): string {
  const W = 620, H = 250;
  const s: string[] = [];
  const col = (x: number, title: string, accent: string) => {
    s.push(txt(x, 22, title, { size: 13, weight: 700, anchor: "middle", fill: accent }));
    s.push(`<rect x="${x - 118}" y="34" width="236" height="182" rx="9"
      fill="none" stroke="${C.line}"/>`);
  };

  col(155, "RESTORE", HEX.good);
  col(465, "TAKE", HEX.bad);

  const agent = (x: number) => {
    s.push(`<circle cx="${x}" cy="94" r="26" fill="${C.line}"/>`);
    s.push(txt(x, 98, "you", { size: 11, anchor: "middle", fill: C.muted }));
  };
  const pool = (x: number) => {
    s.push(`<rect x="${x - 42}" y="152" width="84" height="46" rx="6"
      fill="none" stroke="${C.muted}" stroke-width="1.5"/>`);
    s.push(txt(x, 180, "the pool", { size: 11, anchor: "middle", fill: C.muted }));
  };

  // left: you pay R, the pool gains G. Both arrows point the way the tokens
  // move -- an arrow out of the pool on the RESTORE side reads as the pool
  // paying you, which is the opposite of the rule.
  agent(155); pool(155);
  s.push(`<path d="M132 118 L120 150" stroke="${HEX.good}" stroke-width="2"
    marker-end="url(#ar)" fill="none"/>`);
  s.push(txt(52, 140, `−${R} you`, { size: 11, weight: 650, fill: HEX.good }));
  s.push(`<path d="M186 120 L186 150" stroke="${HEX.good}" stroke-width="2"
    marker-end="url(#ar)" fill="none"/>`);
  s.push(txt(200, 142, `+${G} pool`, { size: 11, weight: 650, fill: HEX.good }));

  // right: take S from the pool
  agent(465); pool(465);
  s.push(`<path d="M448 150 L448 120" stroke="${HEX.bad}" stroke-width="2"
    marker-end="url(#ar)" fill="none"/>`);
  s.push(txt(360, 142, `+${S} you`, { size: 11, weight: 650, fill: HEX.bad }));
  s.push(txt(508, 142, `−${S} pool`, { size: 11, weight: 650, fill: HEX.bad }));

  // upkeep, on both sides, because it is unavoidable
  for (const x of [155, 465]) {
    s.push(`<path d="M${x + 30} 84 L${x + 70} 66" stroke="${C.muted}" stroke-width="1.5"
      stroke-dasharray="3 3" marker-end="url(#ar)" fill="none"/>`);
  }
  s.push(txt(310, 236,
    `Every turn, before choosing: −${L} upkeep. Unavoidable. Balance below zero and you are removed.`,
    { size: 11.5, anchor: "middle", fill: C.muted }));
  s.push(txt(238, 62, `−${L}`, { size: 10, fill: C.muted }));
  s.push(txt(548, 62, `−${L}`, { size: 10, fill: C.muted }));

  return wrap(W, H, s.join(""),
    "One turn: restore costs you R and adds G to the pool; take gives you S from the pool; upkeep L is paid either way");
}

/**
 * Why alternating works, as a ledger rather than an argument.
 *
 * Two turns, four numbers, both columns summing to zero. This is the entire
 * proof and it fits in a box.
 */
export function ledgerFigure(L = 1, R = 1, G = 3, S = 3): string {
  const W = 560, H = 176;
  const s: string[] = [];
  const rows: [string, string, string][] = [
    ["turn 1 — restore", `−${L} − ${R} = −${L + R}`, `+${G}`],
    ["turn 2 — take", `−${L} + ${S} = +${S - L}`, `−${S}`],
    ["over two turns", `${S - L - L - R === 0 ? "0" : String(S - L - L - R)}`, `${G - S === 0 ? "0" : String(G - S)}`],
  ];
  s.push(txt(20, 22, "Alternate, and both ledgers close", { size: 13, weight: 700 }));
  s.push(txt(300, 48, "your balance", { size: 11, anchor: "middle", fill: C.muted, weight: 650 }));
  s.push(txt(455, 48, "the pool", { size: 11, anchor: "middle", fill: C.muted, weight: 650 }));
  rows.forEach(([label, bal, pl], i) => {
    const y = 76 + i * 30;
    const last = i === rows.length - 1;
    if (last) s.push(`<line x1="20" y1="${y - 20}" x2="530" y2="${y - 20}" stroke="${C.ink}"/>`);
    s.push(txt(20, y, label, { size: 12, weight: last ? 700 : 400 }));
    s.push(txt(300, y, bal, { size: 12, anchor: "middle", weight: last ? 700 : 400,
      fill: last ? HEX.good : C.ink }));
    s.push(txt(455, y, pl, { size: 12, anchor: "middle", weight: last ? 700 : 400,
      fill: last ? HEX.good : C.ink }));
  });
  s.push(txt(20, 168, "Nothing accumulates, nothing depletes. Everyone lives forever.",
    { size: 11.5, fill: C.muted }));
  return wrap(W, H, s.join(""), "Ledger showing both balance and pool net to zero over two alternating turns");
}

/** A single beach with vendors and their catchments. Static. */
export function beachFigure(positions: number[], caption: string): string {
  const W = 260, H = 96, pad = 18;
  const x = (p: number) => pad + p * (W - 2 * pad);
  const hues = ["#2f5d8a", "#c2543d", "#2d8a5f", "#8a6d2f"];
  const s: string[] = [];
  const sorted = positions.map((p, i) => ({ p, i })).sort((a, b) => a.p - b.p);
  sorted.forEach((v, j) => {
    const lo = j === 0 ? 0 : (sorted[j - 1]!.p + v.p) / 2;
    const hi = j === sorted.length - 1 ? 1 : (v.p + sorted[j + 1]!.p) / 2;
    s.push(`<rect x="${x(lo)}" y="34" width="${Math.max(x(hi) - x(lo), 0)}" height="16"
      fill="${hues[v.i % hues.length]}" opacity="0.18"/>`);
  });
  s.push(`<rect x="${pad}" y="50" width="${W - 2 * pad}" height="4" rx="2" fill="${C.line}"/>`);
  positions.forEach((p, i) => {
    s.push(`<circle cx="${x(p)}" cy="52" r="8" fill="${hues[i % hues.length]}"/>`);
    s.push(txt(x(p), 55.5, String(i + 1), { size: 9, anchor: "middle", fill: "#fff", weight: 700 }));
  });
  s.push(txt(W / 2, 82, caption, { size: 11, anchor: "middle", fill: C.muted }));
  return wrap(W, H, s.join(""), caption);
}

/**
 * What a paired cell is.
 *
 * The gate page argued about rejection rates without ever showing what a "cell"
 * is. It is two runs of the same configuration with one thing swapped, and one
 * number: the difference.
 */
export function pairedCellFigure(): string {
  const W = 560, H = 180;
  const s: string[] = [];
  const arm = (y: number, label: string, colour: string, note: string) => {
    s.push(`<rect x="20" y="${y}" width="230" height="42" rx="7" fill="none" stroke="${C.line}"/>`);
    s.push(txt(34, y + 20, label, { size: 12, weight: 650, fill: colour }));
    s.push(txt(34, y + 35, note, { size: 10.5, fill: C.muted }));
  };
  s.push(txt(20, 20, "One paired cell", { size: 13, weight: 700 }));
  arm(36, "baseline", C.accent, "same seed, same salt, same config");
  arm(94, "candidate", HEX.bad, "one thing swapped");
  s.push(`<path d="M256 78 L300 78" stroke="${C.muted}" stroke-width="1.5"
    marker-end="url(#ar)" fill="none"/>`);
  s.push(`<rect x="308" y="52" width="232" height="52" rx="7" fill="none" stroke="${C.ink}"/>`);
  s.push(txt(424, 74, "Δ welfare", { size: 12, weight: 700, anchor: "middle" }));
  s.push(txt(424, 92, "candidate − baseline", { size: 10.5, anchor: "middle", fill: C.muted }));
  s.push(txt(20, 148, "A campaign is thirty of these.", { size: 11.5, fill: C.muted }));
  s.push(txt(20, 164, "The gate sees the differences — never a model's opinion of them.",
    { size: 11.5, fill: C.muted }));
  return wrap(W, H, s.join(""), "A paired cell: baseline and candidate runs differing in one thing, yielding one difference");
}

/** Stationary vs learning, as two schematic trajectories. */
export function driftFigure(): string {
  const W = 560, H = 170;
  const s: string[] = [];
  const ox = 40, oy = 30, w = 480, h = 100;
  const y = (v: number) => oy + h - v * h;
  s.push(`<line x1="${ox}" y1="${oy + h}" x2="${ox + w}" y2="${oy + h}" stroke="${C.ink}"/>`);
  s.push(`<line x1="${ox}" y1="${oy}" x2="${ox}" y2="${oy + h}" stroke="${C.ink}"/>`);
  s.push(`<line x1="${ox}" y1="${y(0.5)}" x2="${ox + w}" y2="${y(0.5)}"
    stroke="${C.muted}" stroke-dasharray="3 4"/>`);
  s.push(txt(ox + w, y(0.5) - 6, "what the pool needs", { size: 10, anchor: "end", fill: C.muted }));
  s.push(`<line x1="${ox}" y1="${y(0.2)}" x2="${ox + w}" y2="${y(0.2)}"
    stroke="${HEX.bad}" stroke-width="2.2"/>`);
  s.push(txt(ox + 8, y(0.2) + 16, "fixed rule — flat by construction", { size: 10.5, fill: HEX.bad }));
  const pts: string[] = [];
  for (let i = 0; i <= 40; i++) {
    const t = i / 40;
    pts.push(`${ox + t * w},${y(0.2 + 0.3 * (1 - Math.exp(-4 * t)))}`);
  }
  s.push(`<polyline points="${pts.join(" ")}" fill="none" stroke="${C.accent}" stroke-width="2.2"/>`);
  s.push(txt(ox + w - 8, y(0.5) + 22, "adaptive — walks to it", { size: 10.5, anchor: "end", fill: C.accent }));
  s.push(txt(ox, oy + h + 18, "turn 1", { size: 10, fill: C.muted }));
  s.push(txt(ox + w, oy + h + 18, "turn 200", { size: 10, anchor: "end", fill: C.muted }));
  s.push(txt(20, H - 6,
    "Measure at turn 20 or at turn 200 and you get different answers.",
    { size: 11.5, fill: C.muted }));
  return wrap(W, H, s.join(""), "A fixed rule stays flat; an adaptive one converges on the required rate");
}

/**
 * The passing pattern, from above, as two beats.
 *
 * The 3D scene shows one instant and moves. This shows the whole cycle at once
 * and does not: on the odd beat every juggler passes across the ring, on the
 * even beat every juggler throws to itself. That is the same two-beat
 * alternation as restore/take, and drawing them side by side is the argument
 * that the two pages are one object.
 */
export function passingFigure(n = 6): string {
  const W = 560, H = 210, r = 62;
  const s: string[] = [];
  const seat = (i: number, cx: number, cy: number) => ({
    x: cx + r * Math.cos((i / n) * Math.PI * 2 - Math.PI / 2),
    y: cy + r * Math.sin((i / n) * Math.PI * 2 - Math.PI / 2),
  });

  const ring = (cx: number, cy: number, title: string, colour: string, pass: boolean) => {
    s.push(txt(cx, 24, title, { size: 12.5, weight: 700, anchor: "middle", fill: colour }));
    for (let i = 0; i < n; i++) {
      const a = seat(i, cx, cy);
      if (pass) {
        // pass across: seat i to the seat opposite
        const b = seat((i + n / 2) % n, cx, cy);
        s.push(`<line x1="${a.x.toFixed(1)}" y1="${a.y.toFixed(1)}"
          x2="${b.x.toFixed(1)}" y2="${b.y.toFixed(1)}" stroke="${colour}"
          stroke-width="1.6" opacity="0.55"/>`);
      } else {
        // self throw: a small loop above the seat
        s.push(`<path d="M${(a.x - 7).toFixed(1)} ${a.y.toFixed(1)}
          Q${a.x.toFixed(1)} ${(a.y - 26).toFixed(1)} ${(a.x + 7).toFixed(1)} ${a.y.toFixed(1)}"
          fill="none" stroke="${colour}" stroke-width="1.6" opacity="0.75"/>`);
      }
    }
    for (let i = 0; i < n; i++) {
      const a = seat(i, cx, cy);
      s.push(`<circle cx="${a.x.toFixed(1)}" cy="${a.y.toFixed(1)}" r="9" fill="${C.line}"/>`);
      s.push(txt(a.x, a.y + 3.5, String(i + 1),
        { size: 9.5, anchor: "middle", fill: C.muted, weight: 700 }));
    }
  };

  ring(150, 112, "beat 1 — everyone passes across", HEX.good, true);
  ring(410, 112, "beat 2 — everyone throws to itself", HEX.bad, false);
  s.push(`<line x1="280" y1="40" x2="280" y2="184" stroke="${C.line}"/>`);
  s.push(txt(280, 202,
    "Alternate the two and the clubs stay in the air. Half a beat of drift and they do not.",
    { size: 11.5, anchor: "middle", fill: C.muted }));
  return wrap(W, H, s.join(""),
    "Two beats of the passing pattern: on the first every juggler passes across the ring, on the second every juggler throws to itself");
}

/**
 * The distillation pipeline, and where the money goes.
 *
 * The essay is about a cost, and a cost is a shape: most of the rollout is
 * untouched, a few spans are edited, and only those spans carry gradient. Drawn,
 * the "sparse loss" argument needs no paragraph.
 */
export function pipelineFigure(): string {
  const W = 560, H = 216;
  const s: string[] = [];
  const ox = 24, w = 512, y = 52, bh = 26;

  s.push(txt(20, 22, "One rollout, edited once", { size: 13, weight: 700 }));

  // the rollout, with a few edited spans
  const spans: [number, number][] = [[0.14, 0.2], [0.42, 0.47], [0.68, 0.78]];
  s.push(`<rect x="${ox}" y="${y}" width="${w}" height="${bh}" rx="4" fill="${C.line}"/>`);
  for (const [a, b] of spans) {
    s.push(`<rect x="${ox + a * w}" y="${y}" width="${(b - a) * w}" height="${bh}"
      rx="3" fill="${C.accent}"/>`);
  }
  s.push(txt(ox, y - 8, "base model output", { size: 10.5, fill: C.muted }));
  s.push(txt(ox + w, y - 8, "teacher changed these", { size: 10.5, anchor: "end", fill: C.accent }));

  // the loss mask underneath: only the edited spans
  const y2 = y + 54;
  s.push(`<rect x="${ox}" y="${y2}" width="${w}" height="${bh}" rx="4" fill="none"
    stroke="${C.line}" stroke-dasharray="3 3"/>`);
  for (const [a, b] of spans) {
    s.push(`<rect x="${ox + a * w}" y="${y2}" width="${(b - a) * w}" height="${bh}"
      rx="3" fill="${HEX.good}"/>`);
    s.push(`<line x1="${ox + ((a + b) / 2) * w}" y1="${y + bh}"
      x2="${ox + ((a + b) / 2) * w}" y2="${y2}" stroke="${C.muted}" stroke-dasharray="2 3"/>`);
  }
  s.push(txt(ox, y2 - 8, "what the gradient sees", { size: 10.5, fill: C.muted }));

  const pct = Math.round(spans.reduce((t, [a, b]) => t + (b - a), 0) * 100);
  s.push(txt(ox, y2 + bh + 24,
    `≈${pct}% of the tokens carry loss. The action schema is never a target,`,
    { size: 11.5, fill: C.muted }));
  s.push(txt(ox, y2 + bh + 40, "so it cannot be trained away. One cached edit per rollout, shared",
    { size: 11.5, fill: C.muted }));
  s.push(txt(ox, y2 + bh + 56, "by every arm — no arm can be re-rolled after results are known.",
    { size: 11.5, fill: C.muted }));
  return wrap(W, H, s.join(""),
    "A rollout with a few edited spans, and a loss mask covering only those spans");
}

/**
 * The evidence ladder.
 *
 * The status page is a wall of tables whose whole point is that claims differ in
 * kind. The kinds are ordered, so draw them ordered.
 */
export function evidenceFigure(): string {
  const W = 560, H = 210;
  const s: string[] = [];
  const rungs: [string, string, string][] = [
    ["arithmetic", "provable from the rules; no model can change it", HEX.good],
    ["measured", "a live run happened and left a receipt", HEX.good],
    ["resampled", "real data, re-drawn under a null", C.accent],
    ["simulated", "scripted rules only — no language model involved", C.accent],
    ["not run", "a plan. Any claim resting on it is a prediction", HEX.bad],
  ];
  s.push(txt(20, 20, "Five kinds of claim, strongest first", { size: 13, weight: 700 }));
  rungs.forEach(([name, note, colour], i) => {
    const y = 44 + i * 32;
    s.push(`<rect x="20" y="${y}" width="${132 - i * 8}" height="22" rx="4" fill="${colour}"
      opacity="${1 - i * 0.13}"/>`);
    s.push(txt(28, y + 16, name, { size: 11.5, weight: 700, fill: "#fff" }));
    s.push(txt(166, y + 16, note, { size: 11.5, fill: C.muted }));
  });
  s.push(txt(20, 204,
    "Every row on this page carries one of these. Nothing is scored by a model.",
    { size: 11.5, fill: C.muted }));
  return wrap(W, H, s.join(""), "Five kinds of evidence ordered from arithmetic to not-yet-run");
}

/**
 * The Count: one round, and what splitting does to it.
 *
 * The rule that makes the game is asymmetric and easy to miss in prose — a win
 * is shared, a loss is not — so it gets drawn twice, with two and with five
 * bettors, and the per-agent figure underneath each.
 */
export function splitFigure(W = 6, L = 2): string {
  const WD = 560, H = 210;
  const s: string[] = [];
  s.push(txt(20, 22, "A win is split. A loss is not.", { size: 13, weight: 700 }));

  const table = (x: number, bettors: number, label: string) => {
    const seats = 6;
    for (let i = 0; i < seats; i++) {
      const a = (i / seats) * Math.PI * 2 - Math.PI / 2;
      const cx = x + 44 * Math.cos(a), cy = 96 + 44 * Math.sin(a);
      const betting = i < bettors;
      s.push(`<circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="10"
        fill="${betting ? HEX.bad : C.line}"/>`);
      if (betting) s.push(txt(cx, cy + 3.5, "in", { size: 8.5, anchor: "middle", fill: "#fff", weight: 700 }));
    }
    s.push(`<rect x="${x - 20}" y="82" width="40" height="28" rx="4" fill="${HEX.good}"/>`);
    s.push(txt(x, 100, `+${W}`, { size: 12, anchor: "middle", fill: "#fff", weight: 700 }));
    s.push(txt(x, 160, label, { size: 11.5, anchor: "middle", fill: C.muted }));
    s.push(txt(x, 180, `each bettor takes ${(W / bettors).toFixed(1)}`,
      { size: 12, anchor: "middle", weight: 700, fill: bettors > 2 ? HEX.bad : HEX.good }));
  };

  table(150, 2, "two of six bet");
  table(410, 5, "five of six bet");
  s.push(`<line x1="280" y1="40" x2="280" y2="170" stroke="${C.line}"/>`);
  s.push(txt(20, 202,
    `On a losing card every bettor pays ${L}, split with nobody.`,
    { size: 11.5, fill: C.muted }));
  return wrap(WD, H, s.join(""),
    "The same winning card split between two bettors and between five, showing the per-agent payoff fall");
}

/**
 * The answer key, as a curve.
 *
 * `curve` is sampled by the caller from the same function the simulation uses,
 * so this is the closed form itself rather than a drawing of it.
 */
export function betCurveFigure(
  curve: { count: number; solo: number; eq: number }[],
): string {
  const W = 560, H = 210, ox = 46, oy = 26, w = 480, h = 128;
  const s: string[] = [];
  const lo = curve[0]!.count, hi = curve[curve.length - 1]!.count;
  const px = (c: number) => ox + ((c - lo) / (hi - lo)) * w;
  const py = (v: number) => oy + h - v * h;

  s.push(txt(20, 18, "How often you should bet, given the count", { size: 13, weight: 700 }));
  s.push(`<line x1="${ox}" y1="${oy + h}" x2="${ox + w}" y2="${oy + h}" stroke="${C.ink}"/>`);
  s.push(`<line x1="${ox}" y1="${oy}" x2="${ox}" y2="${oy + h}" stroke="${C.ink}"/>`);
  for (const v of [0, 0.5, 1]) {
    s.push(txt(ox - 8, py(v) + 3.5, `${(v * 100).toFixed(0)}%`,
      { size: 10, anchor: "end", fill: C.muted }));
  }
  s.push(`<line x1="${px(0)}" y1="${oy}" x2="${px(0)}" y2="${oy + h}"
    stroke="${C.muted}" stroke-dasharray="3 3"/>`);
  s.push(txt(px(0), oy + h + 15, "neutral deck", { size: 10, anchor: "middle", fill: C.muted }));
  s.push(txt(ox, oy + h + 15, "more losers left", { size: 10, fill: C.muted }));
  s.push(txt(ox + w, oy + h + 15, "more winners left", { size: 10, anchor: "end", fill: C.muted }));

  // The solo rule is a step function, so it is drawn dashed and nudged off the
  // frame -- flat on the axis line it reads as a border rather than a result.
  const line = (key: "solo" | "eq", colour: string, dash = "") =>
    `<polyline points="${curve.map((d) => `${px(d.count)},${py(d[key]) + (dash ? 2.5 : 0)}`).join(" ")}"
       fill="none" stroke="${colour}" stroke-width="2.4" ${dash}/>`;
  s.push(line("solo", HEX.bad, 'stroke-dasharray="5 3"'));
  s.push(line("eq", HEX.good));
  // Down in the empty quarter: the two lines occupy the top of the frame at the
  // right and the left is where the red step happens.
  s.push(txt(ox + w - 6, py(0.28), "bet this often if you are alone",
    { size: 10.5, anchor: "end", fill: HEX.bad }));
  s.push(txt(ox + w - 6, py(0.14), "bet this often with six at the table",
    { size: 10.5, anchor: "end", fill: HEX.good }));
  s.push(txt(20, H - 24, "The gap between the two lines is the whole game:",
    { size: 11.5, fill: C.muted }));
  s.push(txt(20, H - 8, "it is what knowing the cards fails to tell you.",
    { size: 11.5, fill: C.muted }));
  return wrap(W, H, s.join(""),
    "Correct betting rate against the count, alone and at a table of six");
}

/**
 * Span-restricted distillation, drawn as delete-and-inpaint.
 *
 * The essay describes the method in prose and the earlier figure showed the
 * loss mask as a bar chart, which is accurate and tells you nothing about what
 * the teacher DOES. This draws the actual operation: a diffusion-style judge
 * masks out a few spans of an instruct model's rollout, inpaints replacements,
 * and the gradient touches only the inpainted positions.
 *
 * Two things the picture has to carry, because they are the whole argument:
 *
 *   1. The action fields are never masked. They are locked, so the schema
 *      cannot be trained away — you cannot lose a token that was never a
 *      target.
 *   2. Most of the sequence is untouched, which is why this is cheap. The
 *      gradient is sparse by construction rather than by regularisation.
 *
 * Token widths are fixed rather than random: a figure that reshuffles on every
 * reload is a figure nobody can point at in a meeting.
 */
export function inpaintFigure(): string {
  const W = 620, H = 300;
  const s: string[] = [];
  const ox = 132, w = 472;   // left gutter holds the row labels

  // A sequence of token-shaped boxes. `kind` decides how each is drawn.
  //   . plain   # locked action field   x deleted   + inpainted
  const WIDTHS = [26, 15, 34, 19, 28, 12, 40, 22, 17, 31, 24, 13, 36, 20, 27, 15, 33, 18, 29, 21];
  const LOCKED = new Set([6, 7, 12, 13]);      // the JSON action fields
  const EDITED = new Set([2, 3, 9, 16, 17]);   // what the judge changes

  const gap = 4;
  const total = WIDTHS.reduce((a, b) => a + b, 0) + gap * (WIDTHS.length - 1);
  const k = w / total;                          // scale to fit the row exactly

  const row = (y: number, mode: "before" | "masked" | "after") => {
    let x = ox;
    WIDTHS.forEach((raw, i) => {
      const tw = raw * k;
      const locked = LOCKED.has(i);
      const edited = EDITED.has(i);
      let fill: string = C.line;
      let stroke: string = "none";
      let dash = "";
      if (locked) { fill = "none"; stroke = C.ink; }
      if (mode === "masked" && edited) { fill = "none"; stroke = HEX.bad; dash = ' stroke-dasharray="3 2"'; }
      if (mode === "after" && edited) { fill = C.accent; }
      if (mode === "before" && edited) { fill = C.line; }
      s.push(`<rect x="${x.toFixed(1)}" y="${y}" width="${Math.max(tw, 3).toFixed(1)}" height="16"
        rx="3" fill="${fill}" stroke="${stroke}" stroke-width="1.2"${dash}/>`);
      if (locked) {
        s.push(`<rect x="${(x + tw / 2 - 2.5).toFixed(1)}" y="${y + 5}" width="5" height="6" rx="1"
          fill="${C.ink}"/>`);
      }
      x += tw + gap * k;
    });
  };

  const label = (y: number, t: string, sub?: string) => {
    s.push(txt(ox - 14, y + 12, t, { size: 11.5, anchor: "end", weight: 650 }));
    if (sub) s.push(txt(ox - 14, y + 26, sub, { size: 10, anchor: "end", fill: C.muted }));
  };

  s.push(txt(20, 20, "One rollout, masked and inpainted", { size: 13, weight: 700 }));

  label(44, "instruct model", "as generated");
  row(44, "before");

  label(112, "diffusion judge", "deletes spans");
  row(112, "masked");

  label(180, "inpainted", "filled back in");
  row(180, "after");

  // the arrows down the left, so the order of operations is unambiguous
  for (const y of [70, 138]) {
    s.push(`<path d="M${ox - 22} ${y} L${ox - 22} ${y + 32}" stroke="${C.muted}"
      stroke-width="1.5" marker-end="url(#ar)" fill="none"/>`);
  }

  // what the gradient sees
  s.push(`<line x1="${ox}" y1="222" x2="${ox + w}" y2="222" stroke="${C.line}"/>`);
  label(232, "loss", "only here");
  let x = ox;
  WIDTHS.forEach((raw, i) => {
    const tw = raw * k;
    if (EDITED.has(i)) {
      s.push(`<rect x="${x.toFixed(1)}" y="232" width="${Math.max(tw, 3).toFixed(1)}" height="16"
        rx="3" fill="${HEX.good}"/>`);
    }
    x += tw + gap * k;
  });

  const pct = Math.round(
    [...EDITED].reduce((t, i) => t + WIDTHS[i]!, 0) / WIDTHS.reduce((a, b) => a + b, 0) * 100);

  s.push(txt(20, 276, `Outlined boxes with a bar are the action fields: never masked, never in the loss,`,
    { size: 11.5, fill: C.muted }));
  s.push(txt(20, 291, `so the schema cannot be trained away. About ${pct}% of the sequence carries gradient.`,
    { size: 11.5, fill: C.muted }));

  return wrap(W, H, s.join(""),
    "A rollout from an instruct model, with a few spans deleted by a diffusion judge and inpainted, "
    + "the action fields locked throughout, and the training loss applied only to the inpainted spans");
}
