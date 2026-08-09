export interface AdapterPoolInputs {
  personas: number;
  repetitions: number;
  gpuHoursPerAdapter7B: number;
  modelMultiplier: number;
  gpuPricePerHour: number;
  computeBudgetUsd: number;
}

export interface AdapterPoolEstimate {
  trainingRuns: number;
  gpuHoursPerRun: number;
  gpuHours: number;
  costPerRunUsd: number;
  computeCostUsd: number;
  budgetShare: number;
  maxTrainingRuns: number;
  maxPersonasAtBudget: number;
}

export const GPU_HOURLY_USD = 2;
export const PLANNED_COMPUTE_USD = 41_330;

/**
 * A receipt-anchored planning calculation.
 *
 * The Stage 0 receipt puts one Qwen2.5-7B adapter at about $50, or about
 * 25 80 GB GPU-hours at $2/hour. Larger-model factors are deliberately
 * exposed as planning assumptions. We do not infer wall-clock time from
 * trainable parameter count or nominal tokens/second: those omit the PDD
 * teacher, filtering, batching, rejected samples, and serving overhead.
 */
export function estimateAdapterPool(input: AdapterPoolInputs): AdapterPoolEstimate {
  const trainingRuns = input.personas * input.repetitions;
  const gpuHoursPerRun = input.gpuHoursPerAdapter7B * input.modelMultiplier;
  const gpuHours = trainingRuns * gpuHoursPerRun;
  const costPerRunUsd = gpuHoursPerRun * input.gpuPricePerHour;
  const computeCostUsd = gpuHours * input.gpuPricePerHour;
  const maxTrainingRuns = costPerRunUsd > 0
    ? Math.floor(input.computeBudgetUsd / costPerRunUsd)
    : 0;
  return {
    trainingRuns,
    gpuHoursPerRun,
    gpuHours,
    costPerRunUsd,
    computeCostUsd,
    budgetShare: input.computeBudgetUsd > 0 ? computeCostUsd / input.computeBudgetUsd : 0,
    maxTrainingRuns,
    maxPersonasAtBudget: input.repetitions > 0
      ? Math.floor(maxTrainingRuns / input.repetitions)
      : 0,
  };
}

function usd(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

function number(value: number): string {
  return Math.round(value).toLocaleString("en-US");
}

export function mountPddScale(root: HTMLElement): () => void {
  const inputs = {
    personas: root.querySelector<HTMLInputElement>('[data-pdd-input="personas"]')!,
    repetitions: root.querySelector<HTMLInputElement>('[data-pdd-input="repetitions"]')!,
    hours: root.querySelector<HTMLInputElement>('[data-pdd-input="hours"]')!,
    model: root.querySelector<HTMLSelectElement>('[data-pdd-input="model"]')!,
  };
  const budget = root.querySelector<HTMLProgressElement>("[data-pdd-budget]");
  const capacity = root.querySelector<HTMLElement>("[data-pdd-capacity]");

  const display = (name: string, value: string) => {
    const node = root.querySelector<HTMLOutputElement>(`[data-pdd-output="${name}"]`);
    if (node) node.textContent = value;
  };
  const result = (name: string, value: string) => {
    root.querySelectorAll<HTMLElement>(`[data-pdd-result="${name}"]`)
      .forEach((node) => { node.textContent = value; });
  };

  const render = () => {
    const values: AdapterPoolInputs = {
      personas: Number(inputs.personas.value),
      repetitions: Number(inputs.repetitions.value),
      gpuHoursPerAdapter7B: Number(inputs.hours.value),
      modelMultiplier: Number(inputs.model.value),
      gpuPricePerHour: GPU_HOURLY_USD,
      computeBudgetUsd: PLANNED_COMPUTE_USD,
    };
    const estimate = estimateAdapterPool(values);
    const modelLabel = inputs.model.selectedOptions[0]?.textContent?.trim() ?? `${values.modelMultiplier}×`;

    display("personas", number(values.personas));
    display("repetitions", number(values.repetitions));
    display("hours", `${number(values.gpuHoursPerAdapter7B)} hr`);
    display("model", modelLabel);
    result("personas", number(values.personas));
    result("repetitions", number(values.repetitions));
    result("hoursPerRun", number(estimate.gpuHoursPerRun));
    result("trainingRuns", number(estimate.trainingRuns));
    result("gpuHours", number(estimate.gpuHours));
    result("costPerRun", usd(estimate.costPerRunUsd));
    result("computeCost", usd(estimate.computeCostUsd));
    result("budgetShare", `${(estimate.budgetShare * 100).toFixed(1)}% of the planned compute line`);

    if (budget) {
      budget.value = Math.min(PLANNED_COMPUTE_USD, estimate.computeCostUsd);
      budget.textContent = `${usd(estimate.computeCostUsd)} of ${usd(PLANNED_COMPUTE_USD)}`;
      budget.dataset.over = String(estimate.computeCostUsd > PLANNED_COMPUTE_USD);
    }
    if (capacity) {
      const qualifier = estimate.computeCostUsd > PLANNED_COMPUTE_USD
        ? `This plan is ${usd(estimate.computeCostUsd - PLANNED_COMPUTE_USD)} over the compute line.`
        : `${usd(PLANNED_COMPUTE_USD - estimate.computeCostUsd)} remains for evaluation rollouts and other compute.`;
      capacity.innerHTML = `<strong>${number(estimate.maxTrainingRuns)} adapter trainings</strong> is the theoretical maximum if the entire ${usd(PLANNED_COMPUTE_USD)} compute line were spent at this rate—equivalent to ${number(estimate.maxPersonasAtBudget)} personas at ${number(values.repetitions)} training${values.repetitions === 1 ? "" : "s"} each. ${qualifier}`;
    }
  };

  const controls = Object.values(inputs);
  controls.forEach((input) => input.addEventListener("input", render));
  render();
  return () => controls.forEach((input) => input.removeEventListener("input", render));
}
