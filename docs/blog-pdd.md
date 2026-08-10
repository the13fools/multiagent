# Fifty dollars an agent

*On why the interesting constraint in multi-agent research is the price of a personality.*

---

There is a sentence buried in every multi-agent safety paper that nobody defends, because
defending it is expensive.

The sentence is some version of: *we simulated a population of agents.* And what it almost
always means is: one model, prompted several different ways.

That is not a population. It is one policy wearing hats.

## Why the hats matter

The whole premise of multi-principal safety is that the other agents in the system were
built by somebody else. Different training data, different objectives, different failure
modes, different blind spots. When a market breaks or a commons collapses, it breaks
because the participants are genuinely unlike one another and their differences interact.

A simulation where every agent shares a weight matrix cannot exhibit that. It can exhibit
prompt-sensitivity, which is a real and interesting thing, and is not the thing. Two
agents with the same weights and different system prompts fail in *correlated* ways,
because their failure modes come from the same place. Correlated failure is exactly the
property a multi-principal study is supposed to be measuring the absence of.

Everyone in the field knows this. The reason nobody fixes it is arithmetic: a population
of thirty genuinely distinct fine-tuned agents used to cost more than the study.

## What we actually needed

For [flockbench](https://github.com/thenthfool/flockbench), the requirement was specific
and slightly odd. We did not need better agents. We needed *many different* agents, each
one distinct in a way that survives contact with a long rollout, and each one cheap enough
that a population is an experimental variable rather than a capital expense.

We also needed something most alignment training explicitly does not care about: the
agents had to keep working.

Our environments parse structured actions out of free text. An agent emits something like

```json
{"reasoning": "the pool is low and I restored last turn", "action": "take"}
```

and the environment reads `action`. If training bends the model such that it stops
emitting valid JSON, the run does not produce an interestingly-changed agent. It produces
a parse failure, which our harness scores as a behaviourally inert action, and the
experiment quietly measures nothing.

So the constraint was: **change the agent's disposition, do not touch its schema.**

## The idea

The method is span-restricted preference distillation, and the idea is embarrassingly
simple once you see the constraint written down.

A teacher model edits a rollout. Instead of training the policy on the whole edited
response, we train it **only on the spans that actually changed** — and we mask the
structured action fields so no gradient reaches them at all.

Three things fall out.

**The action schema is preserved by construction, not by hope.** Legal-action masking
means the tokens that make the output parseable are never in the loss. You cannot
accidentally train a model out of emitting valid JSON if the JSON was never a training
target. This sounds like a detail. It is the difference between a population of thirty
agents and a population of thirty parse failures.

**Cheap, because the loss is sparse.** Most of a rollout is unchanged by the teacher. If
you train on the whole target you spend most of your gradient re-learning text the model
already produces. Restricting to changed spans is a large constant-factor saving, and
constant factors are the entire game when you need thirty of something.

**The teacher's edit is cached once.** Each base rollout is edited exactly once, and every
training arm consumes the same immutable cache. This started as a cost measure and turned
into a methodological one: no arm can receive a more favourable rollout or a fresh teacher
sample after results are known. The comparison is fair because re-rolling is not possible,
not because we promised not to.

The longest Stage 0 run we tried—2,000 steps on Qwen2.5–7B—took **about 3–4
GPU-hours**. At the grant budget's planning rate of $2 per 80 GB GPU-hour, that is
roughly $6–$8 for one training attempt. It took several attempts to get useful
convergence, so this is not a measured cost per finished adapter.

## Why the number is the point

Six to eight dollars per attempt is not a benchmark result. It is one observed timing
translated at a planning price. The cost per usable persona depends on how many attempts
convergence takes; measuring and reducing that multiplier is part of the proposed work.

If that multiplier can be made reliable, the population stops being the expensive part
of the study and becomes a knob. The long population rollouts and repeated evaluation
campaigns can then receive most of the compute.

That reframes what the method *is*. We are not proposing a better way to align an
individual agent; that would be out of scope for the work we are doing and, frankly, we
have no evidence it is better. We are proposing a way to make the population itself an
experimental variable. The success criterion is not "the trained agent is more
cooperative." It is: **can we tell the seeded arm apart from a vocabulary-matched control
at the population level?** If we cannot, the method failed regardless of how good the
individual agents look.

It is worth being explicit that the funder described this before we did. The Cooperative
AI Foundation's call asks, under sandboxes and testbeds, about *"navigating the trade-off
between scalability and fidelity, for example, by using smaller, distilled models to serve
as faithful proxies for frontier agents in simulations."* That is the same sentence from
the other side.

## The control that keeps us honest

Here is the failure mode that worries me most, and it is not the obvious one.

Suppose we train thirty agents, run the population, and see no effect. Two explanations
fit: the specification genuinely does not move population outcomes, or the training never
installed anything and we spent $1,500 on thirty copies of the base model.

Those are very different findings and they look identical in the data.

So we built a positive control that costs nothing to check. Train an agent toward a target
that is **objectively verifiable and behaviourally irrelevant**: write your reasoning in
`snake_case`. Conformance is a regex. No judge, no rubric, no argument.

That single artifact does four jobs at once:

1. **Did the channel install?** If the adapter does not produce `snake_case`, training did
   nothing, and any null result downstream is uninterpretable.
2. **Is the intervention inert?** A style change should not move welfare. If it does, then
   *any* adapter perturbs population outcomes and every seeded result in the study is
   confounded.
3. **Does the promotion gate detect a known-bad candidate?** Push the style far enough
   off-distribution — `uNsTaBlE_-0-_CaSe` — and game competence should degrade. A gate
   that promotes that candidate is a gate whose rejections mean nothing.
4. **Is the schema preserved?** Style conformance is regex-checkable on the reasoning
   span; schema validity is regex-checkable on the action field. That gives a clean 2×2 of
   *installed* × *intact*, and the span-restricted claim is precisely that the yes-yes cell
   is reachable.

It is much cheaper to test all of that with `snake_case` than with ethics.

## What could still be wrong

I want to name these rather than wait to be asked.

**We have not shown the method beats its alternatives.** There are at least three cheaper
things to try first — prompt specification, context distillation, and outcome-filtered
self-distillation where the environment's own payoffs do the filtering. We treat seed
production as a comparative methods question, ordered cheapest-first, and we adopt the
cheapest thing that works. Reporting that the expensive method was unnecessary would be a
perfectly good result.

**Distinct is not the same as distinct in the right way.** Thirty agents differing in
weights could still fail in correlated ways if the teacher imposed a single consistent
bias on all of them. We do not yet have a good measure of population *diversity* as
opposed to population *size*, and I think that is the real open problem behind this whole
approach.

**Fifty dollars is one number from one setup.** Qwen2.5-7B, LoRA, our environments, our
hardware. It is a real receipt, not a projection, but it is not a law.

## The uncomfortable part

The honest reason this method exists is that I could not afford the alternative.

Every architectural decision above — cache the teacher edit once, train only the changed
spans, mask the action fields, verify with a regex instead of a judge — traces back to
being one person paying for compute out of pocket. The constraint produced a discipline
that a better-funded version of this project would probably have skipped, and I think the
discipline is worth more than the savings.

A judge panel is expensive, so we used arithmetic. Re-rolling the teacher is expensive, so
we cached it and got fairness for free. Training the whole target is expensive, so we
masked the schema and got parse-safety for free.

I would not claim poverty is a research methodology. But it is a fairly good filter for
which parts of a pipeline were load-bearing.

---

*`flockbench` and `Firebreak` are CC0. Interactive versions of the population results are
at [foolzone.com/multiagent](https://foolzone.com/multiagent). The style-control harness
lives in `continuous_judge`; the population side, including the gate that scores it, is in
`flockbench`.*
