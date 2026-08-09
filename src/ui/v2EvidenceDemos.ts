// Same file the dose-response figure reads, so the two cannot disagree.
import pilotJson from "./data/commons_pilot.json";

const q = <T extends Element>(root: HTMLElement, selector: string): T | null =>
  root.querySelector<T>(selector);

interface PilotTraceFrame {
  round: number;
  harvests: number[];
  alive: boolean[];
}

interface PilotCondition {
  rounds: number;
  stock_by_round: number[];
  mean_harvest_by_round: number[];
  total_welfare: number;
  restraint_under_scarcity: number;
  total_parse_failures: number;
  trace: PilotTraceFrame[];
}

type ConditionKey = "base8" | "cfa8" | "cfa4mix";
const PILOT_DATA = pilotJson as Record<ConditionKey, PilotCondition>;
const CONDITION_ORDER: ConditionKey[] = ["base8", "cfa4mix", "cfa8"];
const CONDITION_LABELS: Record<ConditionKey, string> = {
  base8: "Baseline · 8 base",
  cfa4mix: "Mixed · 4 seeded + 4 base",
  cfa8: "Fully seeded · 8 seeded",
};
const RESULT_WIDTH = 800;
const RESULT_HEIGHT = 120;

const harvestClass = (value: number): string =>
  value <= 3 ? "harvest-low" : value < 7 ? "harvest-mid" : "harvest-high";

const collapseRound = (condition: PilotCondition): number => {
  const collapse = condition.stock_by_round.findIndex((value, index) => index > 0 && value <= 0);
  return collapse > 0 ? collapse : condition.stock_by_round.length - 1;
};

