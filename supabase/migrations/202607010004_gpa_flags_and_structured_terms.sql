alter table public.courses
  add column if not exists counts_toward_gpa boolean not null default true,
  add column if not exists counts_toward_progress boolean not null default true,
  add column if not exists grading_mode text not null default 'numeric';

do $$
begin
  alter table public.courses
    add constraint courses_grading_mode_check
    check (grading_mode in ('numeric', 'pass_fail', 'numeric_or_pass_fail'));
exception
  when duplicate_object then null;
end $$;

update public.courses
set
  counts_toward_gpa = false,
  counts_toward_progress = true,
  grading_mode = 'numeric_or_pass_fail'
where
  code in ('ADD00031', 'ADD00032', 'ADD00033', 'ADD00034', 'BAA00021', 'BAA00022', 'BAA00030')
  or title ilike 'Anh văn%'
  or title ilike 'Thể dục%'
  or title ilike 'Giáo dục quốc phòng%'
  or title ilike '%quốc phòng%'
  or title ilike '%GDQPAN%';

alter table public.student_course_attempts
  alter column score10 drop not null,
  alter column score4 drop not null,
  add column if not exists semester integer,
  add column if not exists academic_year_start integer,
  add column if not exists academic_year_label text,
  add column if not exists grade_input_mode text not null default 'numeric';

do $$
begin
  alter table public.student_course_attempts
    add constraint student_course_attempts_semester_check
    check (semester in (1, 2, 3));
exception
  when duplicate_object then null;
end $$;

do $$
begin
  alter table public.student_course_attempts
    add constraint student_course_attempts_academic_year_start_check
    check (academic_year_start >= 2000 and academic_year_start <= 2100);
exception
  when duplicate_object then null;
end $$;

do $$
begin
  alter table public.student_course_attempts
    add constraint student_course_attempts_grade_input_mode_check
    check (grade_input_mode in ('numeric', 'pass_fail'));
exception
  when duplicate_object then null;
end $$;

with parsed_attempts as (
  select
    id,
    coalesce(
      (regexp_match(term_label, 'HK\s*([123])'))[1]::integer,
      (regexp_match(term_label, 'Học kỳ\s*([123])'))[1]::integer,
      1
    ) as parsed_semester,
    coalesce(
      (regexp_match(term_label, '(20[0-9]{2})\s*-\s*20[0-9]{2}'))[1]::integer,
      extract(year from created_at)::integer
    ) as parsed_year
  from public.student_course_attempts
)
update public.student_course_attempts attempts
set
  semester = coalesce(attempts.semester, parsed_attempts.parsed_semester),
  academic_year_start = coalesce(attempts.academic_year_start, parsed_attempts.parsed_year),
  academic_year_label = coalesce(
    attempts.academic_year_label,
    parsed_attempts.parsed_year::text || '-' || (parsed_attempts.parsed_year + 1)::text
  ),
  grade_input_mode = case
    when attempts.score10 is null then 'pass_fail'
    else attempts.grade_input_mode
  end
from parsed_attempts
where attempts.id = parsed_attempts.id;

alter table public.student_course_attempts
  alter column semester set not null,
  alter column academic_year_start set not null,
  alter column academic_year_label set not null;

create index if not exists student_course_attempts_user_structured_term_idx
  on public.student_course_attempts (user_id, academic_year_start desc, semester desc, updated_at desc);

create index if not exists student_course_attempts_user_course_structured_term_idx
  on public.student_course_attempts (user_id, course_id, academic_year_start desc, semester desc, created_at desc);

alter table public.student_preferences
  add column if not exists semester integer,
  add column if not exists academic_year_start integer,
  add column if not exists academic_year_label text;

do $$
begin
  alter table public.student_preferences
    add constraint student_preferences_semester_check
    check (semester in (1, 2, 3));
exception
  when duplicate_object then null;
end $$;

do $$
begin
  alter table public.student_preferences
    add constraint student_preferences_academic_year_start_check
    check (academic_year_start >= 2000 and academic_year_start <= 2100);
exception
  when duplicate_object then null;
end $$;

with parsed_preferences as (
  select
    user_id,
    coalesce(
      (regexp_match(current_term_label, 'HK\s*([123])'))[1]::integer,
      (regexp_match(current_term_label, 'Học kỳ\s*([123])'))[1]::integer,
      1
    ) as parsed_semester,
    coalesce(
      (regexp_match(current_term_label, '(20[0-9]{2})\s*-\s*20[0-9]{2}'))[1]::integer,
      extract(year from created_at)::integer
    ) as parsed_year
  from public.student_preferences
)
update public.student_preferences preferences
set
  semester = coalesce(preferences.semester, parsed_preferences.parsed_semester),
  academic_year_start = coalesce(preferences.academic_year_start, parsed_preferences.parsed_year),
  academic_year_label = coalesce(
    preferences.academic_year_label,
    parsed_preferences.parsed_year::text || '-' || (parsed_preferences.parsed_year + 1)::text
  ),
  current_term_label = 'HK' || coalesce(preferences.semester, parsed_preferences.parsed_semester)::text
    || ' - Năm học ' || coalesce(preferences.academic_year_start, parsed_preferences.parsed_year)::text
    || '-' || (coalesce(preferences.academic_year_start, parsed_preferences.parsed_year) + 1)::text
from parsed_preferences
where preferences.user_id = parsed_preferences.user_id;

alter table public.student_preferences
  alter column semester set not null,
  alter column academic_year_start set not null,
  alter column academic_year_label set not null;

alter table public.term_plans
  add column if not exists semester integer,
  add column if not exists academic_year_start integer,
  add column if not exists academic_year_label text;

do $$
begin
  alter table public.term_plans
    add constraint term_plans_semester_check
    check (semester in (1, 2, 3));
exception
  when duplicate_object then null;
end $$;

do $$
begin
  alter table public.term_plans
    add constraint term_plans_academic_year_start_check
    check (academic_year_start >= 2000 and academic_year_start <= 2100);
exception
  when duplicate_object then null;
end $$;

with parsed_plans as (
  select
    id,
    coalesce(
      (regexp_match(term_label, 'HK\s*([123])'))[1]::integer,
      (regexp_match(term_label, 'Học kỳ\s*([123])'))[1]::integer,
      1
    ) as parsed_semester,
    coalesce(
      (regexp_match(term_label, '(20[0-9]{2})\s*-\s*20[0-9]{2}'))[1]::integer,
      extract(year from created_at)::integer
    ) as parsed_year
  from public.term_plans
)
update public.term_plans plans
set
  semester = coalesce(plans.semester, parsed_plans.parsed_semester),
  academic_year_start = coalesce(plans.academic_year_start, parsed_plans.parsed_year),
  academic_year_label = coalesce(
    plans.academic_year_label,
    parsed_plans.parsed_year::text || '-' || (parsed_plans.parsed_year + 1)::text
  ),
  term_label = 'HK' || coalesce(plans.semester, parsed_plans.parsed_semester)::text
    || ' - Năm học ' || coalesce(plans.academic_year_start, parsed_plans.parsed_year)::text
    || '-' || (coalesce(plans.academic_year_start, parsed_plans.parsed_year) + 1)::text
from parsed_plans
where plans.id = parsed_plans.id;

alter table public.term_plans
  alter column semester set not null,
  alter column academic_year_start set not null,
  alter column academic_year_label set not null;

create index if not exists term_plans_user_structured_term_idx
  on public.term_plans (user_id, academic_year_start desc, semester desc);
