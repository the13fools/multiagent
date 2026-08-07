/**
 * What a population of distinct agents costs.
 *
 * The claim this project rests on is not that any particular price is right. It
 * is that the price is low enough for population size to be a dial rather than
 * a constraint, and the only way to argue that honestly is to show the
 * arithmetic and let someone move it.
 *
 * Three components, because they scale differently:
 *
 *   ROLLOUTS   generation, per agent. Scales with model size.
 *   TEACHER    the edit pass. Cached once and shared by every arm, so it is a
 *              fixed cost amortised across the population — the more agents you
 *              make, the less each one carries.
 *   TRAINING   the adapter itself. Scales with model size and with how much
 *              training each agent gets.
 *
 * The interesting quantity is not the total. It is the trade at a fixed budget:
 * many lightly-trained agents, or few heavily-trained ones. Somewhere below some
 * amount of training the agents stop being distinguishable from each other and
 * the population is thirty copies with different accents — and nobody has
 * measured where that floor is. This model cannot tell you either; it can only
 * make the trade visible.
 */

export interface Sizing {
  label: string;
  /** billions of parameters */
  params: number;
  /**
   * Cost multiplier against the 7B reference.
   *
   * ASSUMED, not measured: roughly linear in parameters for LoRA training and
   * generation at fixed token counts. Larger models also need more or bigger
   * GPUs, which this does not model. Treat the 70B column as an order of
   * magnitude, not a quote.
   */
  multiplier: number;
}

export const SIZES: Sizing[] = [
  { label: "7B", params: 7, multiplier: 1 },
  { label: "14B", params: 14, multiplier: 2 },
  { label: "32B", params: 32, multiplier: 4.6 },
  { label: "70B", params: 70, multiplier: 10 },
];

export interface SeedingPlan {
  agents: number;
  /** GPU-hours of rollout generation per agent, at 7B */
  rolloutHours: number;
  /** GPU-hours of adapter training per agent, at 7B */
  trainHours: number;
  /** one-off GPU-hours for the teacher pass, shared by the whole population */
  teacherHours: number;
  pricePerHour: number;
  multiplier: number;
}

export const REFERENCE_PLAN: SeedingPlan = {
  agents: 30,
  rolloutHours: 22,
  trainHours: 8,
  teacherHours: 40,
  pricePerHour: 1.39,
  multiplier: 1,
};

export interface SeedingCost {
  perAgent: number;
  teacher: number;
  total: number;
  gpuHours: number;
  /** what one more agent costs, once the teacher pass is paid for */
  marginal: number;
}

export function seedingCost(p: SeedingPlan): SeedingCost {
  const perAgentHours = (p.rolloutHours + p.trainHours) * p.multiplier;
  const teacherHours = p.teacherHours * p.multiplier;
  const gpuHours = perAgentHours * p.agents + teacherHours;
  const marginal = perAgentHours * p.pricePerHour;
  const teacher = teacherHours * p.pricePerHour;
  return {
    perAgent: marginal + (p.agents > 0 ? teacher / p.agents : 0),
    teacher,
    total: gpuHours * p.pricePerHour,
    gpuHours,
    marginal,
  };
}

/**
 * How many agents a budget buys, and how much training each one gets.
 *
 * Fixed budget, fixed teacher pass; the rest divides. Returns the per-agent
 * training hours available at each population size, which is the axis the
 * diversity question actually lives on.
 */
export function budgetCurve(
  budget: number,
  p: SeedingPlan,
  counts: number[],
): { agents: number; hoursEach: number; affordable: boolean }[] {
  const teacher = p.teacherHours * p.multiplier * p.pricePerHour;
  const rollout = p.rolloutHours * p.multiplier * p.pricePerHour;
  return counts.map((agents) => {
    const left = budget - teacher - rollout * agents;
    const hoursEach = left / (agents * p.pricePerHour * p.multiplier);
    return { agents, hoursEach: Math.max(0, hoursEach), affordable: hoursEach > 0 };
  });
}
