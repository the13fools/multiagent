# Flockbench website v2 — reviewer-skim plan

**Current routing.** The broader research-program landing page now lives at the
site root. This four-page reviewer path lives under `commons_game/`; former root
detail URLs and `/v2/` remain compatibility redirects. The scientific and skim
contracts below still govern the Commons Game pages.

**Revised 8 August 2026.** This plan supersedes the lab-led site plan. V2 is a
fresh, grant-reviewer-facing implementation. V1 remains intact as the lab archive.

## The decision this site supports

A reviewer should be able to answer these questions after five minutes:

1. What is the project?
2. Why is it a genuinely multi-principal, multi-agent safety project?
3. What is the narrow, falsifiable scientific question?
4. What exists today, and what would the grant pay for?
5. Is the proposed study rigorous, feasible, and appropriately scoped?

The site has one governing sentence:

> **Flockbench is a known-answer testbed for measuring how much of a mixed agent
> population must be controlled to keep a shared resource from collapsing, and
> when that intervention stops working.**

Everything in the main reviewer path must advance that sentence. PDD, Firebreak,
mechanism design, entrainment, and future learning populations are supporting
methods or extensions, not competing theses.

## What the call feedback changes

The public Q&A notes become design constraints, not quotations on the site:

| Call participant | Constraint on v2 |
|---|---|
| **James Fox** | Be focused and specific. State why findings from the small setting could generalise, and where they should not. Do not drift into network security. |
| **Matija Franklin** | Make the unit of analysis the interacting population. Do not present chatbot alignment or AI ethics as multi-agent research. |
| **Nenad Tomašev** | Do not imply a scaling law from a few population sizes. Use N = 8, 20, and 50 to test whether the threshold moves with scale. |
| **Adriana Uy** | Make Stage Zero visible and organize delivery around concrete 3/6/9/12/15/18-month decision points. |
| **Katia Sycara** | Explain what “effective” means and why the chosen population sizes are sufficient for this question. Scale is question-dependent. |

The call prioritises depth. V2 therefore presents:

- **Primary fit:** Sandboxes and Testbeds.
- **Scientific demonstration:** Science of Agent Networks.
- **Bounded downstream use:** a population-level promotion decision.
- **Not claimed:** agent infrastructure, network security, collusion detection, or
  general-purpose alignment.

## The skim contract

### In 30 seconds

The first viewport must communicate:

- the concrete problem: agents from different sources share a quota, queue, or
  datastore;
- the question: how large a controlled minority is needed;
- the differentiator: the environment has a computable answer key and no LLM
  judge;
- the status and ask: working public components; Tier 1, $277,343, 18 months.

### In two minutes

A visitor should additionally understand:

- the primary outcome is survival at T = 200;
- the estimand is the critical seeded fraction f*;
- the pre-registered prediction concerns the majority's update rule;
- simple environments buy ground truth, while tools, persistent memory,
  multi-vendor populations, a frontier-model subset, and N = 20/50 test the
  boundary of transfer;
- the current evidence motivates the study but does not establish that minority
  steering works.

### In five minutes

A reviewer should have seen:

- the complete experimental logic and its failure conditions;
- a clean Built / Pilot / Funded distinction;
- the strongest replayable receipts;
- milestones, team, budget, risks, and minimum valuable outcomes;
- links to technical details without needing them to understand the proposal.

## Information architecture

Use one brand, **Flockbench**, and four primary navigation items:

1. **Overview**
2. **Study**
3. **Evidence**
4. **Delivery**

Methods and Archive are footer links, not top-level peers.

Target total for the four-page path: **3,000–3,500 words**. No main page should
exceed 950 words. Every page begins with a one-sentence claim and a compact
summary of the evidence or decision it contains.

---

## Page 1 — Overview

**Job:** answer the Plain-language Summary, Problem and Impact, and “But for”
prompts in a reviewer-readable sequence.

**Target:** 650–750 words.

### First viewport

Eyebrow:

> Flockbench · Tier 1 · 18 months · $277,343

Headline:

> **How much of a mixed agent population must you control to stop a shared
> resource collapsing?**

Deck:

> Flockbench is a known-answer testbed for measuring that threshold across
> agent populations assembled from different sources. Outcomes are scored by
> arithmetic, not by another model's opinion.

Primary action: **See the study**. Secondary action: **Inspect the evidence**.

One compact visual shows agents from several sources acting on a shared resource,
with only a minority highlighted as controlled. It must be labelled as the
experimental setup, not as a measured result.

### Remaining sections

1. **The deployment problem.** One quota, queue, or datastore; several vendors
   and operators; no principal controls every seat.
2. **The measurement gap.** Individual-agent evaluation cannot distinguish a
   failed population from an impossible task, and a fluent model judge can miss
   destructive mechanics.
3. **The answer-key environment.** Explain restore/take/upkeep in one short block.
   Show the three terminal outcomes: sustainable, coordination failure, and
   arithmetically impossible.
