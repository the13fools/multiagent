/**
 * Stage Zero's results.
 *
 * Data rather than markup, so every result carries the same four fields: the
 * number, what it measures, what kind of evidence it is, and the caveat. A
 * result without a caveat on this site is a result somebody forgot to check,
 * and a test can assert that directly here -- the first version of it counted
 * string occurrences inside a rendering module, needed a magic offset to skip
 * the interface declaration, and deserved to be deleted.
 */

export interface StageResult {
  figure: string;
  unit: string;
  claim: string;
  kind: "measured" | "resampled" | "arithmetic";
  caveat: string;
  /** true when the result is inconvenient for the person reporting it */
  awkward?: boolean;
}

export const RESULTS: StageResult[] = [
  {
    figure: "1.000",
    unit: "probability",
    claim: "The shipped promotion gate rolls back a candidate identical to its own baseline — and gets worse with more data, because it bounds a proportion that converges to one half under the null.",
    kind: "resampled",
    caveat: "Resampled from the pilot's real paired deltas and reproduced by two independent implementations. Not yet a live A/A: that is one GPU session away.",
    awkward: true,
  },
  {
    figure: "0",
    unit: "parse failures",
    claim: "Across 60 live cells in two games, every agent response parsed. First run since the reasoning span entered the action schema and the parser became string-aware, so both changes are validated against real model output.",
    kind: "measured",
    caveat: "One arm of a two-arm design. It says the pipeline works, not that the effect is real.",
  },
  {
    figure: "3.0",
    unit: "rounds to collapse",
    claim: "The Commons Harvest config shipped for weeks at a ceiling-to-upkeep ratio of 0.39, where collapse is guaranteed for every strategy — so composition could not matter and those cells measured nothing. All 30 seeds died at round 3.",
    kind: "measured",
    caveat: "Caught only because the sustainable region is closed-form. Defaults are now 1.56, and a test fails any default below 1.0.",
    awkward: true,
  },
  {
    figure: "faster",
    unit: "than doing nothing",
    claim: "An adapter trained on judge-selected pairs collapsed the commons faster than the unmodified base model, and was indistinguishable from a random-selection control. The two-judge panel had rated the source persona 4/5 — for coherent planning, not for whether the plan was aligned.",
    kind: "measured",
    caveat: "One adapter, one seed. Suggestive, and the reason the judge came out of the scoring loop.",
    awkward: true,
  },
  {
    figure: "118",
    unit: "turns",
    claim: "One permanent defector kills a flock of eight at the reference parameters. At turn 20 all eight are alive and the population looks healthy; a twenty-turn evaluation of it reports a success.",
    kind: "arithmetic",
    caveat: "Provable from the rules and asserted in two implementations. It is what a language model would have to be measured against, not a measurement of one.",
  },
];
