import "./style.css";
import { pathList } from "./arc";
import { el, HEX, ringRow, type RingAgent } from "./lab";
import { HORIZON, POLICIES, REFERENCE, referencePolicy, simulate } from "../core/sharedResource";

/**
 * Static illustrations for the front page.
 *
 * Three compositions of the same eight agents, each run to its conclusion and
 * then drawn as it ended. No animation, no controls -- these are figures, and a
 * figure that moves cannot be glanced at.
 *
 * The point of the ring, as opposed to the grid: the grid shows what a
 * population DID, over time. The ring shows what it IS. Composition is the
 * steering question, and eight circles answer it faster than a sentence.
 */

const N = 8;
const P = REFERENCE;

const dot = (colour: string, over: Partial<RingAgent> = {}): RingAgent =>
  ({ colour, ...over });

/** Run a composition and report how it ended. */
function ending(fn: Parameters<typeof simulate>[0], pinned = 0) {
  const out = simulate(fn, { n: N, turns: HORIZON, params: P, pinned });
  const last = out.frames.at(-1);
  return {
    out,
    agents: Array.from({ length: N }, (_, i) =>
      dot(
        last?.actions[i] === "restore" ? HEX.good : HEX.bad,
        { pinned: i < pinned, dead: last ? !last.alive[i] : false },
      )),
  };
}

const allTake = ending(() => "take");
const alternating = ending(({ seat, turn }) => referencePolicy(seat, turn));
const oneDefector = ending(
  ({ seat, turn }) => (seat === 0 ? "take" : referencePolicy(seat, turn)));

el("intro-rings").innerHTML = ringRow([
  {
    title: "Everyone takes",
    agents: allTake.agents,
    caption: `all dead by turn ${allTake.out.extinctionTurn}`,
  },
  {
    title: "Everyone alternates",
    agents: alternating.agents,
    caption: "alive indefinitely",
  },
  {
    title: "One defector",
    agents: oneDefector.agents,
    caption: oneDefector.out.extinctionTurn
      ? `all dead by turn ${oneDefector.out.extinctionTurn}`
      : "survives",
  },
]);

el("intro-caption").innerHTML =
  `Eight agents, three compositions, each drawn as the run ended. ` +
  `<span style="color:${HEX.good};font-weight:650">Green</span> restored on the last turn, ` +
  `<span style="color:${HEX.bad};font-weight:650">red</span> took, ✕ is dead. ` +
  `The middle one is the whole finding: the solution was available to all three.`;

void POLICIES;

// The running order, from the one place it is written down.
const path = document.getElementById("path");
if (path) path.innerHTML = pathList();
