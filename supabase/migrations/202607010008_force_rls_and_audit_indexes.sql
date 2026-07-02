alter table if exists public.programs enable row level security;
alter table if exists public.programs force row level security;

alter table if exists public.course_groups enable row level security;
alter table if exists public.course_groups force row level security;

alter table if exists public.courses enable row level security;
alter table if exists public.courses force row level security;

alter table if exists public.course_prerequisites enable row level security;
alter table if exists public.course_prerequisites force row level security;

alter table if exists public.course_catalog enable row level security;
alter table if exists public.course_catalog force row level security;

alter table if exists public.program_courses enable row level security;
alter table if exists public.program_courses force row level security;

alter table if exists public.program_course_prerequisites enable row level security;
alter table if exists public.program_course_prerequisites force row level security;

alter table if exists public.program_course_replacements enable row level security;
alter table if exists public.program_course_replacements force row level security;

alter table if exists public.program_term_templates enable row level security;
alter table if exists public.program_term_templates force row level security;

alter table if exists public.program_term_template_courses enable row level security;
alter table if exists public.program_term_template_courses force row level security;

alter table if exists public.student_profiles enable row level security;
alter table if exists public.student_profiles force row level security;

alter table if exists public.student_course_records enable row level security;
alter table if exists public.student_course_records force row level security;

alter table if exists public.student_course_attempts enable row level security;
alter table if exists public.student_course_attempts force row level security;

alter table if exists public.student_preferences enable row level security;
alter table if exists public.student_preferences force row level security;

alter table if exists public.term_plans enable row level security;
alter table if exists public.term_plans force row level security;

alter table if exists public.term_plan_courses enable row level security;
alter table if exists public.term_plan_courses force row level security;

alter table if exists public.rate_limit_events enable row level security;
alter table if exists public.rate_limit_events force row level security;

alter table if exists public.security_events enable row level security;
alter table if exists public.security_events force row level security;

create index if not exists student_course_attempts_user_effective_idx
  on public.student_course_attempts (user_id, is_effective, program_course_id)
  where is_effective = true;

create index if not exists term_plans_user_term_lookup_idx
  on public.term_plans (user_id, academic_year_start desc, semester desc);

create index if not exists term_plan_courses_plan_order_idx
  on public.term_plan_courses (plan_id, display_order);

create index if not exists security_events_user_created_idx
  on public.security_events (user_id, created_at desc)
  where user_id is not null;
