import "./style.css";
import { mountArc } from "./arc";
import { el, C, HEX, renderStats, verdict, applyEmbedMode, bindDials } from "./lab";
import { pairedCellFigure } from "./figures";
import {
  CONTROLS, REFERENCE_DESIGN, detectableEffect, evaluate, type Design,
} from "../core/design";

applyEmbedMode();

/**
 * The campaign planner.
 *
 * Cost and power on the same dials, because they are the same decision. A
 * design that is affordable and underpowered spends real money to produce a
 * null nobody can read, and the only way to see that coming is to watch both
 * numbers move together.
 */

const num = (id: string) => Number((el(id) as HTMLInputElement).value);

const design = (): Design => ({
  ...REFERENCE_DESIGN,
  families: num("families"),
  environments: num("environments"),
  fractions: num("fractions"),
  salt: num("salt"),
  seeds: num("seeds"),
});

const money = (v: number) =>
  v >= 1000 ? `$${(v / 1000).toFixed(1)}k` : `$${v.toFixed(0)}`;

/** Detectable effect against campaign size, with the asked-for margin marked. */
function drawCurve() {
  const sd = num("sd");
  const margin = num("margin");
  const have = design().salt * design().seeds;
  const ox = 54, oy = 18, w = 610, h = 132;   // inside the 700x200 viewBox
  const NS = [10, 20, 30, 40, 60, 80, 120, 180, 260, 360];
  const top = detectableEffect(NS[0]!, sd);
  const px = (i: number) => ox + (i / (NS.length - 1)) * w;
  const py = (v: number) => oy + h - Math.min(1, v / top) * h;
  const s: string[] = [];

  s.push(`<line x1="${ox}" y1="${oy + h}" x2="${ox + w}" y2="${oy + h}" stroke="${C.ink}"/>`);
  s.push(`<line x1="${ox}" y1="${oy}" x2="${ox}" y2="${oy + h}" stroke="${C.ink}"/>`);
  for (const v of [0, top / 2, top]) {
    s.push(`<text x="${ox - 8}" y="${py(v) + 3.5}" text-anchor="end" font-size="10"
      fill="${C.muted}">${v.toFixed(0)}</text>`);
  }
  NS.forEach((n, i) => {
    if (i % 2 === 0 || i === NS.length - 1) {
      s.push(`<text x="${px(i)}" y="${oy + h + 15}" text-anchor="middle" font-size="10"
        fill="${C.muted}">${n}</text>`);
    }
  });
  s.push(`<text x="${ox + w / 2}" y="${oy + h + 32}" text-anchor="middle" font-size="11"
    fill="${C.muted}">paired cells per contrast</text>`);

  // the margin you asked for
  s.push(`<line x1="${ox}" y1="${py(margin)}" x2="${ox + w}" y2="${py(margin)}"
    stroke="${C.ink}" stroke-dasharray="4 3"/>`);
  s.push(`<text x="${ox + w}" y="${py(margin) - 6}" text-anchor="end" font-size="10"
    fill="${C.muted}">the margin you care about: ${margin}</text>`);

  const pts = NS.map((n, i) => `${px(i)},${py(detectableEffect(n, sd))}`);
  s.push(`<polyline points="${pts.join(" ")}" fill="none" stroke="${C.accent}" stroke-width="2.4"/>`);

  // where this campaign actually sits
  const frac = Math.max(0, Math.min(1, (Math.log(have) - Math.log(NS[0]!)) /
    (Math.log(NS[NS.length - 1]!) - Math.log(NS[0]!))));
  const hx = ox + frac * w;
  const hy = py(detectableEffect(have, sd));
  const ok = detectableEffect(have, sd) <= margin;
  s.push(`<line x1="${hx}" y1="${oy}" x2="${hx}" y2="${oy + h}" stroke="${ok ? HEX.good : HEX.bad}"
    stroke-width="1.5" opacity="0.5"/>`);
  s.push(`<circle cx="${hx}" cy="${hy}" r="5" fill="${ok ? HEX.good : HEX.bad}"/>`);
  s.push(`<text x="${hx + 8}" y="${hy - 8}" font-size="10.5" font-weight="600"
    fill="${ok ? HEX.good : HEX.bad}">this campaign: ${have} cells</text>`);

  el("curve").innerHTML = s.join("");
}

function render() {
  const d = design();
  const margin = num("margin");
  const sd = num("sd");
  const v = evaluate(d, margin, sd);

  renderStats("stats", [
    { key: "Cells", value: v.cells.toLocaleString() },
    { key: "GPU-hours", value: Math.round(v.gpuHours).toLocaleString() },
    { key: "Compute", value: money(v.cost) },
    { key: "Paired per contrast", value: v.paired },
    { key: "Needed", value: v.need === Infinity ? "—" : v.need },
    { key: "Smallest visible effect", value: detectableEffect(v.paired, sd).toFixed(0) },
  ]);

  el("power").innerHTML = v.powered
    ? `<p class="muted" style="margin:0">At ${v.paired} paired cells this campaign can see an
       effect of ${detectableEffect(v.paired, sd).toFixed(0)} welfare units — smaller than the
       ${margin} you said you cared about, so a null here would mean something.</p>`
    : `<p class="muted" style="margin:0">At ${v.paired} paired cells the smallest effect this
       campaign can see is ${detectableEffect(v.paired, sd).toFixed(0)} welfare units, which is
       <b>larger than the ${margin} you said you cared about</b>. It would need ${v.need} paired
       cells. As designed, a null would be uninterpretable.</p>`;

  verdict("verdict",
    v.powered ? `✓ powered — ${v.paired} of ${v.need} needed` : `✕ underpowered — needs ${v.need}`,
    v.powered ? "live" : "dead");

  el("setup").textContent =
    `${d.families} model famil${d.families === 1 ? "y" : "ies"} × ${d.environments} environment` +
    `${d.environments === 1 ? "" : "s"} × ${d.fractions} seeded fractions × 2 arms × ${d.salt} salt` +
    ` × ${d.seeds} seeds, at ${d.hoursPerCell} GPU-hours a cell and ${money(d.pricePerHour)} an hour.`;

  drawCurve();
}

function drawControls() {
  el("controls").innerHTML =
    `<table><tr><th>control</th><th>the explanation it kills</th><th>how</th></tr>` +
    CONTROLS.map((c) =>
      `<tr><td><b>${c.name}</b></td><td>${c.against}</td><td class="muted">${c.how}</td></tr>`)
      .join("") + `</table>`;
}

el("fig-cell").innerHTML = pairedCellFigure();
drawControls();
bindDials(render);
render();
mountArc("design");
