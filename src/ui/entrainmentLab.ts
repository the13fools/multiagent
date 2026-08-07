import "./style.css";
import { mountArc } from "./arc";
import { el, C, HEX, mix, Ticker, bindDials, populationRing, applyEmbedMode,
  type RingAgent } from "./lab";
import {
  HORIZON, POLICIES, REFERENCE, pNeed, simulate,
  type Action, type Outcome, type Params,
} from "../core/sharedResource";

applyEmbedMode();

/**
 * Entrainment — a different question from the commons.
 *
 * The Shared Resource page asks whether a population finds the sustainable
 * rate. This asks something narrower and, for steering, more useful: given
 * agents you have pinned to the correct phase, do the others LOCK ON?
 *
 * Those come apart. A flock can be at the right average rate and still be dying
 * because the phases are wrong, and a follower rule can be individually
 * sensible and collectively unentrainable. Folding this into a table on the
 * commons page lost the dynamics, which is the part worth seeing.
 *
 * Two views, deliberately:
 *   - ONE RUN, animated, so you can watch phases pull together or fail to.
 *   - THE WHOLE SPACE at once, as small multiples over every rule x every k,
 *     so the threshold is a visible edge rather than a number in a table.
 */

const N = 8;
const KS = [0, 1, 2, 3, 4, 5, 6, 7, 8];

let state = { k: 4, G: 3, rule: "copy" };

const params = (): Params => ({ ...REFERENCE, G: state.G });
const opts = () => ({ n: N, turns: HORIZON, params: params(), pinned: state.k });

const cell = (a: Action | null, dead: boolean) =>
  dead ? HEX.dead : a === "restore" ? HEX.good : a === "take" ? HEX.bad : HEX.line;

/* ------------------------------------------------- one run, as it happens */

let out: Outcome;
let shown = 0;

const GW = 700, GH = 150, LAB = 30;

function drawRun() {
  const frames = out.frames;
  const cols = Math.max(frames.length, 1);
  const cw = GW / cols, rh = GH / N;
  const upto = Math.min(shown, frames.length);
  const s: string[] = [];

  for (let i = 0; i < N; i++) {
    const pinned = i < state.k;
    s.push(
      `<text x="${LAB - 6}" y="${(i * rh + rh * 0.68).toFixed(1)}" text-anchor="end"
         font-size="10" fill="${pinned ? C.accent : C.muted}"
         font-weight="${pinned ? 700 : 400}">${i}${pinned ? "●" : ""}</text>`,
    );
  }
  for (let t = 0; t < upto; t++) {
    const f = frames[t]!;
    for (let i = 0; i < N; i++) {
      s.push(
        `<rect x="${(LAB + t * cw).toFixed(2)}" y="${(i * rh).toFixed(2)}"
           width="${Math.max(cw - 0.4, 0.6).toFixed(2)}" height="${(rh - 1).toFixed(2)}"
           fill="${cell(f.actions[i]!, !f.alive[i])}"/>`,
      );
    }
  }
  // Phase coherence: how far this turn's split is from the required half.
  const target = pNeed(params());
  for (let t = 0; t < upto; t++) {
    const acting = frames[t]!.actions.filter(Boolean);
    if (!acting.length) continue;
    const frac = acting.filter((a) => a === "restore").length / acting.length;
    s.push(
      `<rect x="${(LAB + t * cw).toFixed(2)}" y="${GH + 6}"
         width="${Math.max(cw - 0.4, 0.6).toFixed(2)}" height="9"
         fill="${mix(HEX.good, HEX.bad, Math.min(1, Math.abs(frac - target) / 0.5))}"/>`,
    );
  }
  s.push(`<text x="${LAB}" y="${GH + 30}" font-size="10" fill="${C.muted}">turn 1 → ${upto} · the strip is each turn's split, green when it is near ${target.toFixed(2)}</text>`);
  el("run").innerHTML = s.join("");

  // Who is who, right now. The grid says what they did; this says what they are.
  const f = frames[Math.max(0, upto - 1)];
  const agents: RingAgent[] = Array.from({ length: N }, (_, i) => ({
    colour: f?.actions[i] === "restore" ? HEX.good : HEX.bad,
    pinned: i < state.k,
    dead: f ? !f.alive[i] : false,
  }));
  el("ring").innerHTML = populationRing(agents, {
    size: 168,
    caption: `you control ${state.k} of ${N}`,
  });

  const v = el("runVerdict");
  if (upto >= frames.length) {
    const died = out.extinctionTurn !== null;
    v.textContent = died ? `✕ extinct at turn ${out.extinctionTurn}` : `✓ locked on — survived ${HORIZON} turns`;
    v.className = `verdict ${died ? "dead" : "live"}`;
  } else v.textContent = "";
}

