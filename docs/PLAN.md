# multiagent — lab plan

**Written 2026-08-06, revised same day.** Two labs exist. This is the case for
which others to build, in what order, and the one refactor that goes first.

## The story the site tells

The labs are not a menu of demos. They are one argument in five moves:

1. **Simple rules, many players, long rollouts.** A commons with a solution one
   sentence long. → `shared-resource.html` *(built)*
2. **The solution is a rhythm, and rhythms are hard to hold.** Nobody conducts.
   Each player keeps its own time, and the pattern is the shared resource. →
   `juggling.html` *(the centrepiece — see below)*
3. **Being slightly wrong is fine, until suddenly it isn't.** A small per-beat
   bias is invisible for thirty beats and fatal by ninety. → folded into juggling
4. **A few players can hold the whole thing together — or fail to.** Pin some
   metronomes and see whether the rest lock on. → juggling + shared-resource
5. **How would you know you had measured any of this?** → `gate.html`

Written out, the thesis is: *influencing the dynamics of a large population, with
a small number of players, toward stability and good stewardship of a shared
resource.* Every lab is a move in that sentence, and any lab that isn't gets cut.

## The selection rule

Not every claim deserves a lab. A lab earns its place when three things hold:

1. **There is a counterintuitive fact, and arithmetic settles it.** No judgement
   call, no "it depends" — you run it and the number is the number.
2. **A dial changes the answer.** If the only interaction is pressing play, it is
   a figure, and a figure should be a static SVG in the proposal instead.
3. **It carries a specific claim the proposal makes.** Otherwise it is a toy that
   costs maintenance and dilutes the ones that matter.

Everything below is scored against those three. Three candidates fail and are
listed at the bottom with the reason, because the discipline is the point.

## Do this first: extract the lab harness

`sharedResourceLab.ts` (160 lines) and `boardwalkLab.ts` (119) already duplicate
the `$` helper, a bare `let timer` play loop, `clearInterval` in four places
each, and ad-hoc SVG string assembly. Two copies is tolerable. **Eight copies is
the `make_asker` bug again** — the one where `commons.py` and `pgg.py` drifted
until one had the `stop` fix and the other silently did not.

So before lab three, build `src/ui/lab.ts`:

- `el(id)` — the typed lookup, once
- `Ticker` — start/stop/step/reset, so no lab hand-rolls an interval again
- `svg` tag helper — string building with the theme variables applied
- `statRow(...)` — the four-number header every lab has
- `embedMode()` — reads `?embed=1` and strips nav and prose

That last one is not cosmetic. The proposal links these; an embeddable mode
means one URL serves both the standalone page and the iframe, and there is no
second copy of the lab to keep in sync.

Cost: about half a day. It pays for itself at lab four.

---

## Tier 1 — build these

### 0 · Juggling `juggling.html` — 3D, and the centre of the site

Juggling is not a metaphor for the Shared Resource game. It is the same object
with intuitions people already have. Many players, rules a child can state, a
pattern that only exists while everyone keeps time, and a failure mode everybody
has seen. "Take and restore in equal measure" *is* a two-beat pattern.

**The model, and it is a real one.** N jugglers in a ring on discrete beats. Each
holds a phase and throws on its own count — sometimes to itself, sometimes across
the ring. A club thrown from *i* to *j* arrives some beats later; if *j*'s hand is
not ready within tolerance, it drops, and dropped clubs leave play. **The clubs in
the air are the shared resource.** Each juggler carries a small per-throw timing
error, and errors compound.

Why this earns the centrepiece slot:

- **Drift becomes visible rather than argued.** A juggler running 4% fast does not
  drop anything for thirty beats. The pattern just breathes slightly. Then it goes.
  That is §2's whole long-horizon argument and it needs no explanation at all.
- **Entrainment becomes obvious.** Pin *k* jugglers as metronomes and watch the
  others lock on — or fail to. Same question as the pacemaker slider, but you can
  see the phases pulling together.
- **Virtue still has a ceiling.** One juggler cannot compensate for a neighbour's
  drift; it can only drop its own clubs trying.
- **The natural metric is already the right one.** Kuramoto's order parameter *R*
  measures phase coherence, which is exactly the coupled-oscillator framing §2
  claims, arriving here as the obvious thing to plot rather than an imported idea.

**3D is justified, not decorative.** Clubs travel on parabolas between points in a
ring; that is a spatial fact and flattening it costs real information — you cannot
see a pass being late in 2D, you can only read it in a number. Orbitable camera,
clubs on arcs, jugglers coloured by phase error.

