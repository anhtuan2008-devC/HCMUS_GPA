import { readFileSync } from "node:fs";
import { join } from "node:path";

const migrationPath = join(
  process.cwd(),
  "supabase",
  "migrations",
  "202607010007_brand_security_hardening.sql",
);
const forceRlsMigrationPath = join(
  process.cwd(),
  "supabase",
  "migrations",
  "202607010008_force_rls_and_audit_indexes.sql",
);
const creditPolicyMigrationPath = join(
  process.cwd(),
  "supabase",
  "migrations",
  "202607010009_credit_policy_and_curriculum_requirements.sql",
);

const sql = readFileSync(migrationPath, "utf8").toLowerCase();
const forceRlsSql = readFileSync(forceRlsMigrationPath, "utf8").toLowerCase();
const creditPolicySql = readFileSync(creditPolicyMigrationPath, "utf8").toLowerCase();
const hardeningSql = `${sql}\n${creditPolicySql}`;
const rlsSql = `${forceRlsSql}\n${creditPolicySql}`;

const protectedTables = [
  "programs",
  "course_groups",
  "program_requirement_sections",
  "courses",
  "course_prerequisites",
  "course_catalog",
  "program_courses",
  "program_course_prerequisites",
  "program_course_replacements",
  "program_term_templates",
  "program_term_template_courses",
  "student_profiles",
  "student_course_records",
  "student_course_attempts",
  "student_preferences",
  "term_plans",
  "term_plan_courses",
  "rate_limit_events",
  "security_events",
];

const failures = [];

for (const table of protectedTables) {
  if (!hardeningSql.includes(`public.${table}`)) {
    failures.push(`Missing privilege hardening mention for public.${table}`);
  }

  const hasForceRls =
    rlsSql.includes(`alter table if exists public.${table} force row level security`) ||
    rlsSql.includes(`alter table public.${table} force row level security`);

  if (!hasForceRls) {
    failures.push(`Missing FORCE RLS for public.${table}`);
  }
}

if (!hardeningSql.includes("revoke insert, update, delete")) {
  failures.push("Missing DML revoke block.");
}

const dmlGrantLines = hardeningSql
  .split(/\r?\n/)
  .filter((line) => line.trim().startsWith("grant "))
  .filter((line) => !line.includes("grant execute"))
  .filter((line) => /\b(insert|update|delete|all)\b/.test(line));

if (dmlGrantLines.length) {
  failures.push("Found a direct DML grant in hardening migration.");
}

if (!sql.includes("grant execute on function public.save_student_profile")) {
  failures.push("Missing RPC execute grants for authenticated mutations.");
}

if (!forceRlsSql.includes("student_course_attempts_user_effective_idx")) {
  failures.push("Missing effective attempt lookup index in FORCE RLS migration.");
}

if (failures.length) {
  console.error("Security privilege check failed:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log("Security privilege migration check passed.");
