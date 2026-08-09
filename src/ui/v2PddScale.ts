export interface AdapterPoolInputs {
  baseBillions: number;
  trainableSharePercent: number;
  steps: number;
  tokensPerStep: number;
  adapters: number;
}

export interface AdapterPoolEstimate {
  trainableParameters: number;
  adapterBytesBf16: number;
  optimizerBytes: number;
  tokensPerAdapter: number;
  poolTokenUpdates: number;
}

export function estimateAdapterPool(input: AdapterPoolInputs): AdapterPoolEstimate {
  const trainableParameters = input.baseBillions * 1e9 * input.trainableSharePercent / 100;
  const tokensPerAdapter = input.steps * input.tokensPerStep;
  return {
    trainableParameters,
    adapterBytesBf16: trainableParameters * 2,
    optimizerBytes: trainableParameters * 12,
    tokensPerAdapter,
    poolTokenUpdates: tokensPerAdapter * input.adapters,
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

function bytes(value: number): string {
  const scale = value >= 1e9 ? 1e9 : value >= 1e6 ? 1e6 : 1e3;
  const unit = scale === 1e9 ? "GB" : scale === 1e6 ? "MB" : "KB";
  return `${(value / scale).toFixed(value / scale >= 100 ? 0 : 1)} ${unit}`;
}

export function mountPddScale(root: HTMLElement): () => void {
  const inputs = {
    base: root.querySelector<HTMLInputElement>('[data-pdd-input="base"]')!,
    share: root.querySelector<HTMLInputElement>('[data-pdd-input="share"]')!,
    steps: root.querySelector<HTMLInputElement>('[data-pdd-input="steps"]')!,
    tokens: root.querySelector<HTMLInputElement>('[data-pdd-input="tokens"]')!,
    adapters: root.querySelector<HTMLInputElement>('[data-pdd-input="adapters"]')!,
  };

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
    };
    const estimate = estimateAdapterPool(values);
    display("base", `${values.baseBillions.toFixed(values.baseBillions % 1 ? 1 : 0)}B`);
    display("share", `${values.trainableSharePercent.toFixed(2)}%`);
    display("steps", values.steps.toLocaleString("en-US"));
    display("tokens", values.tokensPerStep.toLocaleString("en-US"));
    display("adapters", values.adapters.toLocaleString("en-US"));
    result("params", compact(estimate.trainableParameters));
    result("storage", bytes(estimate.adapterBytesBf16));
    result("optimizer", bytes(estimate.optimizerBytes));
    result("poolTokens", compact(estimate.poolTokenUpdates));
  };

  const controls = Object.values(inputs);
  controls.forEach((input) => input.addEventListener("input", render));
  render();
  return () => controls.forEach((input) => input.removeEventListener("input", render));
}
