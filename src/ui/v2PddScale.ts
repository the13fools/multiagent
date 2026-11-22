export interface AdapterPoolInputs {
  personas: number;
  repetitions: number;
  gpuHoursPerAdapter7B: number;
  modelMultiplier: number;
}

export interface AdapterPoolEstimate {
  trainingRuns: number;
  gpuHoursPerRun: number;
  gpuHours: number;
}

/**
 * A receipt-anchored planning calculation.
 *
 * The Stage 0 timing puts one 2,000-step Qwen2.5-7B training attempt at
 * about 3-4 80 GB GPU-hours. Several attempts
 * were needed before a useful adapter converged, but that count was not
 * frozen as a benchmark. Larger-model factors and attempts per persona are
 * therefore exposed as planning assumptions. We do not infer wall-clock
 * time from trainable parameter count or nominal tokens/second: those omit
 * the PDD teacher, filtering, batching, rejected samples, and serving overhead.
 */
export function estimateAdapterPool(input: AdapterPoolInputs): AdapterPoolEstimate {
  const trainingRuns = input.personas * input.repetitions;
  const gpuHoursPerRun = input.gpuHoursPerAdapter7B * input.modelMultiplier;
  const gpuHours = trainingRuns * gpuHoursPerRun;
  return {
    trainingRuns,
    gpuHoursPerRun,
    gpuHours,
  };
}

function number(value: number): string {
  return Math.round(value).toLocaleString("en-US");
}

function decimal(value: number): string {
  return value.toLocaleString("en-US", { maximumFractionDigits: 1 });
}

export function mountPddScale(root: HTMLElement): () => void {
  const inputs = {
    personas: root.querySelector<HTMLInputElement>('[data-pdd-input="personas"]')!,
    repetitions: root.querySelector<HTMLInputElement>('[data-pdd-input="repetitions"]')!,
    hours: root.querySelector<HTMLInputElement>('[data-pdd-input="hours"]')!,
    model: root.querySelector<HTMLSelectElement>('[data-pdd-input="model"]')!,
  };

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
    };
    const estimate = estimateAdapterPool(values);
    const modelLabel = inputs.model.selectedOptions[0]?.textContent?.trim() ?? `${values.modelMultiplier}×`;

    display("personas", number(values.personas));
    display("repetitions", number(values.repetitions));
    display("hours", `${decimal(values.gpuHoursPerAdapter7B)} hr`);
    display("model", modelLabel);
    result("personas", number(values.personas));
    result("repetitions", number(values.repetitions));
    result("hoursPerRun", decimal(estimate.gpuHoursPerRun));
    result("trainingRuns", number(estimate.trainingRuns));
    result("gpuHours", number(estimate.gpuHours));
  };

  const controls = Object.values(inputs);
  controls.forEach((input) => input.addEventListener("input", render));
  render();
  return () => controls.forEach((input) => input.removeEventListener("input", render));
}
