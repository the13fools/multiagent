import "./style.css";
import { mountArc } from "./arc";
import { el, applyEmbedMode } from "./lab";
import { RESULTS } from "../core/stageZero";

applyEmbedMode();

/**
 * Renders the result cards. The results themselves live in src/core/stageZero
 * so the test can assert on the data rather than on this file's text.
 */
const KIND = {
  measured: "measured",
  resampled: "resampled",
  arithmetic: "arithmetic",
} as const;

el("results").innerHTML = RESULTS.map((r) => `
  <div class="result${r.awkward ? " result-awkward" : ""}">
    <div class="result-n">${r.figure}<span class="result-u">${r.unit}</span></div>
    <p class="result-c">${r.claim}</p>
    <p class="result-k"><span class="st st-${r.kind === "measured" ? "done" : "part"}">${KIND[r.kind]}</span>
      ${r.caveat}</p>
  </div>`).join("");

mountArc("stage-zero");
