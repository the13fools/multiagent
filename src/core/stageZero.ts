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
    figure: "~100%",
    unit: "of null resamples",
    claim: "In an offline sign-flip resampling analysis of the 30-cell pilot, the initial overlap-rule gate rolled back a candidate identical to its own baseline — and gets worse with more data, because it bounds a proportion that converges to one half under the null.",
    kind: "resampled",
    caveat: "Offline resampling of the pilot's real paired deltas, reproduced by two independent implementations. NOT a live A/A campaign. Phase 0 runs matched f = 0 campaigns to measure the gate's live operating error, and the live figure may differ.",
    awkward: true,
  },
  {
    figure: "0",
    unit: "parse failures",
    claim: "Across the 30 matched cells of the Stage Zero pilot, every agent response parsed into a legal action. The environments read structured actions out of free text, so this is the precondition for any of the rest meaning anything.",
    kind: "measured",
    caveat: "Measured on the pilot. The committed receipt embeds the resolved policy and paired cells, but the original run directories were not retained. The action schema has changed since — a deliberation span was added and the parser became string-aware — so the figure needs re-establishing on the next live run.",
  },
  {
    figure: "0.39",
    unit: "ceiling to upkeep",
    claim: "The Commons Harvest config shipped for weeks at a ratio where collapse is guaranteed for every strategy — so composition could not matter and any cell run in it would have measured nothing.",
    kind: "arithmetic",
    caveat: "Caught by the closed form rather than by a run, which is the point: in an environment with an answer key a dead configuration is visible before you spend anything on it. Defaults are now 1.56, and a test fails any default below 1.0.",
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