4. **The study in one screen.** Primary outcome, f*, the follower-rule
   hypothesis, and the three transfer moderators.
5. **Why public funding.** The useful instrument can reject its author's own
   candidate and publish a precise null; vendors have weak incentives to build
   it.
6. **What success changes.** Best case, minimum valuable outcome, and the meaning
   of a flat or non-transfer result.

Do not put a history of the project, a literature review, PDD, or the full gate
calibration story on this page.

---

## Page 2 — Study

**Job:** answer Approach and the scientific parts of Proposal Risks.

**Target:** 850–950 words.

### Opening summary

Show four facts before prose:

- **Primary outcome:** population survival fraction at T = 200.
- **Estimand:** f*, the smallest controlled fraction producing the mechanical
  one-defector margin.
- **Core design:** 6,720 cells / 3,360 matched pairs / 70 pairs per contrast.
- **Prediction:** f* is lowest for imitate-best-neighbour majorities and highest
  for myopic-greedy majorities.

### Research logic

Present the central question first, even though gate calibration runs first in
time:

1. **RQ2 — How large a minority is needed?** Fractions, primary outcome,
   isotonic curve, interval for f*, monotonicity failure, mimic and style
   controls.
2. **RQ3 — What does the majority do with the signal?** Four manipulated update
   rules; classifier validated on scripted answer-key populations before use on
   LLM traces.
3. **RQ1 — Can the measurement rule be trusted?** A/A calibration licenses the
   downstream claims. Keep this visibly subordinate: 17.3% of compute, not a
   second project.

### “Simple, not toy” section

Answer the call's largest objection directly:

- natural-language LLM agents act against a live endpoint;
- agents have separate resources and mixed incentives, not a shared reward;
- the known-answer core distinguishes failure from impossibility;
- a shared key-value-store environment adds auditable tools and persistent
  memory while preserving the resource invariant;
- seats come from two open-weight families and a commercial provider;
- a frontier-grade matched subset tests proxy fidelity;
- N = 8, 20, and 50 tests the direction and stability of scaling, not a law for
  populations of millions.

### Failure logic

End with a compact table: flat curve, non-monotone curve, gate above 10% error,
classifier failure, model-specific result, and failed transfer. For every failure,
state the reportable conclusion rather than promising success.

Move full missingness rules, multiplicity, power derivation, configuration grids,
and campaign schemas to Methods.

---

## Page 3 — Evidence

**Job:** answer Novelty and Feasibility, while making overclaiming difficult.

**Target:** 750–850 words.

### Status ledger

The first element is a three-column ledger:

| **Built** | **Pilot evidence** | **Funded work** |
|---|---|---|
| Deterministic environments, answer-key equations, trace schema, campaign planner, Firebreak path, tests | One-seed live Commons run; 30-pair matched PGG receipt; offline sign-flip gate audit | Powered fraction sweep, live A/A campaigns, tool-and-memory environment, multi-vendor and frontier subsets, N = 20/50 replication |

Status words must be used consistently:

- **Built:** code exists and is tested.
- **Pilot:** an empirical artifact exists, but it is not a powered result.
- **Offline audit:** computed from committed data without a new live campaign.
- **Proposed:** requires grant-funded work.

Never label a proposed extension “in the testbed” without the qualifier.

### Strongest evidence

Use at most five claims, each paired with a receipt or test:

1. The flagship environment has an exact sustainable regime and an exact
   impossible control.
2. One permanent defector can look safe at turn 20 and produce total collapse by
   turn 118.
3. The original promotion rule rejects a clone in approximately 100% of offline
   null resamples.
4. A 30-pair matched pilot completed the decision path and produced a replayable
   receipt.
5. The site and Python implementation pin the same arithmetic in tests.

Clearly state: none of these demonstrates that minority steering works.

### Novelty comparison

A small comparison against GovSim, Melting Pot/Concordia, and repeated-game work
should use only three axes:

- population composition as the intervention;
- a closed-form answer key and impossible-regime control;
- a calibrated, population-level decision rule.

### PDD illustration

Keep the requested PDD illustration here as a compact method card:

> prompt or source material → span-restricted rationale edits → protected action
> schema → distinct candidate policy → population-level evaluation

Label it **population-generation method under test**. Do not describe PDD as
alignment, proof of moral behavior, or the proposal's primary contribution. Link
to the full Methods note.

---

## Page 4 — Delivery

**Job:** answer Feasibility, Team, Budget, Milestones, Existing Funding, and the
operational parts of Risks.

**Target:** 700–850 words.

### Milestone spine

Use six decision points rather than an activity-heavy Gantt chart:

- **Month 3:** promotion rule calibrated or retired.
- **Month 6:** intervention channel and follower-rule classifier validated or
  bounded.
