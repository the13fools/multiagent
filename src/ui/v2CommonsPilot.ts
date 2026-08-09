import { COMMONS_PILOT, byDose, isMonotoneInDose, seededDelta, KNOWN_DEFECT }
  from "../core/commonsPilot";

/**
 * The Commons Harvest pilot, drawn as the dose-response it actually is.
 *
 * Three points: 0, 4 and 8 seeded seats. The fully seeded arm looks good --
 * collapse pushed from round 15 to 19, welfare up 19%. The half-seeded arm is
 * WORSE than no intervention at all, dying a round earlier than baseline. At
 * one seed per condition that is as likely to be noise as signal, and drawing
 * it is the honest alternative to quoting only the pair that flatters.
 */

const W = 720, H = 200;
const PAD = { l: 46, r: 90, t: 14, b: 34 };

const q = <T extends Element>(root: HTMLElement, sel: string): T | null =>
  root.querySelector<T>(sel);

export function mountCommonsPilot(root: HTMLElement): void {
  const plot = q<SVGElement>(root, "#commons-plot");
  const readout = q<HTMLElement>(root, "#commons-readout");
  const verdict = q<HTMLElement>(root, "#commons-verdict");
  const defect = q<HTMLElement>(root, "#commons-defect");
  if (!plot || !readout) return;

  const longest = Math.max(...COMMONS_PILOT.map((c) => c.stock.length));
  const top = Math.max(...COMMONS_PILOT.flatMap((c) => c.stock));
  const x = (round: number) => PAD.l + (round / (longest - 1)) * (W - PAD.l - PAD.r);
  const y = (stock: number) => PAD.t + (1 - stock / top) * (H - PAD.t - PAD.b);

  const parts: string[] = [];
  parts.push(`<line class="cp-zero" x1="${PAD.l}" y1="${y(0).toFixed(1)}"
    x2="${W - PAD.r}" y2="${y(0).toFixed(1)}"></line>`);
  for (const tick of [0, Math.round(top / 2), Math.round(top)]) {
    parts.push(`<text class="cp-tick" x="${PAD.l - 8}" y="${(y(tick) + 3.5).toFixed(1)}"
      text-anchor="end">${tick}</text>`);
  }
  for (let r = 0; r < longest; r += 4) {
    parts.push(`<text class="cp-tick" x="${x(r).toFixed(1)}" y="${H - 14}"
      text-anchor="middle">${r + 1}</text>`);
  }
  parts.push(`<text class="cp-axis" x="${(PAD.l + W - PAD.r) / 2}" y="${H - 2}"
    text-anchor="middle">round</text>`);

  for (const c of COMMONS_PILOT) {
    const pts = c.stock.map((s, i) => `${x(i).toFixed(1)},${y(s).toFixed(1)}`).join(" ");
    parts.push(`<polyline class="cp-line is-${c.key}" points="${pts}"></polyline>`);
    const lastX = x(c.stock.length - 1), lastY = y(0);
    parts.push(`<circle class="cp-dot is-${c.key}" cx="${lastX.toFixed(1)}"
      cy="${lastY.toFixed(1)}" r="3.5"></circle>`);
    parts.push(`<text class="cp-label is-${c.key}" x="${(lastX + 7).toFixed(1)}"
      y="${(lastY + 3.5).toFixed(1)}">${c.seeded} seeded · r${c.collapseRound}</text>`);
  }
  plot.innerHTML = parts.join("");
  plot.setAttribute("aria-label",
    "Commons Harvest stock by round for three populations. " +
    byDose().map((c) => `${c.seeded} seeded collapses at round ${c.collapseRound}`).join("; ") + ".");

  readout.innerHTML = `<table class="cp-table">
    <thead><tr><th>seeded seats</th><th>collapse round</th><th>total welfare</th>
      <th>restraint under scarcity</th><th>parse failures</th></tr></thead>
    <tbody>${byDose().map((c) => `<tr>
      <td><b>${c.seeded} of 8</b></td>
      <td>${c.collapseRound}</td>
      <td>${c.totalWelfare.toFixed(2)}</td>
      <td>${c.restraintUnderScarcity.toFixed(4)}</td>
      <td>${c.parseFailures}</td></tr>`).join("")}</tbody></table>`;

  if (verdict) {
    const d = seededDelta();
    verdict.dataset.outcome = isMonotoneInDose() ? "survives" : "collapses";
    verdict.textContent = isMonotoneInDose()
      ? `Collapse round rises with the seeded fraction: +${d.rounds} rounds and +${d.welfare.toFixed(0)} welfare at full seeding.`
      : `Not monotone. Full seeding buys +${d.rounds} rounds and +${d.welfare.toFixed(0)} welfare, ` +
        `but the half-seeded population collapsed a round EARLIER than no intervention at all.`;
  }
  if (defect) defect.textContent = KNOWN_DEFECT;
}
