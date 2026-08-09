import { existsSync, readFileSync, statSync } from "node:fs";
import { dirname, resolve } from "node:path";

const landingPages = ["index.html"];
const commonsPages = ["index.html", "program.html", "study.html", "evidence.html", "delivery.html"]
  .map((page) => `commons-game/${page}`);
const rootRedirectPages = ["program.html", "study.html", "evidence.html", "delivery.html"];
const legacyUnderscorePages = ["index.html", "program.html", "study.html", "evidence.html", "delivery.html"]
  .map((page) => `commons_game/${page}`);
const legacyV2Pages = ["index.html", "program.html", "study.html", "evidence.html", "delivery.html"]
  .map((page) => `v2/${page}`);
const archivePages = [
  "index.html",
  "proposal.html",
  "shared-resource.html",
  "juggling.html",
  "entrainment.html",
  "experiments.html",
  "future.html",
  "gate.html",
  "blog-pdd.html",
  "figure.html",
  "boardwalk.html",
  "lineage.html",
  "cards.html",
  "design.html",
  "stage-zero.html",
  "program-foundations.html",
].map((page) => `archive/${page}`);

const pages = [...landingPages, ...commonsPages, ...rootRedirectPages, ...legacyUnderscorePages, ...legacyV2Pages, ...archivePages];
const publicationAssets = [".nojekyll", "og.png", "sitemap.xml"];
const distRoot = resolve("dist");
const failures = [];

const existsAndHasContent = (relativePath) => {
  const absolutePath = resolve(distRoot, relativePath);
  try {
    return statSync(absolutePath).isFile() && statSync(absolutePath).size > 0;
  } catch {
    return false;
  }
};

for (const path of [...pages, ...publicationAssets]) {
  if (!existsAndHasContent(path) && path !== ".nojekyll") {
    failures.push(`${path} is missing or empty`);
  } else if (path === ".nojekyll" && !existsSync(resolve(distRoot, path))) {
    failures.push(".nojekyll is missing");
  }
}

for (const page of pages) {
  const pagePath = resolve(distRoot, page);
  if (!existsSync(pagePath)) continue;
  const source = readFileSync(pagePath, "utf8");

  if (/\b(?:src|href)=["']\/(?:assets|src)\//.test(source)) {
    failures.push(`${page} contains a root-relative asset and will break on a repository subpath`);
  }
  if (/\b(?:src|href)=["'][^"']*\/src\//.test(source)) {
    failures.push(`${page} still points at unbuilt source code`);
  }

  for (const match of source.matchAll(/\b(?:src|href)=["']([^"']+)["']/g)) {
    const rawTarget = match[1];
    if (!rawTarget || /^(?:https?:|mailto:|data:|javascript:|#)/.test(rawTarget)) continue;
    const target = decodeURIComponent(rawTarget.split("#")[0].split("?")[0]);
    if (!target) continue;
    const localPath = resolve(distRoot, dirname(page), target);
    if (!localPath.startsWith(distRoot) || !existsSync(localPath)) {
      failures.push(`${page} links to missing ${rawTarget}`);
    }
  }
}

if (failures.length > 0) {
  console.error(`Static-host check failed:\n- ${[...new Set(failures)].join("\n- ")}`);
  process.exitCode = 1;
} else {
  console.log(`Static-host check passed: ${landingPages.length} program landing page, ${commonsPages.length} Commons Game pages, ${rootRedirectPages.length + legacyUnderscorePages.length + legacyV2Pages.length} compatibility redirects, and ${archivePages.length} archived pages are subpath-safe.`);
}