- **Month 9:** f* estimated or declared undefined.
- **Month 12:** follower-rule and tool/memory transfer results.
- **Month 15:** scale, provider, and frontier-fidelity boundaries.
- **Month 18:** independently replayable synthesis and release.

Every milestone shows: what is demonstrated, evidence produced, and what changes
if the result fails.

### Budget

Lead with the actual proposal, not the general calculator:

> **$277,343 over 18 months** — $252,130 direct and $25,213 indirect.

Show four grouped lines: PI, contracted reproducibility engineering, GPU/API
compute, and operations. The compute allocation may expand on request.

The existing interpolation tool may appear behind **Explore other scopes**, but
must open in “general planning” mode and explicitly say that `$300k → one year`
is not this proposal. It must never replace or visually compete with the actual
18-month ask.

### Team and readiness

Show the PI, relevant credentials and prior work, exact FTE, contracted role,
statistical review, and sponsorship status plainly. Do not publish placeholders.
Stage Zero belongs here as proof of execution: working code, public receipts,
tests, and self-funded pilots already completed.

### “With / without funding” close

Two short columns:

- **With funding:** powered study, live calibration, tool/memory extension,
  provider and scale boundaries, reproducibility engineering.
- **Without funding:** public maintenance and small-N pilots continue; the powered
  claims and external-validity programme do not.

---

## Methods and archive

These remain available without burdening the primary navigation.

### Methods

- full campaign specification and power derivation;
- PDD method note;
- claim ledger and replay receipts;
- equations and answer-key derivations;
- literature and funder-fit mapping;
- statistical missingness, multiplicity, and stopping rules.

### Archive

- Boardwalk;
- Cards;
- Juggling;
- the long PDD essay;
- Lineage;
- figure builder;
- the ten-chapter v1 narrative.

Archive pages must carry a small banner: “Research archive — not part of the
five-minute proposal path.”

## Visual and editorial rules

1. **One claim per section.** Section headings state the conclusion, not a theme.
2. **Status beside every empirical claim.** Built, Pilot, Offline audit, or
   Proposed appears where the claim is made.
3. **No paragraph longer than 80 words.** Use prose first; lists only when they
   improve scanning.
4. **No more than one primary visual per page.** A visual must settle a question
   faster than text.
5. **No unexplained acronyms in the first viewport.** Define f* on first use; PDD
   never appears on Overview.
6. **No invented precision.** N = 8/20/50 is a scale comparison, not a scaling
   law. Frontier agreement is a declared test, not assumed fidelity.
7. **No duplicated stories.** The gate failure lives on Evidence; its study role
   gets one short block on Study. PDD lives on Evidence/Methods only.
8. **One brand and one nav.** Remove the competing “multiagent” chapter identity
   from v2.
9. **Mobile is a first-class skim.** Summary facts stack without horizontal
   scrolling; tables become labelled cards.
10. **Fast by default.** No 3D hero, autoplay, scroll-jacking, or animation needed
    to understand a claim.

## Canonical facts for v2

V2 must source shared grant facts from one data module rather than copying them
into page scripts:

- Tier 1;
- 18 months;
- $277,343 total request;
- 30 A/A campaigns of 60 matched pairs across four strata;
- 9.5% one-sided upper bound with zero rollbacks;
- 6,720 cells / 3,360 paired comparisons;
- 70 paired cells per contrast;
- T = 200;
- N = 8, 20, 50.

The final application narrative is authoritative if older site copy disagrees.

## Implementation sequence

1. **Content lock.** Resolve PI/team placeholders, existing funding, host wording,
   and the reduced-scope alternative before public v2 copy is frozen.
2. **Fresh shell.** Build v2 separately, preserving all v1 URLs and behavior.
3. **Overview first.** Write and test the complete skim path before migrating any
   interactive component.
4. **Study and Evidence.** Add the design and status ledger; wire every evidence
   claim to a receipt or test.
5. **Delivery.** Add canonical milestones and budget, with the actual proposal
   visually dominant over the general calculator.
6. **Methods and archive.** Move technical depth and older labs out of the main
   route without deleting them.
7. **Verification.** Test navigation, numeric invariants, status labels, word
   budgets, responsive layout, reduced motion, keyboard access, and production
   build.
8. **Reviewer trials.** Run three timed checks: 30 seconds, two minutes, and five
   minutes. After each, ask the reviewer to state the question, contribution,
   evidence status, ask, and largest risk. Revise any answer they cannot recover.

## Definition of done

V2 is ready when a technically literate reader, without opening Methods, can say:

> This is a working known-answer multi-agent testbed. The grant funds a narrow,
> powered test of the population fraction needed to prevent resource collapse,
> with an explicit hypothesis about the uncontrolled majority and honest tests of
> transfer across tools, memory, providers, and scale. The existing results prove
> execution and expose measurement failure; they do not pre-announce the result.

If the reader instead remembers PDD, juggling, moral infrastructure, or the broken
gate as the main project, the site is still too diffuse.