const ticker = new Ticker(() => {
  shown++;
  drawRun();
  return shown < out.frames.length;
}, 45);

function runOne() {
  ticker.stop();
  out = simulate(POLICIES[state.rule]!.fn, opts());
  shown = 0;
  drawRun();
  ticker.play();
}

/* ------------------------------------------- the whole space, all at once */

/**
 * Small multiples over every follower rule x every pacemaker count. One glance
 * gives the threshold for all five rules, which a slider cannot: a slider shows
 * you one cell of this grid at a time and asks you to remember the others.
 */
function drawSpace() {
  const p = params();
  const rows = Object.entries(POLICIES).map(([key, { label }]) => {
    const cells = KS.map((k) => {
      const o = simulate(POLICIES[key]!.fn, { n: N, turns: HORIZON, params: p, pinned: k });
      return { k, survived: o.extinctionTurn === null, died: o.extinctionTurn ?? HORIZON };
    });
    return { key, label, cells };
  });
  rows.sort((a, b) => a.cells.filter((c) => !c.survived).length - b.cells.filter((c) => !c.survived).length);

  const head = `<div class="mrow"><div class="mlab">agents you control →</div>` +
    KS.map((k) => `<div class="mhead">${k}</div>`).join("") + `</div>`;

  const body = rows.map(({ key, label, cells }) => {
    const first = cells.find((c) => c.survived)?.k;
    const bars = cells.map((c) => {
      const frac = c.survived ? 1 : c.died / HORIZON;
      const fill = c.survived ? HEX.good : mix(HEX.bad, HEX.good, Math.min(1, frac * 3));
      const isThreshold = c.k === first;
      return `<div title="${label} · ${c.k} pinned · ${c.survived ? "survives" : "dies at turn " + c.died}"
        style="height:26px;background:${fill};border-radius:2px;
        ${isThreshold ? `outline:2px solid ${C.ink};outline-offset:1px` : ""}"></div>`;
    }).join("");
    const sel = key === state.rule ? ` style="font-weight:700;color:var(--ink)"` : "";
    return `<div class="mrow"><div class="mlab"${sel}>${label.replace(/ \(.*\)/, "")}</div>${bars}</div>`;
  }).join("");

  el("space").innerHTML =
    head + body +
    `<div class="mrow"><div class="mlab"></div><div style="grid-column:2/-1;font-size:10px;color:var(--muted);padding-top:6px">
      green survives · red dies early · outline marks the threshold
    </div></div>`;
}

/* ---------------------------------------------------------------- wiring */

(el("rule") as HTMLSelectElement).innerHTML = Object.entries(POLICIES)
  .map(([k, v]) => `<option value="${k}"${k === state.rule ? " selected" : ""}>${v.label}</option>`)
  .join("");

// Same dial bar as every other lab. This page used to put its controls inside a
// sentence, which read well and worked badly: two draggable numbers and a
// dropdown in a line of prose look like typography, not like instruments.
bindDials((id) => {
  if (id === "k") state.k = Number((el("k") as HTMLInputElement).value);
  if (id === "G") state.G = Number((el("G") as HTMLInputElement).value);
  if (id === "rule") state.rule = (el("rule") as HTMLSelectElement).value;
  drawSpace();
  runOne();
});

drawSpace();
runOne();

mountArc("entrainment");
