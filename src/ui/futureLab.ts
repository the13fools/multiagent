import "./style.css";
import { el, C, HEX, linePlot, refLine, applyEmbedMode } from "./lab";
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
