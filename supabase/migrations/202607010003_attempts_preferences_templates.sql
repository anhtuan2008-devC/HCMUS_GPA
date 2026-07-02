create table if not exists public.student_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  current_term_label text not null default 'HK1 2026-2027',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.student_course_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  course_id text not null references public.courses(id) on delete cascade,
  attempt_no integer not null check (attempt_no >= 1),
  attempt_type text not null check (attempt_type in ('first', 'retake', 'improvement')),
  score10 numeric(5,3) not null check (score10 >= 0 and score10 <= 10),
  score4 numeric(4,2) not null check (score4 >= 0 and score4 <= 4),
  status text not null check (status in ('passed', 'failed')),
  term_label text not null,
  notes text,
  is_effective boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, course_id, attempt_no)
);

create table if not exists public.program_term_templates (
  id text primary key,
  program_id text not null references public.programs(id) on delete cascade,
  term_number integer not null check (term_number >= 1 and term_number <= 12),
  term_label text not null,
  recommended_credits integer not null default 0,
  source_note text not null default 'Chuẩn hóa từ kế hoạch học tập trong PDF CTĐT khóa 2024.',
  display_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (program_id, term_number)
);

create table if not exists public.program_term_template_courses (
  template_id text not null references public.program_term_templates(id) on delete cascade,
  course_id text not null references public.courses(id) on delete cascade,
  display_order integer not null default 0,
  is_required_in_template boolean not null default false,
  note text,
  created_at timestamptz not null default now(),
  primary key (template_id, course_id)
);

alter table public.term_plan_courses
  add column if not exists display_order integer not null default 0,
  add column if not exists source text not null default 'manual'
    check (source in ('template', 'manual', 'suggested')),
  add column if not exists notes text;

create index if not exists student_course_attempts_user_term_idx
  on public.student_course_attempts (user_id, term_label, updated_at desc);

create index if not exists student_course_attempts_user_course_idx
  on public.student_course_attempts (user_id, course_id, attempt_no desc);

create unique index if not exists student_course_attempts_effective_unique_idx
  on public.student_course_attempts (user_id, course_id)
  where is_effective;

create index if not exists program_term_templates_program_idx
  on public.program_term_templates (program_id, term_number);

create index if not exists program_term_template_courses_template_idx
  on public.program_term_template_courses (template_id, display_order);

drop trigger if exists set_student_preferences_updated_at on public.student_preferences;
create trigger set_student_preferences_updated_at
before update on public.student_preferences
for each row execute function public.set_updated_at();

drop trigger if exists set_student_course_attempts_updated_at on public.student_course_attempts;
create trigger set_student_course_attempts_updated_at
before update on public.student_course_attempts
for each row execute function public.set_updated_at();

drop trigger if exists set_program_term_templates_updated_at on public.program_term_templates;
create trigger set_program_term_templates_updated_at
before update on public.program_term_templates
for each row execute function public.set_updated_at();

insert into public.student_course_attempts (
  user_id,
  course_id,
  attempt_no,
  attempt_type,
  score10,
  score4,
  status,
  term_label,
  notes,
  is_effective,
  created_at,
  updated_at
)
select
  user_id,
  course_id,
  1,
  'first',
  score10::numeric(5,3),
  score4,
  status,
  term_label,
  notes,
  true,
  created_at,
  updated_at
from public.student_course_records
on conflict (user_id, course_id, attempt_no) do nothing;

insert into public.program_term_templates (
  id,
  program_id,
  term_number,
  term_label,
  recommended_credits,
  source_note,
  display_order
)
select
  courses.program_id || '-term-' || courses.suggested_term,
  courses.program_id,
  courses.suggested_term,
  'Học kỳ ' || courses.suggested_term,
  sum(courses.credits)::integer,
  'Chuẩn hóa từ kế hoạch học tập trong PDF CTĐT khóa 2024 và trường suggested_term của seed curriculum.',
  courses.suggested_term
from public.courses
group by courses.program_id, courses.suggested_term
on conflict (program_id, term_number) do update set
  recommended_credits = excluded.recommended_credits,
  source_note = excluded.source_note,
  display_order = excluded.display_order,
  updated_at = now();

insert into public.program_term_template_courses (
  template_id,
  course_id,
  display_order,
  is_required_in_template,
  note
)
select
  ranked.program_id || '-term-' || ranked.suggested_term,
  ranked.id,
  ranked.display_order,
  ranked.kind in ('required', 'graduation'),
  null
from (
  select
    courses.*,
    row_number() over (
      partition by courses.program_id, courses.suggested_term
      order by
        case when courses.kind in ('required', 'graduation') then 0 else 1 end,
        courses.code
    ) as display_order
  from public.courses
) ranked
on conflict (template_id, course_id) do update set
  display_order = excluded.display_order,
  is_required_in_template = excluded.is_required_in_template;

alter table public.student_preferences enable row level security;
alter table public.student_course_attempts enable row level security;
alter table public.program_term_templates enable row level security;
alter table public.program_term_template_courses enable row level security;

drop policy if exists "Students can read their own preferences" on public.student_preferences;
create policy "Students can read their own preferences"
  on public.student_preferences for select
  using (auth.uid() = user_id);

drop policy if exists "Students can insert their own preferences" on public.student_preferences;
create policy "Students can insert their own preferences"
  on public.student_preferences for insert
  with check (auth.uid() = user_id);

drop policy if exists "Students can update their own preferences" on public.student_preferences;
create policy "Students can update their own preferences"
  on public.student_preferences for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Students can read their own course attempts" on public.student_course_attempts;
create policy "Students can read their own course attempts"
  on public.student_course_attempts for select
  using (auth.uid() = user_id);

drop policy if exists "Students can insert their own course attempts" on public.student_course_attempts;
create policy "Students can insert their own course attempts"
  on public.student_course_attempts for insert
  with check (auth.uid() = user_id);

drop policy if exists "Students can update their own course attempts" on public.student_course_attempts;
create policy "Students can update their own course attempts"
  on public.student_course_attempts for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Students can delete their own course attempts" on public.student_course_attempts;
create policy "Students can delete their own course attempts"
  on public.student_course_attempts for delete
  using (auth.uid() = user_id);

drop policy if exists "Authenticated users can read program term templates" on public.program_term_templates;
create policy "Authenticated users can read program term templates"
  on public.program_term_templates for select
  using (auth.role() = 'authenticated');

drop policy if exists "Authenticated users can read program term template courses" on public.program_term_template_courses;
create policy "Authenticated users can read program term template courses"
  on public.program_term_template_courses for select
  using (auth.role() = 'authenticated');