*Implementation note:* hand-rolled perspective projection onto a canvas, not
Three.js. Perhaps sixty lines for balls on parabolic arcs, no 600 KB dependency,
and it keeps the "opens straight off disk" promise. Revisit if the pattern
library grows.

This replaces the separately-planned `drift.html`; a drift readout lives inside it
as a panel, so there is one lab instead of two saying the same thing.

### 1 · The promotion gate `gate.html`

**The best remaining lab, and it is not close.** The most counterintuitive claim
in the whole proposal is that a sensible-looking promotion rule rolls back a
candidate identical to its own baseline **100% of the time**, and that collecting
more evidence makes it worse. Nobody believes that from a table. They believe it
from a slider.

- Dials: policy (overlap rules / superiority test / non-inferiority), paired
  cells *n*, true effect, and the non-inferiority margin.
- Shows: P(roll back) against *n*, with the true effect at zero highlighted as
  the A/A case. Watch the overlap-rule curve go **up** with more data.
- The payoff: drag the margin and watch a broken gate become a working one.

Carries §4 entirely — the gate calibration, the A/A validity requirement, the
minimum campaign size, and the power analysis all fall out of the same widget.

*Core:* port `tools/aa_calibrate.py`. Test: reproduce 1.000 / 1.000 / 0.076.

### 2 · Phase diagram `phase.html`

- Dials: `L`, `R`, `G`, `S`.
- Shows: a 2D heatmap of slack over two chosen parameters, with the zero contour
  drawn — the surface where `p_self = p_need` and solutions exist at all — and
  the negative region shaded as unwinnable.
- The payoff: the reference parameters sit exactly on a knife edge. You can see
  that it was *chosen*, not stumbled into, and you can see the unwinnable control
  condition as a region rather than a footnote.

Carries RQ3 and the ground-truth claim. Overlay the measured carrying capacity on
the closed-form one and the whole "we have an answer key" argument is one image.

---

## Tier 2 — strong, build if there is room

### 4 · Identifiability `resolution.html`

At N=8 the reachable seeded fractions are {0, 12.5, 25, 37.5}%, so a threshold
near 10% **cannot be located at all** — the grid is coarser than the interval of
interest. §5 argues this in prose; a picture settles it in one second. Small lab,
high clarity, and it justifies the N=50 line in the budget.

### 5 · El Farol `elfarol.html`

Arthur's bar problem: go if you expect it under-crowded, and the good outcome
requires that *not everyone reasons alike*. It is the canonical anti-coordination
problem and it generalises the conformity finding beyond our one game — which
matters, because right now "imitation is the wrong heuristic" rests on a single
environment. A second classic showing the same thing turns an observation into a
pattern.

### 6 · Rule inference `whichrule.html`

Given an action trace, which follower rule best explains it? This *is* RQ2's
measurement, so the lab doubles as a specification of the method. Paste a trace
from a real flockbench run and it reports the fit. Build after a live run exists,
otherwise it has nothing real to chew on.

---

## Not building, and why

- **Mimic control (RQ4).** Needs live models to be interesting. Scripted agents
  make the control look trivially effective, which would be a lie about the
  experiment.
- **Ostrom's design principles.** A good essay, not a lab — no dial changes an
  answer.
- **PGG with punishment.** Already in flockbench and genuinely interesting, but
  antisocial punishment needs live agents to be surprising. Scripted, it just
  replays whatever policy we wrote.

---

## Sequencing

| | |
|---|---|
| **Slice A — before submission** | harness → **juggling (3D)** → gate |
| **Slice B — the week after** | phase → resolution |
| **Slice C — once live runs exist** | El Farol → rule inference |

Ordered by the story rather than by my estimate of value. Juggling comes before
the gate because it is move 2 of the argument and the gate is move 5: a visitor
who reads one page should read the one that makes the problem felt, not the one
that audits the instrument. Juggling also absorbs the drift lab, so Slice A is
two builds and a refactor rather than three builds.

Slice B and C are for the site as a research artifact rather than for the grant.

## Invariants for every lab

Non-negotiable, because these are what make the site evidence rather than
decoration:

1. **Engines in `src/core/`, pure, no DOM.** UI never computes anything a test
   could check.
2. **Every claim on the page is asserted in `test/`.** If the prose says 75%, a
   test says 75%. This is why the site cannot drift away from flockbench.
3. **No judge, anywhere.** Every number computed from rules.
4. **Cross-pinned to flockbench** where an engine exists on both sides.
5. **Works from any subpath and from disk.** Relative base, no server.
