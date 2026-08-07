/**
 * Smoke tests that actually load each lab page.
 *
 * Added after a lab shipped visibly broken and the unit tests stayed green,
 * because they only ever exercised src/core. Anything that throws on load, or
 * references an element the HTML does not have, is now a test failure rather
 * than something you find by opening the page.
 */
import { describe, it, expect, beforeEach, vi } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";

const PAGES = ["shared-resource", "entrainment", "juggling", "boardwalk", "gate"] as const;

const loadPage = (name: string) => {
  const html = readFileSync(resolve(__dirname, `../${name}.html`), "utf8");
  document.documentElement.innerHTML = html
    .replace(/<!doctype html>/i, "")
    .replace(/<\/?html[^>]*>/gi, "");
};

describe("lab pages load without throwing", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllTimers();
    document.documentElement.innerHTML = "";
  });

  for (const page of PAGES) {
    it(`${page}.html`, async () => {
      loadPage(page);
      const mod = { "shared-resource": "sharedResourceLab", juggling: "jugglingLab", boardwalk: "boardwalkLab", gate: "gateLab", entrainment: "entrainmentLab" }[page]!;
      vi.resetModules();
      await expect(import(`../src/ui/${mod}`)).resolves.toBeTruthy();
      vi.advanceTimersByTime(2000);
      vi.clearAllTimers();
    });
  }
});

