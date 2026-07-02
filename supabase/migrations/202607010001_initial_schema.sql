create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

create table if not exists public.programs (
  id text primary key,
  code text not null unique,
  name text not null,
  english_name text not null,
  degree text not null,
  duration_years integer not null check (duration_years > 0),
  total_credits integer not null check (total_credits > 0),
  source_note text not null,
  curriculum_coverage_note text not null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.course_groups (
  id text primary key,
  program_id text not null references public.programs(id) on delete cascade,
  title text not null,
  category text not null check (category in ('general-education', 'foundation', 'major-core', 'major-elective', 'graduation')),
  required_credits integer not null check (required_credits >= 0),
  description text not null,
  display_order integer not null default 0,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.courses (
  id text primary key,
  program_id text not null references public.programs(id) on delete cascade,
  group_id text not null references public.course_groups(id) on delete cascade,
  category text not null check (category in ('general-education', 'foundation', 'major-core', 'major-elective', 'graduation')),
  code text not null,
  title text not null,
  credits integer not null check (credits > 0),
  lecture_hours integer not null default 0,
  practice_hours integer not null default 0,
  lab_hours integer not null default 0,
  kind text not null check (kind in ('required', 'elective', 'graduation')),
  suggested_term integer not null check (suggested_term between 1 and 12),
  notes text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (program_id, code)
);

create table if not exists public.course_prerequisites (
  course_id text not null references public.courses(id) on delete cascade,
  prerequisite_course_id text not null references public.courses(id) on delete cascade,
  created_at timestamptz not null default timezone('utc', now()),
  primary key (course_id, prerequisite_course_id),
  check (course_id <> prerequisite_course_id)
);

create table if not exists public.student_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  student_code text not null unique,
  email text not null,
  start_year integer not null check (start_year >= 2000),
  program_id text not null references public.programs(id),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.student_course_records (
  user_id uuid not null references auth.users(id) on delete cascade,
  course_id text not null references public.courses(id) on delete cascade,
  score10 numeric(4,2) not null check (score10 between 0 and 10),
  score4 numeric(4,2) not null check (score4 between 0 and 4),
  status text not null check (status in ('planned', 'passed', 'failed')),
  term_label text not null,
  notes text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  primary key (user_id, course_id)
);

create table if not exists public.term_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  term_label text not null,
  focus text not null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (user_id, term_label)
);

create table if not exists public.term_plan_courses (
  plan_id uuid not null references public.term_plans(id) on delete cascade,
  course_id text not null references public.courses(id) on delete cascade,
  created_at timestamptz not null default timezone('utc', now()),
  primary key (plan_id, course_id)
);

create index if not exists idx_course_groups_program_id on public.course_groups(program_id);
create index if not exists idx_courses_program_id on public.courses(program_id);
create index if not exists idx_courses_group_id on public.courses(group_id);
create index if not exists idx_student_course_records_user_id on public.student_course_records(user_id);
create index if not exists idx_term_plans_user_id on public.term_plans(user_id);

drop trigger if exists set_programs_updated_at on public.programs;
create trigger set_programs_updated_at
before update on public.programs
for each row execute function public.set_updated_at();

drop trigger if exists set_course_groups_updated_at on public.course_groups;
create trigger set_course_groups_updated_at
before update on public.course_groups
for each row execute function public.set_updated_at();

drop trigger if exists set_courses_updated_at on public.courses;
create trigger set_courses_updated_at
before update on public.courses
for each row execute function public.set_updated_at();

drop trigger if exists set_student_profiles_updated_at on public.student_profiles;
create trigger set_student_profiles_updated_at
before update on public.student_profiles
for each row execute function public.set_updated_at();

drop trigger if exists set_student_course_records_updated_at on public.student_course_records;
create trigger set_student_course_records_updated_at
before update on public.student_course_records
for each row execute function public.set_updated_at();

drop trigger if exists set_term_plans_updated_at on public.term_plans;
create trigger set_term_plans_updated_at
before update on public.term_plans
for each row execute function public.set_updated_at();

alter table public.programs enable row level security;
alter table public.course_groups enable row level security;
alter table public.courses enable row level security;
alter table public.course_prerequisites enable row level security;
alter table public.student_profiles enable row level security;
alter table public.student_course_records enable row level security;
alter table public.term_plans enable row level security;
alter table public.term_plan_courses enable row level security;

create policy "authenticated read programs"
on public.programs
for select
to authenticated
using (true);

create policy "authenticated read course groups"
on public.course_groups
for select
to authenticated
using (true);

create policy "authenticated read courses"
on public.courses
for select
to authenticated
using (true);

create policy "authenticated read prerequisites"
on public.course_prerequisites
for select
to authenticated
using (true);

create policy "users manage own profile select"
on public.student_profiles
for select
to authenticated
using ((select auth.uid()) = user_id);

create policy "users manage own profile insert"
on public.student_profiles
for insert
to authenticated
with check ((select auth.uid()) = user_id);

create policy "users manage own profile update"
on public.student_profiles
for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "users manage own records select"
on public.student_course_records
for select
to authenticated
using ((select auth.uid()) = user_id);

create policy "users manage own records insert"
on public.student_course_records
for insert
to authenticated
with check ((select auth.uid()) = user_id);

create policy "users manage own records update"
on public.student_course_records
for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "users manage own records delete"
on public.student_course_records
for delete
to authenticated
using ((select auth.uid()) = user_id);

create policy "users manage own plans select"
on public.term_plans
for select
to authenticated
using ((select auth.uid()) = user_id);

create policy "users manage own plans insert"
on public.term_plans
for insert
to authenticated
with check ((select auth.uid()) = user_id);

create policy "users manage own plans update"
on public.term_plans
for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "users manage own plans delete"
on public.term_plans
for delete
to authenticated
using ((select auth.uid()) = user_id);

create policy "users manage own term plan courses select"
on public.term_plan_courses
for select
to authenticated
using (
  exists (
    select 1
    from public.term_plans
    where term_plans.id = term_plan_courses.plan_id
      and term_plans.user_id = (select auth.uid())
  )
);

create policy "users manage own term plan courses insert"
on public.term_plan_courses
for insert
to authenticated
with check (
  exists (
    select 1
    from public.term_plans
    where term_plans.id = term_plan_courses.plan_id
      and term_plans.user_id = (select auth.uid())
  )
);

create policy "users manage own term plan courses delete"
on public.term_plan_courses
for delete
to authenticated
using (
  exists (
    select 1
    from public.term_plans
    where term_plans.id = term_plan_courses.plan_id
      and term_plans.user_id = (select auth.uid())
  )
);
