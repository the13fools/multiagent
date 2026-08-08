import "./style.css";
import { evidenceFigure, inpaintFigure, pipelineFigure } from "./figures";
import { mountArc } from "./arc";

/**
 * Mounts static figures on the two prose pages that have no lab of their own.
 *
 * They had no script at all, which is why they were the last pages with nothing
 * to look at. Each mount is conditional, so one module serves both pages without
 * either needing to know about the other.
 */
const mount = (id: string, svg: () => string) => {
  const node = document.getElementById(id);
  if (node) node.innerHTML = svg();
};

mount("fig-evidence", evidenceFigure);
mount("fig-pipeline", pipelineFigure);
mount("fig-inpaint", inpaintFigure);

// Each of these is a chapter too, and neither had any way to say so.
if (document.getElementById("fig-evidence")) mountArc("experiments");
if (document.getElementById("fig-pipeline")) mountArc("blog-pdd");
if (document.body.dataset.page === "lineage") mountArc("lineage");

/**
 * The status page counts itself.
 *
 * Every row carries a status chip, and the honest summary of the page is how
 * many rows are in each state -- which a reader was previously expected to
 * tally by hand across four tables. Counting the DOM rather than hard-coding
 * the numbers means the scoreboard cannot drift from the tables it describes.
 */
const board = document.getElementById("scoreboard");
if (board) {
  const chips = Array.from(document.querySelectorAll<HTMLElement>("td .st"));
  const count = (cls: string) => chips.filter((c) => c.classList.contains(cls)).length;
  const cards: [number, string][] = [
    [count("st-done"), "measured or working"],
    [count("st-part"), "partial, or one arm"],
    [count("st-todo"), "not run"],
  ];
  board.innerHTML = cards
    .map(([n, k]) => `<div class="score"><div class="n">${n}</div><div class="k">${k}</div></div>`)
    .join("");
}
