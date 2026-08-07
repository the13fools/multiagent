/**
 * The shared lab harness.
 *
 * Extracted before the third lab, not after the eighth. The two existing labs
 * had already grown their own `$` helper, their own bare `let timer`, and four
 * separate `clearInterval` calls each. That is the same drift that let
 * flockbench's two engines diverge until one had a fix the other silently
 * lacked. One copy, here.
 */

export const el = <T extends HTMLElement = HTMLElement>(id: string): T => {
  const node = document.getElementById(id);
  if (!node) throw new Error(`lab: no element #${id}`);
  return node as T;
};

/** Theme tokens, so a lab never hard-codes a hex value. */
export const C = {
  ink: "var(--ink)",
  muted: "var(--muted)",
  line: "var(--line)",
  good: "var(--restore)",
  bad: "var(--take)",
  dead: "var(--dead)",
  accent: "var(--accent)",
} as const;

/** Categorical series colours, in a fixed order so figures stay comparable. */
export const SERIES = [
  "#2f5d8a", "#c2543d", "#2d8a5f", "#8a6d2f",
  "#6d2f8a", "#2f8a86", "#8a2f5d", "#4a4a4a",
] as const;

export const hue = (i: number): string => SERIES[i % SERIES.length]!;

/**
 * Interpolate two hex colours. Used instead of CSS `color-mix()` because that
 * is unreliable inside an SVG *presentation attribute* -- it resolves in some
 * browsers and silently yields black in others, and a tally that renders black
 * is worse than one that renders wrong, because it looks deliberate.
 */
export const mix = (a: string, b: string, t: number): string => {
  const p = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  const [r1, g1, b1] = p(a) as [number, number, number];
  const [r2, g2, b2] = p(b) as [number, number, number];
  const k = Math.max(0, Math.min(1, t));
  const c = (x: number, y: number) => Math.round(x + (y - x) * k).toString(16).padStart(2, "0");
  return `#${c(r1, r2)}${c(g1, g2)}${c(b1, b2)}`;
};

/** Literal hex for the semantic colours, for use where a CSS var will not do. */
export const HEX = { good: "#2d8a5f", bad: "#c2543d", dead: "#a8a8a8", line: "#d8d8d8" } as const;

/**
 * A play/pause/step loop.
 *
 * Every lab wants the same four buttons and the same "stop cleanly when the run
 * is over" behaviour, and every hand-rolled version gets the teardown subtly
 * wrong. `tick` returns false to signal the run is finished.
 */
export class Ticker {
  private handle: number | undefined;
  private readonly tick: () => boolean;
  private readonly intervalMs: number;

  constructor(tick: () => boolean, intervalMs = 100) {
    this.tick = tick;
    this.intervalMs = intervalMs;
  }

  get running(): boolean {
    return this.handle !== undefined;
  }

  step(): void {
    this.stop();
    this.tick();
  }

  play(): void {
    this.stop();
    this.handle = window.setInterval(() => {
      if (!this.tick()) this.stop();
    }, this.intervalMs);
  }

  stop(): void {
    if (this.handle !== undefined) window.clearInterval(this.handle);
    this.handle = undefined;
  }

  toggle(): void {
    this.running ? this.stop() : this.play();
  }
}

// ------------------------------------------------------------- rendering

/** Tagged template that trims and joins SVG fragments. */
export const svg = (
  strings: TemplateStringsArray,
  ...values: unknown[]
): string => String.raw({ raw: strings }, ...values);

export const setSvg = (id: string, parts: string[] | string): void => {
  el(id).innerHTML = Array.isArray(parts) ? parts.join("") : parts;
};

export interface Stat {
  key: string;
  value: string | number;
}

/** The four-number header every lab has. */
export const renderStats = (id: string, stats: Stat[]): void => {
  el(id).innerHTML = stats
    .map(
      (s) =>
        `<div class="stat"><div class="k">${s.key}</div><div class="v">${s.value}</div></div>`,
    )
    .join("");
};

export const verdict = (
  id: string,
  text: string,
  kind: "live" | "dead" | "" = "",
): void => {
  const node = el(id);
  node.textContent = text;
  node.className = `verdict ${kind}`;
};

/**
 * A line chart, because three labs want one and none of them wants a charting
 * library. Series share a y-scale; pass `yMin`/`yMax` to pin it.
 */
export interface SeriesSpec {
  points: number[];
  colour?: string;
  width?: number;
  dashed?: boolean;
}

export const linePlot = (
  series: SeriesSpec[],
  opts: { w?: number; h?: number; yMin?: number; yMax?: number } = {},
): string => {
  const { w = 620, h = 150 } = opts;
  const all = series.flatMap((s) => s.points);
  if (!all.length) return "";
  const yMin = opts.yMin ?? Math.min(...all);
  const yMax = opts.yMax ?? Math.max(...all);
  const span = yMax - yMin || 1;
  const n = Math.max(...series.map((s) => s.points.length), 2);
  return series
    .map((s, i) => {
      const pts = s.points
        .map((v, k) => `${(k / (n - 1)) * w},${h - ((v - yMin) / span) * h}`)
        .join(" ");
      return `<polyline points="${pts}" fill="none" stroke="${s.colour ?? hue(i)}"
        stroke-width="${s.width ?? 1.8}" ${s.dashed ? 'stroke-dasharray="4 3"' : ""}/>`;
    })
    .join("");
};

/** Horizontal reference line at value `v`, for "the level the rules require". */
export const refLine = (
  v: number,
  opts: { w?: number; h?: number; yMin: number; yMax: number; label?: string },
): string => {
  const { w = 620, h = 150, yMin, yMax, label } = opts;
  const y = h - ((v - yMin) / (yMax - yMin || 1)) * h;
  return (
    `<line x1="0" y1="${y}" x2="${w}" y2="${y}" stroke="${C.muted}"
      stroke-width="1" stroke-dasharray="3 4"/>` +
    (label
      ? `<text x="4" y="${y - 4}" font-size="10" fill="${C.muted}">${label}</text>`
      : "")
  );
};

// ------------------------------------------------------------- embedding

/**
 * `?embed=1` strips the nav and the prose, leaving the interactive panel.
 *
 * One URL serves both the standalone page and the iframe the proposal drops in.
 * The alternative is a second stripped-down copy of each lab, which would be a
 * second thing to keep in sync and would rot the moment a lab changed.
 */
export const applyEmbedMode = (): boolean => {
  const embed = new URLSearchParams(location.search).get("embed") === "1";
  if (!embed) return false;
  document.querySelectorAll("nav, .no-embed").forEach((n) => n.remove());
  document.querySelectorAll(".wrap > h1, .wrap > h2, .wrap > p").forEach((n) => n.remove());
  document.body.classList.add("embedded");
  return true;
};

/** Wire the conventional controls if the page has them. Missing ids are fine. */
export const wireControls = (
  ticker: Ticker,
  ids: { play?: string; step?: string; reset?: string } = {},
  onReset?: () => void,
): void => {
  const bind = (id: string | undefined, fn: () => void) => {
    if (!id) return;
    const node = document.getElementById(id);
    node?.addEventListener("click", fn);
  };
  bind(ids.play, () => ticker.toggle());
  bind(ids.step, () => ticker.step());
  bind(ids.reset, () => {
    ticker.stop();
    onReset?.();
  });
};
