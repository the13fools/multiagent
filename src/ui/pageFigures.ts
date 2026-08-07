import "./style.css";
import { evidenceFigure, pipelineFigure } from "./figures";

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
