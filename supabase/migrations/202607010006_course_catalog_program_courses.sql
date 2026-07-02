create table if not exists public.course_catalog (
  id text primary key,
  code text not null unique,
  title text not null,
  credits integer not null check (credits > 0),
  lecture_hours integer not null default 0,
  practice_hours integer not null default 0,
  lab_hours integer not null default 0,
  default_counts_toward_gpa boolean not null default true,
  default_counts_toward_progress boolean not null default true,
  default_grading_mode text not null default 'numeric'
    check (default_grading_mode in ('numeric', 'pass_fail', 'numeric_or_pass_fail')),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.program_courses (
  id text primary key,
  program_id text not null references public.programs(id) on delete cascade,
  catalog_course_id text not null references public.course_catalog(id),
  group_id text not null references public.course_groups(id) on delete cascade,
  category text not null check (category in ('general-education', 'foundation', 'major-core', 'major-elective', 'graduation')),
  kind text not null check (kind in ('required', 'elective', 'graduation')),
  suggested_term integer not null check (suggested_term between 1 and 12),
  notes text,
  counts_toward_gpa boolean not null default true,
  counts_toward_progress boolean not null default true,
  grading_mode text not null default 'numeric'
    check (grading_mode in ('numeric', 'pass_fail', 'numeric_or_pass_fail')),
  display_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (program_id, catalog_course_id)
);

create table if not exists public.program_course_prerequisites (
  program_course_id text not null references public.program_courses(id) on delete cascade,
  prerequisite_program_course_id text not null references public.program_courses(id),
  created_at timestamptz not null default now(),
  primary key (program_course_id, prerequisite_program_course_id),
  check (program_course_id <> prerequisite_program_course_id)
);

create table if not exists public.program_course_replacements (
  id uuid primary key default gen_random_uuid(),
  program_id text not null references public.programs(id) on delete cascade,
  old_program_course_id text not null references public.program_courses(id),
  new_program_course_id text not null references public.program_courses(id),
  replacement_type text not null default 'replacement'
    check (replacement_type in ('replacement', 'equivalent')),
  effective_academic_year_start integer,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (program_id, old_program_course_id, new_program_course_id),
  check (old_program_course_id <> new_program_course_id)
);

drop trigger if exists set_course_catalog_updated_at on public.course_catalog;
create trigger set_course_catalog_updated_at
before update on public.course_catalog
for each row execute function public.set_updated_at();

drop trigger if exists set_program_courses_updated_at on public.program_courses;
create trigger set_program_courses_updated_at
before update on public.program_courses
for each row execute function public.set_updated_at();

drop trigger if exists set_program_course_replacements_updated_at on public.program_course_replacements;
create trigger set_program_course_replacements_updated_at
before update on public.program_course_replacements
for each row execute function public.set_updated_at();

insert into public.course_catalog (
  id,
  code,
  title,
  credits,
  lecture_hours,
  practice_hours,
  lab_hours,
  default_counts_toward_gpa,
  default_counts_toward_progress,
  default_grading_mode
)
select
  code,
  code,
  max(title),
  max(credits),
  max(lecture_hours),
  max(practice_hours),
  max(lab_hours),
  bool_or(counts_toward_gpa),
  bool_or(counts_toward_progress),
  max(grading_mode)
from public.courses
group by code
on conflict (id) do update set
  code = excluded.code,
  title = excluded.title,
  credits = excluded.credits,
  lecture_hours = excluded.lecture_hours,
  practice_hours = excluded.practice_hours,
  lab_hours = excluded.lab_hours,
  default_counts_toward_gpa = excluded.default_counts_toward_gpa,
  default_counts_toward_progress = excluded.default_counts_toward_progress,
  default_grading_mode = excluded.default_grading_mode,
  updated_at = now();

insert into public.program_courses (
  id,
  program_id,
  catalog_course_id,
  group_id,
  category,
  kind,
  suggested_term,
  notes,
  counts_toward_gpa,
  counts_toward_progress,
  grading_mode,
  display_order
)
select
  ranked.id,
  ranked.program_id,
  ranked.code,
  ranked.group_id,
  ranked.category,
  ranked.kind,
  ranked.suggested_term,
  ranked.notes,
  ranked.counts_toward_gpa,
  ranked.counts_toward_progress,
  ranked.grading_mode,
  ranked.display_order
from (
  select
    courses.*,
    row_number() over (
      partition by courses.program_id
      order by courses.suggested_term, courses.code
    ) as display_order
  from public.courses
) ranked
on conflict (id) do update set
  program_id = excluded.program_id,
  catalog_course_id = excluded.catalog_course_id,
  group_id = excluded.group_id,
  category = excluded.category,
  kind = excluded.kind,
  suggested_term = excluded.suggested_term,
  notes = excluded.notes,
  counts_toward_gpa = excluded.counts_toward_gpa,
  counts_toward_progress = excluded.counts_toward_progress,
  grading_mode = excluded.grading_mode,
  display_order = excluded.display_order,
  updated_at = now();

insert into public.program_course_prerequisites (
  program_course_id,
  prerequisite_program_course_id
)
select
  course_id,
  prerequisite_course_id
from public.course_prerequisites
on conflict (program_course_id, prerequisite_program_course_id) do nothing;

alter table public.student_course_records
  add column if not exists program_course_id text;

alter table public.student_course_attempts
  add column if not exists program_course_id text;

alter table public.term_plan_courses
  add column if not exists program_course_id text;

alter table public.program_term_template_courses
  add column if not exists program_course_id text;

update public.student_course_records
set program_course_id = course_id
where program_course_id is null;

update public.student_course_attempts
set program_course_id = course_id
where program_course_id is null;

update public.term_plan_courses
set program_course_id = course_id
where program_course_id is null;

update public.program_term_template_courses
set program_course_id = course_id
where program_course_id is null;

do $$
begin
  alter table public.student_course_records
    add constraint student_course_records_program_course_id_fkey
    foreign key (program_course_id) references public.program_courses(id);
exception
  when duplicate_object then null;
end $$;

do $$
begin
  alter table public.student_course_attempts
    add constraint student_course_attempts_program_course_id_fkey
    foreign key (program_course_id) references public.program_courses(id);
exception
  when duplicate_object then null;
end $$;

do $$
begin
  alter table public.term_plan_courses
    add constraint term_plan_courses_program_course_id_fkey
    foreign key (program_course_id) references public.program_courses(id);
exception
  when duplicate_object then null;
end $$;

do $$
begin
  alter table public.program_term_template_courses
    add constraint program_term_template_courses_program_course_id_fkey
    foreign key (program_course_id) references public.program_courses(id);
exception
  when duplicate_object then null;
end $$;

create index if not exists program_courses_program_idx
  on public.program_courses (program_id, display_order);

create index if not exists program_courses_catalog_idx
  on public.program_courses (catalog_course_id);

create index if not exists program_courses_group_idx
  on public.program_courses (group_id);

create index if not exists program_course_prerequisites_prerequisite_idx
  on public.program_course_prerequisites (prerequisite_program_course_id);

create index if not exists program_course_replacements_program_idx
  on public.program_course_replacements (program_id);

create index if not exists student_course_records_program_course_idx
  on public.student_course_records (user_id, program_course_id);

create index if not exists student_course_attempts_user_program_course_idx
  on public.student_course_attempts (user_id, program_course_id, attempt_no desc);

create unique index if not exists student_course_attempts_program_effective_unique_idx
  on public.student_course_attempts (user_id, program_course_id)
  where is_effective and program_course_id is not null;

create index if not exists term_plan_courses_program_course_idx
  on public.term_plan_courses (program_course_id);

create index if not exists program_term_template_courses_program_course_idx
  on public.program_term_template_courses (program_course_id);

alter table public.course_catalog enable row level security;
alter table public.program_courses enable row level security;
alter table public.program_course_prerequisites enable row level security;
alter table public.program_course_replacements enable row level security;

drop policy if exists "authenticated read course catalog" on public.course_catalog;
create policy "authenticated read course catalog"
on public.course_catalog
for select
to authenticated
using (true);

drop policy if exists "authenticated read program courses" on public.program_courses;
create policy "authenticated read program courses"
on public.program_courses
for select
to authenticated
using (true);

drop policy if exists "authenticated read program prerequisites" on public.program_course_prerequisites;
create policy "authenticated read program prerequisites"
on public.program_course_prerequisites
for select
to authenticated
using (true);

drop policy if exists "authenticated read program replacements" on public.program_course_replacements;
create policy "authenticated read program replacements"
on public.program_course_replacements
for select
to authenticated
using (true);

grant select on public.course_catalog to authenticated;
grant select on public.program_courses to authenticated;
grant select on public.program_course_prerequisites to authenticated;
grant select on public.program_course_replacements to authenticated;
