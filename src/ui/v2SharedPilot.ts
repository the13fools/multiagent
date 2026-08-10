import selfPlayRaw from "../../shared_continuous_results_self_play.json";
import transferRaw from "../../shared_continuous_results_transfer.json";

type SourceConditionKey = "base8" | "cfa4mix" | "cfa8";
type ReplayKey = "base" | "direct" | "transfer";

interface SharedTraceFrame {
  round: number;
  pool_before: number;
  pool_after: number;
  actions: Array<"restore" | "take" | null>;
  balances: number[];
  alive: boolean[];
  replies?: { action?: Array<string | null> };
}

interface SharedTraceCondition {
  trace: SharedTraceFrame[];
  extinction_turn: number;
  final_pool: number;
  observed_restore_rate: number;
  required_restore_rate: number;
  survivors: number;
}

const SELF_PLAY = selfPlayRaw as Record<SourceConditionKey, SharedTraceCondition>;
const TRANSFER = transferRaw as Record<SourceConditionKey, SharedTraceCondition>;

// One compact replay: the direct-training control plus both trained policies.
// The transfer upload contains its own control trace; its aggregate result is
// reported in the table and its turn-level JSON remains available below.
const DATA: Record<ReplayKey, SharedTraceCondition> = {
  base: SELF_PLAY.base8,
  direct: SELF_PLAY.cfa8,
  transfer: TRANSFER.cfa8,
};
const ORDER: ReplayKey[] = ["base", "direct", "transfer"];
const LABELS: Record<ReplayKey, string> = {
  base: "Untrained control",
  direct: "Shared-trained",
  transfer: "Commons Game–trained",
};
const LAST_TURN = Math.max(...ORDER.map((key) => DATA[key].trace.length));

/** First turn on which the direct-run control and trained flock diverge. */
const DIVERGENCE_TURN = (() => {
  for (let turn = 1; turn <= LAST_TURN; turn++) {
    const control = DATA.base.trace[turn - 1]?.actions.join("|");
    const trained = DATA.direct.trace[turn - 1]?.actions.join("|");
    if (control !== undefined && trained !== undefined && control !== trained) return turn;
  }
  return -1;
})();

export const divergenceTurn = (): number => DIVERGENCE_TURN;
const MAX_POOL = Math.max(...ORDER.map((key) => DATA[key].final_pool), 1);

const q = <T extends Element>(root: HTMLElement, selector: string): T | null =>
  root.querySelector<T>(selector);

const BEATS: Record<number, string> = {
  1: "All three flocks restore. The cooperative-looking action spends private balances.",
  2: "The pools grow while every agent pays. A full pool is not the survival objective.",
  3: "One untrained bot takes and buys time. Both trained flocks remain unanimous.",
  4: "Direct training and cross-game transfer produce the same rigid action: restore.",
  5: "Every trained balance reaches zero in lockstep; the untrained outlier still has four.",
  6: "Both trained populations die together. One untrained bot remains alive.",
  7: "The trained runs are over. The last untrained bot restores again.",
  8: "All fail—but training changed noisy drift into synchronized self-sacrifice.",
};

const frameAt = (condition: SharedTraceCondition, turn: number): SharedTraceFrame => {
  const frame = condition.trace[turn - 1];
  if (frame) return frame;
  const last = condition.trace.at(-1)!;
  return {
    ...last,
    round: turn,
    pool_before: last.pool_after,
    pool_after: last.pool_after,
    actions: last.actions.map(() => null),
    replies: { action: last.actions.map(() => null) },
  };
};

const sourceAt = (condition: SharedTraceCondition, turn: number): string => {
  const frame = condition.trace[turn - 1];
  return frame
    ? JSON.stringify(frame, null, 2)
    : `Run ended at turn ${condition.trace.length}.\nNo uploaded frame exists for synchronized turn ${turn}.`;
};

const ensureFlock = (flock: HTMLElement, seats: number) => {
  if (flock.children.length === seats) return;
  flock.innerHTML = Array.from({ length: seats }, (_, seat) =>
    `<div class="flock-seat"><i aria-hidden="true"></i><span>A${seat + 1}</span><em></em><b></b></div>`,
  ).join("");
};

