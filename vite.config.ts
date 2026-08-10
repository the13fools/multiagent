import { defineConfig } from "vite";

// Relative base so the built site works from any repository subpath --
// foolzone.com/multiagent, a GitHub Pages project path, or opened from disk --
// without a rebuild. An absolute base is the usual reason a static lab 404s
// the moment it leaves localhost.
export default defineConfig({
  base: "./",
  build: {
    rollupOptions: {
      // Paths are resolved against the project root, so no node:path import
      // and no __dirname -- which keeps this file type-checkable without
      // pulling in @types/node.
      input: {
        main: "index.html",
        rootProgramRedirect: "program.html",
        rootStudyRedirect: "study.html",
        rootEvidenceRedirect: "evidence.html",
        rootDeliveryRedirect: "delivery.html",
        commonsMain: "commons-game/index.html",
        commonsProgram: "commons-game/program.html",
        commonsDemos: "commons-game/demos.html",
        commonsStudy: "commons-game/study.html",
        commonsEvidence: "commons-game/evidence.html",
        commonsDelivery: "commons-game/delivery.html",
        legacyUnderscoreMain: "commons_game/index.html",
        legacyUnderscoreProgram: "commons_game/program.html",
        legacyUnderscoreStudy: "commons_game/study.html",
        legacyUnderscoreEvidence: "commons_game/evidence.html",
        legacyUnderscoreDelivery: "commons_game/delivery.html",
        legacyV2Main: "v2/index.html",
        legacyV2Program: "v2/program.html",
        legacyV2Study: "v2/study.html",
        legacyV2Evidence: "v2/evidence.html",
        legacyV2Delivery: "v2/delivery.html",
        archiveMain: "archive/index.html",
        archiveProposal: "archive/proposal.html",
        archiveShared: "archive/shared-resource.html",
        archiveJuggling: "archive/juggling.html",
        archiveEntrainment: "archive/entrainment.html",
        archiveExperiments: "archive/experiments.html",
        archiveFuture: "archive/future.html",
        archiveGate: "archive/gate.html",
        archiveBlog: "archive/blog-pdd.html",
        archiveFigure: "archive/figure.html",
        archiveBoardwalk: "archive/boardwalk.html",
        archiveLineage: "archive/lineage.html",
        archiveCards: "archive/cards.html",
        archiveDesign: "archive/design.html",
        archiveStageZero: "archive/stage-zero.html",
        archiveProgramFoundations: "archive/program-foundations.html",
      },
    },
  },
});
