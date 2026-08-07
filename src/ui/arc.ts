/**
 * The spine.
 *
 * The site was nine pages and a card grid, which is a directory, not an
 * argument. Each page was individually fine and none of them knew about the
 * others, so a reader landing on the gate page had no way to learn that it
 * exists because the commons page raised a question it could not answer.
 *
 * This file is the running order, written once. Each chapter carries two
 * sentences: the question it answers, and the question it leaves you holding.
 * The second one is the handoff, and it is the whole reason the next page is
 * next. Pages render their own eyebrow and footer from this, so the order lives
 * in one place and cannot drift page by page.
 *
 * A page is in here only if it carries weight. Juggling was chapter three and
 * was not up to the standard of the pages either side of it -- a pretty 3D
 * scene making an argument the colouring grid already makes better. It is still
 * reachable, marked as the sketch it is, and out of the running order.
 */

export interface Chapter {
  /** file basename, without .html */
  slug: string;
  title: string;
  /** what this page answers */
  asks: string;
  /** what it leaves you wanting, which is the next page's reason to exist */
  hands: string;
}

export const SPINE: Chapter[] = [
  {
    slug: "shared-resource",
    title: "The game",
    asks: "A commons whose solution is one sentence long. Does a population find it?",
    hands: "It does not. So can you steer it from the inside?",
  },
  {
    slug: "entrainment",
    title: "Steering",
    asks: "Pin some agents to the right phase. Do the others lock on?",
    hands:
      "Sometimes — and it depends on how the others update, not on how many seats you hold. " +
      "But both answers so far assumed there was a rhythm to keep. Plenty of systems have no " +
      "rest point at all.",
  },
  {
    slug: "boardwalk",
    title: "Boardwalk",
    asks: "Three vendors on a beach, and no arrangement anyone is happy to stop at.",
    hands: "Suppose you do find a change that helps. How would you know that it helped?",
  },
  {
    slug: "gate",
    title: "The gate",
    asks: "A promotion gate with no judge in it — and its false-rejection rate.",
    hands: "That rate came out of a real campaign. Which campaigns have actually run?",
  },
  {
    slug: "experiments",
    title: "What has run",
    asks: "Every claim on this site, and the kind of evidence under it.",
    hands: "Most of it assumes the population holds still. It does not.",
  },
  {
    slug: "future",
    title: "What next",
    asks: "A population that learns while you measure it, decentralised mechanisms, and the " +
      "climb to games where nobody knows the answer.",
    hands: "Which needs thirty distinct agents. Thirty agents is a budget problem.",
  },
  {
    slug: "blog-pdd",
    title: "Cheap populations",
    asks: "Low-cost fine-tuning, and how large and varied a population it can buy.",
    hands: "That is the argument. Whose problem is it, and who else is asking?",
  },
  {
    slug: "lineage",
    title: "Where this sits",
    asks: "Three programmes named this problem in one year. What this instrument adds to it.",
    hands: "And it all reduces to eight agents and a pool.",
  },
];

export const chapterOf = (slug: string) => SPINE.findIndex((c) => c.slug === slug);

/**
 * Renders the eyebrow and the handoff footer into the page.
 *
 * Builds its own nodes rather than requiring every page to carry two more empty
 * divs: eight pages times two containers is eight chances to forget one, and
 * the containers hold nothing a reader or an editor needs to see in the source.
 */
export function mountArc(slug: string): void {
  const i = chapterOf(slug);
  if (i < 0) return;
  // Find the column from the heading outwards. Selecting it directly wants
  // `.wrap:not(nav .wrap)`, a Level 4 :not() that not every DOM implements --
  // including the one the tests run in, where it silently matched nothing.
  const h1 = document.querySelector("h1");
  const wrap = h1?.closest(".wrap") as HTMLElement | null;
  if (!wrap || !h1) return;

  const here = SPINE[i]!;
  const prev = SPINE[i - 1];
  const next = SPINE[i + 1];

  const eyebrow = document.createElement("p");
  eyebrow.className = "chapter";
  eyebrow.innerHTML =
    `<a href="./index.html">The path</a> · ${i + 1} of ${SPINE.length} · ${here.title}`;
  h1.parentNode!.insertBefore(eyebrow, h1);

  const foot = document.createElement("div");
  foot.className = "arc";
  foot.innerHTML = [
    prev
      ? `<a class="arc-prev" href="./${prev.slug}.html">← ${prev.title}</a>`
      : `<span class="arc-prev"></span>`,
    next
      ? `<a class="arc-next" href="./${next.slug}.html">
           <span class="arc-q">${here.hands}</span>
           <b>${next.title} →</b></a>`
      : `<a class="arc-next" href="./${SPINE[0]!.slug}.html">
           <span class="arc-q">${here.hands}</span>
           <b>${SPINE[0]!.title} →</b></a>`,
  ].join("");
  wrap.appendChild(foot);
}

/** The same running order, as the front page's table of contents. */
export function pathList(): string {
  return SPINE.map(
    (c, i) =>
      `<a class="path-row" href="./${c.slug}.html">
         <span class="path-n">${i + 1}</span>
         <span><b>${c.title}</b><span class="path-q">${c.asks}</span></span>
       </a>`,
  ).join("");
}
