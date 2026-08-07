import "./style.css";
import { mountArc } from "./arc";
import { el, hue, C, HEX, mix, Ticker, renderStats, verdict, linePlot, applyEmbedMode } from "./lab";
import {
  DEFAULTS,
  initial,
  step,
  orderParameter,
  driftTolerance,
  metronomesNeeded,
  type PatternConfig,
  type PatternState,
} from "../core/juggling";
import { passingFigure } from "./figures";

applyEmbedMode();

/* ------------------------------------------------------------ 3D, by hand
 * Sixty lines of perspective projection instead of 600 KB of Three.js. The
 * scene is a ring of jugglers and some parabolas; that does not need a scene
 * graph, and keeping the dependency out preserves the promise that the built
 * site opens straight off disk.
 */
const W = 640, H = 340;
const CAM = { dist: 9.2, height: 3.4, fov: 620 };
let yaw = 0.6;

interface P3 { x: number; y: number; z: number }

/**
 * Returns `k`, the pixels-per-world-unit factor at this depth, so callers size
 * things in WORLD units and let perspective do the rest.
 *
 * The previous version returned `scale = k / fov` -- i.e. 1/depth -- and callers
 * then multiplied by `fov` again, which put the jugglers at 42-81px radius in a
 * 640x340 box. Six of those is one blob, which is what "looks bugged" was.
 */
function project(p: P3): { x: number; y: number; k: number; depth: number } {
  const c = Math.cos(yaw), s = Math.sin(yaw);
  const rx = p.x * c - p.z * s;
  const rz = p.x * s + p.z * c;
  const ey = p.y - CAM.height;
  const ez = Math.max(rz + CAM.dist, 0.4);
  const k = CAM.fov / ez;
  return { x: W / 2 + rx * k, y: H / 2 - ey * k, k, depth: ez };
}

// Radii in world units. At the nominal camera distance one world unit is
// CAM.fov / CAM.dist = ~67 px, so a juggler is about 15 px across.
const R_JUGGLER = 0.22;
const R_CLUB = 0.085;

const seatPos = (i: number, n: number): P3 => ({
  x: 2.9 * Math.cos((i / n) * Math.PI * 2),
  y: 0,
  z: 2.9 * Math.sin((i / n) * Math.PI * 2),
});

/** Where a club is, mid-flight, on a parabola between two seats. */
function clubPos(from: P3, to: P3, u: number): P3 {
  const apex = 2.3;
  return {
    x: from.x + (to.x - from.x) * u,
    y: 4 * apex * u * (1 - u),
    z: from.z + (to.z - from.z) * u,
  };
}

/* --------------------------------------------------------------- config */

const num = (id: string) => Number((el(id) as HTMLInputElement).value);
function cfg(): PatternConfig {
  return {
    ...DEFAULTS,
    n: num("n"),
    clubs: num("n") * 2,
    bias: num("bias") / 1000, // slider is in tenths of a percent
    coupling: num("coupling") / 100,
    pinned: Math.min(num("pinned"), num("n")),
  };
}

let state: PatternState;
let conf: PatternConfig;

/* ---------------------------------------------------------------- render */

function draw() {
  const parts: string[] = [];

  // floor ring, drawn as a faint ellipse of the seat circle
  const ringPts: string[] = [];
  for (let a = 0; a <= 48; a++) {
    const p = project({ x: 2.9 * Math.cos((a / 48) * Math.PI * 2), y: 0, z: 2.9 * Math.sin((a / 48) * Math.PI * 2) });
    ringPts.push(`${p.x.toFixed(1)},${p.y.toFixed(1)}`);
  }
  parts.push(`<polyline points="${ringPts.join(" ")}" fill="none" stroke="${C.line}" stroke-width="1"/>`);

  type Drawn = { depth: number; svg: string };
  const items: Drawn[] = [];

  // jugglers, coloured by how far off the beat they are
  state.jugglers.forEach((j, i) => {
    const base = seatPos(i, conf.n);
    const pr = project({ ...base, y: 0.55 });
    const off = Math.min(j.phase, 1 - j.phase);
    const bad = Math.min(1, off / conf.tolerance);
    const fill = j.pinned ? C.accent : mix(HEX.good, HEX.bad, bad);
    const r = R_JUGGLER * pr.k;
    items.push({
      depth: pr.depth,
      svg:
        `<line x1="${pr.x}" y1="${pr.y}" x2="${project(base).x}" y2="${project(base).y}"
           stroke="${C.line}" stroke-width="1.5"/>` +
        (j.pinned ? `<circle cx="${pr.x}" cy="${pr.y}" r="${(r * 1.5).toFixed(1)}" fill="${C.accent}" opacity="0.25"/>` : "") +
        `<rect x="${(pr.x - r).toFixed(1)}" y="${(pr.y - r).toFixed(1)}" width="${(r * 2).toFixed(1)}" height="${(r * 2).toFixed(1)}" rx="${(r * 0.4).toFixed(1)}" fill="${fill}"
           ${j.pinned ? `stroke="${C.accent}" stroke-width="2.5"` : ""}/>` +
        `<text x="${pr.x}" y="${(pr.y + r * 0.3).toFixed(1)}" text-anchor="middle"
           font-size="${(r * 0.75).toFixed(1)}" fill="#fff" font-weight="700">${i}${j.pinned ? "●" : ""}</text>`,
    });
  });

  // clubs in flight
  for (const club of state.clubs) {
    const u = Math.min(1, Math.max(0, (state.t - club.launched) / (club.lands - club.launched || 1)));
    const p = clubPos(seatPos(club.from, conf.n), seatPos(club.to, conf.n), u);
    const pr = project(p);
    const r = Math.max(1.5, R_CLUB * pr.k);
    items.push({
      depth: pr.depth,
      svg: `<circle cx="${pr.x.toFixed(1)}" cy="${pr.y.toFixed(1)}" r="${r.toFixed(1)}"
              fill="${club.from === club.to ? C.muted : hue(club.from)}"/>`,
    });
  }

  // painter's algorithm: far things first
  items.sort((a, b) => b.depth - a.depth);
  parts.push(...items.map((d) => d.svg));
  el("scene").innerHTML = parts.join("");

  const R = orderParameter(state.jugglers);
  renderStats("stats", [
    { key: "Beat", value: state.t.toFixed(0) },
    { key: "Clubs in play", value: state.inPlay },
    { key: "Dropped", value: state.drops },
    { key: "Phase lock R", value: R.toFixed(3) },
  ]);

  el("plot").innerHTML =
    linePlot(
      [
        { points: state.history.map((h) => h.R), colour: C.accent },
        { points: state.history.map((h) => h.inPlay / Math.max(conf.clubs, 1)), colour: C.good },
      ],
      { w: 620, h: 110, yMin: 0, yMax: 1 },
    ) +
    `<text x="4" y="12" font-size="10" fill="${C.accent}">phase lock R</text>` +
    `<text x="4" y="26" font-size="10" fill="${C.good}">clubs remaining</text>`;
}

