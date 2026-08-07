import "./style.css";
import { el } from "./lab";
import {
  HORIZON, REFERENCE, carryingCapacity, pNeed, pSelf, pacemakersNeeded,
  referencePolicy, simulate, POLICIES as SR,
} from "../core/sharedResource";

/**
 * Figure builder.
 *
 * A grant allows one figure, so this composes the whole argument into three
 * panels and exports real vector SVG -- not a screenshot of a webpage, which is
 * what a reviewer usually gets and which reproduces badly at print size.
 *
 * Everything is drawn from the same engines the labs use, so the figure cannot
 * disagree with the site or with the testbed. Change a dial, re-export.
 */

const num = (id: string) => Number((el(id) as HTMLInputElement).value);
const str = (id: string) => (el(id) as HTMLInputElement).value;
const on = (id: string) => (el(id) as HTMLInputElement).checked;

/* Print-friendly palette: the CSS variables are theme-dependent and an exported
 * file has to be legible on white paper regardless of the reader's settings. */
const P = {
  ink: "#1a1a1a", muted: "#6a6a6a", line: "#d8d8d8",
  good: "#2d8a5f", bad: "#c2543d", accent: "#2f5d8a", pale: "#eef3f8",
};

const W = 1100;
const PANEL_H = 300;
const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;");

const txt = (
  x: number, y: number, s: string,
  o: { size?: number; fill?: string; weight?: number; anchor?: string; italic?: boolean } = {},
) =>
  `<text x="${x}" y="${y}" font-family="Helvetica, Arial, sans-serif"
     font-size="${o.size ?? 12}" fill="${o.fill ?? P.ink}"
     ${o.weight ? `font-weight="${o.weight}"` : ""}
     ${o.italic ? 'font-style="italic"' : ""}
     ${o.anchor ? `text-anchor="${o.anchor}"` : ""}>${esc(s)}</text>`;

/* ------------------------------------------------- panel A: the two rates */

function panelA(x0: number): string {
  const G = num("G");
  const p = { ...REFERENCE, G };
  const self = pSelf(p), need = pNeed(p);
  const w = 300, h = 150, ox = x0 + 20, oy = 76;
  const gx = (g: number) => ox + ((g - 1) / 11) * w;
  const gy = (v: number) => oy + h - v * h;
  const s: string[] = [];

  s.push(txt(x0, 30, "A · A solution exists only where the two rates meet", { size: 14, weight: 700 }));
  s.push(txt(x0, 50, "Restore share, as a function of the restore gain G", { size: 11, fill: P.muted }));

  // axes
  s.push(`<line x1="${ox}" y1="${oy + h}" x2="${ox + w}" y2="${oy + h}" stroke="${P.ink}" stroke-width="1"/>`);
  s.push(`<line x1="${ox}" y1="${oy}" x2="${ox}" y2="${oy + h}" stroke="${P.ink}" stroke-width="1"/>`);
  for (const v of [0, 0.25, 0.5, 0.75, 1]) {
    s.push(`<line x1="${ox - 3}" y1="${gy(v)}" x2="${ox}" y2="${gy(v)}" stroke="${P.ink}"/>`);
    s.push(txt(ox - 6, gy(v) + 3.5, v.toFixed(2), { size: 9, fill: P.muted, anchor: "end" }));
  }
  for (const g of [1, 3, 6, 9, 12]) {
    s.push(txt(gx(g), oy + h + 14, String(g), { size: 9, fill: P.muted, anchor: "middle" }));
  }
  s.push(txt(ox + w / 2, oy + h + 30, "restore gain G", { size: 10, fill: P.muted, anchor: "middle" }));

  // p_need falls with G; p_self is flat
  const needPts: string[] = [];
  for (let g = 1; g <= 12; g += 0.25) needPts.push(`${gx(g)},${gy(pNeed({ ...REFERENCE, G: g }))}`);
  s.push(`<line x1="${gx(1)}" y1="${gy(self)}" x2="${gx(12)}" y2="${gy(self)}"
     stroke="${P.accent}" stroke-width="2.2"/>`);
  s.push(`<polyline points="${needPts.join(" ")}" fill="none" stroke="${P.good}" stroke-width="2.2"/>`);

  // the crossing: where a solution exists at all
  s.push(`<circle cx="${gx(3)}" cy="${gy(0.5)}" r="5" fill="none" stroke="${P.ink}" stroke-width="2"/>`);
  s.push(txt(gx(3) + 9, gy(0.5) - 8, "G=3: they coincide", { size: 10, weight: 700 }));
  s.push(txt(gx(3) + 9, gy(0.5) + 5, "one-sentence solution exists", { size: 9.5, fill: P.muted }));

  s.push(txt(gx(11.6), gy(self) - 7, "p_self = (S−L)/(R+S)", { size: 10, fill: P.accent, anchor: "end" }));
  s.push(txt(gx(11.6), gy(pNeed({ ...REFERENCE, G: 11 })) - 7, "p_need = S/(G+S)", { size: 10, fill: P.good, anchor: "end" }));

  // slack shading to the right of the crossing
  s.push(`<path d="M ${gx(3)} ${gy(0.5)} L ${gx(12)} ${gy(self)} L ${gx(12)} ${gy(pNeed({ ...REFERENCE, G: 12 }))} Z"
     fill="${P.good}" opacity="0.12"/>`);
  s.push(txt(gx(8), gy(0.44), "slack = free-riders the flock can carry", { size: 9, fill: P.muted, anchor: "middle" }));

  const cap = carryingCapacity(p, 8);
  s.push(txt(x0, oy + h + 54, `At G=${G}: slack ${(self - need).toFixed(3)} — a flock of 8 carries ${
    cap < 0 ? "nothing; unwinnable" : `${cap} defector${cap === 1 ? "" : "s"}`}. Closed form.`,
    { size: 10.5, weight: 700 }));
  return s.join("");
}

