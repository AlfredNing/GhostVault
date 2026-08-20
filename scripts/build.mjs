/**
 * GhostVault multi-browser build orchestrator.
 *
 * Usage:
 *   node scripts/build.mjs --target chrome|edge|brave|firefox|all
 *
 * Runs the three Vite entry builds (popup, background, content), merges the
 * outputs into dist/<target>/ and copies the matching manifest.json.
 */
import { execSync } from "node:child_process";
import { cpSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DIST = path.join(ROOT, "dist");
const STAGING = path.join(DIST, ".staging");

const TARGETS = ["chrome", "edge", "brave", "firefox"];

function parseTarget() {
  const idx = process.argv.indexOf("--target");
  const target = idx >= 0 ? process.argv[idx + 1] : "chrome";
  if (!TARGETS.includes(target) && target !== "all") {
    console.error(`Unknown target: ${target}. Use one of ${TARGETS.join(", ")} or "all".`);
    process.exit(1);
  }
  return target;
}

function run(cmd) {
  console.log(`\n$ ${cmd}`);
  execSync(cmd, { cwd: ROOT, stdio: "inherit" });
}

function readFileSyncSafe(file) {
  try {
    return readFileSync(file);
  } catch {
    return null;
  }
}

function buildEntries() {
  for (const entry of ["popup", "background", "content"]) {
    run(`npx vite build --mode entry:${entry}`);
  }
}

function assemble(target) {
  const out = path.join(DIST, target);
  rmSync(out, { recursive: true, force: true });
  mkdirSync(out, { recursive: true });

  // Merge staging outputs: popup first, then background/content scripts.
  for (const part of ["popup", "background", "content"]) {
    cpSync(path.join(STAGING, part), out, { recursive: true });
  }

  // Vite preserves the source directory of the HTML entry
  // (src/popup/index.html); the manifest expects popup.html at the root.
  const nestedHtml = path.join(out, "src", "popup", "index.html");
  const htmlBuffer = readFileSyncSafe(nestedHtml);
  if (htmlBuffer) {
    // The HTML was emitted two directories deep, so its relative asset URLs
    // carry a ../../ prefix; rebaseline them to the extension root.
    const html = htmlBuffer
      .toString("utf8")
      .replace(/(\.\.\/)+assets\//g, "./assets/");
    writeFileSync(path.join(out, "popup.html"), html);
    rmSync(path.join(out, "src"), { recursive: true, force: true });
  }

  // Copy browser-specific manifest (chrome/edge/brave share the MV3 shape,
  // firefox.json diverges as the Firefox-specific fields are added).
  const manifestSrc = path.join(ROOT, "manifests", `${target}.json`);
  const manifest = JSON.parse(readFileSync(manifestSrc, "utf8"));
  writeFileSync(path.join(out, "manifest.json"), JSON.stringify(manifest, null, 2));

  // Shared static assets (icons).
  cpSync(path.join(ROOT, "public"), out, { recursive: true });

  console.log(`\n✔ ${target} build ready → ${path.relative(ROOT, out)}`);
}

async function main() {
  const target = parseTarget();
  const started = Date.now();

  buildEntries();

  const targets = target === "all" ? TARGETS : [target];
  for (const t of targets) {
    await assemble(t);
  }

  rmSync(STAGING, { recursive: true, force: true });
  console.log(`\nDone in ${((Date.now() - started) / 1000).toFixed(1)}s`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