/* ------------------------------------------------------------------ loop */

const ticker = new Ticker(() => {
  state = step(state, conf, 0.025);
  yaw += 0.0016;
  draw();
  if (state.inPlay === 0) {
    verdict("verdict", `✕ pattern collapsed at beat ${state.t.toFixed(0)}`, "dead");
    return false;
  }
  if (state.t > 400) {
    verdict("verdict", `✓ held for 400 beats`, "live");
    return false;
  }
  return true;
}, 40);

function reset() {
  ticker.stop();
  conf = cfg();
  state = initial(conf, 7);
  verdict("verdict", "", "");
  draw();
}

/* --------------------------------------------------------------- tables */

function tables() {
  const c = cfg();
  const driftEl = document.getElementById("drift");
  const steerEl = document.getElementById("steer");
  if (!driftEl || !steerEl) return;
  driftEl.innerHTML =
    `<table><tr><th>timing error</th><th>pattern collapses at beat</th></tr>` +
    driftTolerance({ ...c, pinned: 0, coupling: 0 }, 240)
      .map(
        (r) =>
          `<tr><td>${(r.bias * 100).toFixed(1)}%</td><td class="num">${
            r.collapseTime === null ? "never" : r.collapseTime.toFixed(0)
          }</td></tr>`,
      )
      .join("") +
    `</table>`;

  steerEl.innerHTML =
    `<table><tr><th>coupling</th><th>metronomes needed, of ${c.n}</th></tr>` +
    [0, 0.1, 0.3, 0.6, 1].
      map((k) => {
        const need = metronomesNeeded({ ...c, bias: 0.01, coupling: k }, 240);
        return `<tr><td>${k.toFixed(1)}</td><td class="num">${
          need === null ? "all of them fail" : need === c.n ? `${need} — every seat` : need
        }</td></tr>`;
      })
      .join("") +
    `</table>`;
}

/* ----------------------------------------------------------------- wiring */

for (const id of ["n", "bias", "coupling", "pinned"]) {
  el(id).addEventListener("input", () => {
    el(`${id}lab`).textContent =
      id === "bias"
        ? `${(num("bias") / 10).toFixed(1)}%`
        : id === "coupling"
          ? (num("coupling") / 100).toFixed(2)
          : String(num(id));
  });
  el(id).addEventListener("change", () => {
    reset();
    ticker.play();
  });
}
// The metronome slider must not offer more seats than the ring has; clamping
// only in cfg() left the control claiming a range it could not honour.
function syncPinnedRange() {
  const pinned = el("pinned") as HTMLInputElement;
  pinned.max = String(num("n"));
  if (num("pinned") > num("n")) pinned.value = String(num("n"));
  el("pinnedlab").textContent = pinned.value;
}
el("n").addEventListener("input", syncPinnedRange);
syncPinnedRange();

el("play").addEventListener("click", () => ticker.toggle());
el("reset").addEventListener("click", () => { reset(); ticker.play(); });
// These three live in .no-embed blocks, so in embed mode they are gone by the
// time this runs. Binding unconditionally threw and took the whole lab with it.
document.getElementById("tablesBtn")?.addEventListener("click", tables);

reset();
ticker.play();

// The cycle as a still picture. The scene shows one instant and moves; this
// shows both beats at once, which is the thing to remember.
el("fig-pass").innerHTML = passingFigure(6);

mountArc("juggling");
