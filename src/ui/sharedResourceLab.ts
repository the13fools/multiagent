import "./style.css";
import {
  POLICIES,
  REFERENCE,
  carryingCapacity,
  pNeed,
  pSelf,
  pacemakersNeeded,
  simulate,
  slack,
  type Action,
  type Frame,
  type Params,
} from "../core/sharedResource";

const $ = <T extends HTMLElement>(id: string) =>
  document.getElementById(id) as T;

const N = 8;
const MAX_TURNS = 60;
const colour = (a: Action | null, dead: boolean) =>
  dead ? "var(--dead)" : a === "restore" ? "var(--restore)"
  : a === "take" ? "var(--take)" : "var(--line)";

let timer: number | undefined;

function params(): Params {
  return { ...REFERENCE, G: Number(($("G") as HTMLInputElement).value) };
}

function drawRing(f: Frame | null, pinned: number) {
  const out: string[] = [];
  for (let i = 0; i < N; i++) {
    const ang = (i / N) * 2 * Math.PI - Math.PI / 2;
    const x = 125 + 82 * Math.cos(ang);
    const y = 125 + 82 * Math.sin(ang);
    const dead = !!f && !f.alive[i];
    out.push(
      `<circle cx="${x}" cy="${y}" r="18" fill="${colour(f ? f.actions[i]! : null, dead)}" ${
        i < pinned ? 'stroke="var(--ink)" stroke-width="3.5"' : ""
      }/>`,
      `<text x="${x}" y="${y + 4}" text-anchor="middle" font-size="12" fill="#fff" font-weight="600">${i}</text>`,
    );
  }
  const pool = f ? f.pool : 30;
  const frac = Math.max(0, Math.min(1, pool / 60));
  out.push(
    `<circle cx="125" cy="125" r="40" fill="none" stroke="var(--line)" stroke-width="8"/>`,
    `<circle cx="125" cy="125" r="40" fill="none" stroke="${pool <= 0 ? "var(--take)" : "var(--restore)"}"
      stroke-width="8" stroke-linecap="round" transform="rotate(-90 125 125)"
      stroke-dasharray="${(frac * 251).toFixed(1)} 251"/>`,
    `<text x="125" y="122" text-anchor="middle" font-size="17" font-weight="700" fill="var(--ink)">${pool.toFixed(0)}</text>`,
    `<text x="125" y="138" text-anchor="middle" font-size="10" fill="var(--muted)">pool</text>`,
  );
  $("ring").innerHTML = out.join("");
}

function drawGrid(frames: Frame[], upto: number) {
  const cw = 340 / MAX_TURNS;
  const rh = 118 / N;
  const out: string[] = [];
  for (let t = 0; t < Math.min(upto, frames.length); t++) {
    for (let i = 0; i < N; i++) {
      out.push(
        `<rect x="${t * cw}" y="${i * rh}" width="${Math.max(cw - 0.4, 0.6)}"
          height="${rh - 0.8}" fill="${colour(frames[t]!.actions[i]!, false)}"/>`,
      );
    }
  }
  $("grid").innerHTML = out.join("");
}

function updateTheory() {
  const p = params();
  const s = slack(p);
  const cap = carryingCapacity(p, N);
  $("theory").innerHTML = `
    <code>p_self = (S−L)/(R+S) = ${pSelf(p).toFixed(3)}</code> &nbsp;
    <code>p_need = S/(G+S) = ${pNeed(p).toFixed(3)}</code> &nbsp;
    <code>slack = ${s.toFixed(3)}</code><br>
    <span class="muted">Closed form: a flock of ${N} survives
    <b>${cap < 0 ? "no defectors — the game is unwinnable" : `${cap} permanent defector${cap === 1 ? "" : "s"}`}</b>.
    That is ground truth for the empirical threshold, not an estimate.</span>`;
}

function run() {
  window.clearInterval(timer);
  const key = ($("rule") as HTMLSelectElement).value;
  const pinned = Number(($("k") as HTMLInputElement).value);
  const p = params();
  const out = simulate(POLICIES[key]!.fn, {
    n: N, turns: MAX_TURNS, pinned, params: p,
  });
  const { frames } = out;
  let t = 0;
  $("verdict").textContent = "";
  timer = window.setInterval(() => {
    if (t >= frames.length) {
      window.clearInterval(timer);
      const died = out.extinctionTurn !== null;
      const v = $("verdict");
      v.textContent = died
        ? `✕ extinct at turn ${out.extinctionTurn}`
        : `✓ sustained — ${out.survivors}/${N} alive`;
      v.className = `verdict ${died ? "dead" : "live"}`;
      return;
    }
    const f = frames[t]!;
    drawRing(f, pinned);
    drawGrid(frames, t + 1);
    const acting = f.actions.filter(Boolean);
    const r = acting.filter((a) => a === "restore").length;
    $("t").textContent = String(f.turn);
    $("pool").textContent = f.pool.toFixed(0);
    $("alive").textContent = String(f.alive.filter(Boolean).length);
    $("rate").textContent = acting.length ? (r / acting.length).toFixed(2) : "—";
    t++;
  }, 110);
}

function buildTable() {
  const rows = Object.entries(POLICIES).map(([, { label, fn }]) => {
    const k = pacemakersNeeded(fn, { n: N, turns: 200 });
    return { label, k };
  });
  rows.sort((a, b) => (b.k ?? 99) - (a.k ?? 99));
  $("entrain").innerHTML =
    `<table><tr><th>follower rule</th><th>pacemakers needed, of ${N}</th></tr>` +
    rows
      .map(
        (r) =>
          `<tr><td>${r.label}</td><td class="num">${
            r.k === null ? "never survives" : r.k === N ? `${N} — no entrainment` : r.k
          }</td></tr>`,
      )
      .join("") +
    `</table>`;
}

// wire up
const sel = $("rule") as HTMLSelectElement;
sel.innerHTML = Object.entries(POLICIES)
  .map(([k, v]) => `<option value="${k}">${v.label}</option>`)
  .join("");

$("k").addEventListener("input", (e) => {
  $("klab").textContent = (e.target as HTMLInputElement).value;
});
for (const id of ["rule", "k", "G"]) {
  $(id).addEventListener("change", () => {
    updateTheory();
    run();
  });
}
$("go").addEventListener("click", run);

updateTheory();
buildTable();
drawRing(null, 0);
run();
