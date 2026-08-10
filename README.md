# Multi-agent research site

Publication target: [foolzone.com/multiagent/commons-game/](https://foolzone.com/multiagent/commons-game/)

The root is a program-level landing page for the linked research projects:

- **Flockbench** — population-level game and evaluation infrastructure
- **Freetimebench** — early long-rollout training research
- **Continuous Judge** — unreleased fine-tuning research
- **Commons Game** — the current theory-led grant study

The five-page Commons Game reviewer narrative, plus a separate playful demos
room, is published under `commons-game/`:

- `commons-game/index.html` — overview and executable answer-key model
- `commons-game/study.html` — pilot replay, PDD population-generation method, and open scaling question
- `commons-game/evidence.html` — source-game and transfer evidence, receipts, and caveats
- `commons-game/program.html` — the longer research arc from answer-key games to agent institutions
- `commons-game/delivery.html` — milestones, team, budget, and award boundary
- `commons-game/demos.html` — Boardwalk, Juggling, and links to neighboring mathematical sketches

The previous multi-page research site and detailed program foundations remain available under
[`archive/`](archive/README.md). Its labs are still built, tested, and deployed;
they are no longer the default reviewer path.

The former root detail pages, `/v2/*.html`, and `/commons_game/*.html` addresses
remain as redirect shims so existing bookmarks and review tabs resolve to the
canonical hyphenated route.

## Run locally

Requires Node.js 22 or newer.

```sh
npm ci
npm run dev
```

Open <http://localhost:4173/>. The Stage 0 applets read the checked-in
`src/ui/data/commons_pilot.json`, `shared_continuous_results_self_play.json`,
and `shared_continuous_results_transfer.json` traces.

## Verify the deployable site

```sh
npm run check
npm run preview
```

`npm run check` runs the complete test suite, builds `dist/`, and audits every
published page for missing files, broken local links, root-relative assets, and
references to unbuilt source. Vite uses a relative base, so the same build works
at the intended `/multiagent/` project path. The canonical grant route is
`/multiagent/commons-game/`; the underscore route is redirects only.

## Publish with GitHub Pages

This checkout does not currently have a Git remote. After creating the target
repository:

```sh
git remote add origin git@github.com:YOUR-ACCOUNT/YOUR-REPOSITORY.git
git push -u origin main
```

Then open **Settings → Pages** in GitHub and set **Source** to **GitHub
Actions**. The included `Publish website` workflow runs the same local checks
and deploys `dist/` after every push to `main`; it can also be run manually from
the Actions tab.

The repository deliberately does not include a `CNAME`: the existing
`foolzone.com` mapping must remain configured at the Pages/domain owner level,
while this build supplies the `/multiagent/commons-game/` route beneath it.

The deployment pattern follows
[`the13fools/direction-field-lab`](https://github.com/the13fools/direction-field-lab):
Node 22, `npm ci`, one reproducible check command, the official Pages artifact,
and repository-subpath-safe assets.

## Repository map

```text
index.html                program landing page
commons-game/             five-page grant narrative plus playful demos
commons_game/             redirects from the former underscore route
*.html                    compatibility redirects for old detail URLs
archive/                  preserved v1 site and labs
v2/                       compatibility redirects to Commons Game
src/core/                 deterministic engines and shared facts
src/ui/                   applets and page behavior
src/ui/data/              checked-in pilot traces
test/                     invariants and page-level checks
.github/workflows/        CI and GitHub Pages publication
```

MIT code. Exported data and figures: CC0.
