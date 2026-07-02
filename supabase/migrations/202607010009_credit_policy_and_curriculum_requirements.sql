create table if not exists public.program_requirement_sections (
  id text primary key,
  program_id text not null references public.programs(id) on delete cascade,
  title text not null,
  category text not null check (category in ('general-education', 'foundation', 'major', 'graduation')),
  required_credits integer not null default 0 check (required_credits >= 0),
  elective_credits integer not null default 0 check (elective_credits >= 0),
  free_elective_credits integer not null default 0 check (free_elective_credits >= 0),
  total_credits integer not null check (total_credits >= 0),
  counts_toward_program_total boolean not null default true,
  source_note text not null,
  display_order integer not null default 0,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  check (total_credits = required_credits + elective_credits + free_elective_credits)
);

drop trigger if exists set_program_requirement_sections_updated_at on public.program_requirement_sections;
create trigger set_program_requirement_sections_updated_at
before update on public.program_requirement_sections
for each row execute function public.set_updated_at();

create index if not exists program_requirement_sections_program_idx
  on public.program_requirement_sections (program_id, display_order);

alter table public.program_requirement_sections enable row level security;
alter table public.program_requirement_sections force row level security;

drop policy if exists "authenticated read program requirement sections" on public.program_requirement_sections;
create policy "authenticated read program requirement sections"
on public.program_requirement_sections
for select
to authenticated
using (true);

revoke insert, update, delete on public.program_requirement_sections from anon, authenticated;
grant select on public.program_requirement_sections to authenticated;

with requirement_sections (
  program_id,
  title,
  category,
  required_credits,
  elective_credits,
  free_elective_credits,
  total_credits,
  display_order,
  source_note
) as (
  values
    ('cntt-2024', 'Giáo dục đại cương (I)', 'general-education', 42, 14, 0, 56, 1, 'Theo bảng tổng hợp CTĐT khóa 2024; không kể Ngoại ngữ, GDTC và GDQPAN.'),
    ('cntt-2024', 'Cơ sở ngành (2)', 'foundation', 38, 0, 0, 38, 2, 'Theo bảng tổng hợp CTĐT khóa 2024.'),
    ('cntt-2024', 'Chuyên ngành (3)', 'major', 16, 8, 10, 34, 3, 'Theo bảng tổng hợp CTĐT khóa 2024; app hiện hiển thị tổng, chưa khóa hướng chuyên ngành.'),
    ('cntt-2024', 'Tốt nghiệp (4)', 'graduation', 0, 10, 0, 10, 4, 'Theo bảng tổng hợp CTĐT khóa 2024.'),
    ('khmt-2024', 'Giáo dục đại cương (I)', 'general-education', 42, 14, 0, 56, 1, 'Theo bảng tổng hợp CTĐT khóa 2024; không kể Ngoại ngữ, GDTC và GDQPAN.'),
    ('khmt-2024', 'Cơ sở ngành (2)', 'foundation', 38, 0, 0, 38, 2, 'Theo bảng tổng hợp CTĐT khóa 2024.'),
    ('khmt-2024', 'Chuyên ngành (3)', 'major', 16, 8, 10, 34, 3, 'Theo bảng tổng hợp CTĐT khóa 2024; app hiện hiển thị tổng, chưa khóa hướng chuyên ngành.'),
    ('khmt-2024', 'Tốt nghiệp (4)', 'graduation', 0, 10, 0, 10, 4, 'Theo bảng tổng hợp CTĐT khóa 2024.'),
    ('ktpm-2024', 'Giáo dục đại cương (I)', 'general-education', 42, 14, 0, 56, 1, 'Theo bảng tổng hợp CTĐT khóa 2024; không kể Ngoại ngữ, GDTC và GDQPAN.'),
    ('ktpm-2024', 'Cơ sở ngành (2)', 'foundation', 38, 0, 0, 38, 2, 'Theo bảng tổng hợp CTĐT khóa 2024.'),
    ('ktpm-2024', 'Chuyên ngành (3)', 'major', 16, 8, 10, 34, 3, 'Theo bảng tổng hợp CTĐT khóa 2024; app hiện hiển thị tổng, chưa khóa hướng chuyên ngành.'),
    ('ktpm-2024', 'Tốt nghiệp (4)', 'graduation', 0, 10, 0, 10, 4, 'Theo bảng tổng hợp CTĐT khóa 2024.'),
    ('httt-2024', 'Giáo dục đại cương (I)', 'general-education', 42, 14, 0, 56, 1, 'Theo bảng tổng hợp CTĐT khóa 2024; không kể Ngoại ngữ, GDTC và GDQPAN.'),
    ('httt-2024', 'Cơ sở ngành (2)', 'foundation', 38, 0, 0, 38, 2, 'Theo bảng tổng hợp CTĐT khóa 2024.'),
    ('httt-2024', 'Chuyên ngành (3)', 'major', 16, 8, 10, 34, 3, 'Theo bảng tổng hợp CTĐT khóa 2024; app hiện hiển thị tổng, chưa khóa hướng chuyên ngành.'),
    ('httt-2024', 'Tốt nghiệp (4)', 'graduation', 0, 10, 0, 10, 4, 'Theo bảng tổng hợp CTĐT khóa 2024.')
)
insert into public.program_requirement_sections (
  id,
  program_id,
  title,
  category,
  required_credits,
  elective_credits,
  free_elective_credits,
  total_credits,
  counts_toward_program_total,
  display_order,
  source_note
)
select
  requirement_sections.program_id || '-' || requirement_sections.category || '-requirement',
  requirement_sections.program_id,
  requirement_sections.title,
  requirement_sections.category,
  requirement_sections.required_credits,
  requirement_sections.elective_credits,
  requirement_sections.free_elective_credits,
  requirement_sections.total_credits,
  true,
  requirement_sections.display_order,
  requirement_sections.source_note
