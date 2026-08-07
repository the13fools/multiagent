import "./style.css";
import { mountArc } from "./arc";
import { el, C, renderStats, verdict, applyEmbedMode } from "./lab";
import {
  POLICIES, PILOT_SD, PILOT_BASELINE, rejectionRate, minimumCampaignSize, rejects,
} from "../core/gate";

applyEmbedMode();

import { pairedCellFigure } from "./figures";

const NS = [10, 20, 30, 40, 60, 80, 100, 140, 200, 350];
const COLOUR: Record<string, string> = {
  overlap: C.bad,
  superiority: "#8a6d2f",
  nonInferiority: C.good,
};

const num = (id: string) => Number((el(id) as HTMLInputElement).value);

function rule(key: string) {
  const base = POLICIES[key]!.rule;
  return key === "nonInferiority" ? { ...base, minMeanImprovement: -num("margin") } : base;
}

/* ------------------------------------------------------------ the curves */

function drawCurves() {
  const w = 560, h = 220, ox = 52, oy = 18;
  const trials = num("trials");
  const effect = num("effect");
  const px = (i: number) => ox + (i / (NS.length - 1)) * w;
  const py = (v: number) => oy + h - v * h;
  const s: string[] = [];

  // the 5% band: anything above this line is a gate you cannot trust
  s.push(`<rect x="${ox}" y="${py(1)}" width="${w}" height="${py(0.05) - py(1)}"
     fill="${C.bad}" opacity="0.05"/>`);
  s.push(`<line x1="${ox}" y1="${py(0.05)}" x2="${ox + w}" y2="${py(0.05)}"
     stroke="${C.ink}" stroke-dasharray="4 3"/>`);
  s.push(`<text x="${ox + w}" y="${py(0.05) - 5}" text-anchor="end" font-size="10"
     fill="${C.muted}">5% — the most false rejection anyone should accept</text>`);

  s.push(`<line x1="${ox}" y1="${oy + h}" x2="${ox + w}" y2="${oy + h}" stroke="${C.ink}"/>`);
  s.push(`<line x1="${ox}" y1="${oy}" x2="${ox}" y2="${oy + h}" stroke="${C.ink}"/>`);
  for (const v of [0, 0.25, 0.5, 0.75, 1]) {
    s.push(`<text x="${ox - 7}" y="${py(v) + 3.5}" text-anchor="end" font-size="10"
       fill="${C.muted}">${(v * 100).toFixed(0)}%</text>`);
  }
  NS.forEach((n, i) => {
    if (i % 2 === 0 || i === NS.length - 1)
      s.push(`<text x="${px(i)}" y="${oy + h + 15}" text-anchor="middle" font-size="10"
         fill="${C.muted}">${n}</text>`);
  });
  s.push(`<text x="${ox + w / 2}" y="${oy + h + 33}" text-anchor="middle" font-size="11"
     fill="${C.muted}">paired cells in the campaign</text>`);

  for (const key of Object.keys(POLICIES)) {
    const pts = NS.map((n, i) => `${px(i)},${py(rejectionRate(rule(key), n, effect, trials))}`);
    s.push(`<polyline points="${pts.join(" ")}" fill="none" stroke="${COLOUR[key]}" stroke-width="2.4"/>`);
    NS.forEach((n, i) =>
      s.push(`<circle cx="${px(i)}" cy="${py(rejectionRate(rule(key), n, effect, trials))}"
         r="3" fill="${COLOUR[key]}"/>`));
  }
  el("curves").innerHTML = s.join("");

  el("legend").innerHTML = Object.entries(POLICIES)
    .map(
      ([k, v]) =>
        `<div style="margin:5px 0"><span style="display:inline-block;width:20px;height:3px;
           background:${COLOUR[k]};vertical-align:middle"></span>
         <b style="font-size:13px"> ${v.label}</b>
         <div class="muted" style="margin-left:28px">${v.note}</div></div>`,
    )
    .join("");
}