describe("every id a lab reaches for exists in its page", () => {
  const ids = (src: string) =>
    [...src.matchAll(/\b(?:el|\$)\(\s*["'`]([a-zA-Z0-9_-]+)["'`]/g)].map((m) => m[1]!);

  for (const [page, mod] of Object.entries({
    "shared-resource": "sharedResourceLab",
    juggling: "jugglingLab",
    boardwalk: "boardwalkLab",
    gate: "gateLab",
    entrainment: "entrainmentLab",
  })) {
    it(page, () => {
      const html = readFileSync(resolve(__dirname, `../${page}.html`), "utf8");
      const src = readFileSync(resolve(__dirname, `../src/ui/${mod}.ts`), "utf8");
      const missing = [...new Set(ids(src))].filter((id) => !html.includes(`id="${id}"`));
      expect(missing, `${page}.html is missing #${missing.join(", #")}`).toEqual([]);
    });
  }
});

/**
 * Prose is a claim, so it gets tested like one.
 *
 * The shared-resource page previously animated 60 turns beside a table computed
 * over 200, so it could show a flock "sustained" next to a table saying six
 * pacemakers were required. Both numbers were right about different runs. These
 * assertions make that class of contradiction a build failure.
 */
describe("page prose matches what the code computes", () => {
  const read = (f: string) => readFileSync(resolve(__dirname, `../${f}`), "utf8");

  it("shared-resource: no hardcoded horizon in the lab", async () => {
    const src = read("src/ui/sharedResourceLab.ts");
    expect(src).not.toMatch(/turns:\s*\d+/);
    expect(src).toContain("HORIZON");
  });

  it("shared-resource: the stated pacemaker counts are the computed ones", async () => {
    const { POLICIES, pacemakersNeeded, HORIZON } = await import("../src/core/sharedResource");
    expect(pacemakersNeeded(POLICIES.copy!.fn, { turns: HORIZON })).toBe(6);
    // the page says "three-quarters of the seats"
    expect(6 / 8).toBe(0.75);
  });

  it("shared-resource: 'dies at turn 6' is true of the permanent restorer", async () => {
    const { simulate } = await import("../src/core/sharedResource");
    expect(read("shared-resource.html")).toContain("dies at turn 6");
    expect(simulate(() => "restore", { turns: 30 }).extinctionTurn).toBe(6);
  });

  it("shared-resource: the G=9 claim in the prose is the computed one", async () => {
    const { carryingCapacity, REFERENCE } = await import("../src/core/sharedResource");
    const cap = carryingCapacity({ ...REFERENCE, G: 9 }, 8);
    expect(cap).toBe(4);
    // Assert the CLAIM, not the sentence. Pinning exact wording made ordinary
    // copy-editing fail the build, which trains people to weaken the test.
    const prose = read("shared-resource.html").replace(/\s+/g, " ");
    expect(prose).toMatch(/G=9/);
    expect(prose).toMatch(new RegExp(`carries (${cap}|four)\\b`, "i"));
  });

  it("juggling: 'dead by beat 103' is within what the model produces", async () => {
    const { DEFAULTS, run } = await import("../src/core/juggling");
    expect(read("juggling.html")).toContain("beat 103");
    const t = run({ ...DEFAULTS, bias: 0.002 }, 240, 7).collapseTime;
    expect(t).not.toBeNull();
    expect(Math.round(t!)).toBe(103);
  });
});

/**
 * Geometry guard.
 *
 * The juggling scene shipped with jugglers at 42-81px radius in a 640x340 box,
 * because `project` returned 1/depth and the caller multiplied by the focal
 * length a second time. Everything rendered as one blob and every unit test
 * stayed green, since none of them looked at the picture. This one does.
 */
describe("juggling scene geometry", () => {
  it("keeps jugglers and clubs a sane size at every depth", async () => {
    const src = readFileSync(resolve(__dirname, "../src/ui/jugglingLab.ts"), "utf8");
    const fov = Number(/fov:\s*([\d.]+)/.exec(src)![1]);
    const dist = Number(/dist:\s*([\d.]+)/.exec(src)![1]);
    const rJ = Number(/R_JUGGLER = ([\d.]+)/.exec(src)![1]);
    const rC = Number(/R_CLUB = ([\d.]+)/.exec(src)![1]);
    const ringR = 2.9;
    for (const depth of [dist - ringR, dist, dist + ringR]) {
      const k = fov / depth;
      expect(rJ * k).toBeGreaterThan(6);
      expect(rJ * k).toBeLessThan(30); // a sixth of the 340px viewBox height
      expect(rC * k).toBeGreaterThan(2);
      expect(rC * k).toBeLessThan(14);
    }
  });

  it("never sizes anything off the doubled focal length again", () => {
    const src = readFileSync(resolve(__dirname, "../src/ui/jugglingLab.ts"), "utf8");
    expect(src).not.toMatch(/scale\s*\*\s*CAM\.fov/);
  });
});

describe("figure builder", () => {
  it("loads and produces a well-formed standalone SVG", async () => {
    document.documentElement.innerHTML = readFileSync(resolve(__dirname, "../figure.html"), "utf8")
      .replace(/<!doctype html>/i, "").replace(/<\/?html[^>]*>/gi, "");
    vi.resetModules();
    await import("../src/ui/figureLab");
    const svg = document.getElementById("preview")!.innerHTML;
    expect(svg).toContain("<svg");
    expect(svg).toContain('xmlns="http://www.w3.org/2000/svg"');
    // white background, so it is legible on paper regardless of the reader's theme
    expect(svg).toContain('fill="#ffffff"');
    // no CSS custom properties: they do not resolve in a detached file
    expect(svg).not.toContain("var(--");
    // all three panels present
    for (const t of ["A · ", "B · ", "C · "]) expect(svg).toContain(t);
  });
});

/**
 * Geometry guard for the exported figure.
 *
 * "The figures are very bugged" was mostly a 1.7s redraw wired to an event a
 * slider fires thirty times per drag, but layout is the other way a figure goes
 * wrong silently: an element drawn outside the viewBox simply is not there in
 * the exported file, and the preview on screen looks plausible.
 */
describe("exported figure geometry", () => {
  it("draws nothing outside its own viewBox", async () => {
    document.documentElement.innerHTML = readFileSync(resolve(__dirname, "../figure.html"), "utf8")
      .replace(/<!doctype html>/i, "").replace(/<\/?html[^>]*>/gi, "");
    vi.resetModules();
    await import("../src/ui/figureLab");
    const svg = document.getElementById("preview")!.innerHTML;
    const [, wStr, hStr] = /viewBox="0 0 (\d+) (\d+)"/.exec(svg)!;
    const W = Number(wStr), H = Number(hStr);

    const xs: number[] = [];
    const ys: number[] = [];
    for (const m of svg.matchAll(/\b(?:x|cx|x1|x2)="(-?[\d.]+)"/g)) xs.push(Number(m[1]));
    for (const m of svg.matchAll(/\b(?:y|cy|y1|y2)="(-?[\d.]+)"/g)) ys.push(Number(m[1]));
    expect(xs.length).toBeGreaterThan(50);
    expect(Math.min(...xs)).toBeGreaterThanOrEqual(0);
    expect(Math.max(...xs)).toBeLessThanOrEqual(W);
    expect(Math.min(...ys)).toBeGreaterThanOrEqual(0);
    expect(Math.max(...ys)).toBeLessThanOrEqual(H);
  });

  it("renders fast enough to drive from a slider", async () => {
    const t0 = Date.now();
    (document.getElementById("G") as HTMLInputElement).value = "6";
    document.getElementById("G")!.dispatchEvent(new Event("input"));
    expect(Date.now() - t0).toBeLessThan(400);
  });
});

/**
 * The experiments page makes claims about the repository's own state. If it
 * drifts it becomes the most misleading page on the site, because its whole
 * value is that it is the honest one.
 */
describe("experiments status page", () => {
  const page = () => readFileSync(resolve(__dirname, "../experiments.html"), "utf8");

  it("separates what was run from what was not", () => {
    const s = page();
    expect(s).toContain("st-done");
    expect(s).toContain("st-todo");
    // the two rows the gate argument depends on must still be marked resampled
    expect(s).toContain("resampled");
    expect(s).toContain("Live A/A calibration");
  });

  it("names the commit it was written against", () => {
    expect(page()).toMatch(/commit <code>[0-9a-f]{7}<\/code>/);
  });

  it("does not claim the A/A campaign is complete", () => {
    // Deliberately not asserting st-todo: one arm of two has now run, so the
    // row is legitimately st-part. What must never appear is st-done, and the
    // page must keep saying the error rate is resampled rather than measured.
    const s = page();
    const row = s.slice(s.indexOf("Live A/A calibration"), s.indexOf("Live A/A calibration") + 600);
    expect(row).not.toContain("st-done");
    expect(row).toContain("resampled");
  });
});

describe("shared visual vocabulary", () => {
  it("defines the status badges exactly once, in the stylesheet", () => {
    const css = readFileSync(resolve(__dirname, "../src/ui/style.css"), "utf8");
    expect(css).toContain(".st-todo");
    for (const page of ["index.html", "experiments.html"]) {
      const html = readFileSync(resolve(__dirname, `../${page}`), "utf8");
      // pages may USE the classes but must not redefine them
      expect(html, `${page} redefines .st-todo`).not.toMatch(/\.st-todo\s*\{/);
    }
  });

  it("puts the honest status on the front page, not only the status page", () => {
    const html = readFileSync(resolve(__dirname, "../index.html"), "utf8");
    expect(html).toContain("st-todo");
    expect(html.replace(/\s+/g, " ")).toMatch(/no language model has been measured against it/i);
  });
});

/**
 * Canvas sizing.
 *
 * A viewBox plus a fixed pixel height letterboxes: the SVG fits by height, so a
 * 620-wide drawing renders 620 wide in an 860px column with dead space on both
 * sides, smaller than it should be and looking broken. `height:auto` lets the
 * width drive and the aspect ratio follow.
 */
describe("svg canvases scale with their column", () => {
  const pages = ["index", "shared-resource", "entrainment", "juggling", "boardwalk", "gate", "figure", "future"];
  for (const page of pages) {
    it(`${page}.html has no fixed-height viewBox`, () => {
      const html = readFileSync(resolve(__dirname, `../${page}.html`), "utf8");
      for (const tag of html.match(/<svg[^>]*>/g) ?? []) {
        if (!tag.includes("viewBox")) continue;
        expect(tag, `letterboxed svg in ${page}.html: ${tag.slice(0, 90)}`)
          .not.toMatch(/height:\s*\d+px/);
      }
    });
  }

  it("the figure preview scales but the exported file keeps its size", async () => {
    document.documentElement.innerHTML = readFileSync(resolve(__dirname, "../figure.html"), "utf8")
      .replace(/<!doctype html>/i, "").replace(/<\/?html[^>]*>/gi, "");
    vi.resetModules();
    await import("../src/ui/figureLab");
    const preview = document.getElementById("preview")!.innerHTML;
    expect(preview).toContain("width:100%");
    expect(preview).not.toMatch(/<svg[^>]*width="\d+"/);
    // the builder itself still emits an intrinsically-sized file
    const src = readFileSync(resolve(__dirname, "../src/ui/figureLab.ts"), "utf8");
    expect(src).toMatch(/width="\$\{W\}" height="\$\{H\}"/);
  });
});

/**
 * One control idiom.
 *
 * Every lab had invented its own: a value chip before its slider here, a bare
 * select inside a sentence there, a number box with an inline width somewhere
 * else. This asserts they now share the dial bar, and -- the part that actually
 * matters to a reader -- that no control is unlabelled or silent about its
 * current value.
 */
describe("the dials", () => {
  const LABS = ["shared-resource", "entrainment", "juggling", "boardwalk", "gate"] as const;

  for (const page of LABS) {
    it(`${page} uses the shared dial bar`, () => {
      const html = readFileSync(resolve(__dirname, `../${page}.html`), "utf8");
      expect(html, `${page} still has an ad-hoc .controls block`).not.toContain('class="controls"');
      expect(html).toContain('class="dials"');

      // every dial says what it is
      const dials = [...html.matchAll(/<label class="dial">([\s\S]*?)<\/label>/g)].map((m) => m[1]!);
      expect(dials.length, `${page} has a dial bar with no dials`).toBeGreaterThan(0);
      for (const d of dials) {
        expect(d, `a dial on ${page} has no name`).toMatch(/class="dial-k">[^<]{3,}</);
        // and every slider says what it is set to
        if (/type="range"/.test(d)) {
          expect(d, `a slider on ${page} has no readout`).toMatch(/data-out=|class="dial-v"/);
        }
      }
    });
  }

  it("no lab reaches for the deleted scrub helper", () => {
    const lab = readFileSync(resolve(__dirname, "../src/ui/lab.ts"), "utf8");
    expect(lab).not.toContain("initScrubs");
    expect(lab).toContain("bindDials");
  });
});

describe("the future page is marked as unrun", () => {
  it("says nothing on it has been run, and links to what has", () => {
    const html = readFileSync(resolve(__dirname, "../future.html"), "utf8").replace(/\s+/g, " ");
    expect(html).toMatch(/Nothing on this page has been run/i);
    expect(html).toContain("experiments.html");
  });

  it("has a learning policy behind the figure, not a drawing of one", async () => {
    const { POLICIES, simulate, HORIZON, REFERENCE } = await import("../src/core/sharedResource");
    expect(POLICIES.learn).toBeTruthy();
    const out = simulate(POLICIES.learn!.fn, { n: 8, turns: HORIZON, params: REFERENCE });
    // it should reach the required rate rather than merely not crash
    expect(Math.abs(out.restoreRateGap)).toBeLessThan(0.05);
    expect(out.extinctionTurn).toBeNull();
  });
});

describe("population rings", () => {
  it("draws N agents, marks the controlled ones, crosses out the dead", async () => {
    const { populationRing, HEX } = await import("../src/ui/lab");
    const svg = populationRing(
      [
        { colour: HEX.good, pinned: true },
        { colour: HEX.bad },
        { colour: HEX.bad, dead: true },
      ],
      { caption: "1 of 3 pinned" },
    );
    // one circle per agent, plus the guide ring, plus a halo behind each agent
    // you control. Counting a fixed total broke the moment the halo was added,
    // which is a test asserting an implementation rather than a behaviour.
    const circles = (svg.match(/<circle/g) ?? []).length;
    const pinned = 1;
    expect(circles).toBe(3 + 1 + pinned);
    expect(svg).toContain("stroke-width=\"2.5\"");        // the one you control
    expect(svg).toContain("<path");                       // the cross on the dead one
    expect(svg).toContain("1 of 3 pinned");
    // Themed via CSS variables ON PURPOSE. The no-variables rule applies to the
    // exported figure, which leaves the page and has to survive on white paper.
    // An in-page component that hardcoded ink would be unreadable in dark mode.
    expect(svg).toContain("var(--");
  });

  it("shrinks the dots as the ring fills, so 20 agents do not overlap", async () => {
    const { populationRing, HEX } = await import("../src/ui/lab");
    const agentRadius = (n: number) => {
      const svg = populationRing(Array.from({ length: n }, () => ({ colour: HEX.good })));
      // index 0 is the guide ring itself; the agents follow
      return [...svg.matchAll(/<circle[^>]*r="([\d.]+)"/g)].map((m) => Number(m[1]))[1]!;
    };
    expect(agentRadius(20)).toBeLessThan(agentRadius(8));
  });

  it("the front page shows three compositions, statically", () => {
    const html = readFileSync(resolve(__dirname, "../index.html"), "utf8");
    expect(html).toContain('id="intro-rings"');
    const src = readFileSync(resolve(__dirname, "../src/ui/introFigures.ts"), "utf8");
    expect(src).toContain("Everyone takes");
    expect(src).toContain("Everyone alternates");
    expect(src).toContain("One defector");
    expect(src).not.toContain("Ticker"); // figures do not move
  });
});

/**
 * Static figures.
 *
 * Every page had an interactive and no picture of what it was about. These
 * assert the picture is still there -- and, separately, that it is still
 * static: a figure that animates is one you cannot glance at, and the temptation
 * to make one move is real.
 */
describe("every page carries a static figure", () => {
  const FIGURES: Record<string, string[]> = {
    "shared-resource": ["fig-turn", "fig-ledger"],
    juggling: ["fig-pass"],
    boardwalk: ["fig-cases"],
    gate: ["fig-cell"],
    future: ["fig-drift"],
    experiments: ["fig-evidence"],
    "blog-pdd": ["fig-pipeline"],
    index: ["intro-rings"],
  };

  for (const [page, ids] of Object.entries(FIGURES)) {
    it(page, () => {
      const html = readFileSync(resolve(__dirname, `../${page}.html`), "utf8");
      for (const id of ids) expect(html, `${page}.html lost #${id}`).toContain(`id="${id}"`);
      expect(html, `${page}.html has a figure but no script to fill it`).toMatch(/<script type="module"/);
    });
  }

  it("figures do not move", () => {
    const src = readFileSync(resolve(__dirname, "../src/ui/figures.ts"), "utf8");
    for (const banned of ["Ticker", "setInterval", "setTimeout", "requestAnimationFrame", "<animate"]) {
      expect(src, `figures.ts reaches for ${banned}`).not.toContain(banned);
    }
  });

  it("every figure fits its box by width, not by height", () => {
    // A viewBox plus a fixed pixel height letterboxes; height:auto does not.
    const src = readFileSync(resolve(__dirname, "../src/ui/figures.ts"), "utf8");
    const svgs = [...src.matchAll(/<svg[^>]*>/g)].map((m) => m[0]);
    expect(svgs.length).toBeGreaterThan(0);
    for (const tag of svgs) {
      expect(tag).toContain("viewBox");
      expect(tag).toMatch(/height:\s*auto/);
    }
  });
});

describe("figure builders return well-formed, self-contained SVG", () => {
  it("each one produces a single svg element with a label", async () => {
    const f = await import("../src/ui/figures");
    const built: [string, string][] = [
      ["turnDiagram", f.turnDiagram()],
      ["ledgerFigure", f.ledgerFigure()],
      ["beachFigure", f.beachFigure([0.25, 0.75], "two vendors, both at the centre")],
      ["pairedCellFigure", f.pairedCellFigure()],
      ["driftFigure", f.driftFigure()],
      ["passingFigure", f.passingFigure(6)],
      ["pipelineFigure", f.pipelineFigure()],
      ["evidenceFigure", f.evidenceFigure()],
    ];
    for (const [name, svg] of built) {
      expect(svg.startsWith("<svg"), name).toBe(true);
      expect(svg.trimEnd().endsWith("</svg>"), name).toBe(true);
      expect(svg, name).toContain('role="img"');
      expect(svg, `${name} has no aria-label`).toMatch(/aria-label="[^"]{20,}"/);
      // it must survive being parsed, not merely look like markup
      const host = document.createElement("div");
      host.innerHTML = svg;
      expect(host.querySelector("svg"), name).not.toBeNull();
    }
  });

  it("the ledger really does close, for parameters where it should", async () => {
    const { ledgerFigure } = await import("../src/ui/figures");
    // L=1 R=1 G=3 S=3: balance nets 0, pool nets 0. The figure is a proof, so a
    // typo in it is a wrong proof, not a cosmetic bug.
    const svg = ledgerFigure(1, 1, 3, 3);
    const totals = [...svg.matchAll(/>(-?\d+)<\/text>/g)].map((m) => m[1]);
    expect(totals.filter((t) => t === "0").length).toBeGreaterThanOrEqual(2);
  });
});

/**
 * Text that runs off the edge.
 *
 * Three captions shipped wider than their own viewBox and were simply clipped
 * mid-sentence -- invisible to every other test here, because the SVG was
 * well-formed and the page loaded fine. This estimates each label's width and
 * asserts it lands inside the box. The 0.55em-per-character factor is
 * deliberately generous; it catches sentences, not kerning.
 */
describe("no figure text runs outside its viewBox", () => {
  const EM = 0.55;

  it("every label fits", async () => {
    const f = await import("../src/ui/figures");
    const svgs: [string, string][] = [
      ["turnDiagram", f.turnDiagram()],
      ["ledgerFigure", f.ledgerFigure()],
      ["pairedCellFigure", f.pairedCellFigure()],
      ["driftFigure", f.driftFigure()],
      ["passingFigure", f.passingFigure(6)],
      ["pipelineFigure", f.pipelineFigure()],
      ["evidenceFigure", f.evidenceFigure()],
      ["beachFigure", f.beachFigure([0.5, 0.5], "two — both at the centre, settled")],
    ];
    const overflows: string[] = [];

    for (const [name, svg] of svgs) {
      const vb = /viewBox="0 0 ([\d.]+) ([\d.]+)"/.exec(svg)!;
      const W = Number(vb[1]), H = Number(vb[2]);
      for (const m of svg.matchAll(/<text\b([^>]*)>([^<]*)<\/text>/g)) {
        const attrs = m[1]!, body = m[2]!.trim();
        if (!body) continue;
        const x = Number(/\bx="([-\d.]+)"/.exec(attrs)?.[1] ?? 0);
        const y = Number(/\by="([-\d.]+)"/.exec(attrs)?.[1] ?? 0);
        const size = Number(/font-size="([\d.]+)"/.exec(attrs)?.[1] ?? 12);
        const anchor = /text-anchor="(\w+)"/.exec(attrs)?.[1] ?? "start";
        const w = body.length * size * EM;
        const left = anchor === "middle" ? x - w / 2 : anchor === "end" ? x - w : x;
        const right = left + w;
        if (left < -2 || right > W + 2) {
          overflows.push(`${name}: "${body.slice(0, 44)}…" spans ${left.toFixed(0)}–${right.toFixed(0)} of ${W}`);
        }
        if (y > H) overflows.push(`${name}: "${body.slice(0, 30)}…" sits at y=${y}, below H=${H}`);
      }
    }
    expect(overflows, overflows.join("\n")).toEqual([]);
  });
});

/**
 * The arc.
 *
 * Nine pages that did not know about each other read as a directory. The spine
 * in src/ui/arc.ts is the running order, and these assert it is real: that
 * every chapter is a file, that loading a page actually produces the eyebrow
 * and the handoff, and that the handoff points at the page that comes next.
 */
describe("the spine", () => {
  it("every chapter is a page that exists, exactly once", async () => {
    const { SPINE } = await import("../src/ui/arc");
    const slugs = SPINE.map((c) => c.slug);
    expect(new Set(slugs).size, "a chapter appears twice").toBe(slugs.length);
    for (const c of SPINE) {
      expect(() => readFileSync(resolve(__dirname, `../${c.slug}.html`), "utf8"),
        `${c.slug}.html is in the spine but not on disk`).not.toThrow();
    }
  });

  it("every chapter hands off to the next", async () => {
    const { SPINE } = await import("../src/ui/arc");
    for (const c of SPINE) {
      // The handoff is the next page's reason to exist. An empty or throwaway
      // one means the order is arbitrary at that seam.
      expect(c.hands.length, `${c.slug} has no handoff`).toBeGreaterThan(20);
      expect(c.asks.length, `${c.slug} does not say what it answers`).toBeGreaterThan(20);
    }
  });

  it("loading a page renders its eyebrow and its handoff", async () => {
    const { SPINE, mountArc } = await import("../src/ui/arc");
    for (let i = 0; i < SPINE.length; i++) {
      const c = SPINE[i]!;
      document.documentElement.innerHTML =
        readFileSync(resolve(__dirname, `../${c.slug}.html`), "utf8")
          .replace(/<!doctype html>/i, "").replace(/<\/?html[^>]*>/gi, "");
      mountArc(c.slug);
      const eyebrow = document.querySelector(".chapter");
      expect(eyebrow?.textContent, `${c.slug} has no chapter marker`)
        .toContain(`${i + 1} of ${SPINE.length}`);
      const next = SPINE[i + 1] ?? SPINE[0]!;
      const link = document.querySelector(".arc-next") as HTMLAnchorElement | null;
      expect(link?.getAttribute("href"), `${c.slug} does not point at ${next.slug}`)
        .toBe(`./${next.slug}.html`);
      expect(link?.textContent, `${c.slug} hands off without saying why`).toContain(c.hands.slice(0, 24));
      // and it goes after the argument, not into the middle of it
      expect(document.querySelector("h1")!.closest(".wrap")!.lastElementChild!.className).toBe("arc");
    }
  });

  it("the front page lists the whole order", async () => {
    const { SPINE, pathList } = await import("../src/ui/arc");
    const html = readFileSync(resolve(__dirname, "../index.html"), "utf8");
    expect(html, "index.html has nowhere to put the running order").toContain('id="path"');
    const list = pathList();
    for (const c of SPINE) expect(list).toContain(`./${c.slug}.html`);
    expect([...list.matchAll(/class="path-row"/g)].length).toBe(SPINE.length);
  });
});

/**
 * The arc as prose.
 *
 * The spine can be perfectly wired and still not tell a story. These assert the
 * two things that make the sequence readable rather than merely linked: every
 * chapter opens with a one-line statement of what it is, and no two chapters
 * open with the same one.
 */
describe("each chapter introduces itself", () => {
  it("has a heading and a lede", async () => {
    const { SPINE } = await import("../src/ui/arc");
    const ledes: string[] = [];
    for (const c of SPINE) {
      const html = readFileSync(resolve(__dirname, `../${c.slug}.html`), "utf8");
      expect(/<h1>[^<]{8,}<\/h1>/.test(html), `${c.slug} has no real <h1>`).toBe(true);
      const m = /<p class="lede">([\s\S]*?)<\/p>/.exec(html);
      expect(m, `${c.slug} has no lede — the reader lands with no idea what this one is`).not.toBeNull();
      ledes.push(m![1]!.replace(/<[^>]+>/g, "").trim());
    }
    expect(new Set(ledes).size, "two chapters open with the same line").toBe(ledes.length);
  });
});

/**
 * The pitch.
 *
 * The site can be an excellent set of toys and still never say what it is for.
 * These assert the through-line survives editing: the front page states the
 * steering question, the steering chapter claims it, and the closing chapter
 * says what the work needs.
 */
describe("steering is the pitch", () => {
  const read = (f: string) => readFileSync(resolve(__dirname, `../${f}`), "utf8").replace(/\s+/g, " ");

  it("the front page asks the steering question", () => {
    const html = read("index.html");
    expect(html).toMatch(/how few of them do you have to control/i);
  });

  it("the steering chapter says it is the point", () => {
    expect(read("entrainment.html")).toMatch(/steering a flock you do not own/i);
  });

  it("the last research chapter states the ask", () => {
    const html = read("future.html");
    expect(html).toMatch(/the pitch, in one paragraph/i);
    expect(html, "the ask has to say what the money buys").toMatch(/what the funding buys/i);
  });

  it("no page still calls a controlled agent a pacemaker", () => {
    for (const f of ["index", "shared-resource", "entrainment", "juggling", "boardwalk", "gate",
                     "experiments", "future", "blog-pdd"]) {
      expect(read(`${f}.html`), `${f}.html still says pacemaker`).not.toMatch(/pacemaker/i);
    }
  });
});

/**
 * Claims about money, and citations.
 *
 * The cost essay used to lead with a single number as though it were a result.
 * It is one figure from one model on one stack in a market that reprices
 * monthly, and the argument does not need it: what matters is the ratio between
 * what a population costs and what a campaign against it costs. These assert
 * the hedge stays hedged, and that the reading list keeps its links.
 */
describe("the cost essay does not oversell", () => {
  const html = () =>
    readFileSync(resolve(__dirname, "../blog-pdd.html"), "utf8").replace(/\s+/g, " ");

  it("never puts a price in the title or the lede", () => {
    const h = html();
    const head = h.slice(0, h.indexOf("</p>", h.indexOf('class="lede"')));
    expect(head, "a single figure is back in the headline").not.toMatch(/fifty dollars|\$\d/i);
  });

  it("says the figure is one setup, not a law", () => {
    const h = html();
    expect(h).toMatch(/one number from one setup/i);
    expect(h).toMatch(/not a law/i);
  });

  it("frames the work as exploring how cheap, not asserting a price", () => {
    expect(html()).toMatch(/how far can the per-agent cost be pushed down/i);
  });
});

describe("the behavioural-economics reading list", () => {
  it("names its sources and links them", () => {
    const html = readFileSync(resolve(__dirname, "../future.html"), "utf8");
    expect(html).toContain("danieljbenjamin.com/publications");
    // a reading list with fewer than a handful of entries is a gesture
    const links = [...html.matchAll(/href="https?:\/\/[^"]*(nber|ssrn|danieljbenjamin|mitpress)[^"]*"/g)];
    expect(links.length).toBeGreaterThanOrEqual(6);
    expect(html, "the mapping is a proposal and has to say so")
      .toMatch(/is a proposal,\s*not a result/);
  });

  it("the gate cites the literature on evidence thresholds", () => {
    const html = readFileSync(resolve(__dirname, "../gate.html"), "utf8");
    expect(html).toMatch(/Redefine Statistical Significance/);
  });
});

describe("juggling is off the path", () => {
  it("is not a chapter", async () => {
    const { SPINE } = await import("../src/ui/arc");
    expect(SPINE.map((c) => c.slug)).not.toContain("juggling");
  });

  it("says so on the page, and still works", () => {
    const html = readFileSync(resolve(__dirname, "../juggling.html"), "utf8").replace(/\s+/g, " ");
    expect(html).toMatch(/A sketch, not a result/i);
    expect(html).toContain("index.html");
    // demoted, not abandoned: it keeps its dial bar and its script
    expect(html).toContain('class="dials"');
    expect(html).toContain("jugglingLab.ts");
  });
});

/**
 * The context page.
 *
 * A grant site that never says whose problem this is leaves the reviewer to
 * guess. This asserts the page engages all three works the call is built on,
 * keeps the lineage links live, and -- the part that is easiest to lose in an
 * edit -- keeps saying what the testbed does NOT model.
 */
describe("where this sits", () => {
  const html = () =>
    readFileSync(resolve(__dirname, "../lineage.html"), "utf8").replace(/\s+/g, " ");

  it("engages each of the three inspirations by name", () => {
    const h = html();
    expect(h).toMatch(/Distributional AGI Safety/);
    expect(h).toMatch(/Scaling Trust/);
    expect(h).toMatch(/Multi-Agent Risks from Advanced AI/);
    expect(h).toContain("arxiv.org/abs/2512.16856");
    expect(h).toContain("aria.org.uk");
    expect(h).toContain("cooperativeai.com");
  });

  it("carries the lineage the call points at", () => {
    const h = html();
    for (const id of ["1810.10862", "2006.04948", "2012.08630", "2501.10114", "2501.07913",
                      "2509.01063", "2509.10147"]) {
      expect(h, `lineage lost ${id}`).toContain(id);
    }
  });

  it("says what it does not model", () => {
    const h = html();
    expect(h, "claiming collusion coverage would be a lie").toMatch(
      /Collusion and multi-agent security are not modelled/i);
    expect(h).toMatch(/not infrastructure and not a governance proposal/i);
    expect(h, "an honest page names what would make it worthless")
      .toMatch(/What would make it not worth doing/i);
  });

  it("is the closing chapter, and mounts", async () => {
    const { SPINE, mountArc } = await import("../src/ui/arc");
    expect(SPINE[SPINE.length - 1]!.slug).toBe("lineage");
    document.documentElement.innerHTML = readFileSync(resolve(__dirname, "../lineage.html"), "utf8")
      .replace(/<!doctype html>/i, "").replace(/<\/?html[^>]*>/gi, "");
    mountArc("lineage");
    expect(document.querySelector(".chapter")?.textContent).toContain(`of ${SPINE.length}`);
  });
});

/**
 * Every page ships.
 *
 * lineage.html was written, linked from the front page, tested, committed --
 * and left out of the build inputs, so the production site would have 404ed on
 * the one page a reviewer arriving from the call was most likely to open. Vite
 * only emits what it is told about, and nothing else notices.
 */
describe("the build knows about every page", () => {
  it("has an input for each html file in the root", () => {
    const config = readFileSync(resolve(__dirname, "../vite.config.ts"), "utf8");
    const pages = readdirSync(resolve(__dirname, ".."))
      .filter((f) => f.endsWith(".html"));
    expect(pages.length).toBeGreaterThan(5);
    for (const page of pages) {
      expect(config, `${page} would not be built, and would 404 in production`)
        .toContain(`"${page}"`);
    }
  });
});
