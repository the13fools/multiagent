import "./style.css";
import { mountArc } from "./arc";
import { el, C, HEX, linePlot, refLine, applyEmbedMode, renderStats, verdict, bindDials } from "./lab";
import { HORIZON, POLICIES, REFERENCE, pNeed, simulate } from "../core/sharedResource";
import { driftFigure } from "./figures";

applyEmbedMode();

/**
 * One figure, because the page makes one claim: a learning population is a
 * moving target, and everything measured so far assumes it holds still.
 *
 * Running restore rate over the rollout. A fixed rule is a flat line -- whatever
 * it was at turn 1 is what it is at turn 200. The adaptive rule walks toward the
 * required rate. Both can end at the same place; only one of them was ever
 * measurable by a single paired comparison.
 */
const W = 700, H = 190;
const target = pNeed(REFERENCE);

function rateOverTime(key: string): number[] {
  const out = simulate(POLICIES[key]!.fn, { n: 8, turns: HORIZON, params: REFERENCE });
  const series: number[] = [];
  let r = 0, acted = 0;
  for (const f of out.frames) {
    for (const a of f.actions) {
      if (a === "restore") { r++; acted++; }
      else if (a === "take") acted++;
    }
    series.push(acted ? r / acted : 0);
  }
  return series;
}

const shown = ["learn", "copy", "own"] as const;
const colours: Record<string, string> = { learn: C.accent, copy: HEX.bad, own: HEX.good };

el("drift").innerHTML =
  refLine(target, { w: W, h: H, yMin: 0, yMax: 1, label: `required rate ${target.toFixed(2)}` }) +
  linePlot(
    shown.map((k) => ({ points: rateOverTime(k), colour: colours[k], width: 2.2 })),
    { w: W, h: H, yMin: 0, yMax: 1 },
  ) +
  shown.map((k, i) =>
    `<text x="8" y="${16 + i * 15}" font-size="11" fill="${colours[k]}" font-weight="600">${
      POLICIES[k]!.label.replace(/ \(.*\)/, "")}</text>`).join("");

el("fig-drift").innerHTML = driftFigure();

el("caption").textContent =
  "Running restore rate over 200 turns. Fixed rules are flat by construction. " +
  "The adaptive one walks toward the required rate — and a paired comparison " +
  "cannot tell you which turn it was measured on.";

mountArc("future");

/* ------------------------------------------------------ what a population costs
 *
 * The project's central claim about money is that population size can be a dial
 * rather than a constraint. That is checkable arithmetic, so it is a calculator
 * rather than a sentence -- and it is the honest place to argue the scope,
 * because the reason to stay at 7B for a year is visible the moment you move
 * the size dial.
 */
import { REFERENCE_PLAN, SIZES, budgetCurve, seedingCost, type SeedingPlan } from "../core/seeding";

const dial = (id: string) => Number((el(id) as HTMLInputElement).value);

const plan = (): SeedingPlan => ({
  ...REFERENCE_PLAN,
  agents: dial("agents"),
  rolloutHours: dial("rollout"),
  trainHours: dial("train"),
  teacherHours: dial("teacher"),
  pricePerHour: dial("price"),
  multiplier: SIZES[Number((el("size") as HTMLSelectElement).value)]!.multiplier,
});

const usd = (v: number) =>
  v >= 10000 ? `$${(v / 1000).toFixed(0)}k` : v >= 1000 ? `$${(v / 1000).toFixed(1)}k` : `$${v.toFixed(0)}`;

