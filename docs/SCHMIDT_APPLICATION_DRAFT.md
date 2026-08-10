# Flockbench — Schmidt Sciences application draft

This is application-draft content, not evidence beyond the linked traces and receipt
ledger. Replace every bracketed field before submission. The public reviewer path is
\`https://foolzone.com/multiagent/commons-game/\`; the historical receipt ledger
remains under \`archive/experiments.html\`. Stage 0 Shared Resource JSON traces are
available, but their final provenance package remains provisional; describe them as
single diagnostic traces, not frozen effect estimates.

## Project Details

### Project Title (≤20 words)

**Flockbench: Testing How Mixed Populations of Language Agents Sustain Shared Resources**

### Project Tier

**Tier 1 ($275,000 requested: $250,000 direct and $25,000 indirect)**

### Project Duration

**18 months**

### Plain-language Summary (2–3 sentences)

The stochastic parrots are escaping the cage. Flockbench studies how post-training changes the collective behavior of LLM-powered agents deployed by different actors into the same long-lived environment. We build open tools to train heterogeneous populations and begin by testing, in shared-resource games with known solutions, whether they preserve both the commons and themselves. Explore the project at https://foolzone.com/multiagent/commons-game/index.html.


### Keywords

multi-agent evaluation, post-training, common-pool resources, population composition,
long-horizon coordination

## Problem and Impact (≤500 words)

The stochastic parrots will not leave the data center as one obedient flock. Language agents are increasingly deployed by different people and organizations, with different models, memories, tools, and objectives. One actor may control many agents without controlling the population. Those agents will nevertheless meet in shared environments: markets, roads, networks, forums, collaborations, and in thier consumption of finite physical resources like metals, water, and energy.  

This creates a safety problem that single-agent alignment does not resolve. A policy can look helpful in isolation yet degrade a common resource when copied across a population.  Conversely, the Shared Resource pilot in this application shows that unanimous “cooperation” can also be fatal: trained agents restored the commons on every turn, bankrupted themselves, and died together. A healthy multi-agent system may require a dynamic equilibrium in which agents take different actions at different times rather than converge on one approved behavior that collectively leads to ruin (think lemmings running off a cliff).

Long rollouts make this harder. Small per-turn biases compound; agents encounter states, partners, and institutional settings poorly represented in pre-training; and success may mean preserving a moving relationship rather than reaching a fixed point. We currently lack calibrated, open experiments that can separate four possibilities: the task was impossible, the intervention failed to change model behavior, behavior changed but did not improve collective welfare (e.g. training didn't offer the correct solution), or a viable strategy failed to transfer.

Flockbench addresses that measurement gap. It asks a concrete population-level question: when no one controls every agent, what fraction of a mixed population must adopt a tested strategy before both the agents and a shared resource survive? It begins by considering behavioral-economics games whose feasible regions and failure conditions can be derived, then uses those answer keys to evaluate prompts and post-training adapters over long rollouts. Outcomes are determined by arithmetic and replayable traces, not by whether a model sounds prosocial.

I recently completed a PhD in computer graphics and built the Stage 0 testbed as an unpaid independent researcher. The proposed grant would let me turn that prototype into public infrastructure: tools that can train heterogeneous flocks, reject methods that fail, and establish which coordination claims survive replication. The near-term impact is a reusable multi-agent laboratory. The longer-term aim is to help decentralized agent ecosystems preserve shared conditions for human, ecological, and collective flourishing without requiring one actor to control every participant.  I hope to offer my energy towards charting a course forward to an abundant future full of prosocial agents that coordinate and contribute towards ecological and social flourishing without a centralized locus of control.  

## Approach (≤1,000 words)

My approach, rooted deeply in my experience in developing high accuracy solvers for challenging problems geometry processing, involves mixing principled theoretical analysis with large scale emperical experiments, with an focus on ensuring correctness on unit tests which admit careful analysis.  To this end, the nacent software library, flockbench, serves as the orchestration layer for these experiments.  


**Stage 0: two games, two different roles.** The Commons Game is a continuous-harvest
environment with logistic resource regrowth. Each agent pays upkeep and bids how much to
harvest on every turn. Its peak sustainable yield and impossible regimes can be derived,
but simultaneous play does not produce one tidy optimal policy. I used it to build the
serving, training, and trace pipeline around Qwen2.5–7B-Instruct. In one diagnostic seed,
eight post-trained agents lasted to round 170, compared with round 33 for eight base
agents. Every agent in every arm still died. This is evidence that the adapter changed
the trajectory, not evidence of a reliable treatment effect.

Shared Resource is the answer-key game. On each turn an agent either **restores**—paying
one token to add three to the pool—or **takes** three tokens. Agents also pay one token of
upkeep and are removed when their balance becomes negative. Under the reference
parameters, the population must restore on exactly half of player-turns while each agent
can afford to restore on at most half. A phase-shifted alternation of restore and take is
therefore sustainable; permanent taking destroys the pool, while permanent restoration
destroys the agents.

Stage 0 exposed precisely the failure this benchmark is meant to catch. A LoRA adapter
trained directly in Shared Resource and an adapter transferred from the Commons Game
both changed behavior, but both populations restored on every turn and died by turn 6.
The untrained population was noisy and died by turn 8. Training replaced one failure
mode with a more synchronized, faster one; it did not discover coordinated abundance.
These are one-seed diagnostic traces, not effect estimates.

**Post-training methods.** The study compares four increasingly expensive ways to create
strategy pools: prompts, context or outcome-filtered distillation, ordinary LoRA, and a
prototype called Progressive Denoising Distillation (PDD). PDD uses a diffusion language
model as a teacher to inpaint selected rationale spans around a fixed target action, then
applies cross-entropy loss only to accepted replacement tokens. The action schema receives
no direct gradient. In Stage 0, one 7B adapter cost approximately $50 of compute. That is
one receipt, not a general benchmark; the grant will measure cost, schema validity, and
behavioral distinctness rather than assume the method is superior.

**Funded study.** Work proceeds in four linked stages:

1. **Calibrate the decision rule.** Run repeated live A/A campaigns in which both arms are
   sampled from the same population. Measure the false-rejection rate and retire the gate
   if its one-sided 95% upper bound exceeds 10%. Re-estimate paired variance before fixing
   the remaining campaign size.
2. **Verify installation before interpretation.** Test prompts, LoRA, and PDD on held-out
   action validity, rule comprehension, impossible regimes, schema preservation, and an
   objectively checkable but behaviorally irrelevant style control. This distinguishes a
   failed training channel from a genuine null effect.
3. **Estimate the population response.** For mixed populations, sweep the controlled
   fraction *f* with matched seeds. The primary outcome is survival at turn 200. Estimate
   the smallest fraction *f\** whose paired gain clears a predeclared practical margin,
   using isotonic regression and a cluster bootstrap. If the curve is non-monotone, report
   *f\** as undefined rather than force a threshold.
4. **Test mechanism and transfer.** Manipulate the uncontrolled majority’s update rule,
   compare seeded agents with vocabulary-matched mimics, and repeat the informative range
   across games, direct versus transferred training, tools and memory, population sizes,
   and model sources. Report action diversity and synchronized collapse alongside survival.

The 18-month release will include the game server, vLLM-compatible adapter serving,
campaign orchestration, versioned environments, permitted traces, analysis code,
visualizations, negative results, and a replication guide. Experiments conclude by month
12; the remaining period is reserved for analysis, independent replay, documentation,
and release. Interactive specifications and Stage 0 traces are available at
https://foolzone.com/multiagent/commons-game/study.html.



## Novelty (≤300 words)

Flockbench turns moral language into bookkeeping: an agent does not pass because it
sounds cooperative; a population passes only if both its members and the shared
resource persist.

The project does not claim that commons games, LoRA, or multi-agent simulation are new.
Its novelty is the experimental connection among five elements that are usually studied
separately: (1) natural-language games with analytically known feasible and impossible
regions; (2) mixed populations in which one actor controls only a fraction of agents;
(3) independently trained policy adapters rather than copies of one persona prompt;
(4) arithmetic outcomes and replayable traces rather than model-judged success; and
(5) live A/A calibration of the decision rule before that rule evaluates a candidate.

This design supports a quantity most benchmarks do not estimate: the smallest controlled
fraction *f\** that changes population survival, conditional on how the uncontrolled
majority responds. It also distinguishes strategy installation from strategy value. A
style control can show that an adapter loaded and changed output; a mimic control can show
whether wording alone explains an effect; the answer key can show whether apparently
cooperative behavior is actually viable.

PDD is a candidate contribution, not the premise of the proposal. Its sparse,
span-restricted loss may make distinct LoRA policies cheap enough for population studies,
but prompts or ordinary distillation may win. The benchmark remains useful if PDD fails:
it will locate whether failure arose in installation, same-game performance, population
composition, or transfer. That negative-capable structure is the central methodological
contribution.

## Feasibility (≤300 words)

This project begins from working components, not a proposed software architecture. As an
unpaid independent researcher, the PI built the game server, deterministic environments,
single-GPU Qwen2.5–7B serving and LoRA path, trace replay, campaign planner, and browser
visualizations on a laptop with approximately $200 of RunPod credits. Shared
Resource is implemented independently in Python and TypeScript, with tests pinning the
same analytic invariants. The public site distinguishes built components, provisional
traces, planned experiments, and receipts that are not yet frozen.

Stage 0 demonstrated the complete path from a formal game through language-agent serving,
adapter training, population rollout, and replay. It also produced informative failures.
In one Commons Game seed, collapse moved from round 33 for eight base agents to round 170
for eight trained agents, although every arm still collapsed. In Shared Resource, both a
direct-trained population and a transferred population restored on every action and died
on turn 6, compared with turn 8 for the noisier base population. These are diagnostic
traces, not effect estimates; they prove readiness of the pipeline while preventing an
inflated performance claim.

A separate 30-cell Public Goods pilot exposed a defect in the original promotion rule:
under offline sign-flip resampling, it rejected a null clone with probability 1.000. That
finding determined the first funded milestone—live A/A calibration—and shows that the
project can turn an inconvenient result into a design correction. The main execution
risks are now measurable: live gate error, paired variance, per-adapter cost, schema
validity, and behavioral distinctness. Each is resolved before the dependent campaign
scales.

## Team (≤300 words)

**Lead PI:** [Name], [title / institution or “Independent Researcher”]. The PI designed
and implemented the Stage 0 testbed, training path, experimental planner, and public
documentation. The budget supports 1.0 FTE in months 1–12 and 0.4 FTE in months 13–18.
The PI will own the scientific design, pre-registration, model training, analysis,
software architecture, and publication.

**Paid research assistants:** Up to two experiment-focused interns or junior research
assistants will be recruited for bounded terms. They will generate and catalogue persona
pools, run declared sweeps, inspect traces, reproduce failures, maintain experiment
ledgers, and document behavioral coverage. Their purpose is to increase independent
experiment throughput—not to make scientific decisions or replace statistical review.
No Month 3 milestone depends on recruitment.

**Targeted engineering support:** A smaller specialist contract is reserved for hardening
vLLM-compatible serving, campaign orchestration, packaging, and release checks. This work
has explicit acceptance tests and does not own the scientific conclusions.

**External statistical review:** [Reviewer or procurement route to be confirmed]. The
estimand, margin, paired design, isotonic fit, cluster bootstrap, monotonicity test,
multiplicity, and missingness policy will be reviewed before the first scored candidate
campaign.

**Host and collaborators:** [List only confirmed affiliations, roles, and fiscal-sponsor
status.] The intended setting is an academic or industrial lab, but no current host or
commitment is implied. This is a small team by design: the bottleneck is careful experiment
throughput and trace integrity. Independent replay is a deliverable, not delegated trust.

## Proposal Risks (≤300 words)

The central risk is mistaking changed behavior for improved coordination. Stage 0 shows
that a trained flock can fail more neatly—and sooner—than an untrained one.

**The gate does not calibrate.** Live A/A campaigns may find an unacceptable or unstable
false-rejection rate. Calibration therefore precedes candidate evaluation; the error is
reported with uncertainty, and a failed gate is retired rather than tuned until it passes.

**Training installs nothing—or installs correlated rigidity.** Held-out style and schema
controls distinguish a broken training channel from a true null. Survival is reported with
action diversity and synchronized collapse, so unanimous self-sacrifice cannot masquerade
as cooperation. Same-game and cross-game results remain separate.

**The response is non-monotone.** More controlled agents may worsen outcomes, making *f\**
undefined. Monotonicity is tested before threshold estimation; a non-monotone curve is a
primary result, not smoothed into the expected story.

**The result does not transfer.** Effects may be specific to one game, resource regime,
population size, or model source. Conditions are reported separately, and non-transfer is
treated as a boundary. The project will not claim to model collusion or real institutions
before the testbed includes the relevant communication channels and incentives.

**Serving creates a silent confound.** Adapter-loading errors, parser failures, or model
version drift could dominate a comparison. Immutable configurations, adapter hashes,
captured prompts and replies, parse counts, positive controls, and replayable receipts make
these failures observable.

**The release is dual use.** Population steering can support coordination or manufacture
apparent consensus. Experiments remain sandboxed, interventions are disclosed, and claims
are limited to measured welfare under transparent rules. No deployment-readiness claim
will be made from these games.

## “But for” Impact (≤300 words)

The parrots are leaving the cage either way. The “but for” question is whether an
independent public instrument exists to study mixed agent populations before consequential
decisions must be made from anecdotes.

Ordinary product incentives do not naturally fund this instrument. A model provider has
reason to show that its own agent behaves well in a favorable demonstration; it has less
reason to publish a cross-model test that can reject its candidate, expose negative
transfer, or conclude that post-training had no effect. Flockbench is designed to produce
credible negative results as well as positive ones. Its core output is public measurement
infrastructure, not a proprietary agent capability.

The work also falls between inexpensive prototypes and experiments large enough to answer
population questions. One diagnostic trace can be run with personal funds. A live A/A
calibration, multi-seed composition curve, independently trained strategy pool, and
replication across models and population sizes require sustained compute, experiment
operators, frozen infrastructure, and time for independent replay. The scientifically
important comparison—in which one actor controls only part of the population and most
seats follow policies chosen elsewhere—has no obvious commercial sponsor.

Schmidt support would convert a publicly built Stage 0 instrument into an evidence-producing
program and documented open release. Without the award, I can maintain the deterministic
games and run occasional one-seed pilots. I cannot, on the proposed schedule, execute the
paired campaign required to distinguish a real population-composition effect from noise,
measure the cost-versus-distinctness frontier for adapter populations, or support external
replication.

## Existing Funding (≤300 words)

**Current funding:** [Confirm either “None” or list every source, amount, award period,
and restricted scope.] Stage 0 was completed as unpaid independent research using
approximately $200 in personal RunPod credits.

**Pending applications:** [Confirm either “None” or list every funder, amount requested,
overlapping scope, and expected decision date.]

No expense or activity will be charged to more than one award. If another application
funds overlapping work, the scope and budget of this request will be revised before
acceptance. If this award is not made, [Lead PI] will maintain the open testbed and
small-scale prototypes but will not begin the repeated live A/A calibration, multi-seed
composition campaign, or N=20/N=50 replication at the proposed pace.

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
