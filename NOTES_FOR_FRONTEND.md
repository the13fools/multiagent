# Notes for whoever picks up the frontend

Written for the next person to open this repo. It is the stuff that is not
obvious from the code, plus the mistakes already made here so they do not get
made twice.

Everything below is a *reason*, not a rule for its own sake. If a reason stops
holding, change the thing.

---

## What this site is

A companion to a grant proposal for `flockbench`, a multi-agent testbed. Eight
pages that argue one thing in order: **how few agents must you control to hold a
population you do not own on a pattern that keeps it alive?**

It is not a marketing site and should not start behaving like one. Every number
on it is either arithmetic a reader can check or a run that left a receipt, and
where a claim has neither, the page says so. That constraint is the product.

**Stack:** Vite + TypeScript, no framework, no runtime dependencies. Vanilla DOM
and hand-written SVG. Tests are vitest + happy-dom.

```
npm install
npm run dev      # localhost:5173
npm test         # 129 tests, all of them fast
npm run build    # dist/, opens from disk (base: "./")
```

---

## Layout

```
*.html                 one file per page, hand-written, no templating
src/core/*.ts          the simulations. Pure, no DOM, heavily tested
src/ui/*Lab.ts         one module per interactive page
src/ui/lab.ts          the shared harness every lab uses
src/ui/arc.ts          the running order (see below)
src/ui/figures.ts      static explanatory SVG. Pure functions, no state
src/ui/style.css       all of it, one file
test/                  core.test, gate.test, juggling.test, pages.test
```

**`src/core` never touches the DOM.** It is the same arithmetic as the Python
testbed and the tests pin the two together. If you change a number in there you
are changing a scientific claim, not a rendering detail — go and read
`test/core.test.ts` first.

---

## Five things that will bite you

### 1. The spine is the site's structure, and it lives in one file

`src/ui/arc.ts` holds the running order. Each chapter carries what it answers
and **the question it leaves you holding**, which is the next page's reason to
exist. Pages build their own chapter marker and footer from it at runtime.

To reorder the site, edit that array. Do not add per-page navigation — the whole
point is that the order cannot drift page by page.

A page belongs in `SPINE` only if it carries weight. `juggling.html` is
deliberately *not* in it: it is a hand-built analogy rather than a port of
anything real, and it is labelled on the page as the sketch it is. Keeping it
reachable while keeping it out of the argument was a decision, not an oversight.

### 2. Grids append, they do not redraw

Both colouring grids used to rebuild their whole SVG from a string every tick.
Harmless while the cells were plain rects — and a strobe light the moment the
cells got an entry animation, because `innerHTML` replaces every node, so all
1,600 cells were new every frame and every one of them replayed `pop-in`
together. The page flashed instead of advancing.

So: scaffolding is built once per run (`buildGrid` / `buildRun`), and a tick
appends one column into `#g-cells` / `#r-cells`. **If you add anything animated
to a ticking view, it has to be appended, not rewritten.** There is a test that
advances the ticker and asserts a cell already on screen is the same DOM node a
tick later.

Same reason `renderStats` writes values in place rather than rebuilding the
block, and same reason `prefers-reduced-motion` kills the animation outright.

### 3. Every SVG sizes by width, never by height

`viewBox` plus a fixed pixel height letterboxes: the drawing fits by height and
you get a thin strip in a big box. Six canvases shipped that way. Use
`style="width:100%;height:auto"`, and there is a test that walks every `<svg>`
tag and enforces it.

Related: figure text is estimated against the viewBox in a test, because three
captions once shipped clipped mid-sentence and nothing noticed. If you widen a
caption and the suite complains, the caption really is running off the edge.

### 4. One control idiom: the dial

`.dials` / `.dial` / `.dial-v`. Name above, control below, current value beside
it in the accent colour. `bindDials()` wires the readout and the change handler
so a page adds a control by writing markup.

Before this there were four idioms across five pages — a value chip before its
slider here, a bare `<select>` inside a sentence there, a number input with an
inline width somewhere else. They read as four prototypes rather than one
instrument. A test asserts every dial has a name and every slider has a readout.

The draggable-number-in-prose is gone on purpose. It was the Bret Victor move
and it did not survive contact with users: nothing about a number in a paragraph
tells you it is a control.

### 5. Tests assert claims, not wording

`test/pages.test.ts` checks that the prose agrees with what the code computes —
that the capacity quoted on the page is the capacity the formula returns, that
each chapter hands off to its actual successor, that the cost essay stays
hedged. It deliberately does *not* pin exact sentences: an earlier version did,
ordinary copy-editing failed the build, and that trains people to weaken tests.

If you rewrite a paragraph and a test fails, read it before adjusting it. It is
usually telling you the new sentence claims something different from the old
one.

---

## Conventions worth keeping

**Comments say why, not what.** The codebase is full of "this used to do X and
here is the bug that caused". That is deliberate: most of these files look
over-engineered until you know which simple version was tried first.

**No `localStorage`, no analytics, no fonts from a CDN.** The built site opens
from `file://`. Keep it that way — `base: "./"` in `vite.config.ts` exists for
exactly this.

**Colours come from CSS variables**, so dark mode works. The one exception is
`figureLab.ts`, which exports print figures that have to survive on white paper
and therefore hardcodes ink. There is a test enforcing the distinction.

**Every new page needs an entry in `vite.config.ts`.** Vite only emits what it
is told about. A page was once written, linked, tested and committed, and would
still have 404ed in production. There is now a test that walks every `.html` in
the root and asserts the config names it — but you will hit it, so this is the
warning.

---

## Known rough edges

- **`figure.html`** is a tool rather than a chapter and still uses the old
  `.controls` markup. Harmless, but it is the last holdout.
- **`juggling.html`** works and is off the path. If someone wants to do the
  timing model properly it could earn its way back into the spine; nobody has.
- **The boardwalk census** brute-forces equilibria on the main thread behind a
  button. Fine at the current grid, would need a worker if it got finer.
- **`node_modules` is macOS-native here.** Do not reinstall it from a Linux
  container into this working tree; that has already broken the dev server once.

---

## If you are adding a page

1. Write the HTML by hand, copy the `<nav>` from a neighbour.
2. Add it to `vite.config.ts`.
3. If it is part of the argument, add it to `SPINE` in `src/ui/arc.ts` and give
   it an honest handoff. If it is not, say so on the page like `juggling.html`
   does.
4. Give it a `<h1>` and a `.lede`. A test enforces both, and that no two
   chapters open with the same line.
5. If it has an interactive, put the static figure *first*. A figure that moves
   cannot be glanced at, re-read, or compared to the one above it.

Last thing: the tone is plain and slightly blunt on purpose, and the site says
what it has not done as loudly as what it has. That is the most valuable thing
about it. Please do not sand it off.