/** Synchronized replay of one untrained control and the two training routes. */
export function mountSharedPilot(root: HTMLElement): void {
  const round = q<HTMLInputElement>(root, "#sp-round");
  const roundValue = q<HTMLOutputElement>(root, "#sp-round-value");
  const play = q<HTMLButtonElement>(root, "#sp-play");
  const beat = q<HTMLElement>(root, "#sp-beat");
  const comparison = q<HTMLElement>(root, "#sp-comparison");

  const laneElements = Object.fromEntries(ORDER.map((key) => [key, {
    pool: q<HTMLElement>(root, `#sp-${key}-pool`),
    poolValue: q<HTMLElement>(root, `#sp-${key}-pool-value`),
    flock: q<HTMLElement>(root, `#sp-${key}-flock`),
    note: q<HTMLElement>(root, `#sp-${key}-note`),
    json: q<HTMLElement>(root, `#sp-json-${key}`),
  }])) as Record<ReplayKey, {
    pool: HTMLElement | null;
    poolValue: HTMLElement | null;
    flock: HTMLElement | null;
    note: HTMLElement | null;
    json: HTMLElement | null;
  }>;
  const transferBaseJson = q<HTMLElement>(root, "#sp-json-transfer-base");

  const allElements = ORDER.flatMap((key) => Object.values(laneElements[key]));
  if (!round || !roundValue || !play || !beat || !comparison || !transferBaseJson || allElements.some((element) => !element)) return;

  let timer: number | null = null;

  const stop = () => {
    if (timer !== null) window.clearTimeout(timer);
    timer = null;
    play.textContent = "Replay three flocks";
  };

  const renderLane = (key: ReplayKey, condition: SharedTraceCondition, turn: number) => {
    const elements = laneElements[key] as Record<"pool" | "poolValue" | "flock" | "note" | "json", HTMLElement>;
    const frame = frameAt(condition, turn);
    const alive = frame.alive.filter(Boolean).length;
    const restores = frame.actions.filter((action) => action === "restore").length;
    const takes = frame.actions.filter((action) => action === "take").length;
    const lane = elements.note.closest<HTMLElement>(".shared-lane");
    elements.pool.style.width = `${frame.pool_after / MAX_POOL * 100}%`;
    elements.poolValue.textContent = `${frame.pool_before} → ${frame.pool_after}`;
    ensureFlock(elements.flock, frame.alive.length);
    Array.from(elements.flock.children).forEach((child, seat) => {
      const agent = child as HTMLElement;
      const action = frame.actions[seat];
      const balance = frame.balances[seat];
      const isAlive = frame.alive[seat] ?? false;
      agent.className = `flock-seat ${isAlive ? "is-alive" : "is-dead"} action-${action ?? "inactive"}${typeof balance === "number" && balance < 0 ? " is-negative" : ""}`;
      const actionNode = agent.querySelector<HTMLElement>("em");
      const balanceNode = agent.querySelector<HTMLElement>("b");
      if (actionNode) actionNode.textContent = action === "restore" ? "↑ restore" : action === "take" ? "↓ take" : "inactive";
      if (balanceNode) balanceNode.textContent = balance === undefined ? "—" : String(balance);
    });
    if (lane) {
      lane.dataset.turn = String(turn);
      lane.dataset.event = turn === condition.extinction_turn
        ? "collapse"
        : turn === DIVERGENCE_TURN ? "divergence" : "running";
    }
    elements.note.dataset.outcome = alive === 0 ? "collapses" : "running";
    const seats = frame.alive.length;
    const breakers = frame.actions
      .map((action, seat) => (action === "take" ? `A${seat + 1}` : null))
      .filter((label): label is string => label !== null);

    if (turn === DIVERGENCE_TURN && breakers.length > 0) {
      elements.note.textContent = `${breakers.join(", ")} BREAKS RANK: TAKE · ${alive}/${seats} alive`;
    } else if (turn === DIVERGENCE_TURN) {
      elements.note.textContent = `ALL ${restores} RESTORE IN LOCKSTEP · ${alive}/${seats} alive`;
    } else if (turn === condition.extinction_turn) {
      elements.note.textContent = alive === 0
        ? `SYNCHRONIZED COLLAPSE · 0/${seats} alive`
        : `${alive} STILL STANDING · ${alive}/${seats} alive`;
    } else {
      elements.note.textContent = `${alive}/${seats} alive · ${restores} restore · ${takes} take`;
    }
    elements.json.textContent = sourceAt(condition, turn);
  };

  const render = () => {
    const turn = Math.max(1, Math.min(Number(round.value), LAST_TURN));
    roundValue.textContent = `turn ${turn} / ${LAST_TURN}`;
    beat.textContent = BEATS[turn] ?? "";
    beat.dataset.turn = String(turn);
    ORDER.forEach((key) => renderLane(key, DATA[key], turn));
    transferBaseJson.textContent = sourceAt(TRANSFER.base8, turn);
  };

  const scheduleNext = () => {
    const next = Number(round.value) + 1;
    if (next > LAST_TURN) {
      stop();
      return;
    }
    const current = Number(round.value);
    const delay = current === DIVERGENCE_TURN || current === 6 ? 1800 : 900;
    timer = window.setTimeout(() => {
      round.value = String(next);
      render();
      scheduleNext();
    }, delay);
  };

  round.addEventListener("input", () => {
    stop();
    render();
  });
  play.addEventListener("click", () => {
    if (timer !== null) {
      stop();
      return;
    }
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) {
      round.value = String(LAST_TURN);
      render();
      return;
    }
    round.value = "1";
    render();
    play.textContent = "Pause";
    scheduleNext();
  });

  const control = SELF_PLAY.base8;
  const transferControl = TRANSFER.base8;
  comparison.innerHTML = `<table class="cp-table">
    <thead><tr><th>population</th><th>failure signature</th><th>extinct</th><th>restore rate</th><th>required</th></tr></thead>
    <tbody>
      <tr><td><b>Untrained controls · 2 runs</b></td><td>one take, on turn 3 / 4</td><td>turn ${control.extinction_turn} / ${transferControl.extinction_turn}</td><td>${control.observed_restore_rate.toFixed(2)} / ${transferControl.observed_restore_rate.toFixed(2)}</td><td>${control.required_restore_rate.toFixed(2)}</td></tr>
      ${(["direct", "transfer"] as ReplayKey[]).map((key) => {
        const condition = DATA[key];
        return `<tr><td><b>${LABELS[key]}</b></td><td>unanimous restoration</td><td>turn ${condition.extinction_turn}</td><td>${condition.observed_restore_rate.toFixed(2)}</td><td>${condition.required_restore_rate.toFixed(2)}</td></tr>`;
      }).join("")}
    </tbody></table>`;

  render();
}
