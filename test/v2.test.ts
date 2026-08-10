import { describe, expect, it, beforeEach } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { GRANT_FACTS, formatInteger, formatPercent, formatUsd } from "../src/core/grantFacts";
import {
  DESCOPE_ORDER, REFERENCE_DESIGN, cells, descopeBudget, descopePlan, pairedCells,
  pairedComparisons,
} from "../src/core/design";
import { mountPowerDemo } from "../src/ui/v2PowerDemo";
import { HORIZON, POLICIES, pacemakersNeeded, simulate } from "../src/core/sharedResource";
import {
  POLICIES as GATE_POLICIES, PILOT_SD, rejectionRate,
} from "../src/core/gate";
import { FITNESS_BAR, mountGateDemo } from "../src/ui/v2GateDemo";
import {
  COMMONS_PILOT, KNOWN_DEFECT, byDose, conditionsWithBrokenCollapseField,
  isMonotoneInDose, seededDelta,
} from "../src/core/commonsPilot";
import {
  ABUNDANCE, GEN0, SCARCITY, aggregateUpkeep, equilibria, feasibilityRatio,
  greedStarves, greedyCeiling, msy, msyStock, regime, regrowth, sustainableShare,
} from "../src/core/commons";
import { mountCommonsTheory } from "../src/ui/v2CommonsTheory";
import {
  SHARED_PILOT, anySurvived, crossGameSignFlip, overRestored, poolOutlivedEveryone,
} from "../src/core/sharedPilot";
import { divergenceTurn, mountSharedPilot } from "../src/ui/v2SharedPilot";
import { estimateAdapterPool, mountPddScale } from "../src/ui/v2PddScale";

/** The campaign sizes the gate figure plots. */
const SWEEP = [10, 20, 30, 40, 60, 80, 100, 140, 200] as const;
import { mountPopulationDemo } from "../src/ui/v2Demo";
import { mountPilotReplay } from "../src/ui/v2EvidenceDemos";
import pilotJson from "../src/ui/data/commons_pilot.json";
import sharedSelfPlayJson from "../shared_continuous_results_self_play.json";
import sharedTransferJson from "../shared_continuous_results_transfer.json";

const ROOT = resolve(__dirname, "..");
const PAGES = ["index", "study", "evidence", "program", "delivery"] as const;
const read = (page: typeof PAGES[number]) =>
  readFileSync(resolve(ROOT, `commons-game/${page}.html`), "utf8");
const readDemos = () => readFileSync(resolve(ROOT, "commons-game/demos.html"), "utf8");

