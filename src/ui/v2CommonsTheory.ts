import {
  ABUNDANCE, GEN0, SCARCITY, aggregateUpkeep, equilibria, feasibilityRatio,
  greedyCeiling, msy, msyStock, regime, regrowth, sustainableShare,
  type CommonsParams,
} from "../core/commons";

/**
 * The Commons Game's sustainable region, drawn the way bioeconomics draws it.
 *
 * Regrowth g(S) = rS(1 - S/K) is a hump. Any constant total harvest is a
 * horizontal line. Where the line cuts the hump there are two stock levels
 * that hold: the right-hand one is stable, the left-hand one is the edge of a
 * cliff. Lift the line above the peak and it stops cutting the hump at all --
 * at which point no stock level sustains that draw and collapse is arithmetic
 * rather than behavioural.
 *
 * That picture is the whole reason to have a theory for this game. It says in
 * advance whether a parameter set can measure anything, and this project
 * shipped one that could not: aggregate upkeep sat ABOVE the peak for months,
 * so every strategy collapsed and composition could not possibly matter.
 */

const PRESETS: { key: string; label: string; note: string; p: CommonsParams }[] = [
  { key: "gen0", label: "gen 0 run", note: "the run on the evidence page", p: GEN0 },
  { key: "abundance", label: "shipped abundance", note: "configs/commons.yaml", p: ABUNDANCE },
  { key: "scarcity", label: "shipped scarcity", note: "measures nothing, by construction", p: SCARCITY },
];

const W = 720, H = 240;
const PAD = { l: 52, r: 118, t: 16, b: 34 };

const q = <T extends Element>(root: HTMLElement, sel: string): T | null =>
  root.querySelector<T>(sel);