from requirement_sections
join public.programs on programs.id = requirement_sections.program_id
on conflict (id) do update set
  title = excluded.title,
  category = excluded.category,
  required_credits = excluded.required_credits,
  elective_credits = excluded.elective_credits,
  free_elective_credits = excluded.free_elective_credits,
  total_credits = excluded.total_credits,
  counts_toward_program_total = excluded.counts_toward_program_total,
  display_order = excluded.display_order,
  source_note = excluded.source_note,
  updated_at = timezone('utc', now());

with condition_courses(code) as (
  values
    ('ADD00031'),
    ('ADD00032'),
    ('ADD00033'),
    ('ADD00034'),
    ('BAA00021'),
    ('BAA00022'),
    ('BAA00030')
)
update public.course_catalog
set
  default_counts_toward_gpa = false,
  default_counts_toward_progress = false,
  default_grading_mode = 'numeric_or_pass_fail',
  updated_at = timezone('utc', now())
where code in (select code from condition_courses);

with condition_courses(code) as (
  values
    ('ADD00031'),
    ('ADD00032'),
    ('ADD00033'),
    ('ADD00034'),
    ('BAA00021'),
    ('BAA00022'),
    ('BAA00030')
)
update public.program_courses
set
  counts_toward_gpa = false,
  counts_toward_progress = false,
  grading_mode = 'numeric_or_pass_fail',
  updated_at = timezone('utc', now())
where catalog_course_id in (select code from condition_courses);

with condition_courses(code) as (
  values
    ('ADD00031'),
    ('ADD00032'),
    ('ADD00033'),
    ('ADD00034'),
    ('BAA00021'),
    ('BAA00022'),
    ('BAA00030')
)
update public.courses
set
  counts_toward_gpa = false,
  counts_toward_progress = false,
  grading_mode = 'numeric_or_pass_fail',
  updated_at = timezone('utc', now())
where code in (select code from condition_courses);

update public.course_groups
set
  description = 'Khối kiến thức đại cương tính vào tín chỉ tốt nghiệp; không kể Ngoại ngữ, GDTC và GDQPAN.',
  updated_at = timezone('utc', now())
where category = 'general-education';