const visibleWords = (html: string): string[] => html
  .replace(/<script[\s\S]*?<\/script>/gi, " ")
  .replace(/<style[\s\S]*?<\/style>/gi, " ")
  .replace(/<[^>]+>/g, " ")
  .replace(/&[a-z#0-9]+;/gi, " ")
  .trim()
  .split(/\s+/)
  .filter(Boolean);

/**
 * GRANT_FACTS was written by hand and happens to agree with the campaign
 * planner. Two sources for one number is how a site starts contradicting the
 * document it was built to support, so pin them to each other. If someone moves
 * a dial default, this fails before a reviewer finds the discrepancy.
 */
describe("the published facts are the planner's facts", () => {
  it("derives the campaign figures from the design, not from memory", () => {
    expect(GRANT_FACTS.cells).toBe(cells(REFERENCE_DESIGN));
    expect(GRANT_FACTS.pairedComparisons).toBe(pairedComparisons(REFERENCE_DESIGN));
    expect(GRANT_FACTS.pairsPerContrast).toBe(pairedCells(REFERENCE_DESIGN));
  });

  it("keeps the budget internally consistent", () => {
    // indirect is 10% of direct, and the total is their sum -- the two places a
    // hand-edited budget goes wrong first
    expect(GRANT_FACTS.indirectCosts).toBe(Math.round(GRANT_FACTS.directCosts * 0.1));
    expect(GRANT_FACTS.totalRequest).toBe(GRANT_FACTS.directCosts + GRANT_FACTS.indirectCosts);
    // and it stays under the Tier 1 cap, visibly rather than by luck
    expect(GRANT_FACTS.totalRequest).toBeLessThan(300_000);
  });

  it("computes the A/A bound rather than quoting it", () => {
    // exact one-sided 95% upper bound with zero rollbacks in k null campaigns
    const bound = 1 - 0.05 ** (1 / GRANT_FACTS.aaCampaigns);
    expect(GRANT_FACTS.aaUpperBound).toBeCloseTo(bound, 3);
    // the declared fitness threshold is 10%; a bound at or above it would mean
    // the campaign as designed cannot clear its own bar
    expect(GRANT_FACTS.aaUpperBound).toBeLessThan(0.1);
  });
});

describe("Commons Game reviewer path", () => {
  it("ships five reviewer entries and one demos entry under commons-game", () => {
    const config = readFileSync(resolve(ROOT, "vite.config.ts"), "utf8");
    for (const page of PAGES) {
      const inputName = page === "index" ? "commonsMain" : `commons${page[0]!.toUpperCase()}${page.slice(1)}`;
      expect(config).toContain(`${inputName}: "commons-game/${page}.html"`);
      expect(existsSync(resolve(ROOT, `commons-game/${page}.html`))).toBe(true);
    }
    expect(config).toContain('commonsDemos: "commons-game/demos.html"');
    expect(existsSync(resolve(ROOT, "commons-game/demos.html"))).toBe(true);
  });

  it("keeps archive material off the skim path except for the technical receipt ledger", () => {
    const archiveLinks = PAGES.flatMap((page) =>
      [...read(page).matchAll(/href="([^"]*archive[^"]*)"/g)]
        .map((match) => `${page}:${match[1]}`),
    );
    expect(archiveLinks).toEqual(["evidence:../archive/experiments.html"]);
  });

  it("publishes canonical metadata for the foolzone route", () => {
    expect(existsSync(resolve(ROOT, "public/og.png"))).toBe(true);
    expect(existsSync(resolve(ROOT, "public/sitemap.xml"))).toBe(true);
    expect(readFileSync(resolve(ROOT, "index.html"), "utf8"))
      .toContain('href="https://foolzone.com/multiagent/"');
    for (const page of PAGES) {
      const html = read(page);
      const canonical = page === "index"
        ? "https://foolzone.com/multiagent/commons-game/"
        : `https://foolzone.com/multiagent/commons-game/${page}.html`;
      expect(html).toContain(`rel="canonical" href="${canonical}"`);
      expect(html).toContain('content="https://foolzone.com/multiagent/og.png"');
      expect(html).toContain('rel="sitemap"');
    }
    const demos = readDemos();
    expect(demos).toContain('rel="canonical" href="https://foolzone.com/multiagent/commons-game/demos.html"');
    expect(demos).toContain('content="https://foolzone.com/multiagent/og.png"');
    expect(demos).toContain('rel="sitemap"');
  });

  it("uses the root as a program landing page", () => {
    const landing = readFileSync(resolve(ROOT, "index.html"), "utf8");
    expect(landing).toMatch(/Training agents for long-horizon coordination/i);
    expect(landing).toMatch(/cheap behavioral fine-tuning/i);
    expect(landing).toContain("https://github.com/thenthfool/flockbench");
    expect(landing).toContain("https://github.com/thenthfool/freetimebench");
    expect(landing).toContain("./commons-game/index.html");
    expect(landing).toMatch(/Continuous Judge[\s\S]*Coming soon|Coming soon[\s\S]*Continuous Judge/i);
    expect(landing).not.toMatch(/How do we train for coordination that must last/i);
  });

  /** The reviewer path is intentionally asymmetric: four fast pages frame one
   * roomier programme page. These are development guardrails, not call limits. */
  const CEILING: Record<typeof PAGES[number], number> = {
    index: 700,
    program: 1_600,
    // Raised from 1,100 when the three RQ bodies stopped linking to unpolished
    // archive posts and started carrying their own evidence: the clone-test
    // table, the power arithmetic, the 0-to-8 swing in seats needed as the
    // majority rule changes, and the explicit assumptions in the PDD scaling
    // calculator. Lower it again if the questions get their own page.
    study: 1_700,
    evidence: 850,
    delivery: 1_200,
  };

  for (const page of PAGES) {
    it(`${page} has the complete navigation and no placeholders`, () => {
      const html = read(page);
      for (const destination of PAGES) expect(html).toContain(`./${destination}.html`);
      expect(html).not.toMatch(/\[(?:FULL|YOUR|CONFIRM|TODO|TBD|XX)/i);
      const n = visibleWords(html).length;
      expect(n, `${page}.html is ${n} words against a ${CEILING[page]} ceiling`)
        .toBeLessThanOrEqual(CEILING[page]);

      const narrativeOrder = ["index", "study", "evidence", "program", "delivery"];
      for (let i = 1; i < narrativeOrder.length; i++) {
        expect(html.indexOf(`./${narrativeOrder[i - 1]}.html`))
          .toBeLessThan(html.indexOf(`./${narrativeOrder[i]}.html`));
      }
    });
  }

  it("keeps the Overview focused on the population question", () => {
    const html = read("index");
    expect(html).toMatch(/partial coalition keep a commons alive when no one controls the whole population/i);
    expect(html).toMatch(/pilot is the reason for the study, not its answer/i);
    expect(html).toContain('id="stage-zero-finding"');
    expect(html).toContain('href="./evidence.html#shared-resource-transfer"');
    expect(html).toContain('href="./evidence.html#commons-training"');
    expect(html).toContain('href="./program.html"');
    expect(html).toMatch(/Training changed the failure mode/i);
    expect(html).toMatch(/round 33 to 170[\s\S]*no arm survived/i);
    expect(html).toMatch(/extinct turn 8[\s\S]*extinct turn 6/i);
    expect(html).toMatch(/one seed per condition/i);
    expect(html).toMatch(/diagnostic traces.not effect sizes/i);
    expect(html).not.toMatch(/\bPDD\b/);
    expect(html).not.toMatch(/moral infrastructure/i);
    expect(html).not.toMatch(/<p class="section-kicker">The funded study<\/p>/i);
    expect(html).not.toMatch(/Stage 0 · what I built/i);
    expect(html).toContain('href="./study.html"');
  });

  it("gives the longer research programme one page without sending reviewers into the archive", () => {
    const html = read("program");
    const demos = readDemos();
    const delivery = read("delivery");
    const archive = readFileSync(resolve(ROOT, "archive/program-foundations.html"), "utf8");
    expect(html).toMatch(/From answer-key games to institutions for a world of agents/i);
    expect(html).toMatch(/Intelligence is becoming plural before governance does/i);
    expect(html).toMatch(/Answer-key games/i);
    expect(html).toMatch(/Population science/i);
    expect(html).toMatch(/Side-channel games/i);
    expect(html).toMatch(/Agent institutions/i);
    expect(html).toMatch(/Coordination is not the same as consensus/i);
    expect(html).toContain('id="stable-flocks-demo"');
    expect(html).toMatch(/One answer key. One source experiment/i);
    expect(html).toContain('data-stable-modes="commons,harvest"');
    expect(html).toMatch(/Shared Resource/i);
    expect(html).toMatch(/Common Harvest/i);
    expect(html).toMatch(/33 to 90 to 170/i);
    expect(html.indexOf('id="stable-flocks"')).toBeLessThan(html.indexOf('id="longer-program"'));
    expect(html).not.toMatch(/Boardwalk/i);
    expect(html).not.toMatch(/Juggling/i);
    expect(html).toContain('href="./demos.html"');
    expect(demos).toMatch(/Tiny worlds. Strange equilibria/i);
    expect(demos).toContain('data-stable-modes="boardwalk,juggling"');
    expect(demos).toMatch(/Boardwalk/i);
    expect(demos).toMatch(/Juggling/i);
    expect(demos).toMatch(/Clebsch fields/i);
    expect(demos).toMatch(/Direction Field Lab/i);
    expect(demos).toMatch(/Icosahedron ants/i);
    expect(demos).toMatch(/Conceptual demos, not grant evidence/i);
    expect(demos).toMatch(/A question should become something you can perturb/i);
    expect(demos).toContain('href="./program.html"');
    expect(html).not.toContain('href="../archive/boardwalk.html"');
    expect(html).not.toContain('href="../archive/juggling.html"');
    expect(html).not.toContain('href="../archive/program-foundations.html"');
    expect(html).toContain('href="./delivery.html"');
    expect(html).not.toContain('id="first-grant"');
    expect(html).not.toMatch(/Why begin with games/i);
    expect(delivery).toContain('id="first-grant"');
    expect(delivery).toMatch(/Known-answer games are the scaffold/i);
    expect(delivery).toMatch(/Create strategy pools[\s\S]*Scale the laboratory[\s\S]*Make the work reusable/i);
    expect(html).not.toContain('id="commons-theory"');
    expect(archive).toContain('id="commons-theory"');
    expect(archive).toMatch(/<p class="section-kicker">Two games<\/p>/i);
    expect(archive).toMatch(/Why begin with games/i);
    expect(archive).toMatch(/Stage 0 implementation/i);
    expect(archive).toMatch(/Boardwalk/i);
    expect(read("study")).not.toContain('id="commons-theory"');
    expect(read("evidence")).not.toMatch(/<p class="section-kicker">What I built<\/p>/i);
  });

  it("defines two core games and two playful collective-motion demos", async () => {
    const {
      COMMONS_COLLAPSE_HOLD_MS,
      COMMONS_FRAME_MS,
      STABILITY_MODES,
      STABLE_DEFAULTS,
      commonsFrameDelay,
    } = await import("../src/ui/v2StableFlocks");
    expect(Object.keys(STABILITY_MODES)).toEqual(["commons", "harvest", "boardwalk", "juggling"]);
    expect(STABILITY_MODES.commons.title).toMatch(/shared pool stays level/i);
    expect(STABILITY_MODES.harvest.description).toMatch(/33 to 90 to 170/i);
    expect(STABILITY_MODES.boardwalk.description).toMatch(/no pure-strategy equilibrium/i);
    expect(STABILITY_MODES.juggling.title).toMatch(/stable pattern.*motion/i);
    const harvestRuns = byDose();
    expect(harvestRuns.map((condition) => condition.collapseRound)).toEqual([33, 90, 170]);
    for (const condition of harvestRuns) {
      expect(condition.trace).toHaveLength(condition.stock.length - 1);
      expect(condition.roles.filter((role) => role === "cfa")).toHaveLength(condition.seeded);
      expect(condition.trace.every((round) => round.harvests.length === 8)).toBe(true);
    }
    expect(STABLE_DEFAULTS).toEqual({
      jugglingTimingErrorPercent: 1,
      jugglingListening: 0.2,
      jugglingControlledPlayers: 1,
    });
    const collapsed = simulate(() => "take", { turns: 60, pool0: 30, balance0: 10 }).frames;
    expect(commonsFrameDelay(collapsed[0]!, 0, collapsed.length)).toBe(COMMONS_FRAME_MS);
    expect(commonsFrameDelay(collapsed.at(-1)!, collapsed.length - 1, collapsed.length))
      .toBe(COMMONS_COLLAPSE_HOLD_MS);
    expect(COMMONS_COLLAPSE_HOLD_MS).toBeGreaterThan(COMMONS_FRAME_MS * 7);
  });

  it("makes the three shared-resource outcomes explicit on the Overview", () => {
    const html = read("index");
    expect(existsSync(resolve(ROOT, "public/commons-game-outcomes.jpg"))).toBe(true);
    expect(html).toContain("../commons-game-outcomes.jpg");
    expect(html).toMatch(/Take only:[\s\S]*empty pond[\s\S]*agents and wildlife fall/i);
    expect(html).toMatch(/Give only:[\s\S]*full pond[\s\S]*living wildlife[\s\S]*fallen agents/i);
    expect(html).toMatch(/Give and take:[\s\S]*all survive/i);
  });

  it("starts the live answer key with copy-the-majority selected", () => {
    const html = read("index");
    expect(html).toMatch(/<option value="copy" selected>copy the majority<\/option>/i);
    expect(html).not.toMatch(/<option value="take" selected>/i);
  });

  it("makes the Stage 0 origin and implementation prongs skimmable", () => {
    const archive = readFileSync(resolve(ROOT, "archive/program-foundations.html"), "utf8");
    expect(archive).toMatch(/approximately \$200 in RunPod credits/i);
    expect(archive).toMatch(/Qwen2\.5.7B-Instruct on a single-GPU path/i);
    expect(archive).toMatch(/Game server and harness/i);
    expect(archive).toMatch(/Theory and answer keys/i);
    expect(archive).toMatch(/Low-cost policy populations/i);
    expect(read("evidence")).toMatch(/unpaid independent researcher/i);
  });

  it("grounds the mission in constraints without turning aspiration into a result", () => {
    const program = read("program");
    expect(program).toMatch(/made of the same earth/i);
    expect(program).toMatch(/long-term abundance/i);
    expect(program).toMatch(/mutual flourishing/i);
    expect(program).toMatch(/A null result still advances the arc/i);
    expect(program).toMatch(/not simply how to align one model/i);
  });

  it("keeps old v2 URLs as compatibility redirects", () => {
    for (const page of PAGES) {
      const redirect = readFileSync(resolve(ROOT, `v2/${page}.html`), "utf8");
      expect(redirect).toContain(`../commons-game/${page}.html`);
      expect(redirect).toMatch(/location\.replace/);
    }
  });

  it("keeps the former underscore URLs as compatibility redirects", () => {
    for (const page of PAGES) {
      const redirect = readFileSync(resolve(ROOT, `commons_game/${page}.html`), "utf8");
      expect(redirect).toContain(`../commons-game/${page}.html`);
      expect(redirect).toMatch(/location\.replace/);
      expect(redirect).toMatch(/name="robots" content="noindex"/);
    }
  });

  it("redirects the former root detail pages", () => {
    for (const page of PAGES.filter((page) => page !== "index")) {
      const redirect = readFileSync(resolve(ROOT, `${page}.html`), "utf8");
      expect(redirect).toContain(`./commons-game/${page}.html`);
      expect(redirect).toMatch(/location\.replace/);
    }
  });

  it("states the hypothesis and refuses a scaling-law claim", () => {
    const html = read("study");
    expect(html).toMatch(/f\* will be lowest under imitate-best-neighbour/i);
    expect(html).toMatch(/does not claim a scaling law/i);
    expect(html).toMatch(/upper confidence bound above 10% retires the gate/i);
    expect(html.match(/<details class="question">/g)).toHaveLength(3);
    expect(html).not.toMatch(/<details class="question" open/);
    expect(html).not.toContain('id="gate-demo"');
    expect(html).not.toMatch(/Controls, boundaries, and stopping/i);
    expect(html).toContain('id="pilot-replay"');
    expect(html).toContain('id="pdd-demo"');
    expect(html).not.toContain('id="commons-theory"');
    expect(html).not.toMatch(/<p class="section-kicker">The estimand<\/p>/i);
    expect(html.indexOf('id="pilot-replay"')).toBeLessThan(html.indexOf('class="question-list"'));
    expect(html.indexOf('class="question-list"')).toBeLessThan(html.indexOf('id="pdd-demo"'));

    const archive = readFileSync(resolve(ROOT, "archive/design.html"), "utf8");
    expect(archive).toContain('id="estimand"');
    expect(archive).toMatch(/smallest fraction that improves survival/i);
  });

  it("separates evidence status and does not claim the funded effect", () => {
    const html = read("evidence");
    expect(html).toMatch(/One seed per condition/i);
    expect(html).toMatch(/Instrumentation defect/i);
    expect(read("delivery")).toContain('class="label proposed"');
    expect(readFileSync(resolve(ROOT, "archive/program-foundations.html"), "utf8")).toContain("Built");
    expect(html).toMatch(/Receipts and caveats, at the bottom where they belong/i);
    expect(html).not.toMatch(/Six claims worth carrying forward/i);
    expect(read("study")).toMatch(/Observe the baseline/i);
    expect(html).toMatch(/Both trained populations[\s\S]*died on turn 6/i);
    expect(html).toMatch(/diagnostic traces.not effect sizes/i);
    expect(html).not.toMatch(/zero-shot transfer above/i);
    expect(html).not.toContain('id="pilot-replay"');
    expect(html).toContain('id="shared-trained-playthrough"');
    expect(html).toMatch(/trained for 2,000 PDD steps on[\s\S]*Shared Resource itself/i);
    expect(html).toMatch(/do not settle PDD or post-training generally/i);
    expect(html).not.toMatch(/empirically proves|validating the need/i);
    expect(html).toMatch(/Both target-game JSON traces are now checked in/i);
    expect(html).toMatch(/Experiment 1 · source game/i);
    expect(html).toMatch(/Experiments 2–3 · one target game · two training routes/i);
    expect(html).toMatch(/artifacts are not frozen, and no effect is claimed/i);
    expect(html).toContain('id="shared-resource-transfer"');
    expect(html).toContain('id="shared-pilot"');
    expect(html).not.toContain('id="sp-plot"');
    // Order is the argument. The two training runs share an evaluation game and
    // differ only in where the policy was learned, so they must sit adjacent --
    // the comparison IS the finding, and Novelty and the archive were splitting
    // it. The archive also says "at the bottom where they belong", which the
    // previous order contradicted by placing it above two live results.
    const at = (id: string) => html.indexOf(`id="${id}"`);
    expect(at("commons-training"))
      .toBeLessThan(at("two-game-field-guide"));
    expect(at("two-game-field-guide"))
      .toBeLessThan(at("shared-trained-playthrough"));
    expect(at("shared-trained-playthrough"))
      .toBeLessThan(at("shared-resource-transfer"));
    expect(at("shared-resource-transfer")).toBeLessThan(at("receipts"));
    expect(html).not.toMatch(/Novelty, stated narrowly/i);
    expect(html).toMatch(/synchronized failure|die together/i);
    expect(html).toMatch(/open research question/i);
    expect(html).toMatch(/Flockbench is the laboratory/i);
    // Was: "No transfer result is shown yet" -- a correct guard until the run
    // existed. It does now, so the guard becomes: report it without inflating
    // it. One seed, no receipt, and the source-game result not overwritten.
    expect(html).toMatch(/One seed per condition/i);
    expect(html).toMatch(/receipts not yet committed/i);
    expect(html).toMatch(/One trace per condition · no effect size/i);
    expect(html).toMatch(/bought \+137 rounds where it trained, then cost 2 turns here/i);
    expect(html).not.toContain('id="pdd-demo"');
    expect(html).toContain('href="./delivery.html#first-grant"');
    expect(html).toContain('href="./index.html#population-demo"');
    expect(html).toContain('id="two-game-field-guide"');
    expect(html).toContain('src="../two-game-field-guide-v2.webp"');
    expect(existsSync(resolve(ROOT, "public/two-game-field-guide-v2.webp"))).toBe(true);
    expect(html.indexOf('class="game-field-guide-grid"'))
      .toBeLessThan(html.indexOf('class="game-field-guide-visual"'));
    expect(html).toMatch(/Commons Game[\s\S]*Shared Resource/i);
    expect(html).toMatch(/Selective scale check[\s\S]*at least one 70B\+ open-weight model/i);
    expect(html).not.toContain('href="../archive/boardwalk.html"');
    expect(read("program")).not.toContain('href="../archive/program-foundations.html"');
  });

  it("merges direct training and zero-shot transfer in one target-game comparison", () => {
    const html = read("evidence");
    expect(html).toMatch(/one target game · two training routes/i);
    expect(html).toMatch(/without further fine-tuning/i);
    expect(html).toContain('id="shared-pilot"');
    expect(html).toContain('class="shared-lane is-base"');
    expect(html).toContain('class="shared-lane is-trained is-direct"');
    expect(html).toContain('class="shared-lane is-trained is-transfer"');
    expect(html).toMatch(/restore on half the turns and take on the other half/i);
    expect(html).toMatch(/Inspect this turn in both uploaded JSON files/i);
    expect(html).toMatch(/discover prosocial strategies/i);
    expect(html).toMatch(/many known-answer test fixtures/i);
  });

  /**
   * The illustrative funding slider was removed: it showed $300,000 -- the Tier 1
   * cap -- a few lines under a $246,455 ask, and the "after the award" fork now
   * answers "how could this grow" with a criterion instead of an anchor. Assert
   * it stays gone, and that what replaced it is gated on evidence.
   */
  it("shows growth as an evidence-gated fork, not a funding slider", () => {
    const html = read("delivery");
    const program = read("program");
    expect(html).toContain(formatUsd(GRANT_FACTS.totalRequest));
    expect(html).not.toMatch(/Explore general funding scopes/i);
    expect(html).not.toContain("$300,000");
    expect(program).toMatch(/A null result still advances the arc/i);
    expect(program).toMatch(/only when the evidence earns them/i);
    expect(html).not.toContain('id="power-demo"');
    expect(html).not.toContain("../archive/experiments.html#variance-risk");
    expect(html).toMatch(/complete public evaluation and reusable release/i);
    expect(html).toMatch(/neither to centralize authority.*nor to financialize/i);
    expect(html).not.toMatch(/most dual-use idea here|manufacture apparent consensus/i);
  });

  it("keeps Delivery focused on milestones, resources, readiness, and the motivation", () => {
    const html = read("delivery");
    expect(existsSync(resolve(ROOT, "public/parrots-escaping-cage.jpg"))).toBe(true);
    expect(html).toContain("../parrots-escaping-cage.jpg");
    expect(html).toMatch(/guiding flocks toward mutual flourishing/i);
    expect(html).toMatch(/Build an interpretable intervention/i);
    expect(html).toMatch(/Estimate f\* or declare it undefined/i);
    expect(html).toMatch(/Team and readiness/i);
    expect(html).toMatch(/Why this work/i);
    expect(html).toMatch(/visitors on a living planet/i);
    expect(html).toContain('href="./program.html"');
    expect(html).not.toMatch(/The institutional horizon|Side-channel games/i);
    expect(html).toContain('class="scaffold-stack"');
    expect(html).toMatch(/The middle layer is the funded work/i);
    expect(html).toMatch(/Answer-key games[\s\S]*Flockbench infrastructure[\s\S]*Less structured worlds|Less structured worlds[\s\S]*Flockbench infrastructure[\s\S]*Answer-key games/i);
    expect(html).toMatch(/up to two experiment-focused interns/i);
    expect(html).toMatch(/80 GB GPU compute/i);
    expect(html).toMatch(/Compute remains below \$50,000/i);
    expect(html).toMatch(/The flock is leaving the cage/i);
  });

  it("pins the fallback copy to the canonical grant facts", () => {
    const overview = read("index");
    const delivery = read("delivery");
    const study = read("study");
    expect(overview).toContain(`>${formatUsd(GRANT_FACTS.totalRequest)}<`);
    expect(delivery).toContain(`>${formatUsd(GRANT_FACTS.directCosts)}<`);
    expect(delivery).toContain(`>${formatUsd(GRANT_FACTS.indirectCosts)}<`);
    expect(delivery).toContain(`>${formatInteger(GRANT_FACTS.aaCampaigns)}<`);
    expect(delivery).toContain(`>${formatInteger(GRANT_FACTS.pairsPerCampaign)}<`);
    expect(study).toContain(`>${formatInteger(GRANT_FACTS.cells)}<`);
    expect(formatPercent(GRANT_FACTS.aaUpperBound)).toBe("9.5%");
  });

  it("uses a restrained visual system and makes the simulator the visual anchor", () => {
    const overview = read("index");
    const css = readFileSync(resolve(ROOT, "src/ui/v2.css"), "utf8");
    expect(overview).toContain('id="population-demo"');
    expect(overview).toContain('id="controlled-seats"');
    expect(overview).not.toMatch(/<img[^>]+og\.png/i);
    expect(css).not.toMatch(/Georgia|Times New Roman|linear-gradient|box-shadow|backdrop-filter/i);
  });

  it("does not publish links to repositories that are not public yet", () => {
    for (const page of PAGES) expect(read(page)).not.toMatch(/github\.com\/thenthfool/i);
  });
});

describe("v2 page script", () => {
  beforeEach(() => {
    document.documentElement.innerHTML = "";
  });

  it("substitutes canonical facts into every page", async () => {
    document.body.innerHTML = `
      <span data-grant-fact="total">fallback</span>
      <span data-grant-fact="cells">fallback</span>
      <span data-grant-fact="aaUpperBound">fallback</span>`;
    await import("../src/ui/v2");
    expect(document.querySelector("[data-grant-fact='total']")?.textContent)
      .toBe(formatUsd(GRANT_FACTS.totalRequest));
    expect(document.querySelector("[data-grant-fact='cells']")?.textContent)
      .toBe(formatInteger(GRANT_FACTS.cells));
    expect(document.querySelector("[data-grant-fact='aaUpperBound']")?.textContent)
      .toBe(formatPercent(GRANT_FACTS.aaUpperBound));
  });

  it("runs the overview demo against the tested 200-turn simulator", () => {
    document.body.innerHTML = `
      <section id="population-demo">
        <input id="controlled-seats" type="range" min="0" max="8" value="5">
        <output id="controlled-value"></output>
        <select id="uncontrolled-rule"><option value="copy">copy</option><option value="take">take</option></select>
        <strong id="demo-verdict"></strong>
        <span id="demo-threshold"></span>
        <span id="demo-pool-scale"></span>
        <svg id="demo-pool"></svg>
        <div id="demo-grid"></div>
        <button id="demo-play" type="button">Replay dynamics</button>
        <output id="demo-turn"></output>
        <div id="demo-sweep"></div>
      </section>`;

    const root = document.getElementById("population-demo")!;
    mountPopulationDemo(root);
    expect(document.getElementById("controlled-value")?.textContent).toBe("5 / 8");
    expect(document.getElementById("demo-threshold")?.textContent).toContain("6 of 8");
    expect(document.getElementById("demo-verdict")?.dataset.outcome).toBe("collapses");
    expect(document.querySelectorAll(".demo-row")).toHaveLength(8);
    expect(document.querySelectorAll(".demo-cell")).toHaveLength(8 * 200);

    const seats = document.getElementById("controlled-seats") as HTMLInputElement;
    seats.value = "6";
    seats.dispatchEvent(new Event("input"));
    expect(document.getElementById("demo-verdict")?.dataset.outcome).toBe("survives");
    expect(document.getElementById("demo-verdict")?.textContent).toContain("turn 200");

    const play = document.getElementById("demo-play") as HTMLButtonElement;
    play.click();
    expect(document.getElementById("demo-turn")?.textContent).toContain("turn 0 / 200");
    expect(play.textContent).toBe("Pause");
    play.click();
    expect(play.textContent).toBe("Resume");
  });

  it("ships PDD as a script-independent native stepper", () => {
    const html = read("study");
    const css = readFileSync(resolve(ROOT, "src/ui/v2.css"), "utf8");
    expect(html.match(/class="pdd-radio"/g)).toHaveLength(4);
    expect(html).not.toContain('pdd-process.jpg');
    expect(html).toMatch(/id="pdd-step-0" checked/i);
    expect(html.match(/class="pdd-stage pdd-stage-/g)).toHaveLength(4);
    expect(html).toMatch(/Observe the baseline[\s\S]*Construct the target[\s\S]*Teach the original model/i);
    expect(html.match(/class="pdd-action is-locked/g)).toHaveLength(4);
    expect(html).toMatch(/noisy[\s\S]*clearer[\s\S]*accepted/i);
    expect(html).toMatch(/fuzzy diffusion judge repeatedly refines only the blanks/i);
    expect(html).toMatch(/cross-entropy loss is applied to accepted replacement spans only[\s\S]*entire action field contribute zero gradient[\s\S]*no scalar reward or policy-gradient update/i);
    expect(html).toMatch(/pre-training rationale[\s\S]*take now[\s\S]*restore is fixed[\s\S]*target rationale · Mad Libs mask/i);
    expect(html).toMatch(/same model[\s\S]*fresh rollout · hypothesis[\s\S]*restore\?/i);
    expect(css).toMatch(/#pdd-step-3:checked ~ \.pdd-stages \.pdd-stage-3/);
  });

  it("makes the adapter-pool assumptions inspectable", () => {
    const estimate = estimateAdapterPool({
      personas: 30,
      repetitions: 4,
      gpuHoursPerAdapter7B: 3.5,
      modelMultiplier: 1,
      gpuPricePerHour: 2,
      computeBudgetUsd: 41_330,
    });
    expect(estimate.trainingRuns).toBe(120);
    expect(estimate.gpuHoursPerRun).toBe(3.5);
    expect(estimate.gpuHours).toBe(420);
    expect(estimate.costPerRunUsd).toBe(7);
    expect(estimate.computeCostUsd).toBe(840);
    expect(estimate.budgetShare).toBeCloseTo(0.020324, 5);
    expect(estimate.maxTrainingRuns).toBe(5_904);
    expect(estimate.maxPersonasAtBudget).toBe(1_476);

    const html = read("study");
    expect(html).toContain('id="pdd-scale-calculator"');
    expect(html).toMatch(/measured anchor is[\s\S]*one Stage 0 timing/i);
    expect(html).not.toContain('href="../archive/blog-pdd.html#adapter-cost"');
    expect(html).toMatch(/2,000 steps[\s\S]*took about 3–4 hours/i);
    expect(html).toMatch(/roughly \$6–\$8 for one attempt/i);
    expect(html).toMatch(/does not infer runtime from parameter counts or nominal token throughput/i);
    expect(html).toMatch(/does not claim a cost per converged adapter/i);
    expect(html).toMatch(/unknown training floor[\s\S]*indistinguishable copies with different accents/i);
    expect(html).toMatch(/diffusion language model as an LLM-as-a-Judge/i);
    expect(html).toMatch(/round 170 instead of round 33/i);
    expect(html).toMatch(/gave every turn and all agents died by round 6/i);
    expect(html).not.toMatch(/hat size|pdd-persona|data-pdd-personas/i);
    expect(html).toMatch(/Training time[\s\S]*3\.5 hr/i);
    expect(html).not.toMatch(/Measured 7B time per adapter/i);
    expect(html).not.toContain('data-pdd-input="throughput"');
    expect(html).not.toContain('data-pdd-input="tokens"');
    expect(html.indexOf('id="pdd-demo"')).toBeLessThan(html.indexOf('id="pdd-scale-calculator"'));
  });

  it("updates the visible adapter-pool estimate", () => {
    document.body.innerHTML = `
      <section id="pdd-scale-calculator">
        <input data-pdd-input="personas" value="30">
        <input data-pdd-input="repetitions" value="4">
        <input data-pdd-input="hours" value="3.5">
        <select data-pdd-input="model"><option value="1" selected>7B · measured · 1×</option><option value="2">14B · planning · 2×</option></select>
        <output data-pdd-output="personas"></output>
        <output data-pdd-output="repetitions"></output>
        <output data-pdd-output="hours"></output>
        <output data-pdd-output="model"></output>
        <strong data-pdd-result="personas"></strong>
        <strong data-pdd-result="repetitions"></strong>
        <strong data-pdd-result="hoursPerRun"></strong>
        <strong data-pdd-result="trainingRuns"></strong>
        <strong data-pdd-result="gpuHours"></strong>
        <strong data-pdd-result="costPerRun"></strong>
        <strong data-pdd-result="computeCost"></strong>
        <strong data-pdd-result="budgetShare"></strong>
        <progress data-pdd-budget max="41330"></progress>
        <p data-pdd-capacity></p>
      </section>`;
    const root = document.getElementById("pdd-scale-calculator")!;
    mountPddScale(root);
    expect(root.querySelector('[data-pdd-result="trainingRuns"]')?.textContent).toBe("120");
    expect(root.querySelector('[data-pdd-result="hoursPerRun"]')?.textContent).toBe("3.5");
    expect(root.querySelector('[data-pdd-result="gpuHours"]')?.textContent).toBe("420");
    expect(root.querySelector('[data-pdd-result="costPerRun"]')?.textContent).toBe("$7");
    expect(root.querySelector('[data-pdd-result="computeCost"]')?.textContent).toBe("$840");
    expect(root.querySelector("[data-pdd-capacity]")?.textContent).toContain("5,904 training attempts");

    const personas = root.querySelector<HTMLInputElement>('[data-pdd-input="personas"]')!;
    personas.value = "60";
    personas.dispatchEvent(new Event("input"));
    expect(root.querySelector('[data-pdd-result="trainingRuns"]')?.textContent).toBe("240");
    expect(root.querySelector('[data-pdd-result="computeCost"]')?.textContent).toBe("$1,680");

    const model = root.querySelector<HTMLSelectElement>('[data-pdd-input="model"]')!;
    model.value = "2";
    model.dispatchEvent(new Event("input"));
    expect(root.querySelector('[data-pdd-result="costPerRun"]')?.textContent).toBe("$14");
    expect(root.querySelector('[data-pdd-result="computeCost"]')?.textContent).toBe("$3,360");
    expect(root.querySelector("[data-pdd-capacity]")?.textContent).toContain("2,952 training attempts");
  });

  /**
   * The section is headed "find the cliff", so the cliff has to be on screen.
   * These assert the claim the figure makes, not the markup it happens to use.
   */
  it("shows the whole dose-response and marks f* where the simulator puts it", () => {
    document.body.innerHTML = `
      <section id="population-demo">
        <input id="controlled-seats" type="range" min="0" max="8" value="5">
        <output id="controlled-value"></output>
        <select id="uncontrolled-rule"><option value="copy">copy</option></select>
        <strong id="demo-verdict"></strong><span id="demo-threshold"></span>
        <span id="demo-pool-scale"></span><svg id="demo-pool"></svg>
        <div id="demo-grid"></div>
        <button id="demo-play" type="button"></button><output id="demo-turn"></output>
        <div id="demo-sweep"></div>
      </section>`;
    mountPopulationDemo(document.getElementById("population-demo")!);

    // one step per reachable fraction, 0..8 inclusive
    const steps = Array.from(document.querySelectorAll<HTMLElement>(".sweep-step"));
    expect(steps).toHaveLength(9);

    // the outlined step is the smallest surviving fraction, and it agrees with
    // pacemakersNeeded -- the number the proposal quotes
    const threshold = steps.findIndex((s) => s.classList.contains("is-threshold"));
    const firstSurvivor = steps.findIndex((s) => s.classList.contains("is-survive"));
    expect(threshold).toBe(firstSurvivor);
    expect(threshold).toBe(pacemakersNeeded(POLICIES.copy!.fn, { n: 8, turns: HORIZON }));

    // below it everything collapses, at and above it everything survives: the
    // monotone step is the shape of the claim
    steps.forEach((step, k) => {
      expect(step.classList.contains(k < threshold ? "is-collapse" : "is-survive")).toBe(true);
    });

    // and the axis is an input, not a legend
    steps[8]!.click();
    expect((document.getElementById("controlled-seats") as HTMLInputElement).value).toBe("8");
    expect(steps[8]!.classList.contains("is-current")).toBe(false); // rerendered
    expect(document.querySelectorAll(".sweep-step.is-current")).toHaveLength(1);
  });

  /**
   * The clone test. These assert the three shapes the figure exists to show,
   * against the same gate module the proposal quotes -- so if a rule is retuned
   * and the story changes, the page cannot keep telling the old one.
   */
  it("shows the overlap rule getting worse as the campaign grows", () => {
    const rule = GATE_POLICIES.overlap!.rule;
    const rates = SWEEP.map((n) => rejectionRate(rule, n, 0, 1200, PILOT_SD));
    // never improves with more evidence, which is the whole indictment
    for (let i = 1; i < rates.length; i++) expect(rates[i]!).toBeGreaterThanOrEqual(rates[i - 1]!);
    expect(rates[0]!).toBeGreaterThan(0.9);
    expect(rates.at(-1)!).toBeGreaterThan(0.99);
    // and it rejects a genuine improvement more often too: not strict, broken
    const onGain = SWEEP.map((n) => rejectionRate(rule, n, 400, 1200, PILOT_SD));
    expect(onGain.at(-1)!).toBeGreaterThan(onGain[0]!);
  });

  it("shows the significance test failing a clone at every size, for the opposite reason", () => {
    const rule = GATE_POLICIES.superiority!.rule;
    for (const n of SWEEP) {
      expect(rejectionRate(rule, n, 0, 1200, PILOT_SD)).toBeGreaterThan(0.9);
    }
    // it is not simply broken -- given enough data it does promote a real gain
    expect(rejectionRate(rule, 200, 400, 1200, PILOT_SD)).toBeLessThan(0.1);
  });

  it("shows the tolerated-harm threshold discriminating rather than waving things through", () => {
    const rule = GATE_POLICIES.nonInferiority!.rule;
    // clears the declared 10% bar on a clone, and does so at a reachable size
    expect(rejectionRate(rule, 30, 0, 1200, PILOT_SD)).toBeLessThanOrEqual(FITNESS_BAR);
    // but still catches a candidate that really is worse
    expect(rejectionRate(rule, 60, -800, 1200, PILOT_SD)).toBeGreaterThan(0.9);
  });

  it("renders the gate figure and moves with its controls", () => {
    document.body.innerHTML = `
      <section id="gate-demo">
        <svg id="gate-plot"></svg>
        <strong id="gate-verdict"></strong><span id="gate-gloss"></span>
        <div id="gate-readout"></div>
        <input id="gate-size" type="range" min="0" max="8" value="2">
        <output id="gate-size-value"></output>
        <select id="gate-effect">
          <option value="clone">clone</option><option value="harm">harm</option>
          <option value="gain">gain</option>
        </select>
      </section>`;
    mountGateDemo(document.getElementById("gate-demo")!);

    // the slider says what it is set to, in cells rather than in slider units
    expect(document.getElementById("gate-size-value")?.textContent).toBe("30 pairs");

    expect(document.querySelectorAll(".gate-line")).toHaveLength(3);
    expect(document.querySelectorAll(".gate-dot")).toHaveLength(3);
    expect(document.querySelectorAll(".gate-row")).toHaveLength(3);
    // the declared bar is drawn, so every curve is read against something
    expect(document.querySelectorAll(".gate-bar")).toHaveLength(1);
    // the pilot's gate is over the bar and labelled as such
    expect(document.querySelector(".gate-row.is-overlap .gate-flag")?.className)
      .toContain("is-fail");
    expect(document.getElementById("gate-verdict")?.dataset.outcome).toBe("collapses");

    const cursorAt = () => document.querySelector(".gate-cursor")?.getAttribute("x1");
    const before = cursorAt();
    const size = document.getElementById("gate-size") as HTMLInputElement;
    size.value = "8";
    size.dispatchEvent(new Event("input"));
    expect(cursorAt()).not.toBe(before);
    expect(document.getElementById("gate-size-value")?.textContent).toBe("200 pairs");

    // switching what is true changes what a rollback means
    const effect = document.getElementById("gate-effect") as HTMLSelectElement;
    effect.value = "gain";
    effect.dispatchEvent(new Event("change"));
    expect(document.getElementById("gate-gloss")?.textContent).toMatch(/broken in both directions/i);
  });

  /**
   * The descope promise, checked as arithmetic. A proposal saying "we will drop
   * things in a stated order rather than raise the ask" is worth only as much
   * as the ladder actually covering the shortfall, so these assert the three
   * regimes the figure exists to separate.
   */
  it("stays powered at the pilot variance and drops nothing", () => {
    const plan = descopePlan(400, PILOT_SD);
    expect(plan.need).toBe(69);
    expect(pairedCells(REFERENCE_DESIGN)).toBeGreaterThanOrEqual(plan.need);
    expect(plan.extraHours).toBe(0);
    expect(plan.dropped).toHaveLength(0);
    expect(plan.fits).toBe(true);
  });

  it("spends the whole contingency on a ten per cent miss", () => {
    // 1180 -> 1300 is a small miss; the requirement moves with the square
    const plan = descopePlan(400, 1300);
    expect(plan.need).toBeGreaterThan(descopePlan(400, PILOT_SD).need);
    expect(plan.fits).toBe(true);
    expect(plan.dropped[0]!.name).toMatch(/contingency/i);
    // and it really is only covered because the reserve exists
    expect(plan.extraHours).toBeGreaterThan(DESCOPE_ORDER[0]!.hours * 0.4);
  });

  it("declares a redesign rather than quietly running underpowered", () => {
    const plan = descopePlan(400, 1800);
    expect(plan.fits).toBe(false);
    expect(plan.shortfall).toBeGreaterThan(0);
    // everything droppable is already gone before it gives up
    expect(plan.dropped).toHaveLength(DESCOPE_ORDER.length);
    expect(plan.extraHours).toBeGreaterThan(descopeBudget());
  });

  it("keeps the ladder monotone: a worse variance never drops fewer things", () => {
    let previous = -1;
    for (const sd of [1180, 1250, 1300, 1400, 1500, 1600, 1700, 1800]) {
      const count = descopePlan(400, sd).dropped.length;
      expect(count).toBeGreaterThanOrEqual(previous);
      previous = count;
    }
  });

  it("renders the descope ladder and moves with the variance dial", () => {
    document.body.innerHTML = `
      <section id="power-demo">
        <input id="power-sd" type="range" min="1000" max="2400" value="1180">
        <output id="power-sd-value"></output>
        <input id="power-margin" type="range" min="200" max="800" value="400">
        <output id="power-margin-value"></output>
        <svg id="power-plot"></svg>
        <strong id="power-verdict"></strong><span id="power-detail"></span>
        <ol id="power-ladder"></ol>
      </section>`;
    mountPowerDemo(document.getElementById("power-demo")!);

    // at the pilot variance: everything kept, and the campaign reads as powered
    expect(document.getElementById("power-sd-value")?.textContent).toBe("1,180");
    expect(document.querySelectorAll(".descope.is-dropped")).toHaveLength(0);
    expect(document.querySelectorAll(".descope.is-kept")).toHaveLength(DESCOPE_ORDER.length);
    expect(document.getElementById("power-verdict")?.dataset.outcome).toBe("survives");

    // a modest miss starts spending the ladder, and the ask does not move
    const sdDial = document.getElementById("power-sd") as HTMLInputElement;
    sdDial.value = "1400";
    sdDial.dispatchEvent(new Event("input"));
    expect(document.querySelectorAll(".descope.is-dropped").length).toBeGreaterThan(0);
    expect(document.getElementById("power-detail")?.textContent).toMatch(/ask does not move/i);

    // and past the envelope it says so instead of shrinking the claim
    sdDial.value = "2000";
    sdDial.dispatchEvent(new Event("input"));
    expect(document.getElementById("power-verdict")?.dataset.outcome).toBe("collapses");
    expect(document.getElementById("power-detail")?.textContent).toMatch(/redesign, not a squeeze/i);
  });

  /**
   * The Commons Harvest pilot. These pin the awkward parts, because the awkward
   * parts are the ones that quietly vanish from a write-up.
   */
  /**
   * The transfer test. This is the most load-bearing negative result on the
   * site, so every part of it is pinned: the direction, the attribution, and
   * the fact that it disagrees with the Commons run.
   */
  it("records that the resource survived and the population did not", () => {
    expect(anySurvived()).toBe(false);
    expect(poolOutlivedEveryone()).toBe(true);
    for (const c of SHARED_PILOT) {
      expect(c.survivors).toBe(0);
      expect(c.finalPool).toBeGreaterThan(c.pool[0]!);   // pool ended richer
      expect(c.parseFailures).toBe(0);                   // not a serving artifact
    }
  });

  it("attributes the failure to over-cooperation, not greed", () => {
    // the closed form says alternate at 0.5; every arm restored far above it
    expect(overRestored()).toBe(true);
    for (const c of SHARED_PILOT) {
      expect(c.requiredRestoreRate).toBe(0.5);
      expect(c.observedRestoreRate).toBeGreaterThanOrEqual(0.98);
    }
    // and the base model already had the bias, so it is not purely the adapter
    const base = SHARED_PILOT.find((c) => c.seeded === 0)!;
    const full = SHARED_PILOT.find((c) => c.seeded === 8)!;
    expect(base.observedRestoreRate).toBeGreaterThan(0.9);
    expect(full.observedRestoreRate).toBeGreaterThan(base.observedRestoreRate);
  });

  /**
   * The replay narrates eight turns in prose. Every factual claim in that prose
   * is checked here against the trace, so a rerun makes a test fail rather than
   * leaving the page confidently describing a run that no longer exists.
   */
  it("pins every narrated beat to the two uploaded traces", () => {
    const base = sharedSelfPlayJson.base8;
    const direct = sharedSelfPlayJson.cfa8;
    const transfer = sharedTransferJson.cfa8;
    const acts = (c: typeof base, turn: number) => c.trace[turn - 1]!.actions;
    const alive = (c: typeof base, turn: number) =>
      c.trace[turn - 1]!.alive.filter(Boolean).length;

    // t1-t2: all three flocks restore unanimously.
    for (const turn of [1, 2]) {
      for (const c of [base, direct, transfer]) {
        expect(acts(c, turn).every((a) => a === "restore")).toBe(true);
      }
    }
    // t3: the direct-run control breaks rank; both trained policies stay rigid.
    expect(divergenceTurn()).toBe(3);
    expect(acts(base, 3).filter((a) => a === "take")).toHaveLength(1);
    expect(acts(direct, 3).every((a) => a === "restore")).toBe(true);
    expect(acts(transfer, 3).every((a) => a === "restore")).toBe(true);
    // t5: every trained balance reaches zero; the control outlier still has four.
    expect(direct.trace[4]!.balances.every((b) => b === 0)).toBe(true);
    expect(transfer.trace[4]!.balances.every((b) => b === 0)).toBe(true);
    expect(Math.max(...base.trace[4]!.balances)).toBe(4);
    // t6: both trained populations fall together; one control bot remains.
    expect(alive(direct, 6)).toBe(0);
    expect(alive(transfer, 6)).toBe(0);
    expect(alive(base, 6)).toBe(1);
    // t8: all three have failed, but with different failure signatures.
    expect(base.extinction_turn).toBe(8);
    expect(direct.extinction_turn).toBe(6);
    expect(transfer.extinction_turn).toBe(6);
  });

  /**
   * The archive replay once imported a superseded run, so archive/experiments
   * showed 10/12/12 rounds while the evidence page showed 33/90/170 for what a
   * reader would take to be the same experiment. One file per experiment.
   */
  it("serves the archive replay from the same file as the live site", () => {
    const lab = readFileSync(resolve(ROOT, "src/ui/liveReplayLab.ts"), "utf8");
    expect(lab).toContain("./data/commons_pilot.json");
    expect(lab).not.toMatch(/^import .*pdd_results/m);   // the comment may name it; the import may not
    expect(existsSync(resolve(ROOT, "src/ui/data/pdd_results.json"))).toBe(false);
    // and no byte-identical copies of a trace lying around to be edited singly
    expect(existsSync(resolve(ROOT, "src/ui/data/commons_pilot_full.json"))).toBe(false);
    expect(existsSync(resolve(ROOT, "shared_continuous_results.json"))).toBe(false);
  });

  it("keeps the cross-game sign flip visible", () => {
    const flip = crossGameSignFlip();
    expect(flip.commonsDelta).toBe(137);   // trained here: +137 rounds
    expect(flip.sharedDelta).toBe(-2);     // transferred: -2 turns
    expect(flip.flips).toBe(true);
    expect(read("evidence")).toMatch(/Opposite signs across source and target/i);
  });

  it("replays direct and transfer JSON as actions, balances, and rationales", () => {
    document.body.innerHTML = `
      <section id="shared-pilot">
        <button id="sp-play"></button>
        <input id="sp-round" type="range" min="1" max="8" value="8">
        <output id="sp-round-value"></output><p id="sp-beat"></p>
        <div class="shared-lane is-base"><i id="sp-base-pool"></i><b id="sp-base-pool-value"></b><div id="sp-base-flock"></div><p id="sp-base-note"></p></div>
        <div class="shared-lane is-trained is-direct"><i id="sp-direct-pool"></i><b id="sp-direct-pool-value"></b><div id="sp-direct-flock"></div><p id="sp-direct-note"></p></div>
        <div class="shared-lane is-trained is-transfer"><i id="sp-transfer-pool"></i><b id="sp-transfer-pool-value"></b><div id="sp-transfer-flock"></div><p id="sp-transfer-note"></p></div>
        <div id="sp-comparison"></div><pre id="sp-json-base"></pre><pre id="sp-json-direct"></pre><pre id="sp-json-transfer-base"></pre><pre id="sp-json-transfer"></pre>
      </section>`;
    mountSharedPilot(document.getElementById("shared-pilot")!);
    expect(document.querySelectorAll("#sp-base-flock .flock-seat")).toHaveLength(8);
    expect(document.querySelectorAll("#sp-direct-flock .flock-seat")).toHaveLength(8);
    expect(document.querySelectorAll("#sp-transfer-flock .flock-seat")).toHaveLength(8);
    expect(document.querySelectorAll("#sp-base-flock .is-dead")).toHaveLength(8);
    expect(document.querySelectorAll("#sp-direct-flock .is-dead")).toHaveLength(8);
    expect(document.querySelectorAll("#sp-transfer-flock .is-dead")).toHaveLength(8);
    expect(document.querySelectorAll("#sp-comparison tbody tr")).toHaveLength(3);
    expect(document.getElementById("sp-beat")?.textContent).toMatch(/synchronized self-sacrifice/i);
    expect(document.getElementById("sp-json-base")?.textContent).toMatch(/"pool_after": 174/);
    expect(document.getElementById("sp-json-direct")?.textContent).toMatch(/Run ended at turn 6/i);
    expect(document.getElementById("sp-json-transfer")?.textContent).toMatch(/Run ended at turn 6/i);
    expect(sharedTransferJson.cfa8.trace).toHaveLength(6);

    const round = document.getElementById("sp-round") as HTMLInputElement;
    round.value = "3";
    round.dispatchEvent(new Event("input"));
    expect(document.querySelectorAll("#sp-base-flock .action-take")).toHaveLength(1);
    expect(document.querySelectorAll("#sp-direct-flock .action-take")).toHaveLength(0);
    expect(document.querySelectorAll("#sp-transfer-flock .action-take")).toHaveLength(0);
    expect(document.querySelectorAll("#sp-direct-flock .action-restore")).toHaveLength(8);
    expect(document.querySelectorAll("#sp-transfer-flock .action-restore")).toHaveLength(8);
    expect(document.getElementById("sp-beat")?.textContent).toMatch(/Both trained flocks remain unanimous/i);

    round.value = "6";
    round.dispatchEvent(new Event("input"));
    expect(document.querySelectorAll("#sp-base-flock .is-dead")).toHaveLength(7);
    expect(document.querySelectorAll("#sp-direct-flock .is-dead")).toHaveLength(8);
    expect(document.querySelectorAll("#sp-transfer-flock .is-dead")).toHaveLength(8);
    expect(document.getElementById("sp-direct-note")?.textContent).toMatch(/synchronized collapse/i);
    expect(document.getElementById("sp-transfer-note")?.textContent).toMatch(/synchronized collapse/i);
    expect(document.getElementById("sp-beat")?.textContent).toMatch(/Both trained populations die together/i);
  });

  /**
   * The Commons Game's closed-form region. These reproduce the arithmetic the
   * project's own config headers carry, so the page, the theory module and the
   * YAML cannot drift apart.
   */
  it("solves the sustainable region the way the configs state it", () => {
    // peak of the logistic hump is rK/4, at stock K/2
    expect(msy(GEN0)).toBeCloseTo(60, 6);
    expect(msyStock(GEN0)).toBe(160);
    expect(regrowth(msyStock(GEN0), GEN0)).toBeCloseTo(msy(GEN0), 6);
    // and nothing beats it
    for (const s of [1, 40, 100, 200, 300, 319]) {
      expect(regrowth(s, GEN0)).toBeLessThanOrEqual(msy(GEN0) + 1e-9);
    }
    expect(aggregateUpkeep(GEN0)).toBe(16);
    expect(sustainableShare(GEN0)).toBeCloseTo(7.5, 6);
  });

  it("reproduces the ratios the shipped configs quote in their headers", () => {
    // configs/commons.yaml says "ceiling 25.0 vs upkeep 16.0 -> ratio 1.56"
    expect(msy(ABUNDANCE)).toBeCloseTo(25, 6);
    expect(feasibilityRatio(ABUNDANCE)).toBeCloseTo(1.5625, 4);
    // configs/commons_scarcity.yaml says "ceiling 6.2 vs upkeep 16.0 -> ratio 0.39"
    expect(msy(SCARCITY)).toBeCloseTo(6.25, 6);
    expect(feasibilityRatio(SCARCITY)).toBeCloseTo(0.3906, 4);
    // the gen 0 run sits comfortably above both
    expect(feasibilityRatio(GEN0)).toBeCloseTo(3.75, 4);
  });

  it("calls the degenerate regime degenerate", () => {
    // below ratio 1 no strategy survives, so composition cannot matter and a
    // campaign run there measures nothing. This shipped for months.
    expect(regime(SCARCITY)).toBe("degenerate");
    expect(equilibria(aggregateUpkeep(SCARCITY), SCARCITY).exists).toBe(false);
    // the other two are measurable, and in both, greed still starves
    for (const p of [GEN0, ABUNDANCE]) {
      expect(regime(p)).toBe("measurable");
      expect(equilibria(aggregateUpkeep(p), p).exists).toBe(true);
      expect(greedStarves(p)).toBe(true);
      expect(greedyCeiling(p)).toBeGreaterThan(msy(p));
    }
  });

  it("places the two equilibria either side of the peak", () => {
    const e = equilibria(aggregateUpkeep(GEN0), GEN0);
    expect(e.low).toBeLessThan(msyStock(GEN0));
    expect(e.high).toBeGreaterThan(msyStock(GEN0));
    // both are genuine fixed points of the harvest-then-regrow step
    for (const s of [e.low, e.high]) {
      expect(regrowth(s, GEN0)).toBeCloseTo(aggregateUpkeep(GEN0), 6);
    }
    // and they collapse together exactly at the peak
    const atPeak = equilibria(msy(GEN0), GEN0);
    expect(atPeak.low).toBeCloseTo(atPeak.high, 6);
  });

  it("renders the theory figure and answers to its presets", () => {
    document.body.innerHTML = `
      <section id="commons-theory">
        <div id="ct-presets"></div>
        <input id="ct-capacity" type="range" min="60" max="600" value="320">
        <output id="ct-capacity-value"></output>
        <input id="ct-regrowth" type="range" min="5" max="100" value="75">
        <output id="ct-regrowth-value"></output>
        <svg id="ct-plot"></svg>
        <strong id="ct-verdict"></strong><span id="ct-detail"></span>
        <div id="ct-stats"></div>
      </section>`;
    mountCommonsTheory(document.getElementById("commons-theory")!);

    expect(document.querySelectorAll(".ct-preset")).toHaveLength(3);
    expect(document.querySelectorAll(".ct-stat")).toHaveLength(4);
    expect(document.querySelectorAll(".ct-eq")).toHaveLength(2);   // both equilibria
    expect(document.getElementById("ct-verdict")?.dataset.outcome).toBe("survives");

    // the scarcity preset is the one that measured nothing
    const scarcity = document.querySelector<HTMLElement>('[data-preset="scarcity"]')!;
    scarcity.click();
    expect(document.getElementById("ct-verdict")?.dataset.outcome).toBe("collapses");
    expect(document.getElementById("ct-verdict")?.textContent).toMatch(/clears the hump/i);
    expect(document.getElementById("ct-detail")?.textContent).toMatch(/measures nothing/i);
    expect(document.querySelectorAll(".ct-eq")).toHaveLength(0);   // no level holds
  });

  it("reads the pilot from the runner's file rather than from transcription", () => {
    // three arms, doses 0/4/8, derived from the JSON and not hand-typed
    expect(COMMONS_PILOT.map((c) => c.seeded).sort((a, b) => a - b)).toEqual([0, 4, 8]);
    for (const c of COMMONS_PILOT) {
      expect(c.stock.at(-1)).toBeLessThanOrEqual(0);      // every arm collapsed
      expect(c.agentSurvivalRate).toBe(1);                 // the resource died, not the agents
      expect(c.parseFailures).toBe(0);
    }
  });

  it("reports the gen 0 dose-response, which is monotone", () => {
    const dose = byDose();
    expect(dose.map((c) => c.collapseRound)).toEqual([33, 90, 170]);
    expect(isMonotoneInDose()).toBe(true);
    const d = seededDelta();
    expect(d.rounds).toBe(137);                       // 33 -> 170
    expect(d.welfare).toBeGreaterThan(5_900);         // 1,854.78 -> 7,843.44
  });

  it("keeps the caveats that the ordering alone does not carry", () => {
    // no arm sustains the commons -- seeding buys time, not survival
    for (const c of COMMONS_PILOT) expect(c.stock.at(-1)).toBeLessThanOrEqual(0);
    // and restraint under scarcity moves the WRONG way, so the mechanism is not
    // yet the one the label implies. Pinned so it cannot quietly drop out.
    const base = COMMONS_PILOT.find((c) => c.seeded === 0)!;
    const full = COMMONS_PILOT.find((c) => c.seeded === 8)!;
    expect(full.restraintUnderScarcity).toBeLessThan(base.restraintUnderScarcity);
    expect(read("evidence")).toMatch(/no arm[\s\S]{0,20}sustains the commons/i);
  });

  it("derives collapse rounds from the stock series because the metric is broken", () => {
    // two of three arms report time_to_collapse: null while having collapsed
    expect(conditionsWithBrokenCollapseField()).toHaveLength(2);
    expect(KNOWN_DEFECT).toMatch(/time_to_collapse/);
  });

  it("names both games on the pages that could be confused between them", () => {
    const foundations = readFileSync(resolve(ROOT, "archive/program-foundations.html"), "utf8");
    const evidence = read("evidence");
    for (const html of [foundations, evidence]) {
      expect(html).toMatch(/Shared Resource/);
      expect(html).toMatch(/Commons Game/);
    }
    // the archived foundations frame one as the worked example and the other
    // as the platform; evidence says plainly which one produced its numbers
    // evidence says plainly which one produced the numbers on it
    expect(foundations).toMatch(/One game is the worked example/i);
    expect(foundations).toMatch(/Not a reparameterisation/i);
    expect(evidence).toMatch(/gen 0 training environment/i);
  });

  it("replays the checked-in one-seed pilot traces without promoting them to a powered result", () => {
    document.body.innerHTML = `
      <section id="pilot-replay">
        <button id="result-play"></button><output id="result-round"></output>
        <p id="result-state"></p><span id="result-scale"></span>
        <div id="result-populations"></div>
        <svg id="result-stock"></svg><div id="result-grid"></div>
      </section>`;
    // Derived from the data module, not pinned to a snapshot of it. The traces
    // are still being re-run, and a test that hardcodes "round 12" fails every
    // time a legitimate rerun lands -- which trains you to ignore it. What this
    // test is actually for is the rendering contract: one column per round, one
    // row per agent, for whatever the file currently holds. What may be
    // *claimed* from the file is governed by the receipt rule, not by this.
    const root = document.getElementById("pilot-replay")!;
    mountPilotReplay(root);
    const base = pilotJson.base8;
    expect(document.getElementById("result-round")?.textContent)
      .toBe(`round ${base.rounds} / ${base.rounds}`);
    expect(document.querySelectorAll(".result-cell")).toHaveLength(base.roles.length * base.rounds);
    // the other two arms are drawn behind the selected one, on a shared scale,
    // so a one-seed difference cannot look bigger than it is
    expect(document.querySelectorAll(".result-stock-ghost")).toHaveLength(2);
    expect(document.querySelectorAll(".result-population")).toHaveLength(3);
    expect(document.querySelectorAll(".result-stock-endpoint")).toHaveLength(3);
    expect(document.querySelector(".result-playhead")).not.toBeNull();
    expect(root.dataset.resultCondition).toBe("base8");
    expect(document.querySelector(".result-stock-line.population-base8")).not.toBeNull();
    expect(document.getElementById("result-scale")?.textContent).toMatch(/shared rounds 0.170/i);

    (document.querySelector('[data-result-population="cfa8"]') as HTMLButtonElement).click();
    const seeded = pilotJson.cfa8;
    expect(document.getElementById("result-round")?.textContent)
      .toBe(`round ${seeded.rounds} / ${seeded.rounds}`);
    expect(document.querySelectorAll(".result-cell")).toHaveLength(seeded.roles.length * seeded.rounds);
    expect(root.dataset.resultCondition).toBe("cfa8");
    expect(document.querySelector(".result-stock-line.population-cfa8")).not.toBeNull();
    expect(document.querySelector(".result-population.population-cfa8.is-selected")).not.toBeNull();

    const mixedButton = document.querySelector('[data-result-population="cfa4mix"]') as HTMLButtonElement;
    mixedButton.dispatchEvent(new MouseEvent("mouseenter"));
    expect(root.dataset.resultCondition).toBe("cfa4mix");
    expect(document.querySelector(".result-stock-line.population-cfa4mix")).not.toBeNull();
  });
});