export function mountCommonsTheory(root: HTMLElement): void {
  const kDial = q<HTMLInputElement>(root, "#ct-capacity");
  const kOut = q<HTMLOutputElement>(root, "#ct-capacity-value");
  const rDial = q<HTMLInputElement>(root, "#ct-regrowth");
  const rOut = q<HTMLOutputElement>(root, "#ct-regrowth-value");
  const plot = q<SVGElement>(root, "#ct-plot");
  const verdict = q<HTMLElement>(root, "#ct-verdict");
  const detail = q<HTMLElement>(root, "#ct-detail");
  const stats = q<HTMLElement>(root, "#ct-stats");
  const presets = q<HTMLElement>(root, "#ct-presets");
  if (!kDial || !rDial || !plot || !verdict || !detail || !stats) return;

  if (presets) {
    presets.innerHTML = PRESETS.map((s) =>
      `<button type="button" class="ct-preset" data-preset="${s.key}"
         title="${s.note}">${s.label}</button>`).join("");
  }

  const params = (): CommonsParams => ({
    ...GEN0, k: Number(kDial.value), r: Number(rDial.value) / 100,
  });

  const render = () => {
    const p = params();
    if (kOut) kOut.textContent = String(p.k);
    if (rOut) rOut.textContent = p.r.toFixed(2);

    const peak = msy(p);
    const upkeep = aggregateUpkeep(p);
    const greed = greedyCeiling(p);
    const ratio = feasibilityRatio(p);
    const mode = regime(p);
    const eq = equilibria(upkeep, p);

    // vertical range: always show the upkeep line even when it clears the hump
    const top = Math.max(peak, upkeep, greed * 0.35) * 1.15;
    const x = (s: number) => PAD.l + (s / p.k) * (W - PAD.l - PAD.r);
    const y = (v: number) => PAD.t + (1 - v / top) * (H - PAD.t - PAD.b);
    const out: string[] = [];

    out.push(`<line class="ct-axis-line" x1="${PAD.l}" y1="${y(0)}" x2="${W - PAD.r}" y2="${y(0)}"></line>`);
    for (const tick of [0, Math.round(top / 2), Math.round(top)]) {
      out.push(`<text class="ct-tick" x="${PAD.l - 8}" y="${(y(tick) + 3.5).toFixed(1)}"
        text-anchor="end">${tick}</text>`);
    }
    for (const s of [0, p.k / 2, p.k]) {
      out.push(`<text class="ct-tick" x="${x(s).toFixed(1)}" y="${H - 14}"
        text-anchor="middle">${Math.round(s)}</text>`);
    }
    out.push(`<text class="ct-axis" x="${(PAD.l + W - PAD.r) / 2}" y="${H - 2}"
      text-anchor="middle">stock</text>`);

    // the regrowth hump
    const pts: string[] = [];
    for (let i = 0; i <= 100; i++) {
      const s = (i / 100) * p.k;
      pts.push(`${x(s).toFixed(1)},${y(Math.max(0, regrowth(s, p))).toFixed(1)}`);
    }
    out.push(`<polyline class="ct-curve" points="${pts.join(" ")}"></polyline>`);

    // maximum sustainable yield
    out.push(`<line class="ct-msy" x1="${x(msyStock(p)).toFixed(1)}" y1="${y(peak).toFixed(1)}"
      x2="${x(msyStock(p)).toFixed(1)}" y2="${y(0)}"></line>`);
    out.push(`<circle class="ct-msy-dot" cx="${x(msyStock(p)).toFixed(1)}"
      cy="${y(peak).toFixed(1)}" r="4"></circle>`);
    out.push(`<text class="ct-note" x="${(x(msyStock(p)) + 8).toFixed(1)}"
      y="${(y(peak) - 8).toFixed(1)}">peak regrowth ${peak.toFixed(1)}</text>`);

    // what the population must take, and what it would take unrestrained
    out.push(`<line class="ct-upkeep" x1="${PAD.l}" y1="${y(upkeep).toFixed(1)}"
      x2="${W - PAD.r}" y2="${y(upkeep).toFixed(1)}"></line>`);
    out.push(`<text class="ct-label is-upkeep" x="${W - PAD.r + 8}"
      y="${(y(upkeep) + 3.5).toFixed(1)}">upkeep ${upkeep.toFixed(0)}</text>`);
    if (greed <= top) {
      out.push(`<line class="ct-greed" x1="${PAD.l}" y1="${y(greed).toFixed(1)}"
        x2="${W - PAD.r}" y2="${y(greed).toFixed(1)}"></line>`);
      out.push(`<text class="ct-label is-greed" x="${W - PAD.r + 8}"
        y="${(y(greed) + 3.5).toFixed(1)}">full greed ${greed}</text>`);
    }

    // the two stock levels that hold the upkeep draw
    if (eq.exists) {
      for (const [s, kind] of [[eq.low, "low"], [eq.high, "high"]] as const) {
        out.push(`<circle class="ct-eq is-${kind}" cx="${x(s).toFixed(1)}"
          cy="${y(upkeep).toFixed(1)}" r="3.5"></circle>`);
      }
      out.push(`<text class="ct-note" x="${x(eq.low).toFixed(1)}" y="${(y(upkeep) + 16).toFixed(1)}"
        text-anchor="middle">${eq.low.toFixed(0)}</text>`);
      out.push(`<text class="ct-note" x="${x(eq.high).toFixed(1)}" y="${(y(upkeep) + 16).toFixed(1)}"
        text-anchor="middle">${eq.high.toFixed(0)}</text>`);
    }

    plot.innerHTML = out.join("");
    plot.setAttribute("aria-label",
      `Regrowth against stock. Peak sustainable yield ${peak.toFixed(1)} at stock ` +
      `${msyStock(p)}; aggregate upkeep ${upkeep}; ratio ${ratio.toFixed(2)}, ${mode} regime.`);

    verdict.dataset.outcome =
      mode === "degenerate" ? "collapses" : mode === "tight" ? "running" : "survives";
    verdict.textContent =
      mode === "degenerate"
        ? `Ratio ${ratio.toFixed(2)} — the upkeep line clears the hump. No stock level pays for eight agents, so every strategy collapses.`
        : mode === "tight"
          ? `Ratio ${ratio.toFixed(2)} — survivable, but barely. Little room between staying alive and exhausting the stock.`
          : `Ratio ${ratio.toFixed(2)} — restraint sustains this commons and full greed still starves it. Composition can move the outcome.`;

    detail.textContent = mode === "degenerate"
      ? "A composition experiment run here measures nothing: survival is not a dependent variable, only the timing of an inevitable collapse."
      : `Each agent can sustainably draw ${sustainableShare(p).toFixed(2)} per round against an upkeep of ${p.upkeep}. Unrestrained the population would request ${greed}, which is ${(greed / peak).toFixed(1)}x what regrowth replaces.`;

    stats.innerHTML = [
      ["Peak sustainable yield", `${peak.toFixed(1)}`, "rK / 4, at stock K / 2"],
      ["Aggregate upkeep", `${upkeep.toFixed(0)}`, "N × upkeep, the survival floor"],
      ["Feasibility ratio", ratio.toFixed(2), "above 1 or the game is unwinnable"],
      ["Collapse edge", eq.exists ? eq.low.toFixed(0) : "—", "below this stock, upkeep alone finishes it"],
    ].map(([k, v, note]) =>
      `<div class="ct-stat"><b>${v}</b><span>${k}</span><i>${note}</i></div>`).join("");
  };

  presets?.addEventListener("click", (event) => {
    const button = (event.target as HTMLElement).closest<HTMLElement>("[data-preset]");
    if (!button) return;
    const found = PRESETS.find((s) => s.key === button.dataset.preset);
    if (!found) return;
    kDial.value = String(found.p.k);
    rDial.value = String(Math.round(found.p.r * 100));
    render();
  });

  kDial.addEventListener("input", render);
  rDial.addEventListener("input", render);
  render();
}
