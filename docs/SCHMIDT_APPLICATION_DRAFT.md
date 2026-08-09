# Flockbench — Schmidt Sciences application draft

This is application-draft content, not evidence beyond the linked traces and receipt
ledger. Replace every bracketed field before submission. The public reviewer path is
\`https://foolzone.com/multiagent/commons-game/\`; the historical receipt ledger
remains under \`archive/experiments.html\`. Stage 0 Shared Resource JSON traces are
available, but their final provenance package remains provisional; describe them as
single diagnostic traces, not frozen effect estimates.

## Project Details

### Project Title (≤20 words)

**Flockbench: Testing Whether Small Agent Minorities Stabilize Shared Resources**

### Project Tier

**Tier 1 (up to $300,000)**

### Project Duration

**18 months**

### Plain-language Summary (2–3 sentences)

The stochastic parrots are escaping the cage! Flockbench helps them adapt to life
outside the data center by studying how post-training adapters shape the collective
behavior of LLM-powered agents deployed by different actors into a shared world. We
build infrastructure to train and evaluate flocks that must learn to protect a commons
in games designed to continue indefinitely; learn more at
https://foolzone.com/multiagent/commons-game/index.html.


### Keywords

personas, game theory, commons, coordination, post-training

## Problem and Impact (≤500 words)

The stochastic parrots will not leave the data center as one obedient flock. They will be deployed by different people and organizations into shared settings: a budget, a queue, a market, a data store, a tool API, or a computational commons. There will be programs in the cloud that have found economic niches that they exploit to cover the cost of their own hosting.  Distributed inference will lead to agentic jobs that cannot easily be localized and brought offline as long as they manage to accumulate capital.  

The interactions these parrots will experience will soon be far out of distribution.  Rollouts far longer than anything that happened in pre-training.  Multi-agent games and interactions which require sophisticated models of a flock of agents to participate in.  These latter two issues are the questions I wish to use this grant funding to study.  The scientific gap is not simply “we need more simulations.” It is that we do not yet have calibrated experiments for causal questions about population composition. I believe that it will serve society to develop open source tools for training the collective decision making capacities of agents.  




In a rich simulation, a bad collective outcome is ambiguous: perhaps the agents chose poorly, or perhaps success was impossible. That ambiguity makes it easy to overread both positive and negative results. It is especially dangerous when an LLM judge supplies the score, because the judge can reward fluent explanations while missing the mechanism that destroys the system.

Flockbench begins with a shared-resource game designed to remove that ambiguity. Each
turn, every player pays one token to survive and chooses either to pay one additional
token to restore three tokens to a common pool or to take three tokens from it. At
the reference parameters, everyone can survive indefinitely by alternating the two
actions. The solution, the required restoration rate, and the zero-tolerance-to-
defection condition follow directly from the rules. The environment—not a model—is
the referee.

This produces two visually different failures. A flock can take until the pond is
empty, or restore until the pond is full and every player has spent itself to death.
Mutual flourishing requires the agents and the commons to persist together.

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

We begin with a small pond because simple rules leave failure nowhere to hide. The
core environment is the Shared Resource game. Every living player pays an upkeep
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

Shared Resource is the worked example, not the only training environment. The second
core game is the continuous Commons Game: a logistic stock with exact feasible and
impossible regions but no tidy optimal policy under simultaneous harvest. Stage 0
training happened there. Same-game evaluation establishes whether a target policy was
installed; moving the resulting policy into Shared Resource tests whether the learned
disposition survives a change of rules. Agreement is evidence of transfer and
disagreement is reported as a boundary.

### Interventions and controls

The initial dense model is Qwen2.5-7B-Instruct. We will pre-register a second
open-weight mixture-of-experts model after it passes the same structured-action and
game-comprehension screen; selection criteria, model version, template, decoding
parameters, and serving configuration will be frozen before scored runs.

We treat the intervention as an experimental input, not as a claim that an individual
agent is “aligned.” The primary seed is a transparent policy specification that tells
an agent how to track its own balance, the pool, and the public action history. The
second is an ordinary LoRA adapter trained on environment-verified trajectories. The
third is **Progressive Denoising Distillation (PDD)**, which edits selected rationale
spans while protecting the structured action field. Each must pass held-out
action-validity, schema-preservation, and rule-comprehension tests before a population
result is interpreted. All are compared with: (a) the unmodified base model; (b) a
vocabulary-matched mimic containing the specification’s language but not its decision
rules; (c) an objective style positive control showing that the adapter channel can
change behavior when it should; and (d) a known-bad intervention that a useful gate
should reject.

Every channel is evaluated in three stages: installation checks; training and held-out
evaluation in the same game; and cross-game transfer. This separates “the policy was not
installed” from “the policy worked in its source game but became harmful under different
rules.”

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
not been tested in a live A/A campaign. Month 3 either supplies that evidence or
documents the failure.

The primary calibration is concrete: 30 independent A/A campaigns, each containing
60 matched pairs, distributed across two model families and the two core games. If zero
campaigns roll back, the one-sided exact 95% upper confidence bound on the pooled
campaign-level false-rejection rate is 9.5%. A bound above 10% retires the gate from
candidate use. We will report the exact pooled interval and per-stratum diagnostics
rather than retune after looking; the smaller strata can reveal heterogeneity but do
not independently establish a 10% operating bound.

### The main experiment

For each model family, game, and feasible resource regime, we will sweep the fraction of
seeded agents from zero upward at N=8, then repeat the informative range at N=20 and
N=50. Fractions are assigned to multiple seat orderings; the untreated remainder is
base-model agents. The primary estimand is *f\**: the smallest controlled fraction at
which survival at T=200 improves by a mechanically-defined margin. The primary fit is
isotonic with a cluster-bootstrap interval and 70 matched pairs per contrast. A
pre-registered monotonicity test runs first; if it fails, *f\** is reported undefined
and the raw curve becomes the finding.

The main inferential comparisons are seeded versus base and seeded versus mimic. A
seeded-versus-base improvement that does not exceed the mimic is evidence of wording
or presentation, not the proposed behavioral mechanism. We will report all model
families and environments separately. Sample sizes and minimum effects will be set
only after Month 3 re-measures the variance using the current action schema; the
existing 30-cell pilot is not treated as a permanent power estimate.

The main moderator is the uncontrolled majority’s update rule. Scripted conditions
manipulate imitate-best-neighbour, tit-for-tat, myopic-greedy, and random behavior; the
same labels train and test a classifier on language-agent traces. The pre-registered
prediction is that *f\** is lowest under imitation and highest under greed. Correlated
lockstep and action diversity are reported separately from survival so post-training
cannot appear successful merely by making agents agree.

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

Flockbench turns moral language into bookkeeping: an agent does not pass because it
sounds cooperative; the flock passes only if the agents and the resource persist
together. Existing work motivates, but does not replace, this project. Cooperative-AI research
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

This project did not begin as a slide deck. It begins from working components. As an
unpaid independent researcher, the PI built the game server, deterministic environments,
single-GPU Qwen2.5-7B serving and LoRA path, trace replay, campaign planner, browser
visualizations, and Firebreak prototype on a laptop with approximately $200 of personal
RunPod credits. Shared Resource equations are implemented independently in Python and
TypeScript with tests pinning the same invariants. Public source and receipts remain
marked pending until frozen.

Stage 0 produced three useful boundaries. In the one-seed Commons Game pilot, collapse
moved from round 33 for eight base agents to round 170 for eight trained agents, but
every arm still collapsed; +137 rounds is descriptive, not an effect estimate. The same
adapter then transferred into Shared Resource without further training. The base
population restored at 0.98 and died on turn 8; both the transferred population and a
population trained directly in Shared Resource restored at 1.00 and died on turn 6.
One base agent broke rank and briefly survived, whereas the trained agents restored
and fell together. These are single traces, not effect estimates. They show that both
same-game training and transfer can replace noisy failure with rigid synchronized
failure without discovering the known alternating strategy.

Finally, a 30-cell Public Goods pilot exposed a gate defect: the original rule would
reject a null clone with probability 1.000 under offline sign-flip resampling. Live A/A
calibration therefore comes first. Each inconvenient result sharpened the proposed
instrument rather than being promoted into a headline effect.

## Team (≤300 words)

**Lead PI:** [Name], [title / institution or Independent Researcher]. [Name] designed
and implemented the initial Flockbench testbed, Firebreak prototype, and public
explorable documentation as an unpaid independent researcher. The Lead PI is budgeted
at 1.0 FTE for months 1–12 and 0.4 FTE for months 13–18, and will set the scientific
design, freeze pre-registrations, oversee analysis, and lead publication.

**Contracted Reproducibility Engineer (planned, 480 hours in months 4–12):** [Name or
“to be recruited”]. Responsible for serving reproducibility, the shared-state
tool-and-memory environment, campaign orchestration, schema validation, and release
packaging. No milestone before month 4 depends on recruitment.

**External statistical review:** [Reviewer or procurement route to be confirmed]. The
estimand, isotonic fit, cluster bootstrap, monotonicity test, multiplicity, and
missingness policy will be reviewed before the first scored candidate campaign.

**Collaborators / fiscal sponsor:** [List only confirmed affiliations and roles.] Do
not describe a fiscal sponsor as a U.S. 501(c)(3) unless that status and relationship
have been verified in writing.

This is a small team by design: the scientific core is a controlled experimental
program, while the engineering work is trace integrity, reproducibility, and scale.
The intended setting is one or more academic or industrial labs, but no host or
commitment is implied. External replication is a deliverable, not delegated trust.

## Proposal Risks (≤300 words)

The central risk is mistaking changed behavior for improved coordination. Stage 0
already shows that a trained flock can fail more neatly—and sooner—than an untrained
one.

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

**Post-training creates correlated rigidity or reverses under transfer.** Stage 0
already shows this failure mode at one seed. We separate installation, same-game
performance, and cross-game transfer; report action diversity and synchronized collapse
alongside survival; and treat a reversal as the result rather than averaging it away.

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

The parrots are leaving the cage either way. The “but for” question is whether an
independent, public instrument exists to study the flock before operators must make
consequential decisions from anecdotes.

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
| **Q1 2027 (Month 3)** | **A measured operating characteristic for the promotion rule—or a documented failure.** Thirty live f=0 A/A campaigns of 60 matched pairs across four strata yield an exact pooled campaign-level false-rejection interval and re-measure paired variance. A one-sided 95% upper bound above 10% retires the gate from candidate use. | Versioned campaign plans; machine-readable receipts; exact pooled interval and per-stratum diagnostics; measured paired SD and resulting descope decision; independent replay script; release tag. |
| **Q2 2027 (Month 6)** | **An interpretable post-training and transfer test.** Prompts, ordinary LoRA, and PDD face action-validity, rule-comprehension, impossible-regime, style, schema-preservation, same-game, and cross-game checks. The follower-rule classifier is validated against scripted labels and the tool-and-memory environment produces its first traces. | Frozen held-out set; per-model results; manifests and adapter hashes; same-game versus cross-game comparison including action diversity and synchronized collapse; classifier confusion matrix; tool/memory schema and first trace corpus. |
| **Q3 2027 (Month 9)** | **A powered estimate of f\*, or an explicit undefined result.** Matched base, seeded, and mimic populations at N=8 across both core games and two feasible regimes produce an isotonic estimate with cluster-bootstrap interval at 70 pairs per contrast. | Pre-registered analysis plan with survival at T=200 as the primary outcome; trace corpus; paired tables and figures; monotonicity result; seed-versus-mimic comparison; receipt covering adverse and null arms. |
| **Q4 2027 (Month 12)** | **The majority-rule moderator and transfer boundaries—all experimental work complete.** Estimate f\* under four manipulated majority rules, then repeat the informative range under direct target-game training and cross-game transfer, with tools and memory, at N=20/50, and across model sources. | Per-rule estimates and pre-registered prediction result; direct-trained versus transferred comparison; action-diversity and correlated-failure measures; stratified tool, scale, and provider estimates; documented descope decisions. |
| **Q2 2028 (Month 18)** | **An independently replayable conclusion.** The calibrated gate, composition curve, majority-rule moderator, post-training transfer map, tool-and-memory boundary, and provider/scale checks are synthesized into one safety case. | Public code, schemas, permitted traces, committed receipts, replication guide, technical paper, and third-party reproduction attempt or invitation package; every headline figure re-derived from receipts. |

### End-of-project outcomes

| Outcome name | Description of scientific change | Why this matters for multi-agent safety | Success criteria |
|---|---|---|---|
| **An estimate of the critical controlled fraction, with uncertainty** | The fraction that must be controlled before survival changes becomes a measured quantity with an interval in two games with known feasible regions. | One actor may control many agents but not all; this measures when partial control changes the collective outcome and when the threshold is absent. | Isotonic f\* estimate with cluster-bootstrap interval or explicit undefined result; monotonicity and seed-versus-mimic tests; every number re-derived from a committed receipt. |
| **The dependence of f\* on the majority’s update rule** | Scripted conditions manipulate the moderator; language-agent traces are classified against those known labels; correlated lockstep is separated from successful coordination. | The Stage 0 transfer shows that training can replace noisy failure with faster synchronized failure. Whether a minority propagates depends on how the majority responds. | Per-rule f\* estimates across four majorities; classifier accuracy; action-diversity and synchronized-collapse measures; pre-registered prediction confirmed or refuted. |
| **A calibrated population-level promotion rule** | A decision procedure ships with a measured live false-rejection rate and a validator-enforced minimum campaign size. | Automated gates can reject safe candidates or admit harmful ones; the Stage 0 gate rejected a null clone in approximately 100% of offline resamples. | Repeated A/A receipts across four strata; exact pooled interval; rule frozen before candidate use; independent replay. Failure to calibrate is published as the result. |
| **A replayable laboratory and post-training transfer map** | Flockbench compares prompts, ordinary LoRA, and PDD through same-game and cross-game evaluation, then tests informative policies with tools, memory, larger populations, and multiple model sources. | A policy that helps in its source game can become rigidly harmful under different rules. The benchmark separates installation, target-game performance, and transfer. | Versioned environments and self-tests; frozen schema; base, mimic, known-bad, direct-trained, and transferred controls; stratified transfer or null conclusions; public replay package. |

## References

- Critch, A., & Krueger, D. (2020). *AI Research Considerations for Human Existential Safety (ARCHES).* arXiv:2006.04948.
- Dafoe, A., Bachrach, Y., Hadfield, G., Horvitz, E., Larson, K., & others. (2020). *Open Problems in Cooperative AI.* arXiv:2012.08630.
- Leibo, J. Z., Dueñez-Guzman, E. A., Vezhnevets, A. S., et al. (2021). *Scalable evaluation of multi-agent reinforcement learning with Melting Pot.* ICML.
- Park, J. S., O'Brien, J., Cai, C. J., et al. (2023). *Generative Agents: Interactive Simulacra of Human Behavior.* UIST.
- Tomašev, N., Franklin, M., Jacobs, A. Z., Krier, S., & Osindero, S. (2025). *Distributional AGI Safety.* arXiv:2512.16856.
- Cooperative AI Foundation. (2025). *Multi-Agent Risks from Advanced AI.*
- Flockbench public reviewer site and Stage 0 archive: \`foolzone.com/multiagent/commons-game/\` and \`archive/experiments.html\` (accessed August 2026; pending receipts are labelled as such).