/* --------------------------------------------------- verdict on this dial */

function drawVerdict() {
  const effect = num("effect");
  const n = num("n");
  const trials = num("trials");
  const rows = Object.entries(POLICIES).map(([k, v]) => {
    const r = rejectionRate(rule(k), n, effect, trials);
    const min = minimumCampaignSize(rule(k));
    return `<tr><td>${v.label}</td>
      <td class="num" style="color:${
        effect === 0 ? (r <= 0.05 ? C.good : C.bad) : r >= 0.9 ? C.good : C.bad
      }"><b>${(r * 100).toFixed(1)}%</b></td>
      <td class="num">${min === null ? "never" : min}</td></tr>`;
  });
  el("table").innerHTML =
    `<table><tr><th>gate</th><th>P(roll back) at n=${n}</th>
       <th>smallest n reaching 5% on A/A</th></tr>${rows.join("")}</table>`;

  renderStats("stats", [
    { key: "True effect", value: effect === 0 ? "0 — a clone" : `${effect > 0 ? "+" : ""}${effect}` },
    { key: "As % of baseline", value: `${((effect / PILOT_BASELINE) * 100).toFixed(1)}%` },
    { key: "Paired SD", value: PILOT_SD },
    { key: "Margin", value: `−${num("margin")}` },
  ]);

  verdict(
    "verdict",
    effect === 0
      ? "A/A: the candidate IS the baseline. Every rejection here is a false one."
      : effect < 0
        ? "The candidate is genuinely worse. Rejection is correct."
        : "The candidate is genuinely better. Rejection is a missed improvement.",
    effect === 0 ? "dead" : "live",
  );
}

/* ------------------------------------------------- one campaign, drawn out */

function drawSample() {
  const n = Math.min(num("n"), 60);
  const effect = num("effect");
  let s = 12345;
  const rng = () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    const u = (s + 0.5) / 4294967296;
    s = (s * 1664525 + 1013904223) >>> 0;
    const v = (s + 0.5) / 4294967296;
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  };
  const deltas = Array.from({ length: n }, () => effect + rng() * PILOT_SD);
  const w = 560, h = 90, mid = h / 2;
  const scale = mid / (PILOT_SD * 2.6);
  const bw = w / n;
  const parts = deltas.map((d, i) => {
    const y = Math.max(-mid, Math.min(mid, d * scale));
    return `<rect x="${(i * bw).toFixed(2)}" y="${(y > 0 ? mid - y : mid).toFixed(2)}"
      width="${Math.max(bw - 1, 1).toFixed(2)}" height="${Math.abs(y).toFixed(2)}"
      fill="${d >= 0 ? C.good : C.bad}"/>`;
  });
  parts.push(`<line x1="0" y1="${mid}" x2="${w}" y2="${mid}" stroke="${C.ink}" stroke-width="1"/>`);
  const wins = deltas.filter((d) => d > 0).length;
  parts.push(`<text x="4" y="12" font-size="10" fill="${C.muted}">${wins} of ${n} cells improved</text>`);
  el("sample").innerHTML = parts.join("");

  el("sampleVerdict").innerHTML = Object.entries(POLICIES)
    .map(([k, v]) => {
      const rolled = rejects(deltas, rule(k));
      return `<span style="margin-right:16px"><b style="color:${COLOUR[k]}">${v.label.split(" (")[0]}</b>
        → ${rolled ? "<b>rolls back</b>" : "promotes"}</span>`;
    })
    .join("");
}

function render() {
  drawCurves();
  drawVerdict();
  drawSample();
  el("marginlab").textContent = `−${num("margin")}`;
  el("nlab").textContent = String(num("n"));
  el("effectlab").textContent = String(num("effect"));
}

for (const id of ["effect", "n", "margin", "trials"]) {
  el(id).addEventListener("input", render);
}
el("fig-cell").innerHTML = pairedCellFigure();
render();

mountArc("gate");
