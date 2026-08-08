# Flockbench — Schmidt Sciences application draft

This is submission-ready content, not evidence of results beyond the linked receipt
ledger. Replace every bracketed field before submission. The public site uses the
same evidence boundaries: \`proposal.html\` is the short reviewer path and
\`experiments.html\` is the governing ledger for empirical claims.

## Project Details

### Project Title (≤20 words)

**Flockbench: Testing Whether Small Agent Minorities Stabilize Shared Resources**

### Project Tier

**Tier 1 (up to $300,000)**

### Project Duration

**18 months**

### Plain-language Summary (2–3 sentences)

AI agents will increasingly share budgets, compute, queues, data stores, and other
resources without a single operator controlling every agent. Flockbench asks one
concrete question in a game with a known answer: can a small fraction of carefully
specified agents keep a mixed population from exhausting a shared resource? We will
calibrate the measurement procedure first, then publish reproducible dose-response
evidence—including null results and failure boundaries—rather than treating a
single-agent behavioral score as population safety.

### Keywords

1. Multi-agent safety evaluation
2. Collective resource governance
3. Population dynamics
4. AI agent testbeds
5. Calibrated evaluation

## Problem and Impact (≤500 words)

Most AI safety evaluation asks whether one model gives a safe answer to one user. That
is not the whole deployment setting that is arriving. Agents will be deployed by
different people and organizations into shared settings: a budget, a queue, a market,
a data store, a tool API, or a computational commons. A model can appear sensible in
isolation while participating in a population that extracts too quickly, copies a
bad local norm, or collapses a resource on which every participant depends.

The scientific gap is not simply “we need more simulations.” It is that we do not yet
have calibrated experiments for causal questions about population composition. In a
rich simulation, a bad collective outcome is ambiguous: perhaps the agents chose
poorly, or perhaps success was impossible. That ambiguity makes it easy to overread
both positive and negative results. It is especially dangerous when an LLM judge
supplies the score, because the judge can reward fluent explanations while missing the
mechanism that destroys the system.

Flockbench begins with a shared-resource game designed to remove that ambiguity. Each
turn, every player pays one token to survive and chooses either to pay one additional
token to restore three tokens to a common pool or to take three tokens from it. At
the reference parameters, everyone can survive indefinitely by alternating the two
actions. The solution, the required restoration rate, and the zero-tolerance-to-
defection condition follow directly from the rules. The environment—not a model—is
the referee.

The central hypothesis is deliberately narrow: **in a mixed population, a small
fraction of agents with a behaviorally meaningful cooperative policy can shift the
population from collapse toward sustained resource use, and the required fraction
depends on population size, information, resource slack, and the behavior of the
unseeded majority.** We will estimate this as a dose-response curve, not an anecdote.

The argument relies on two limited assumptions. First, an answer-key environment can
reliably distinguish coordination failure from environmental impossibility. Second,
the boundary conditions of this simple mechanism are informative enough to guide the
design of harder testbeds; we do not assume that its numerical threshold transfers
directly to real institutions. If the project succeeds, researchers and deployers
will have a public way to ask a more disciplined question than “does this agent seem
cooperative?”: “under what conditions does this intervention change a collective
outcome, compared with matched controls?”

The best case is a calibrated measurement protocol and a robust, cross-model
composition effect with a transparent mechanism. The minimum valuable outcome is a
well-powered null or a sharp non-transfer result: for example, that an apparent
effect disappears against a vocabulary-matched control, at larger N, or under
scarcity. Even a failure to calibrate the admission gate would be valuable evidence
that an apparently reasonable automated decision rule is not ready to support a
safety claim. This is timely because agent populations are being deployed before
their collective failure modes can be measured with comparable rigor.

## Approach (≤1,000 words)

### A solved core environment

The core environment is the Shared Resource game. Every living player pays an upkeep
cost L=1 each turn, then chooses exactly one action: **restore**, paying R=1 to add
G=3 tokens to the pool, or **take**, receiving S=3 tokens from the pool. A player
whose balance becomes negative is removed. Under these reference parameters, a player
can afford to restore on at most half of its turns and the pool needs restoration on
exactly half of player-turns. The sustainable solution is therefore a phase-shifted
alternation of restore and take. Because slack is zero, a permanent taker eventually
destroys an eight-player population.

This construction has three useful controls that are rare in language-agent work:
(1) a known sustainable policy; (2) an unwinnable regime created by setting the
parameters so that no policy can meet both personal and pool budgets; and (3) a
positive-slack regime in which the commons tolerates some free-riding. We will vary
resource slack and public action history while retaining deterministic state
transitions and a fixed horizon.

### Interventions and controls

The initial dense model is Qwen2.5-7B-Instruct. We will pre-register a second
open-weight mixture-of-experts model after it passes the same structured-action and
game-comprehension screen; selection criteria, model version, template, decoding
parameters, and serving configuration will be frozen before scored runs.

We treat the intervention as an experimental input, not as a claim that an individual
agent is “aligned.” The primary seed is a transparent policy specification that tells
an agent how to track its own balance, the pool, and the public action history. The
second is a LoRA adapter trained on environment-verified trajectories. It must pass
held-out action-validity and rule-comprehension tests before a population result is
interpreted. Both are compared with: (a) the unmodified base model; (b) a
vocabulary-matched mimic containing the specification’s language but not its decision
rules; (c) an objective style positive control showing that the adapter channel can
change behavior when it should; and (d) a known-bad intervention that a useful gate
should reject.

### Measurement and gate calibration

Each scientific cell is a matched candidate/baseline pair with the same environment,
population size, role order, prompt scaffold, decoding settings, horizon, and random
seed. We record all prompts, replies, parsed actions, state transitions, and payoffs.
The primary outcomes are survival at a pre-specified horizon, collapse round, total
welfare, pool trajectory, inequality, and the gap between observed and required
restoration. Parse failures are counted and mapped to an inert action rather than
silently credited as restraint.

Before evaluating any intervention, we will calibrate Firebreak, the promotion
procedure that reads matched arithmetic outcomes. We will run repeated f=0 A/A
campaigns in which the candidate and baseline describe the same population. Every
rollback is then a false rejection. We will report the campaign-level false-rejection
rate with an exact confidence interval, inspect calibration separately by model and
environment, and pre-register the decision rule before a candidate campaign. The
current offline result is a warning, not a validation: sign-flip resampling of a
30-cell Public Goods pilot found that the original overlap rule rolled back an
identical candidate with probability 1.000. A provisional tolerated-harm threshold
was better under resampling, but it is not yet a formal non-inferiority test and has
not been tested in a live A/A campaign. Phase 1 either supplies that evidence or
documents the failure.

The primary calibration is concrete: 60 independent A/A campaigns, each containing
60 matched pairs, on Qwen2.5-7B-Instruct in the binary Shared Resource game. If zero
campaigns roll back, the one-sided exact 95% upper confidence bound on the
campaign-level false-rejection rate is 4.9%; if any do, we will report the exact
interval rather than retune after looking. We will run 20 diagnostic A/A campaigns
in the continuous Commons environment and on the second model family to check for
heterogeneity. Those smaller checks can reveal a shift but will not be described as
establishing a ≤5% rate.

### The main experiment

For each model family and resource regime, we will sweep the fraction of seeded
agents from zero upward at N=8, then repeat the most informative range at N=20 and
N=50. Fractions are assigned to multiple seat orderings; the untreated remainder is
base-model agents, with a pre-registered adversarial-archetype stress condition only
after the core result is interpretable. The primary estimand is the paired change in
population welfare and survival relative to the matched base population. We will fit
and report the full composition-response curve with uncertainty rather than declare a
single “tipping point” from one successful setting.

The main inferential comparisons are seeded versus base and seeded versus mimic. A
seeded-versus-base improvement that does not exceed the mimic is evidence of wording
or presentation, not the proposed behavioral mechanism. We will report all model
families and environments separately. Sample sizes and minimum effects will be set
only after Phase 1 re-measures the variance using the current action schema; the
existing 30-cell pilot is not treated as a permanent power estimate.

### Ecological validity and boundaries

The testbed is intentionally not a realistic model of all social life. Its ecological
validity comes from isolating a recurring deployment structure—multiple principals
making repeated resource-affecting choices under partial dependence—not from claiming
that a four-parameter economy predicts real markets. Agents act through natural
language and see persistent public history; later extensions can add communication,
memory, and tools only after the core instrument is calibrated. The project’s
transfer claim is therefore constrained: it will establish how the mechanism behaves
in a family of known-answer environments and identify where that behavior changes or
fails to replicate.

### Suggestions (optional)

The core testbed is intentionally narrow. Complementary work by others should test
the same composition and calibration questions in environments with private
communication, delegated tool use, heterogeneous objectives, and cross-vendor model
populations. Those are essential external-validity extensions, but they should not be
used to erase the answer-key calibration stage proposed here.

## Novelty (≤300 words)

Existing work motivates, but does not replace, this project. Cooperative-AI research
and multi-agent reinforcement-learning suites study social dilemmas and emergent
collective behavior. Generative-agent and LLM-agent simulations show that language
models can populate rich social worlds. Repeated-game studies ask whether LLMs
cooperate or reason strategically. These are valuable directions, but they commonly
face a measurement problem: the environment is rich enough that it is difficult to
tell a coordination failure from an impossible or underspecified task, and outcomes
are often assessed through behavioral proxies or model judgments.

Flockbench makes a different trade. It centers a population-composition intervention
in a small natural-language environment with a closed-form sustainable region. This
makes it possible to compare a measured steering threshold against ground truth and
to distinguish an impossible-regime control from a failed-regime result. The proposed
contribution is not a claim that simple games are new, nor that an LLM judge has no
use. It is the combination of: (1) a known-answer collective-resource environment;
(2) independently instantiated language-agent populations rather than copies of one
prompt; (3) arithmetic, replayable outcomes; (4) a vocabulary-matched mimic control;
and (5) explicit A/A calibration of the population-level decision rule.

The last point matters because automated promotion gates are usually treated as
administrative plumbing. Our pilot showed that a plausible overlap rule would reject
a clone of its own baseline under the null. Measuring an operating characteristic
before using a gate to make a safety claim is a modest methodological discipline, but
one that is unusually important when the output will govern repeated model changes.

## Feasibility (≤300 words)

The project begins from working, public components rather than an untested platform.
Flockbench already contains a deterministic shared-resource simulator, Commons
Harvest, Public Goods with Punishment, a frozen round-level trace schema, a campaign
planner, and the Firebreak decision path. The core Shared Resource equations are
implemented independently in Python and TypeScript with tests pinning their
invariants. The system records a parse failure separately and gives it a behaviorally
inert action, preventing a serving error from looking like cooperation.

There are two relevant pilots. First, a one-seed live Qwen2.5-7B Commons run completed
end to end with zero parse failures; the seeded adapter delayed stock exhaustion
relative to its control. This shows the serving/tracing path works but is explicitly
not evidence of an effect size. Second, a 30-cell matched Public Goods pilot produced
a replayable receipt. Its offline sign-flip audit found a severe error in the original
promotion policy: it would reject a null clone with probability 1.000. That is an
inconvenient but high-value feasibility result: the instrumentation is capable of
falsifying its own rules before a headline result is claimed.

The most consequential unknowns are deliberately sequenced first. The live A/A
calibration re-measures variance and false-rejection behavior using the current action
schema; it can invalidate the planned gate or change the required sample size. A
simple, objectively scored style control tests the adapter channel before an adapter
null is interpreted. The core study can still deliver a rigorous result if a trained
seed is ineffective: transparent prompted policy and mimic arms test the population
mechanism separately from the training method.

## Team (≤300 words)

**Lead PI:** [Name], [title / institution or Independent Researcher]. [Name] designed
and implemented the initial Flockbench testbed, Firebreak prototype, and public
explorable documentation. The Lead PI will set the scientific design, freeze
pre-registrations, oversee statistical analysis, and lead publication.

**Research Engineer (planned, 1.0 FTE):** [Name or “to be recruited”]. Responsible
for serving reproducibility, trace collection, campaign orchestration, schema
validation, and release packaging.

**Research Assistant / Research Scientist (planned, 0.5 FTE):** [Name or “to be
recruited”]. Responsible for environment variants, adversarial stress specifications,
literature synthesis, analysis replication, and documentation.

**Collaborators / fiscal sponsor:** [List only confirmed affiliations and roles.] Do
not describe a fiscal sponsor as a U.S. 501(c)(3) unless that status and relationship
have been verified in writing.

This is a small team by design: the scientific core is a controlled experimental
program, while the engineering work is trace integrity, reproducibility, and scale.
External replication is part of the deliverable, not delegated trust.

## Proposal Risks (≤300 words)

**The gate does not calibrate.** A repeated live A/A campaign may show that a simple
promotion decision has an unacceptably high or unstable false-rejection rate. We
mitigate this by putting calibration before candidate evaluation, reporting the error
with uncertainty, and treating a negative calibration result as a primary scientific
outcome rather than tuning until a desired result appears.

**The intervention has no population effect.** A transparent seed, trained adapter,
or both may not shift behavior beyond the mimic control. We mitigate interpretive
risk with positive controls, individual action-validity checks, matched pairs, and
pre-specified null reporting. A precise null answers a useful question about the
limits of local alignment interventions.

**The result is a property of one toy setting or one model.** The central risk to
external validity is real. We address it by varying resource slack, information,
population size, and model family, reporting each condition separately, and framing
non-transfer as a boundary result rather than averaging it away. We will not claim to
model collusion, real institutions, or cross-vendor ecosystems before the testbed has
the required channels and populations.

**Training or serving introduces a silent confound.** The adapter may fail to load,
the parser may fail, or model version drift may dominate a comparison. Immutable
resolved configurations, captured prompts and replies, per-agent parse counts,
objective style controls, and independently replayable receipts make these failures
visible.

**The work could be misread as a recipe for manipulation.** The environments have no
external tools or real resources, interventions are disclosed, and the project
measures welfare/survival under transparent rules. The release will emphasize limits
and avoid claiming deployment readiness from sandbox results.

## “But for” Impact (≤300 words)

This work is hard to fund through ordinary product incentives. A vendor has reason to
show that its own agent behaves well in a favorable setting; it has much less reason
to publish a cross-model, judge-free instrument that can reject its candidate or show
that a proposed intervention does nothing. The central output is negative-capable
public measurement infrastructure, not a proprietary agent capability.

The project also sits in an awkward gap between cheap toy demonstrations and expensive
population experiments. One live trace can be run by an independent researcher; a
calibrated A/A study and a multi-seed dose response across models and population sizes
require sustained compute, serving engineering, and time for replication. Markets do
not naturally provide the comparison condition in which most seats are controlled by
other principals and the evaluator reports a null honestly.

Schmidt support would turn a promising, publicly built Stage Zero instrument into an
evidence-producing program. Without it, the work can continue as deterministic
prototypes and occasional one-seed traces, but not as the repeated, paired campaign
needed to distinguish a real composition effect from noise.

## Existing Funding (≤300 words)

**Current funding:** [Confirm: none / list each source, amount, period, and scope.]

**Pending applications:** [Confirm: none / list each funder, amount requested, and
decision timeline.]

If this award is not made, [Lead PI] will maintain the open testbed and small-scale
prototypes, but will not begin the repeated live A/A calibration, multi-seed
dose-response campaign, or N=20/N=50 replication at the proposed pace. This answer
must be updated with all actual funding and pending applications before submission.

## Scientific Milestones and Outcomes

The following content is duplicated in the accompanying workbook draft. Dates assume
a Q1 2027 start and should be shifted if the award start date differs.

### Intermediate milestones

| Deadline | What will be demonstrated | Evidence that this milestone has been achieved |
|---|---|---|
| **Q2 2027 (Month 3)** | **Measured gate calibration, or a documented failure of calibration.** Sixty independent live f=0 A/A campaigns of 60 matched pairs establish an exact campaign-level false-rejection interval for the primary model/game; 20-campaign checks test model and environment heterogeneity. The project either freezes a rule with disclosed operating characteristics or retires the gate for candidate claims. | Versioned campaign plans; machine-readable receipts containing paired cells and resolved policy; calibration report with exact intervals; independent replay script and release tag. |
| **Q3 2027 (Month 6)** | **An intervention channel that is interpretable at the individual level.** A transparent policy seed and any LoRA seed are evaluated on held-out action-validity, rule-comprehension, unwinnable-regime, and objective style-control tests. The result establishes whether the mechanism is installed before interpreting group outcomes. | Frozen held-out task set; per-model results and parse statistics; training manifest; adapter hashes; test report showing pass/fail against pre-registered thresholds. |
| **Q4 2027 (Month 9)** | **A first powered composition curve in the solved shared-resource game.** Matched base, seed, and mimic populations at N=8 produce confidence intervals for welfare, survival, and restoration-gap outcomes across the pre-registered fraction sweep. The result may be monotonic, threshold-like, flat, or adverse. | Pre-registered analysis plan; trace corpus; paired-comparison tables and figures; versioned release receipt; technical report including every planned arm and null result. |
| **Q1 2028 (Month 12)** | **Mechanism boundary under resource conditions.** The composition result is tested in zero-slack, positive-slack, and unwinnable regimes. This distinguishes genuine adaptation to environmental feasibility from indiscriminate “cooperation.” | Parameter registry; cross-regime traces; arithmetic self-tests; analysis report comparing all three regimes and explaining any non-transfer. |
| **Q2 2028 (Month 15)** | **A population-scale and model-family boundary.** The most informative fraction range is replicated at N=20 and N=50 and on the second model family, yielding either a stable threshold interval or evidence that the effect is scale/model dependent. | Frozen scaling plans; reproducible traces; stratified estimates with confidence intervals; release note documenting missing or infeasible conditions. |
| **Q3 2028 (Month 18)** | **A reproducible scientific conclusion about composition in a known-answer environment.** The project synthesizes calibrated-gate results, dose response, and boundary conditions into an independently replayable safety case. | Public release of code, schemas, data where permitted, receipts, replication guide, and technical paper; third-party reproduction attempt or a documented invitation package. |

### End-of-project outcomes

| Outcome name | Description of scientific change | Why this matters for multi-agent safety | Success criteria |
|---|---|---|---|
| **Calibrated population-evaluation protocol** | A population-level decision procedure has a measured live A/A error profile, stated scope, and reproducible failure analysis rather than an assumed threshold. | Automated gates can silently reject safe candidates or promote harmful ones; their operating characteristics are safety-relevant evidence. | At least two model/environment strata with repeated A/A receipts; exact confidence intervals for campaign-level false rejection; documented rule freeze; independent replay of released results. A failure to reach a usable rate is reported as the outcome, not hidden. |
| **Composition-response map for a shared commons** | The field has an estimate, with uncertainty, of how survival and welfare change as a seeded fraction rises, compared with base and vocabulary-matched mimic populations. | Updates the assumption that individual-agent interventions automatically aggregate to population safety. | All pre-registered fraction arms completed or explicitly accounted for; paired estimates and confidence intervals; seed-versus-mimic comparison; arithmetic outcomes and traces available for replay. |
| **Boundary conditions for collective stabilization** | The work identifies whether the observed composition effect survives changes in resource slack, population size, and model family—or specifies where it fails. | Prevents a result at one small population from becoming an unsupported deployment claim. | Stratified N=8/20/50 and two-model-family results for the informative range, plus zero-/positive-slack and unwinnable controls; a clear transfer, heterogeneity, or null conclusion. |
| **Falsifiable benchmark for future interventions** | Future training, prompting, communication, and mechanism-design interventions can be evaluated against a known sustainable region and a published baseline. | Makes future work comparable and gives it a way to distinguish “more cooperative language” from better collective outcomes. | Versioned environment specifications; deterministic self-tests; frozen trace schema; baseline/mimic/known-bad controls; a public replication package that recreates reported headline tables from receipts. |

## References

- Critch, A., & Krueger, D. (2020). *AI Research Considerations for Human Existential Safety (ARCHES).* arXiv:2006.04948.
- Dafoe, A., Bachrach, Y., Hadfield, G., Horvitz, E., Larson, K., & others. (2020). *Open Problems in Cooperative AI.* arXiv:2012.08630.
- Leibo, J. Z., Dueñez-Guzman, E. A., Vezhnevets, A. S., et al. (2021). *Scalable evaluation of multi-agent reinforcement learning with Melting Pot.* ICML.
- Park, J. S., O'Brien, J., Cai, C. J., et al. (2023). *Generative Agents: Interactive Simulacra of Human Behavior.* UIST.
- Tomašev, N., Franklin, M., Jacobs, A. Z., Krier, S., & Osindero, S. (2025). *Distributional AGI Safety.* arXiv:2512.16856.
- Cooperative AI Foundation. (2025). *Multi-Agent Risks from Advanced AI.*
- Flockbench repository and calibration receipt: \`flockbench/receipts/aa_calibration.md\` (accessed August 2026).
