# Multiagent site — v1 archive

> This is the preserved first version of the research site. The current
> reviewer-facing proposal is at the [repository root](../README.md); the pages
> below continue to build and publish under `/archive/`.

**Interactive labs for multi-agent shared-resource games with known solutions.**

Archive route: [foolzone.com/multiagent/archive/](https://foolzone.com/multiagent/archive/)

Suppose you control the personas of a handful of agents in a population you did
not build and cannot fully see. How few can you control — and what must they do
— to steer the whole system into a state where everybody survives?

That question is hard to study in a rich environment, because you cannot tell a
population that *failed* from one that faced an impossible problem. So these
labs use small games where the answer is known exactly, and the interesting
quantity is the distance between what a population did and what the arithmetic
already permitted.

## The labs

Five pages, and they are one argument in order rather than a menu.

| page | the move it makes |
|---|---|
| [`shared-resource.html`](shared-resource.html) | Simple rules, many players. A commons whose solution is one sentence long. One defector kills everyone; virtue cannot compensate; conformity is the worst available heuristic. |
| [`juggling.html`](juggling.html) | The solution is a rhythm, and rhythms are hard to hold. Same game as a passing pattern, in 3D. A 0.2% timing error looks fine for sixty beats and is fatal by a hundred. |
| [`boardwalk.html`](boardwalk.html) | Hotelling's beach. Two vendors settle at the centre. Three have no stable arrangement at all and chase each other forever — a system with nothing to be steered into. |
| [`gate.html`](gate.html) | How would you know you measured any of this? A judge-free promotion gate that rolls back a clone of its own baseline, and gets worse with more data. |
| [`figure.html`](figure.html) | Composes the three headline results into one page and exports print-resolution vector SVG. |

### Shared Resource

Every turn each living agent pays `L` upkeep, then either pays `R` to add `G` to
a shared pool, or takes `S` out of it. Balance below zero and it is removed.

Two rates fall out of those numbers:

```
p_self = (S − L) / (R + S)     the most an agent can AFFORD to restore
p_need = S / (G + S)           what the pool NEEDS restored
slack  = p_self − p_need       the flock's tolerance for free-riding
```

At `L=1, R=1, G=3, S=3` both are exactly `½`. That coincidence is why a solution
exists — **take and restore in equal measure** — and why the slack is zero, so a
single permanent defector among eight ends all eight. An agent that restores
*every* turn dies at turn 6: its own upkeep caps what it can give, so it does
not outlast the defector it subsidises. There is no martyrdom strategy.

`G` is a difficulty dial and the carrying capacity is **closed-form**, which is
the reason the game is worth building. Elsewhere you estimate a tipping point
and hope; here an empirical threshold has ground truth to compare against.

| `L,R,G,S` | slack | defectors an 8-flock survives |
|---|---|---|
| 1,1,3,3 | 0 | 0 |
| 1,1,4,3 | 1/14 | 1 |
| 1,1,6,3 | 1/6 | 2 |
| 1,1,9,3 | 1/4 | 4 |
| 2,1,3,3 | −1/4 | *unwinnable for every strategy* |

**Coordination here is a dynamic 2-colouring.** Rows are agents, columns are
turns. The pool holds level only when every column is half restoring; each agent
survives only when its own row is half restoring. Nobody assigns the colouring.

Which makes steering an **entrainment** problem. Pin `k` agents to the correct
alternating phase, let the rest follow a local rule, and ask how large `k` must
be before the flock survives 200 turns:

| follower rule | pacemakers needed, of 8 |
|---|---|
| always take | 8 — no entrainment at all |
| **copy the majority** | **6 (75%)** |
| react to pool level | 0 |
| oppose the majority | 0 |
| hold own rate at ½ | 0 |

The pattern this game needs is *anti*-correlated, so imitation — the social
heuristic language-model agents most reliably exhibit — is close to the worst
available rule. **A population's controllability is set by the followers'
update rule far more than by the fraction of seats you hold.**

### Boardwalk

Vendors choose positions on a beach; uniform customers walk to the nearest. Two
vendors converge on the centre (Hotelling's principle of minimum
differentiation). **Three have no pure-strategy equilibrium at all** (Eaton &
Lipsey 1975) — the middle vendor is always squeezed, and whichever way it jumps
it creates a new squeezed middle. Four settle again, paired at the quartiles.

The page counts them by brute force rather than asking you to take the citation
on trust.

The two games are complements. One has a stable state that is exactly reachable;
the other provably has none. *Can a controlled minority stabilise a system with
nothing stable to be steered into?* Answering "no" is as informative as "yes".

## Run it

Requires Node 22+.

```
npm ci
npm run dev     # http://localhost:4173
npm test        # 44 tests
npm run build   # static site in dist/
npm run preview # serve the built dist/ -- do this before pushing
npm run check   # test + typecheck + build
```

**If Vite fails on startup with a missing `@esbuild/...` or `@rollup/...` module**,
`node_modules` was installed on a different platform than the one you are running
on — most likely because the directory was shared with a container or a remote
machine. Vite ships platform-specific native binaries, so the fix is:

```
rm -rf node_modules && npm ci
```

`npm run preview` matters more than it looks: `base` is relative, so `dist/` has
to work from a subpath, and `dev` serves from the root. Preview is the only
local command that exercises what `foolzone.com/multiagent` will actually do.

## Design notes

**The engines are ports, and the tests pin them to the original.** These games
also exist in `flockbench`, the research testbed where they are played by live
language-model agents. `test/core.test.ts` asserts the same invariants as
`flockbench-shared --selftest` — turn 14 for the default flock, turn 6 for the
permanent restorer, 6 pacemakers for a conformist one, no equilibrium at three
vendors. Two implementations of the same arithmetic are only useful if they are
pinned to each other; otherwise the illustration quietly drifts away from the
experiment it illustrates.

**No judge, anywhere.** Every number on these pages is computed from the rules.
Nothing is scored by a model.

**Local first.** No account, server, analytics, or build step at view time.

```
src/core/     the game engines — pure functions, no DOM
src/ui/       one module per lab page
test/         invariants shared with flockbench
*.html        one standalone page per lab
```

## Licence

MIT. Exported data and figures: CC0.

Hotelling, H. (1929). *Stability in Competition.* Economic Journal 39.
Eaton, B. C. & Lipsey, R. G. (1975). *The Principle of Minimum Differentiation
Reconsidered.* Review of Economic Studies 42.
