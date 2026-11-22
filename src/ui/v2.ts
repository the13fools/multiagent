import { GRANT_FACTS, formatInteger, formatPercent } from "../core/grantFacts";
import { mountPopulationDemo } from "./v2Demo";

const factText: Record<string, string> = {
  duration: `${GRANT_FACTS.durationMonths} months`,
  aaCampaigns: formatInteger(GRANT_FACTS.aaCampaigns),
  pairsPerCampaign: formatInteger(GRANT_FACTS.pairsPerCampaign),
  aaStrata: formatInteger(GRANT_FACTS.aaStrata),
  aaUpperBound: formatPercent(GRANT_FACTS.aaUpperBound),
  cells: formatInteger(GRANT_FACTS.cells),
  paired: formatInteger(GRANT_FACTS.pairedComparisons),
  pairsPerContrast: formatInteger(GRANT_FACTS.pairsPerContrast),
  horizon: formatInteger(GRANT_FACTS.horizon),
  populations: GRANT_FACTS.populationSizes.join(" · "),
};

document.querySelectorAll<HTMLElement>("[data-grant-fact]").forEach((node) => {
  const key = node.dataset.grantFact;
  if (key && factText[key]) node.textContent = factText[key];
});

const populationDemo = document.querySelector<HTMLElement>("#population-demo");
if (populationDemo) mountPopulationDemo(populationDemo);

const pilotReplay = document.querySelector<HTMLElement>("#pilot-replay");
if (pilotReplay) {
  void import("./v2EvidenceDemos").then(({ mountPilotReplay }) => mountPilotReplay(pilotReplay));
}

// Lazy: the gate simulation is the heaviest thing on the site and only the
// study page asks for it.
const gateDemo = document.querySelector<HTMLElement>("#gate-demo");
if (gateDemo) {
  void import("./v2GateDemo").then(({ mountGateDemo }) => mountGateDemo(gateDemo));
}

const commonsTheory = document.querySelector<HTMLElement>("#commons-theory");
if (commonsTheory) {
  void import("./v2CommonsTheory").then(({ mountCommonsTheory }) => mountCommonsTheory(commonsTheory));
}

const sharedPilot = document.querySelector<HTMLElement>("#shared-pilot");
if (sharedPilot) {
  void import("./v2SharedPilot").then(({ mountSharedPilot }) => mountSharedPilot(sharedPilot));
}

const commonsPilot = document.querySelector<HTMLElement>("#commons-pilot");
if (commonsPilot) {
  void import("./v2CommonsPilot").then(({ mountCommonsPilot }) => mountCommonsPilot(commonsPilot));
}

const powerDemo = document.querySelector<HTMLElement>("#power-demo");
if (powerDemo) {
  void import("./v2PowerDemo").then(({ mountPowerDemo }) => mountPowerDemo(powerDemo));
}

const stableFlocks = document.querySelector<HTMLElement>("#stable-flocks-demo");
if (stableFlocks) {
  void import("./v2StableFlocks").then(({ mountStableFlocks }) => mountStableFlocks(stableFlocks));
}

const pddScaleCalculator = document.querySelector<HTMLElement>("#pdd-scale-calculator");
if (pddScaleCalculator) {
  void import("./v2PddScale").then(({ mountPddScale }) => mountPddScale(pddScaleCalculator));
}