/* ------------------------------------- panel B: the colouring, two outcomes */

function panelB(x0: number): string {
  const G = num("G");
  const p = { ...REFERENCE, G };
  const turns = 40;
  const s: string[] = [];
  s.push(txt(x0, 30, "B · The same population, two update rules", { size: 14, weight: 700 }));
  s.push(txt(x0, 50, "Rows are agents, columns are turns. Green restores, red takes.", { size: 11, fill: P.muted }));

  const runs: [string, ReturnType<typeof simulate>][] = [
    ["Imitate the majority", simulate(SR.copy!.fn, { n: 8, turns, params: p })],
    ["Take and restore in turn", simulate(({ seat, turn }) => referencePolicy(seat, turn), { n: 8, turns, params: p })],
  ];

  runs.forEach(([label, out], k) => {
    const oy = 76 + k * 108;
    const gw = 250, gh = 76;
    const cw = gw / turns, rh = gh / 8;
    for (let t = 0; t < Math.min(out.frames.length, turns); t++) {
      const f = out.frames[t]!;
      for (let i = 0; i < 8; i++) {
        const a = f.actions[i];
        const fill = !f.alive[i] ? "#c9c9c9" : a === "restore" ? P.good : a === "take" ? P.bad : P.line;
        s.push(`<rect x="${(x0 + 20 + t * cw).toFixed(2)}" y="${(oy + i * rh).toFixed(2)}"
           width="${(cw + 0.3).toFixed(2)}" height="${(rh - 0.5).toFixed(2)}" fill="${fill}"/>`);
      }
    }
    // dead space after collapse, so the reader sees the run ended
    if (out.frames.length < turns) {
      const x = x0 + 20 + out.frames.length * cw;
      s.push(`<rect x="${x.toFixed(2)}" y="${oy}" width="${(gw - (x - x0 - 20)).toFixed(2)}"
         height="${gh}" fill="#f2f2f2"/>`);
    }
    s.push(txt(x0 + 20, oy - 6, label, { size: 11, weight: 700 }));
    const died = out.extinctionTurn !== null;
    s.push(txt(x0 + 280, oy + 22, died ? "✕ extinct" : "✓ sustained",
      { size: 12, weight: 700, fill: died ? P.bad : P.good }));
    s.push(txt(x0 + 280, oy + 38, died ? `turn ${out.extinctionTurn}` : "indefinitely",
      { size: 10, fill: P.muted }));
    s.push(txt(x0 + 280, oy + 56, `gap ${out.restoreRateGap >= 0 ? "+" : ""}${out.restoreRateGap.toFixed(2)}`,
      { size: 10, fill: P.muted }));
  });

  s.push(txt(x0, 296, "Conformity herds the flock into lockstep. The pattern needed is anti-correlated.",
    { size: 10.5, weight: 700 }));
  return s.join("");
}

/* -------------------------------- panel C: who you must control, and why */

