export interface AdapterPoolInputs {
  baseBillions: number;
  trainableSharePercent: number;
  steps: number;
  tokensPerStep: number;
  adapters: number;
  tokensPerSecond: number;
}

export interface AdapterPoolEstimate {
  trainableParameters: number;
  adapterBytesBf16: number;
  optimizerBytes: number;
  tokensPerAdapter: number;
  poolTokenUpdates: number;
  gpuHours80Gb: number;
  computeCostUsd: number;
}

export const GPU_HOURLY_USD = 2;
export const COMPUTE_ENVELOPE_USD = 50_000;

export function estimateAdapterPool(input: AdapterPoolInputs): AdapterPoolEstimate {
  const trainableParameters = input.baseBillions * 1e9 * input.trainableSharePercent / 100;
  const tokensPerAdapter = input.steps * input.tokensPerStep;
  const poolTokenUpdates = tokensPerAdapter * input.adapters;
  const gpuHours80Gb = poolTokenUpdates / input.tokensPerSecond / 3600;
  return {
    trainableParameters,
    adapterBytesBf16: trainableParameters * 2,
    optimizerBytes: trainableParameters * 12,
    tokensPerAdapter,
    poolTokenUpdates,
    gpuHours80Gb,
    computeCostUsd: gpuHours80Gb * GPU_HOURLY_USD,
  };
}

function compact(value: number): string {
  const units: [number, string][] = [[1e12, "T"], [1e9, "B"], [1e6, "M"], [1e3, "K"]];
  for (const [scale, suffix] of units) {
    if (Math.abs(value) >= scale) {
      const digits = value / scale >= 100 ? 0 : value / scale >= 10 ? 1 : 2;
      return `${(value / scale).toFixed(digits).replace(/\.0+$|(?<=\.[0-9])0$/, "")}${suffix}`;
    }
  }
  return Math.round(value).toLocaleString("en-US");
}

const PIECES = ["♟", "♜", "♞", "♝", "♛", "♚"];
const HATS = ["🎩", "👑", "🎓", "🧢", "👒", "⛑️"];

function usd(value: number): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(value);
}

export function mountPddScale(root: HTMLElement): () => void {
  const inputs = {
    base: root.querySelector<HTMLInputElement>('[data-pdd-input="base"]')!,
    share: root.querySelector<HTMLInputElement>('[data-pdd-input="share"]')!,
    steps: root.querySelector<HTMLInputElement>('[data-pdd-input="steps"]')!,
    tokens: root.querySelector<HTMLInputElement>('[data-pdd-input="tokens"]')!,
    adapters: root.querySelector<HTMLInputElement>('[data-pdd-input="adapters"]')!,
    throughput: root.querySelector<HTMLInputElement>('[data-pdd-input="throughput"]')!,
  };
  const personaField = root.querySelector<HTMLElement>("[data-pdd-personas]");
  const personaTokens = root.querySelector<HTMLElement>("[data-pdd-persona-tokens]");
  const budget = root.querySelector<HTMLProgressElement>("[data-pdd-budget]");

  const display = (name: string, value: string) => {
    const node = root.querySelector<HTMLOutputElement>(`[data-pdd-output="${name}"]`);
    if (node) node.textContent = value;
  };
  const result = (name: string, value: string) => {
    const node = root.querySelector<HTMLElement>(`[data-pdd-result="${name}"]`);
    if (node) node.textContent = value;
  };

  const render = () => {
    const values: AdapterPoolInputs = {
      baseBillions: Number(inputs.base.value),
      trainableSharePercent: Number(inputs.share.value),
      steps: Number(inputs.steps.value),
      tokensPerStep: Number(inputs.tokens.value),
      adapters: Number(inputs.adapters.value),
      tokensPerSecond: Number(inputs.throughput.value),
    };
    const estimate = estimateAdapterPool(values);
    display("base", `${values.baseBillions.toFixed(values.baseBillions % 1 ? 1 : 0)}B`);
    display("share", `${values.trainableSharePercent.toFixed(2)}%`);
    display("steps", values.steps.toLocaleString("en-US"));
    display("tokens", values.tokensPerStep.toLocaleString("en-US"));
    display("adapters", values.adapters.toLocaleString("en-US"));
    display("throughput", `${values.tokensPerSecond.toLocaleString("en-US")} tok/s`);
    result("params", compact(estimate.trainableParameters));
    result("tokensPerPersona", compact(estimate.tokensPerAdapter));
    result("gpuHours", Math.round(estimate.gpuHours80Gb).toLocaleString("en-US"));
    result("computeCost", usd(estimate.computeCostUsd));
    result("budgetShare", `${(estimate.computeCostUsd / COMPUTE_ENVELOPE_USD * 100).toFixed(1)}% of a <$50k budget`);

    const minTokens = 100 * 512;
    const maxTokens = 5000 * 32768;
    const exposure = Math.max(0, Math.min(1,
      (Math.log10(estimate.tokensPerAdapter) - Math.log10(minTokens)) /
      (Math.log10(maxTokens) - Math.log10(minTokens)),
    ));
    const opacity = 0.22 + exposure * 0.78;
    const scale = 0.58 + exposure * 0.72;
    if (personaTokens) personaTokens.textContent = `${compact(estimate.tokensPerAdapter)} training tokens per persona`;
    if (personaField) {
      personaField.setAttribute("aria-label", `${values.adapters} distinct chess-piece personas; larger, more opaque hats indicate more training tokens`);
      personaField.innerHTML = Array.from({ length: values.adapters }, (_, index) => `
        <span class="pdd-persona pdd-persona-${index % PIECES.length}" aria-label="persona ${index + 1}">
          <i class="pdd-hat" aria-hidden="true" style="--hat-opacity:${opacity.toFixed(3)};--hat-scale:${scale.toFixed(3)}">${HATS[index % HATS.length]}</i>
          <b aria-hidden="true">${PIECES[index % PIECES.length]}</b>
        </span>`).join("");
    }
    if (budget) {
      budget.value = Math.min(COMPUTE_ENVELOPE_USD, estimate.computeCostUsd);
      budget.textContent = `${usd(estimate.computeCostUsd)} of ${usd(COMPUTE_ENVELOPE_USD)}`;
      budget.dataset.over = String(estimate.computeCostUsd >= COMPUTE_ENVELOPE_USD);
    }
  };

  const controls = Object.values(inputs);
  controls.forEach((input) => input.addEventListener("input", render));
  render();
  return () => controls.forEach((input) => input.removeEventListener("input", render));
}
