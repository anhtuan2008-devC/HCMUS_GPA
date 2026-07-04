import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";

const root = process.cwd();
const sourceRoots = ["app", "components", "lib"];
const skippedSegments = new Set([".git", ".next", "node_modules", ".playwright-cli"]);
const failures = [];

function walk(path) {
  const absolute = join(root, path);
  const stat = statSync(absolute);

  if (stat.isFile()) {
    return [absolute];
  }

  return readdirSync(absolute).flatMap((entry) => {
    if (skippedSegments.has(entry)) {
      return [];
    }

    const child = join(path, entry);
    const childStat = statSync(join(root, child));
    return childStat.isDirectory() ? walk(child) : [join(root, child)];
  });
}

function isSourceFile(file) {
  return /\.(ts|tsx|css)$/.test(file);
}

function toRepoPath(file) {
  return relative(root, file).split(sep).join("/");
}

for (const file of sourceRoots.flatMap(walk).filter(isSourceFile)) {
  const repoPath = toRepoPath(file);
  const text = readFileSync(file, "utf8");

  if (/setInterval\s*\(/.test(text)) {
    failures.push(`${repoPath}: Tránh setInterval cho animation; dùng requestAnimationFrame hoặc CSS animation có reduced-motion.`);
  }

  if (/transition-all/.test(text)) {
    failures.push(`${repoPath}: transition-all dễ gây jank; khai báo property cụ thể.`);
  }

  if (/window\.requestAnimationFrame/.test(text) && !/cancelAnimationFrame/.test(text)) {
    failures.push(`${repoPath}: requestAnimationFrame cần cleanup cancelAnimationFrame khi unmount.`);
  }
}

const packageJson = readFileSync(join(root, "package.json"), "utf8");
if (!packageJson.includes("\"tokens:build\"")) {
  failures.push("package.json: Thiếu script tokens:build để design token có thể lặp lại.");
}

const globals = readFileSync(join(root, "app", "globals.css"), "utf8");
for (const marker of ["content-visibility", "will-change: transform, opacity", "prefers-reduced-motion"]) {
  if (!globals.includes(marker)) {
    failures.push(`app/globals.css: Thiếu performance marker ${marker}.`);
  }
}

const canvasScene = readFileSync(join(root, "components", "visual", "academic-canvas-scene.tsx"), "utf8");
for (const marker of [
  "requestAnimationFrame",
  "cancelAnimationFrame",
  "visibilitychange",
  "ResizeObserver",
  "getCappedDevicePixelRatio",
  "prefersReducedMotion",
]) {
  if (!canvasScene.includes(marker)) {
    failures.push(`components/visual/academic-canvas-scene.tsx: Canvas scene thiếu ${marker}.`);
  }
}

if (failures.length) {
  console.error("Performance audit failed:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log("Performance audit passed.");