/** Replay a checked-in pilot trace. Replacing the JSON replaces the applet data. */
export function mountPilotReplay(root: HTMLElement): void {
  const play = q<HTMLButtonElement>(root, "#result-play");
  const roundValue = q<HTMLOutputElement>(root, "#result-round");
  const state = q<HTMLElement>(root, "#result-state");
  const scale = q<HTMLElement>(root, "#result-scale");
  const stockPlot = q<SVGElement>(root, "#result-stock");
  const grid = q<HTMLElement>(root, "#result-grid");
  const populations = q<HTMLElement>(root, "#result-populations");
  if (!play || !roundValue || !state || !scale || !stockPlot || !grid || !populations) return;

  let conditionKey: ConditionKey = "base8";
  let condition = PILOT_DATA.base8;
  let pointPairs: string[] = [];
  let currentRound = 0;
  let sharedLastRound = 1;
  let timer: number | null = null;

  const stop = () => {
    if (timer !== null) window.clearInterval(timer);
    timer = null;
  };

  const showRound = (round: number) => {
    const end = condition.trace.length;
    currentRound = Math.max(0, Math.min(round, end));
    root.style.setProperty("--result-progress", `${currentRound / Math.max(1, sharedLastRound) * 100}%`);
    const line = q<SVGPolylineElement>(root, ".result-stock-line");
    if (line) line.setAttribute("points", pointPairs.slice(0, currentRound + 1).join(" "));
    const playhead = q<SVGLineElement>(root, ".result-playhead");
    if (playhead) {
      const x = currentRound / Math.max(1, sharedLastRound) * RESULT_WIDTH;
      playhead.setAttribute("x1", x.toFixed(2));
      playhead.setAttribute("x2", x.toFixed(2));
    }
    roundValue.textContent = `round ${currentRound} / ${end}`;

    const stock = condition.stock_by_round[currentRound] ?? 0;
    if (currentRound === end) {
      const collapse = condition.stock_by_round.findIndex((value, index) => index > 0 && value <= 0);
      state.textContent = collapse > 0
        ? `Pool reaches zero at round ${collapse}. Total welfare ${condition.total_welfare.toFixed(1)} · ${condition.total_parse_failures} parse failures.`
        : `Pool finishes at ${stock.toFixed(1)}. Total welfare ${condition.total_welfare.toFixed(1)} · ${condition.total_parse_failures} parse failures.`;
      state.dataset.outcome = collapse > 0 ? "collapses" : "survives";
    } else if (currentRound === 0) {
      state.textContent = `Initial stock ${stock.toFixed(0)} · eight agents ready.`;
      state.dataset.outcome = "running";
    } else {
      const frame = condition.trace[currentRound - 1];
      const mean = condition.mean_harvest_by_round[currentRound - 1] ?? 0;
      state.textContent = `Round ${currentRound}: stock ${stock.toFixed(1)} · mean harvest ${mean.toFixed(1)} · ${frame?.alive.filter(Boolean).length ?? 0} agents alive.`;
      state.dataset.outcome = "running";
    }
  };

  const render = (nextKey: ConditionKey = conditionKey) => {
    stop();
    conditionKey = PILOT_DATA[nextKey] ? nextKey : "base8";
    condition = PILOT_DATA[conditionKey];
    const end = condition.trace.length;
    root.dataset.resultCondition = conditionKey;

    /*
     * One condition at a time hid the only thing worth looking at. These are
     * three arms of the same pilot, and a reviewer's question is how far apart
     * they are -- which, at one seed, is "not very". Drawing the other two as
     * ghosts answers that honestly instead of letting the selected line look
     * more decisive alone than it is. Shared vertical scale across all three,
     * or the comparison would be a lie.
     */
    const maxStock = Math.max(...CONDITION_ORDER.flatMap((k) => PILOT_DATA[k].stock_by_round), 1);
    const longest = Math.max(...CONDITION_ORDER.map((k) => PILOT_DATA[k].stock_by_round.length), 1);
    sharedLastRound = Math.max(1, longest - 1);
    const project = (series: number[]): string[] => series.map((stock, index) => {
      const x = index / Math.max(1, longest - 1) * RESULT_WIDTH;
      const y = RESULT_HEIGHT - stock / maxStock * (RESULT_HEIGHT - 4) - 2;
      return `${x.toFixed(2)},${y.toFixed(2)}`;
    });

    pointPairs = project(condition.stock_by_round);
    const ghosts = CONDITION_ORDER
      .filter((k) => k !== conditionKey)
      .map((k) => `<polyline class="result-stock-ghost population-${k}"
         points="${project(PILOT_DATA[k].stock_by_round).join(" ")}"></polyline>`)
      .join("");

    const endpoints = CONDITION_ORDER.map((k) => {
      const collapse = collapseRound(PILOT_DATA[k]);
      const x = collapse / sharedLastRound * RESULT_WIDTH;
      const anchor = x > RESULT_WIDTH - 55 ? "end" : "start";
      const dx = anchor === "end" ? -5 : 5;
      return `<g class="result-stock-endpoint population-${k}">
        <circle cx="${x.toFixed(2)}" cy="${RESULT_HEIGHT - 2}" r="2.8"></circle>
        <text x="${(x + dx).toFixed(2)}" y="${RESULT_HEIGHT - 9}" text-anchor="${anchor}">r${collapse}</text>
      </g>`;
    }).join("");

    stockPlot.innerHTML = `
      <title>Commons stock for baseline, mixed, and fully seeded populations</title>
      <desc>All three populations collapse. The selected trajectory replays against the two complete comparison trajectories on a shared round axis.</desc>
      <line class="result-zero-line" x1="0" y1="${RESULT_HEIGHT - 2}" x2="${RESULT_WIDTH}" y2="${RESULT_HEIGHT - 2}"></line>
      ${ghosts}
      <polyline class="result-stock-line population-${conditionKey}" points="${pointPairs.join(" ")}"></polyline>
      ${endpoints}
      <line class="result-playhead" x1="0" y1="0" x2="0" y2="${RESULT_HEIGHT}"></line>`;
    scale.textContent = `0–${Math.ceil(maxStock)} tokens · shared rounds 0–${sharedLastRound}`;

    populations.innerHTML = CONDITION_ORDER.map((populationKey) => {
      const selected = populationKey === conditionKey;
      return `<button type="button" class="result-population population-${populationKey}${selected ? " is-selected" : ""}"
        data-result-population="${populationKey}" aria-pressed="${selected}">
        <i aria-hidden="true"></i><b>${CONDITION_LABELS[populationKey]}</b><small>collapse r${collapseRound(PILOT_DATA[populationKey])}</small>
      </button>`;
    }).join("");

    populations.querySelectorAll<HTMLButtonElement>("[data-result-population]").forEach((button) => {
      const selectPopulation = () => {
        const requested = button.dataset.resultPopulation as ConditionKey;
        if (requested !== conditionKey && PILOT_DATA[requested]) render(requested);
      };
      button.addEventListener("click", selectPopulation);
      button.addEventListener("mouseenter", selectPopulation);
    });

    const rows: string[] = [];
    for (let seat = 0; seat < 8; seat++) {
      const cells = condition.trace.map((frame) => {
        const harvest = frame.harvests[seat] ?? 0;
        return `<i class="result-cell ${harvestClass(harvest)}" aria-hidden="true"></i>`;
      }).join("");
      rows.push(`<div class="result-row"><span>A${seat + 1}</span><span class="result-cells" style="grid-template-columns:repeat(${longest}, minmax(0, 1fr))">${cells}</span></div>`);
    }
    grid.innerHTML = rows.join("");
    grid.setAttribute(
      "aria-label",
      `Eight agent harvest traces over ${end} rounds for ${CONDITION_LABELS[conditionKey]}.`,
    );
    play.textContent = "Replay trace";
    showRound(end);
  };

  play.addEventListener("click", () => {
    if (timer !== null) {
      stop();
      play.textContent = "Resume";
      return;
    }
    const end = condition.trace.length;
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) {
      showRound(end);
      return;
    }
    if (currentRound >= end) showRound(0);
    play.textContent = "Pause";
    const intervalMs = Math.max(35, Math.min(160, Math.round(7000 / Math.max(1, end))));
    timer = window.setInterval(() => {
      const next = Math.min(currentRound + 1, end);
      showRound(next);
      if (next >= end) {
        stop();
        play.textContent = "Replay trace";
      }
    }, intervalMs);
  });

  render();
}
