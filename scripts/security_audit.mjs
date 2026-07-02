import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";

const root = process.cwd();
const sourceRoots = ["app", "components", "lib", "next.config.ts", "proxy.ts"];
const skippedSegments = new Set([".git", ".next", "node_modules", ".playwright-cli"]);
const failures = [];

const riskyPatterns = [
  [/dangerouslySetInnerHTML|__html\s*:/, "Không dùng raw HTML sink trong React."],
  [/\b(localStorage|sessionStorage)\b/, "Không dùng Web Storage cho auth/session hoặc dữ liệu tin cậy."],
  [/\bselect\s*\(\s*["'`]?\*["'`]?\s*\)/, "Không dùng select(\"*\") trong data/API layer."],
  [/service_role|SUPABASE_SERVICE/i, "Không để service role hoặc biến service Supabase trong app/client code."],
  [/Access-Control-Allow-Origin/i, "Không bật CORS thủ công nếu chưa có allowlist rõ ràng."],
  [/\beval\s*\(|new Function\s*\(/, "Không dùng dynamic code execution."],
  [/\binnerHTML\b|document\.write\s*\(/, "Không dùng DOM injection sink."],
  [/\bconsole\.log\s*\(/, "Không commit console.log trong source chính."],
];

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

    if (childStat.isDirectory()) {
      return walk(child);
    }

    return [join(root, child)];
  });
}

function isSourceFile(file) {
  return /\.(ts|tsx|js|mjs|css)$/.test(file);
}

function toRepoPath(file) {
  return relative(root, file).split(sep).join("/");
}

for (const file of sourceRoots.flatMap(walk).filter(isSourceFile)) {
  const repoPath = toRepoPath(file);

  if (repoPath === "lib/security/api-response.ts") {
    continue;
  }

  const text = readFileSync(file, "utf8");

  for (const [pattern, message] of riskyPatterns) {
    if (pattern.test(text)) {
      failures.push(`${repoPath}: ${message}`);
    }
  }

  if (repoPath.startsWith("app/api/") && /NextResponse\.json/.test(text)) {
    failures.push(`${repoPath}: Dùng jsonOk/jsonError từ lib/security/api-response.ts thay vì NextResponse.json trực tiếp.`);
  }

  if (repoPath.startsWith("components/") && /process\.env/.test(text)) {
    failures.push(`${repoPath}: Không đọc process.env trong component client/browser.`);
  }

  if (repoPath === "next.config.ts") {
    if (text.includes("'unsafe-eval'") && !text.includes("isDevelopment ? [\"'unsafe-eval'\"] : []")) {
      failures.push("next.config.ts: unsafe-eval chỉ được phép bật trong nhánh development.");
    }
  } else if (text.includes("'unsafe-eval'")) {
    failures.push(`${repoPath}: Không dùng unsafe-eval ngoài CSP dev guard.`);
  }

  const hasMutation = /export\s+async\s+function\s+(POST|PUT|PATCH|DELETE)\b/.test(text);
  const isSignOut = repoPath === "app/api/auth/sign-out/route.ts";
  if (repoPath.startsWith("app/api/") && hasMutation && !/assertSameOrigin\s*\(/.test(text)) {
    failures.push(`${repoPath}: Mutation API cần assertSameOrigin().`);
  }

  if (repoPath.startsWith("app/api/") && hasMutation && !isSignOut && !/check(RateLimit|MutationRateLimit)\s*\(/.test(text)) {
    failures.push(`${repoPath}: Mutation API cần rate limit.`);
  }
}

if (failures.length) {
  console.error("Security audit failed:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log("Security audit passed.");