function panelC(x0: number): string {
  const G = num("G");
  const p = { ...REFERENCE, G };
  const rows = Object.values(SR).map(({ label, fn }) => ({
    label: label.replace(/ \(.*\)/, ""),
    k: pacemakersNeeded(fn, { n: 8, turns: HORIZON, params: p }),
  }));
  rows.sort((a, b) => (b.k ?? 99) - (a.k ?? 99));

  // Sized against the 1100 viewBox: label column 760..864, bars 872..1022,
  // value text to ~1090. The geometry test enforces this.
  const w = 150, oy = 84, bh = 20, gap = 9;
  const ox = x0 + 112;
  const s: string[] = [];

  s.push(txt(x0, 30, "C · How many seats you must control", { size: 14, weight: 700 }));
  s.push(txt(x0, 50, "Pacemakers needed before a flock of 8 survives 200 turns,", { size: 11, fill: P.muted }));
  s.push(txt(x0, 64, "as a function of how the OTHER agents update.", { size: 11, fill: P.muted }));

  rows.forEach((r, i) => {
    const y = oy + i * (bh + gap);
    const k = r.k ?? 8;
    const frac = k / 8;
    s.push(txt(ox - 8, y + bh * 0.7, r.label, { size: 10, anchor: "end" }));
    s.push(`<rect x="${ox}" y="${y}" width="${w}" height="${bh}" fill="${P.line}" opacity="0.5"/>`);
    s.push(`<rect x="${ox}" y="${y}" width="${(w * frac).toFixed(1)}" height="${bh}"
       fill="${k === 0 ? P.good : k >= 6 ? P.bad : "#8a6d2f"}"/>`);
    s.push(txt(ox + w * frac + 6, y + bh * 0.72,
      k === 0 ? "0 — alone" : k >= 8 ? "8 — every seat" : String(k),
      { size: 10, weight: 700 }));
  });

  const yb = oy + rows.length * (bh + gap) + 6;
  s.push(`<line x1="${ox}" y1="${yb}" x2="${ox + w}" y2="${yb}" stroke="${P.ink}"/>`);
  for (const k of [0, 2, 4, 6, 8]) {
    s.push(txt(ox + (w * k) / 8, yb + 13, String(k), { size: 9, fill: P.muted, anchor: "middle" }));
  }
  s.push(txt(ox + w / 2, yb + 28, "seats you must control, of 8", { size: 10, fill: P.muted, anchor: "middle" }));

  s.push(txt(x0, 296, "Controllability is a property of the agents you do NOT control.",
    { size: 10.5, weight: 700 }));
  return s.join("");
}

/* ------------------------------------------------------------ composition */

function buildSvg(): string {
  const cols = [40, 400, 760];
  const H = PANEL_H + (on("caption") ? 96 : 40);
  const body = [
    on("panelA") ? panelA(cols[0]!) : "",
    on("panelB") ? panelB(cols[1]!) : "",
    on("panelC") ? panelC(cols[2]!) : "",
  ].join("");

  const title = on("caption")
    ? txt(40, PANEL_H + 62, str("title"), { size: 13, weight: 700 }) +
      txt(40, PANEL_H + 80, str("captionText"), { size: 11, fill: P.muted })
    : "";

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">
<rect width="${W}" height="${H}" fill="#ffffff"/>
${body}${title}
</svg>`;
}

function render() {
  const svg = buildSvg();
  // The exported file keeps its width/height attributes -- a downstream tool
  // needs an intrinsic size. The on-screen preview must not: 1100px in an
  // ~860px column overflowed and got silently clipped by overflow:auto, so the
  // right-hand panel was cut off in exactly the place nobody scrolls to.
  el("preview").innerHTML = svg.replace(
    /<svg([^>]*?)width="\d+" height="\d+"/,
    '<svg$1style="width:100%;height:auto;display:block"',
  );
  el("size").textContent = `${(new Blob([svg]).size / 1024).toFixed(1)} kB SVG`;
}

function download(name: string, blob: Blob) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}

el("svgBtn").addEventListener("click", () =>
  download("multiagent-figure.svg", new Blob([buildSvg()], { type: "image/svg+xml" })));

el("pngBtn").addEventListener("click", () => {
  // 3x for print. A screenshot of the page would be 1x and soft.
  const scale = 3;
  const svg = buildSvg();
  const img = new Image();
  const blob = new Blob([svg], { type: "image/svg+xml;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  img.onload = () => {
    const vb = /viewBox="0 0 (\d+) (\d+)"/.exec(svg)!;
    const canvas = document.createElement("canvas");
    canvas.width = Number(vb[1]) * scale;
    canvas.height = Number(vb[2]) * scale;
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    canvas.toBlob((b) => b && download("multiagent-figure.png", b), "image/png");
    URL.revokeObjectURL(url);
  };
  img.src = url;
});

for (const id of ["G", "title", "captionText", "caption", "panelA", "panelB", "panelC"]) {
  el(id).addEventListener("input", render);
  el(id).addEventListener("change", render);
}
render();
