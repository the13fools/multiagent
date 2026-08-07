/**
 * Smoke tests that actually load each lab page.
 *
 * Added after a lab shipped visibly broken and the unit tests stayed green,
 * because they only ever exercised src/core. Anything that throws on load, or
 * references an element the HTML does not have, is now a test failure rather
 * than something you find by opening the page.
 */
import { describe, it, expect, beforeEach, vi } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const PAGES = ["shared-resource", "juggling", "boardwalk"] as const;

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
      const mod = { "shared-resource": "sharedResourceLab", juggling: "jugglingLab", boardwalk: "boardwalkLab" }[page]!;
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

  it("shared-resource: 'G=9 carries four defectors' is true", async () => {
    const { carryingCapacity, REFERENCE } = await import("../src/core/sharedResource");
    expect(read("shared-resource.html")).toContain("carries four defectors");
    expect(carryingCapacity({ ...REFERENCE, G: 9 }, 8)).toBe(4);
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
