import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";

const root = process.cwd();
const sourceRoots = ["app", "components", "design", ".cursor/rules"];
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
  return /\.(tsx|css|md)$/.test(file);
}

function toRepoPath(file) {
  return relative(root, file).split(sep).join("/");
}

for (const file of sourceRoots.flatMap(walk).filter(isSourceFile)) {
  const repoPath = toRepoPath(file);
  const text = readFileSync(file, "utf8");

  if (/--teal|shadow-teal|var\(--teal/.test(text)) {
    failures.push(`${repoPath}: Token legacy teal còn sót; dùng --brand-*.`);
  }

  if (repoPath.startsWith("components/") && /#[0-9a-fA-F]{3,8}/.test(text)) {
    failures.push(`${repoPath}: Không hard-code hex trong component; đưa vào app/globals.css token.`);
  }

  if (repoPath.startsWith("components/") && /\b(Fraunces|IBM Plex|Inter|Roboto-only)\b/.test(text)) {
    failures.push(`${repoPath}: Font phải đi qua token HCMUS, không hard-code font trong component.`);
  }

  if (/purple|violet|fuchsia/i.test(text) && !repoPath.includes(".cursor")) {
    failures.push(`${repoPath}: Tránh màu purple/violet/fuchsia generic trong UI HCMUS.`);
  }

  if (/transition-all/.test(text)) {
    failures.push(`${repoPath}: Không dùng transition-all; giới hạn property để tránh jank.`);
  }
}

const globals = readFileSync(join(root, "app", "globals.css"), "utf8");
for (const token of ["--brand-primary", "--brand-primary-strong", "--brand-navy", "--brand-accent", "--focus-ring"]) {
  if (!globals.includes(token)) {
    failures.push(`app/globals.css: Thiếu token ${token}.`);
  }
}

for (const requiredFile of [
  "design/tokens/hcmus.tokens.json",
  "app/design-tokens.css",
  "lib/design-tokens/tokens.ts",
]) {
  if (!existsSync(join(root, requiredFile))) {
    failures.push(`${requiredFile}: Thiếu token artifact cho design system.`);
  }
}

if (!globals.includes("@import \"./design-tokens.css\"")) {
  failures.push("app/globals.css: Chưa import generated design tokens.");
}

if (!globals.includes("--motion-duration-page") || !globals.includes("--motion-ease-smooth")) {
  failures.push("app/globals.css: Motion phải dùng token duration/easing thay vì hard-code rải rác.");
}

if (failures.length) {
  console.error("UI audit failed:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log("UI audit passed.");
