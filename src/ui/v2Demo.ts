import {
  HORIZON,
  POLICIES,
  pacemakersNeeded,
  simulate,
  type Action,
  type Outcome,
} from "../core/sharedResource";

const N = 8;
const PLOT_WIDTH = 800;
const PLOT_HEIGHT = 100;

/**
 * There are only (N + 1) x |POLICIES| distinct runs, so compute each once.
 *
 * Two reasons, and the second is the interesting one. Dragging the slider used
 * to re-simulate 200 turns and rebuild 1,600 DOM nodes on every input event.
 * And the sweep below needs all nine fractions at once -- without a cache that
 * is nine full simulations per repaint.
 */
const runs = new Map<string, Outcome>();

const run = (ruleKey: string, controlled: number): Outcome => {
  const key = `${ruleKey}:${controlled}`;
  const hit = runs.get(key);
  if (hit) return hit;
  const policy = POLICIES[ruleKey] ?? POLICIES.copy!;
  const fresh = simulate(policy.fn, { n: N, turns: HORIZON, pinned: controlled });
  runs.set(key, fresh);
  return fresh;
};

const q = <T extends Element>(root: HTMLElement, selector: string): T | null =>
  root.querySelector<T>(selector);

const cellClass = (action: Action | null, alive: boolean): string => {
  if (!alive || action === null) return "dead";
  if (action === "restore") return "restore";
  if (action === "take") return "take";
  return "inert";
};

/**
 * A compact version of the original shared-resource lab.
 *
 * It deliberately uses the same simulator and 200-turn horizon as the tests
 * and proposal copy. The interaction is therefore an executable answer key,
 * not a decorative animation or a separate approximation of the model.
 */