function drawCostCurve() {
  const p = plan();
  const c = seedingCost(p);
  const budget = c.total;                       // hold this campaign's budget fixed
  const counts = [5, 10, 20, 30, 40, 60, 80, 120];
  const rows = budgetCurve(budget, p, counts);
  const ox = 54, oy = 20, w = 606, h = 130;
  const top = Math.max(...rows.map((r) => r.hoursEach), p.trainHours) * 1.1 || 1;
  const px = (i: number) => ox + (i / (counts.length - 1)) * w;
  const py = (v: number) => oy + h - Math.min(1, v / top) * h;
  const s: string[] = [];

  s.push(`<line x1="${ox}" y1="${oy + h}" x2="${ox + w}" y2="${oy + h}" stroke="${C.ink}"/>`);
  s.push(`<line x1="${ox}" y1="${oy}" x2="${ox}" y2="${oy + h}" stroke="${C.ink}"/>`);
  for (const v of [0, top / 2, top]) {
    s.push(`<text x="${ox - 8}" y="${py(v) + 3.5}" text-anchor="end" font-size="10"
      fill="${C.muted}">${v.toFixed(0)}</text>`);
  }
  s.push(`<text x="${ox + w / 2}" y="${oy + h + 32}" text-anchor="middle" font-size="11"
    fill="${C.muted}">agents in the population, at a fixed ${usd(budget)} budget</text>`);
  counts.forEach((n, i) =>
    s.push(`<text x="${px(i)}" y="${oy + h + 15}" text-anchor="middle" font-size="10"
      fill="${C.muted}">${n}</text>`));

  s.push(`<polyline points="${rows.map((r, i) => `${px(i)},${py(r.hoursEach)}`).join(" ")}"
    fill="none" stroke="${C.accent}" stroke-width="2.4"/>`);
  s.push(`<text x="${ox + 8}" y="${oy + 14}" font-size="10.5" fill="${C.accent}"
    font-weight="600">training hours each agent can get</text>`);

  const here = counts.findIndex((n) => n >= p.agents);
  if (here >= 0) {
    s.push(`<line x1="${px(here)}" y1="${oy}" x2="${px(here)}" y2="${oy + h}"
      stroke="${C.ink}" stroke-dasharray="3 3" opacity="0.5"/>`);
  }
  el("cost-curve").innerHTML = s.join("");
}

function renderCost() {
  const p = plan();
  const c = seedingCost(p);
  const size = SIZES[Number((el("size") as HTMLSelectElement).value)]!;

  renderStats("cost-stats", [
    { key: "Per agent", value: usd(c.perAgent) },
    { key: "One more agent", value: usd(c.marginal) },
    { key: "Teacher pass", value: usd(c.teacher) },
    { key: `${p.agents} agents`, value: usd(c.total) },
    { key: "GPU-hours", value: Math.round(c.gpuHours).toLocaleString() },
  ]);

  // A campaign against this population costs about $52k at the reference plan;
  // the comparison is the whole argument, so it is on the screen.
  const campaign = 52000;
  const share = (c.total / campaign) * 100;
  el("cost-note").innerHTML =
    `<p class="muted" style="margin:0">A population of ${p.agents} at ${size.label} costs
     <b>${usd(c.total)}</b> — ${share < 100
       ? `${share.toFixed(0)}% of the ${usd(campaign)} needed to run a powered campaign against it,
          so the population is the cheap part`
       : `<b>more than the ${usd(campaign)}</b> needed to run a powered campaign against it, so the
          population has stopped being the cheap part`}.</p>`;

  verdict("cost-verdict", size.label === "7B"
    ? "✓ 7B — a population is a rounding error against the campaign"
    : `${share < 50 ? "✓" : "✕"} ${size.label} — ${usd(c.perAgent)} an agent`,
    share < 50 ? "live" : "dead");

  el("cost-setup").textContent =
    `${p.agents} agents at ${size.label}: ${p.rolloutHours} GPU-hours of rollouts and ` +
    `${p.trainHours} of training each, ×${p.multiplier} for size, plus a shared ` +
    `${p.teacherHours}-hour teacher pass, at $${p.pricePerHour.toFixed(2)} an hour.`;

  drawCostCurve();
}

(el("size") as HTMLSelectElement).innerHTML = SIZES
  .map((s, i) => `<option value="${i}"${s.label === "7B" ? " selected" : ""}>${s.label}</option>`)
  .join("");
bindDials(renderCost);
renderCost();
