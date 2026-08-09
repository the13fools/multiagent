import { POLICIES, rejectionRate, PILOT_SD } from "../core/gate";

/**
 * Point the promotion gate at a clone and watch three reasonable rules disagree.
 *
 * RQ1 is the least visible thing on this site: it arrives as a sentence saying
 * an overlap rule rolled back an identical candidate in ~100% of null
 * resamples. That number is the reason the project exists, and a number in a
 * paragraph is easy to skim past.
 *
 * The figure it deserves is rejection rate against campaign size, because the
 * shape is the argument. One line RISES as you collect more data -- the overlap
 * rule bounds a proportion converging to 0.5 under the null, so more evidence
 * makes it more certain to reject a clone. One line sits pinned at the top for
 * the opposite reason. One falls. No prose makes that as quickly as three
 * diverging curves.
 *
 * The same `gate.ts` the tests and the proposal use, so the picture cannot
 * drift from the claim.
 */

const SIZES = [10, 20, 30, 40, 60, 80, 100, 140, 200] as const;
const TRIALS = 1200;
const ORDER = ["overlap", "superiority", "nonInferiority"] as const;

/** The declared fitness bar: above this the gate is retired, not tuned. */
export const FITNESS_BAR = 0.1;

interface Effect {
  value: number;
  /** What a rollback MEANS at this effect -- the axis label changes meaning. */
  rollback: string;
  gloss: string;
}

export const EFFECTS: Record<string, Effect> = {
  clone: {
    value: 0,
    rollback: "false rejection",
    gloss: "The candidate is identical to the baseline, so every rollback is an error and the rollback rate is the false-rejection rate.",
  },
  harm: {
    value: -800,
    rollback: "correct rollback",
    gloss: "The candidate really is worse, by twice the declared margin. Here a high rate is the gate working, and the tolerated-harm rule catches it — so its near-zero rate against a clone is discrimination, not permissiveness.",
  },
  gain: {
    value: 400,
    rollback: "missed improvement",
    gloss: "The candidate really is better by the margin. Note what the overlap rule does: it rejects a genuine improvement more often as the campaign grows. It is not merely strict, it is broken in both directions.",
  },
};

const W = 720;
const H = 190;
const PAD = { l: 46, r: 14, t: 12, b: 30 };

const x = (i: number) => PAD.l + (i / (SIZES.length - 1)) * (W - PAD.l - PAD.r);
const y = (rate: number) => PAD.t + (1 - rate) * (H - PAD.t - PAD.b);

const q = <T extends Element>(root: HTMLElement, sel: string): T | null =>
  root.querySelector<T>(sel);

const pct = (v: number) => `${(v * 100).toFixed(v >= 0.995 || v <= 0.005 ? 0 : 1)}%`;

export function mountGateDemo(root: HTMLElement): void {
  const size = q<HTMLInputElement>(root, "#gate-size");
  const sizeValue = q<HTMLOutputElement>(root, "#gate-size-value");
  const effect = q<HTMLSelectElement>(root, "#gate-effect");
  const plot = q<SVGElement>(root, "#gate-plot");
  const readout = q<HTMLElement>(root, "#gate-readout");
  const verdict = q<HTMLElement>(root, "#gate-verdict");
  const gloss = q<HTMLElement>(root, "#gate-gloss");
  if (!size || !effect || !plot || !readout || !verdict || !gloss) return;

  const render = () => {
    const chosen = EFFECTS[effect.value] ?? EFFECTS.clone!;
    const index = Number(size.value);
    const n = SIZES[index]!;
    if (sizeValue) sizeValue.textContent = `${n} pairs`;

    const series = ORDER.map((key) => {
      const policy = POLICIES[key]!;
      return {
        key,
        label: policy.label,
        note: policy.note,
        points: SIZES.map((s) => rejectionRate(policy.rule, s, chosen.value, TRIALS, PILOT_SD)),
        here: rejectionRate(policy.rule, n, chosen.value, TRIALS, PILOT_SD),
      };
    });

    const parts: string[] = [];

    // the declared 10% bar, drawn once so every curve is read against it
    parts.push(`<line class="gate-bar" x1="${PAD.l}" y1="${y(FITNESS_BAR).toFixed(1)}"
      x2="${W - PAD.r}" y2="${y(FITNESS_BAR).toFixed(1)}"></line>`);
    parts.push(`<text class="gate-bar-label" x="${W - PAD.r}" y="${(y(FITNESS_BAR) - 5).toFixed(1)}"
      text-anchor="end">declared bar: 10%</text>`);

    for (const tick of [0, 0.5, 1]) {
      parts.push(`<text class="gate-tick" x="${PAD.l - 8}" y="${(y(tick) + 3.5).toFixed(1)}"
        text-anchor="end">${tick * 100}%</text>`);
    }
    SIZES.forEach((s, i) => {
      if (i % 2 === 0 || i === SIZES.length - 1) {
        parts.push(`<text class="gate-tick" x="${x(i).toFixed(1)}" y="${H - 12}"
          text-anchor="middle">${s}</text>`);
      }
    });
    parts.push(`<text class="gate-axis" x="${(PAD.l + W - PAD.r) / 2}" y="${H - 1}"
      text-anchor="middle">paired cells in the campaign</text>`);

    // current campaign size
    parts.push(`<line class="gate-cursor" x1="${x(index).toFixed(1)}" y1="${PAD.t}"
      x2="${x(index).toFixed(1)}" y2="${H - PAD.b}"></line>`);

    for (const s of series) {
      const d = s.points.map((rate, i) => `${x(i).toFixed(1)},${y(rate).toFixed(1)}`).join(" ");
      parts.push(`<polyline class="gate-line is-${s.key}" points="${d}"></polyline>`);
      parts.push(`<circle class="gate-dot is-${s.key}" cx="${x(index).toFixed(1)}"
        cy="${y(s.here).toFixed(1)}" r="4"></circle>`);
    }

    plot.innerHTML = parts.join("");
    plot.setAttribute("aria-label",
      `Rollback rate against campaign size for three promotion rules at a true effect of ` +
      `${chosen.value} welfare units. At ${n} paired cells: ` +
      series.map((s) => `${s.label}, ${pct(s.here)}`).join("; ") + ".");

    readout.innerHTML = series.map((s) => {
      const clears = s.here <= FITNESS_BAR;
      return `<div class="gate-row is-${s.key}">
        <span class="gate-swatch"></span>
        <span class="gate-name">${s.label}</span>
        <b class="gate-rate">${pct(s.here)}</b>
        <span class="gate-flag ${clears ? "is-clear" : "is-fail"}">
          ${clears ? "clears the bar" : "over the bar"}</span>
        <span class="gate-note">${s.note}</span>
      </div>`;
    }).join("");

    const overlapNow = series[0]!.here;
    const overlapSmall = series[0]!.points[0]!;
    verdict.dataset.outcome = overlapNow > FITNESS_BAR ? "collapses" : "survives";
    verdict.textContent = chosen.value === 0
      ? (overlapNow >= overlapSmall
        ? `At ${n} paired cells the pilot's own gate rolls back a clone ${pct(overlapNow)} of the time — and it was ${pct(overlapSmall)} at ${SIZES[0]}. More data makes it worse.`
        : `At ${n} paired cells the pilot's own gate rolls back a clone ${pct(overlapNow)} of the time.`)
      : `At ${n} paired cells, ${chosen.rollback} rates are ${series.map((s) => pct(s.here)).join(" · ")} in rule order.`;

    gloss.textContent = chosen.gloss;
  };

  size.addEventListener("input", render);
  effect.addEventListener("change", render);
  render();
}
