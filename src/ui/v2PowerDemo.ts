import {
  DESCOPE_ORDER, REFERENCE_DESIGN, descopeBudget, descopePlan, pairedCells, requiredN,
} from "../core/design";

/**
 * What a worse-than-expected variance does to the budget.
 *
 * The delivery page promises a fixed envelope and an ordered descope: if Phase 0
 * measures variance the pilot did not see, named things get dropped in a stated
 * sequence rather than the ask going up. Written down, that is a sentence any
 * proposal could contain. Run, it is a commitment with edges -- a 10% rise in
 * the paired SD spends the entire contingency, and a 50% rise means the core
 * does not fit at all and has to be redesigned rather than squeezed.
 *
 * The requirement moves with the SQUARE of the SD-to-margin ratio, which is
 * why this is the risk that gets its own milestone instead of a footnote.
 */

const SD_AXIS = [1000, 1180, 1400, 1600, 1800, 2000, 2200, 2400] as const;
const BOUGHT = pairedCells(REFERENCE_DESIGN);

const W = 720;
const H = 170;
const PAD = { l: 46, r: 14, t: 12, b: 30 };

const q = <T extends Element>(root: HTMLElement, sel: string): T | null =>
  root.querySelector<T>(sel);

const hours = (n: number) => `${Math.round(n).toLocaleString()} GPU-hr`;

export function mountPowerDemo(root: HTMLElement): void {
  const sd = q<HTMLInputElement>(root, "#power-sd");
  const sdValue = q<HTMLOutputElement>(root, "#power-sd-value");
  const margin = q<HTMLInputElement>(root, "#power-margin");
  const marginValue = q<HTMLOutputElement>(root, "#power-margin-value");
  const plot = q<SVGElement>(root, "#power-plot");
  const verdict = q<HTMLElement>(root, "#power-verdict");
  const detail = q<HTMLElement>(root, "#power-detail");
  const ladder = q<HTMLElement>(root, "#power-ladder");
  if (!sd || !margin || !plot || !verdict || !detail || !ladder) return;

  const render = () => {
    const sdNow = Number(sd.value);
    const marginNow = Number(margin.value);
    if (sdValue) sdValue.textContent = sdNow.toLocaleString();
    if (marginValue) marginValue.textContent = String(marginNow);

    const plan = descopePlan(marginNow, sdNow);

    // --- the curve: required pairs against SD, at the chosen margin ---
    const needs = SD_AXIS.map((s) => requiredN(marginNow, s));
    const top = Math.max(BOUGHT * 2, ...needs.filter(Number.isFinite));
    const x = (i: number) => PAD.l + (i / (SD_AXIS.length - 1)) * (W - PAD.l - PAD.r);
    const y = (v: number) => PAD.t + (1 - Math.min(1, v / top)) * (H - PAD.t - PAD.b);
    const parts: string[] = [];

    // what the campaign actually buys, drawn as the thing to stay above
    parts.push(`<line class="power-bought" x1="${PAD.l}" y1="${y(BOUGHT).toFixed(1)}"
      x2="${W - PAD.r}" y2="${y(BOUGHT).toFixed(1)}"></line>`);
    parts.push(`<text class="power-tick" x="${W - PAD.r}" y="${(y(BOUGHT) - 6).toFixed(1)}"
      text-anchor="end">the design buys ${BOUGHT}</text>`);

    for (const tick of [0, Math.round(top / 2), Math.round(top)]) {
      parts.push(`<text class="power-tick" x="${PAD.l - 8}" y="${(y(tick) + 3.5).toFixed(1)}"
        text-anchor="end">${tick}</text>`);
    }
    SD_AXIS.forEach((s, i) => {
      if (i % 2 === 0 || i === SD_AXIS.length - 1) {
        parts.push(`<text class="power-tick" x="${x(i).toFixed(1)}" y="${H - 12}"
          text-anchor="middle">${s.toLocaleString()}</text>`);
      }
    });
    parts.push(`<text class="power-axis" x="${(PAD.l + W - PAD.r) / 2}" y="${H - 1}"
      text-anchor="middle">paired standard deviation measured in Phase 0</text>`);

    const line = needs.map((v, i) => `${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(" ");
    parts.push(`<polyline class="power-line" points="${line}"></polyline>`);

    // where the chosen SD sits, interpolated onto the same axis
    const span = SD_AXIS.at(-1)! - SD_AXIS[0]!;
    const frac = Math.max(0, Math.min(1, (sdNow - SD_AXIS[0]!) / span));
    const cx = PAD.l + frac * (W - PAD.l - PAD.r);
    const cy = y(plan.need);
    parts.push(`<line class="power-cursor" x1="${cx.toFixed(1)}" y1="${PAD.t}"
      x2="${cx.toFixed(1)}" y2="${H - PAD.b}"></line>`);
    parts.push(`<circle class="power-dot ${plan.extraHours === 0 ? "is-ok" : plan.fits ? "is-tight" : "is-broken"}"
      cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="4.5"></circle>`);

    plot.innerHTML = parts.join("");
    plot.setAttribute("aria-label",
      `Required paired cells against measured standard deviation at a margin of ${marginNow}. ` +
      `At a standard deviation of ${sdNow} the requirement is ${plan.need}, against ${BOUGHT} bought.`);

    // --- the verdict ---
    if (plan.extraHours === 0) {
      verdict.dataset.outcome = "survives";
      verdict.textContent = `Powered as designed: ${plan.need} paired cells required, ${BOUGHT} bought.`;
      detail.textContent = "Nothing is dropped. This is the case the budget was written for.";
    } else if (plan.fits) {
      verdict.dataset.outcome = "running";
      verdict.textContent = `${plan.need} paired cells now required against ${BOUGHT} bought — ${hours(plan.extraHours)} short.`;
      detail.textContent = `Covered by dropping ${plan.dropped.length} item${plan.dropped.length === 1 ? "" : "s"} in the declared order. The ask does not move.`;
    } else {
      verdict.dataset.outcome = "collapses";
      verdict.textContent = `${plan.need} paired cells required. Everything droppable is gone and it is still ${hours(plan.shortfall)} short.`;
      detail.textContent = "This is a redesign, not a squeeze, and the proposal says so rather than quietly running an underpowered campaign.";
    }

    // --- the ladder ---
    let spent = 0;
    ladder.innerHTML = DESCOPE_ORDER.map((item, i) => {
      const isDropped = i < plan.dropped.length;
      if (isDropped) spent += item.hours;
      return `<li class="descope ${isDropped ? "is-dropped" : "is-kept"}">
        <span class="descope-rank">${i + 1}</span>
        <span class="descope-name">${item.name}</span>
        <span class="descope-hours">${item.hours.toLocaleString()} hr</span>
        <span class="descope-state">${isDropped ? "dropped" : "kept"}</span>
        <span class="descope-why">${item.why}</span>
      </li>`;
    }).join("") +
      `<li class="descope is-total"><span class="descope-rank"></span>
        <span class="descope-name">Released by descoping</span>
        <span class="descope-hours">${spent.toLocaleString()} hr</span>
        <span class="descope-state">of ${descopeBudget().toLocaleString()}</span>
        <span class="descope-why">The whole droppable budget. Past it the envelope cannot absorb the variance.</span></li>`;
  };

  sd.addEventListener("input", render);
  margin.addEventListener("input", render);
  render();
}