export function mountPopulationDemo(root: HTMLElement): void {
  const seats = q<HTMLInputElement>(root, "#controlled-seats");
  const seatsValue = q<HTMLOutputElement>(root, "#controlled-value");
  const rule = q<HTMLSelectElement>(root, "#uncontrolled-rule");
  const verdict = q<HTMLElement>(root, "#demo-verdict");
  const threshold = q<HTMLElement>(root, "#demo-threshold");
  const poolPlot = q<SVGElement>(root, "#demo-pool");
  const poolScale = q<HTMLElement>(root, "#demo-pool-scale");
  const grid = q<HTMLElement>(root, "#demo-grid");
  const play = q<HTMLButtonElement>(root, "#demo-play");
  const turnValue = q<HTMLOutputElement>(root, "#demo-turn");
  const sweep = q<HTMLElement>(root, "#demo-sweep");

  if (!seats || !seatsValue || !rule || !verdict || !threshold ||
      !poolPlot || !poolScale || !grid || !play || !turnValue) return;

  let timer: number | null = null;
  let currentTurn = 0;
  let endTurn = HORIZON;
  let finalVerdict = "";
  let finalOutcome: "survives" | "collapses" = "survives";
  let pointPairs: string[] = [];

  const stop = () => {
    if (timer !== null) window.clearInterval(timer);
    timer = null;
  };

  const setFinalCopy = () => {
    verdict.textContent = finalVerdict;
    verdict.dataset.outcome = finalOutcome;
  };

  const showTurn = (turn: number, pool: number, alive: number) => {
    currentTurn = Math.max(0, Math.min(turn, endTurn));
    root.style.setProperty("--demo-progress", `${currentTurn / HORIZON * 100}%`);
    const line = q<SVGPolylineElement>(root, ".pool-line");
    if (line) line.setAttribute("points", pointPairs.slice(0, currentTurn).join(" "));
    turnValue.textContent = endTurn < HORIZON && currentTurn === endTurn
      ? `turn ${currentTurn} / ${HORIZON} · run ended`
      : `turn ${currentTurn} / ${HORIZON}`;

    if (currentTurn === endTurn) {
      setFinalCopy();
    } else {
      verdict.textContent = `Turn ${currentTurn}: pool ${pool.toFixed(0)} · ${alive} alive.`;
      verdict.dataset.outcome = "running";
    }
  };

  /**
   * The whole dose-response, not the one point the slider is sitting on.
   *
   * The section is headed "find the cliff", and until now finding it meant
   * dragging the slider nine times and remembering. This runs every fraction
   * against the same rule and the same horizon and lays the outcomes out as an
   * axis under the slider, so f* is a thing you see rather than a number in a
   * caption. Same simulator as the proposal, so the picture cannot drift from
   * the claim.
   */
  const renderSweep = (controlled: number, minimum: number | null) => {
    if (!sweep) return;
    const steps: string[] = [];
    for (let k = 0; k <= N; k++) {
      const survives = run(rule.value, k).extinctionTurn === null;
      const classes = ["sweep-step", survives ? "is-survive" : "is-collapse"];
      if (k === controlled) classes.push("is-current");
      if (minimum !== null && k === minimum) classes.push("is-threshold");
      const label = `${k} of ${N} controlled — ${survives ? "survives" : "collapses"}` +
        (minimum !== null && k === minimum ? ", the smallest fraction that does" : "");
      steps.push(
        `<button type="button" class="${classes.join(" ")}" data-seats="${k}"
           aria-label="${label}" aria-pressed="${k === controlled}"><span>${k}</span></button>`,
      );
    }
    sweep.innerHTML = steps.join("");
    sweep.setAttribute("aria-label", minimum === null
      ? `No controlled fraction sustains this rule across 0 to ${N} seats.`
      : `Outcome at every controlled fraction. The step from collapse to survival is at ${minimum} of ${N}.`);
  };

  const render = () => {
    const controlled = Number(seats.value);
    const selected = POLICIES[rule.value] ?? POLICIES.copy!;
    const outcome = run(rule.value, controlled);
    const minimum = pacemakersNeeded(selected.fn, { n: N, turns: HORIZON });
    const survives = outcome.extinctionTurn === null;

    seatsValue.textContent = `${controlled} / ${N}`;
    finalVerdict = survives
      ? `No full extinction by turn ${HORIZON}.`
      : `Full extinction at turn ${outcome.extinctionTurn}.`;
    finalOutcome = survives ? "survives" : "collapses";
    // Two of the four selectable rules need nobody, and one needs everybody.
    // Saying "threshold: 0 of 8" for the first case reads as a missing number
    // rather than as the finding it is.
    threshold.textContent =
      minimum === null ? "No controlled fraction sustains this rule."
      : minimum === 0 ? "This majority sustains the pool unaided. Nothing to steer."
      : minimum === N ? `Only a fully controlled population survives: ${N} of ${N}.`
      : `Computed threshold for this rule: ${minimum} of ${N} controlled.`;
    renderSweep(controlled, minimum);

    const pools = outcome.frames.map((frame) => frame.pool);
    const maxPool = Math.max(30, ...pools);
    pointPairs = pools.map((pool, index) => {
      const x = pools.length <= 1 ? 0 : index / (HORIZON - 1) * PLOT_WIDTH;
      const y = PLOT_HEIGHT - (pool / maxPool) * (PLOT_HEIGHT - 4) - 2;
      return `${x.toFixed(2)},${y.toFixed(2)}`;
    });
    const referenceY = PLOT_HEIGHT - (30 / maxPool) * (PLOT_HEIGHT - 4) - 2;

    poolPlot.innerHTML = `
      <line class="pool-reference" x1="0" y1="${referenceY.toFixed(2)}" x2="${PLOT_WIDTH}" y2="${referenceY.toFixed(2)}"></line>
      <polyline class="pool-line" points="${pointPairs.join(" ")}"></polyline>`;
    poolScale.textContent = `0–${Math.ceil(maxPool)} tokens`;
    poolPlot.setAttribute(
      "aria-label",
      `Shared pool over ${outcome.frames.length} turns; final level ${pools.at(-1)?.toFixed(0) ?? 30} tokens.`,
    );

    const rows: string[] = [];
    for (let seat = 0; seat < N; seat++) {
      const cells: string[] = [];
      for (let turn = 0; turn < HORIZON; turn++) {
        const frame = outcome.frames[turn];
        const action = frame?.actions[seat] ?? null;
        const alive = frame?.alive[seat] ?? false;
        cells.push(`<i class="demo-cell ${cellClass(action, alive)}"></i>`);
      }
      const kind = seat < controlled ? "C" : "U";
      rows.push(`
        <div class="demo-row${seat < controlled ? " is-controlled" : ""}">
          <span class="demo-row-label">${kind}${seat + 1}</span>
          <span class="demo-cells">${cells.join("")}</span>
        </div>`);
    }
    grid.innerHTML = rows.join("");
    grid.setAttribute(
      "aria-label",
      `${controlled} controlled and ${N - controlled} uncontrolled agents. ${finalVerdict} ${threshold.textContent}`,
    );

    endTurn = outcome.frames.length;
    play.textContent = "Replay dynamics";
    stop();
    currentTurn = endTurn;
    const last = outcome.frames.at(-1);
    showTurn(endTurn, last?.pool ?? 30, last?.alive.filter(Boolean).length ?? N);
  };

  play.addEventListener("click", () => {
    if (timer !== null) {
      stop();
      play.textContent = "Resume";
      return;
    }

    const outcome = run(rule.value, Number(seats.value));

    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) {
      const last = outcome.frames.at(-1);
      showTurn(endTurn, last?.pool ?? 30, last?.alive.filter(Boolean).length ?? N);
      return;
    }

    if (currentTurn >= endTurn) {
      currentTurn = 0;
      showTurn(0, 30, N);
    }
    play.textContent = "Pause";
    timer = window.setInterval(() => {
      const next = Math.min(currentTurn + 1, endTurn);
      const frame = outcome.frames[next - 1];
      showTurn(next, frame?.pool ?? 30, frame?.alive.filter(Boolean).length ?? N);
      if (next >= endTurn) {
        stop();
        play.textContent = "Replay dynamics";
      }
    }, 35);
  });

  // The sweep is an input, not a legend: click a fraction to go there.
  sweep?.addEventListener("click", (event) => {
    const step = (event.target as HTMLElement).closest<HTMLElement>("[data-seats]");
    if (!step) return;
    seats.value = step.dataset.seats!;
    render();
  });

  seats.addEventListener("input", render);
  rule.addEventListener("change", render);
  render();
}
