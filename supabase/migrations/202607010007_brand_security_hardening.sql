create table if not exists public.rate_limit_events (
  id bigserial primary key,
  scope text not null,
  identifier text not null,
  user_id uuid references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.security_events (
  id bigserial primary key,
  event_type text not null,
  scope text,
  identifier text,
  user_id uuid references auth.users(id) on delete set null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists rate_limit_events_lookup_idx
  on public.rate_limit_events (scope, identifier, created_at desc);

create index if not exists security_events_created_idx
  on public.security_events (created_at desc);

alter table public.rate_limit_events enable row level security;
alter table public.security_events enable row level security;

revoke all on public.rate_limit_events from anon, authenticated;
revoke all on public.security_events from anon, authenticated;

do $$
begin
  alter table public.student_profiles
    add constraint student_profiles_text_length_check
    check (
      char_length(full_name) <= 120
      and char_length(student_code) <= 32
      and char_length(email) <= 254
    ) not valid;
exception
  when duplicate_object then null;
end $$;

do $$
begin
  alter table public.student_course_attempts
    add constraint student_course_attempts_notes_length_check
    check (notes is null or char_length(notes) <= 500) not valid;
exception
  when duplicate_object then null;
end $$;

do $$
begin
  alter table public.term_plans
    add constraint term_plans_focus_length_check
    check (char_length(focus) <= 240) not valid;
exception
  when duplicate_object then null;
end $$;

do $$
begin
  alter table public.term_plan_courses
    add constraint term_plan_courses_notes_length_check
    check (notes is null or char_length(notes) <= 500) not valid;
exception
  when duplicate_object then null;
end $$;

create or replace function public.hcmus_format_term_label(
  p_semester integer,
  p_academic_year_start integer
)
returns text
language sql
immutable
as $$
  select 'HK' || p_semester::text || ' - Năm học '
    || p_academic_year_start::text || '-'
    || (p_academic_year_start + 1)::text;
$$;

create or replace function public.hcmus_grade_point_10_to_4(p_score10 numeric)
returns numeric
language sql
immutable
as $$
  select case
    when p_score10 >= 9 then 4::numeric
    when p_score10 < 3 then 0::numeric
    else round((1 + (p_score10 - 3) * 0.5)::numeric, 2)
  end;
$$;

create or replace function public.check_rate_limit(
  p_scope text,
  p_identifier text,
  p_limit integer,
  p_window_seconds integer,
  p_user_id uuid default null
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count integer;
begin
  if p_scope is null or p_identifier is null or p_limit < 1 or p_window_seconds < 1 then
    raise exception 'Invalid rate limit input';
  end if;

  delete from public.rate_limit_events
  where created_at < now() - interval '1 day';

  insert into public.rate_limit_events (scope, identifier, user_id)
  values (p_scope, p_identifier, p_user_id);

  select count(*) into v_count
  from public.rate_limit_events
  where scope = p_scope
    and identifier = p_identifier
    and created_at >= now() - (p_window_seconds * interval '1 second');

  if v_count > p_limit then
    insert into public.security_events (event_type, scope, identifier, user_id, metadata)
    values (
      'rate_limit_exceeded',
      p_scope,
      p_identifier,
      p_user_id,
      jsonb_build_object('limit', p_limit, 'windowSeconds', p_window_seconds)
    );

    return false;
  end if;

  return true;
end;
$$;

create or replace function public.hcmus_normalize_course_attempts(
  p_user_id uuid,
  p_program_course_id text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row record;
  v_index integer := 0;
  v_has_passed_before boolean := false;
begin
  for v_row in
    select id
    from public.student_course_attempts
    where user_id = p_user_id
      and program_course_id = p_program_course_id
    order by academic_year_start asc, semester asc, created_at asc
  loop
    update public.student_course_attempts
    set attempt_no = 100000 + v_index,
        is_effective = false
    where user_id = p_user_id
      and id = v_row.id;

    v_index := v_index + 1;
  end loop;

  v_index := 0;

  for v_row in
    select id, status
    from public.student_course_attempts
    where user_id = p_user_id
      and program_course_id = p_program_course_id
    order by academic_year_start asc, semester asc, created_at asc
  loop
    v_index := v_index + 1;

    update public.student_course_attempts
    set attempt_no = v_index,
        attempt_type = case
          when v_index = 1 then 'first'
          when v_has_passed_before then 'improvement'
          else 'retake'
        end,
        is_effective = v_index = (
          select count(*)
          from public.student_course_attempts
          where user_id = p_user_id
            and program_course_id = p_program_course_id
        )
    where user_id = p_user_id
      and id = v_row.id;

    if v_row.status = 'passed' then
      v_has_passed_before := true;
    end if;
  end loop;
end;
$$;

create or replace function public.hcmus_assert_program_course_for_user(
  p_user_id uuid,
  p_program_course_id text
)
returns public.program_courses
language plpgsql
security definer
set search_path = public
as $$
declare
  v_program_id text;
  v_course public.program_courses%rowtype;
begin
  select program_id into v_program_id
  from public.student_profiles
  where user_id = p_user_id;

  if v_program_id is null then
    raise exception 'Bạn cần tạo hồ sơ sinh viên trước khi lưu dữ liệu học tập.';
  end if;

  select * into v_course
  from public.program_courses
  where id = p_program_course_id
    and program_id = v_program_id
    and is_active = true;

  if v_course.id is null then
    raise exception 'Học phần này không thuộc chương trình học của bạn.';
  end if;

  return v_course;
end;
$$;

create or replace function public.save_student_profile(
  p_full_name text,
  p_student_code text,
  p_email text,
  p_start_year integer,
  p_program_id text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_existing_program_id text;
begin
  if v_user_id is null then
    raise exception 'Bạn cần đăng nhập để cập nhật hồ sơ.';
  end if;

  if char_length(trim(p_full_name)) < 1 or char_length(trim(p_full_name)) > 120 then
    raise exception 'Họ tên chưa hợp lệ.';
  end if;

  if char_length(trim(p_student_code)) < 1 or char_length(trim(p_student_code)) > 32 then
    raise exception 'MSSV chưa hợp lệ.';
  end if;

  if p_start_year < 2000 or p_start_year > 2100 then
    raise exception 'Khóa tuyển chưa hợp lệ.';
  end if;

  if not exists (select 1 from public.programs where id = p_program_id) then
    raise exception 'Chương trình học chưa hợp lệ.';
  end if;

  select program_id into v_existing_program_id
  from public.student_profiles
  where user_id = v_user_id;

  if v_existing_program_id is not null and v_existing_program_id <> p_program_id then
    raise exception 'Chương trình học đã được cố định sau lần tạo hồ sơ đầu tiên.';
  end if;

  insert into public.student_profiles (
    user_id,
    full_name,
    student_code,
    email,
    start_year,
    program_id
  )
  values (
    v_user_id,
    trim(p_full_name),
    trim(p_student_code),
    trim(p_email),
    p_start_year,
    coalesce(v_existing_program_id, p_program_id)
  )
  on conflict (user_id) do update set
    full_name = excluded.full_name,
    student_code = excluded.student_code,
    email = excluded.email,
    start_year = excluded.start_year,
    program_id = public.student_profiles.program_id;
end;
$$;

create or replace function public.save_student_preference(
  p_semester integer,
  p_academic_year_start integer
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_term_label text;
  v_academic_year_label text;
begin
  if v_user_id is null then
    raise exception 'Bạn cần đăng nhập để lưu học kỳ hiện tại.';
  end if;

  if p_semester not in (1, 2, 3) or p_academic_year_start < 2000 or p_academic_year_start > 2100 then
    raise exception 'Học kỳ hiện tại chưa hợp lệ.';
  end if;

  v_term_label := public.hcmus_format_term_label(p_semester, p_academic_year_start);
  v_academic_year_label := p_academic_year_start::text || '-' || (p_academic_year_start + 1)::text;

  insert into public.student_preferences (
    user_id,
    current_term_label,
    semester,
    academic_year_start,
    academic_year_label
  )
  values (
    v_user_id,
    v_term_label,
    p_semester,
    p_academic_year_start,
    v_academic_year_label
  )
  on conflict (user_id) do update set
    current_term_label = excluded.current_term_label,
    semester = excluded.semester,
    academic_year_start = excluded.academic_year_start,
    academic_year_label = excluded.academic_year_label;
end;
$$;

create or replace function public.create_student_course_attempt(
  p_program_course_id text,
  p_semester integer,
  p_academic_year_start integer,
  p_grade_input_mode text default 'numeric',
  p_score10 numeric default null,
  p_pass_fail_status text default null,
  p_notes text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_course public.program_courses%rowtype;
  v_mode text;
  v_score10 numeric(5,3);
  v_score4 numeric(4,2);
  v_status text;
  v_attempt_no integer;
begin
  if v_user_id is null then
    raise exception 'Bạn cần đăng nhập để lưu kết quả học tập.';
  end if;

  v_course := public.hcmus_assert_program_course_for_user(v_user_id, p_program_course_id);
  v_mode := coalesce(p_grade_input_mode, 'numeric');

  if v_course.grading_mode = 'numeric' then
    v_mode := 'numeric';
  end if;

  if v_mode = 'pass_fail' then
    if v_course.grading_mode = 'numeric' or v_course.counts_toward_gpa then
      raise exception 'Môn này cần nhập điểm số để tính GPA.';
    end if;

    if p_pass_fail_status not in ('passed', 'failed') then
      raise exception 'Bạn chọn Đạt hoặc Không đạt cho học phần này nhé.';
    end if;

    v_status := p_pass_fail_status;
  else
    if p_score10 is null or p_score10 < 0 or p_score10 > 10 then
      raise exception 'Bạn nhập điểm hệ 10 từ 0 đến 10 trước khi lưu.';
    end if;

    v_score10 := round(p_score10::numeric, 3);
    v_score4 := public.hcmus_grade_point_10_to_4(v_score10);
    v_status := case when v_score10 >= 5 then 'passed' else 'failed' end;
    v_mode := 'numeric';
  end if;

  select coalesce(max(attempt_no), 0) + 1 into v_attempt_no
  from public.student_course_attempts
  where user_id = v_user_id
    and course_id = p_program_course_id;

  insert into public.student_course_attempts (
    user_id,
    course_id,
    program_course_id,
    attempt_no,
    attempt_type,
    score10,
    score4,
    status,
    term_label,
    semester,
    academic_year_start,
    academic_year_label,
    grade_input_mode,
    notes,
    is_effective
  )
  values (
    v_user_id,
    p_program_course_id,
    p_program_course_id,
    v_attempt_no,
    'first',
    v_score10,
    v_score4,
    v_status,
    public.hcmus_format_term_label(p_semester, p_academic_year_start),
    p_semester,
    p_academic_year_start,
    p_academic_year_start::text || '-' || (p_academic_year_start + 1)::text,
    v_mode,
    nullif(trim(coalesce(p_notes, '')), ''),
    false
  );

  perform public.hcmus_normalize_course_attempts(v_user_id, p_program_course_id);
end;
$$;

create or replace function public.update_student_course_attempt(
  p_attempt_id uuid,
  p_semester integer,
  p_academic_year_start integer,
  p_grade_input_mode text default null,
  p_score10 numeric default null,
  p_pass_fail_status text default null,
  p_notes text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_existing public.student_course_attempts%rowtype;
  v_course public.program_courses%rowtype;
  v_program_course_id text;
  v_mode text;
  v_score10 numeric(5,3);
  v_score4 numeric(4,2);
  v_status text;
begin
  if v_user_id is null then
    raise exception 'Bạn cần đăng nhập để sửa kết quả học tập.';
  end if;

  select * into v_existing
  from public.student_course_attempts
  where id = p_attempt_id
    and user_id = v_user_id;

  if v_existing.id is null then
    raise exception 'Không tìm thấy lần học cần sửa.';
  end if;

  v_program_course_id := coalesce(v_existing.program_course_id, v_existing.course_id);
  v_course := public.hcmus_assert_program_course_for_user(v_user_id, v_program_course_id);
  v_mode := coalesce(p_grade_input_mode, v_existing.grade_input_mode, 'numeric');

  if v_course.grading_mode = 'numeric' then
    v_mode := 'numeric';
  end if;

  if v_mode = 'pass_fail' then
    if v_course.grading_mode = 'numeric' or v_course.counts_toward_gpa then
      raise exception 'Môn này cần nhập điểm số để tính GPA.';
    end if;

    v_status := coalesce(p_pass_fail_status, v_existing.status);

    if v_status not in ('passed', 'failed') then
      raise exception 'Bạn chọn Đạt hoặc Không đạt cho học phần này nhé.';
    end if;

    v_score10 := null;
    v_score4 := null;
  else
    v_score10 := coalesce(p_score10, v_existing.score10);

    if v_score10 is null or v_score10 < 0 or v_score10 > 10 then
      raise exception 'Bạn nhập điểm hệ 10 từ 0 đến 10 trước khi lưu.';
    end if;

    v_score10 := round(v_score10::numeric, 3);
    v_score4 := public.hcmus_grade_point_10_to_4(v_score10);
    v_status := case when v_score10 >= 5 then 'passed' else 'failed' end;
    v_mode := 'numeric';
  end if;

  update public.student_course_attempts
  set score10 = v_score10,
      score4 = v_score4,
      status = v_status,
      term_label = public.hcmus_format_term_label(p_semester, p_academic_year_start),
      semester = p_semester,
      academic_year_start = p_academic_year_start,
      academic_year_label = p_academic_year_start::text || '-' || (p_academic_year_start + 1)::text,
      grade_input_mode = v_mode,
      notes = nullif(trim(coalesce(p_notes, '')), '')
  where id = p_attempt_id
    and user_id = v_user_id;

  perform public.hcmus_normalize_course_attempts(v_user_id, v_program_course_id);
end;
$$;

create or replace function public.delete_student_course_attempt(
  p_attempt_id uuid default null,
  p_program_course_id text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_existing public.student_course_attempts%rowtype;
  v_program_course_id text;
begin
  if v_user_id is null then
    raise exception 'Bạn cần đăng nhập để xóa kết quả học tập.';
  end if;

  if p_attempt_id is null and p_program_course_id is null then
    raise exception 'Bạn cần chọn lần học trước khi xóa.';
  end if;

  if p_attempt_id is not null then
    select * into v_existing
    from public.student_course_attempts
    where id = p_attempt_id
      and user_id = v_user_id;
  else
    select * into v_existing
    from public.student_course_attempts
    where program_course_id = p_program_course_id
      and user_id = v_user_id
      and is_effective = true;
  end if;

  if v_existing.id is null then
    raise exception 'Không tìm thấy lần học cần xóa.';
  end if;

  v_program_course_id := coalesce(v_existing.program_course_id, v_existing.course_id);

  delete from public.student_course_attempts
  where id = v_existing.id
    and user_id = v_user_id;

  perform public.hcmus_normalize_course_attempts(v_user_id, v_program_course_id);
end;
$$;

create or replace function public.save_term_plan(
  p_plan_id uuid default null,
  p_semester integer default 1,
  p_academic_year_start integer default 2026,
  p_focus text default 'Tập trung học đều và giữ nhịp ổn định.',
  p_course_items jsonb default '[]'::jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_plan_id uuid;
  v_term_label text;
  v_academic_year_label text;
  v_count integer := 0;
  v_item record;
begin
  if v_user_id is null then
    raise exception 'Bạn cần đăng nhập để lưu kế hoạch học kỳ.';
  end if;

  if p_semester not in (1, 2, 3) or p_academic_year_start < 2000 or p_academic_year_start > 2100 then
    raise exception 'Học kỳ mục tiêu chưa hợp lệ.';
  end if;

  if char_length(trim(p_focus)) < 1 or char_length(trim(p_focus)) > 240 then
    raise exception 'Mục tiêu học kỳ nên ngắn gọn trong 240 ký tự.';
  end if;

  v_term_label := public.hcmus_format_term_label(p_semester, p_academic_year_start);
  v_academic_year_label := p_academic_year_start::text || '-' || (p_academic_year_start + 1)::text;

  if p_plan_id is not null then
    update public.term_plans
    set term_label = v_term_label,
        semester = p_semester,
        academic_year_start = p_academic_year_start,
        academic_year_label = v_academic_year_label,
        focus = trim(p_focus)
    where id = p_plan_id
      and user_id = v_user_id
    returning id into v_plan_id;

    if v_plan_id is null then
      raise exception 'Không tìm thấy kế hoạch học kỳ cần sửa.';
    end if;
  else
    insert into public.term_plans (
      user_id,
      term_label,
      semester,
      academic_year_start,
      academic_year_label,
      focus
    )
    values (
      v_user_id,
      v_term_label,
      p_semester,
      p_academic_year_start,
      v_academic_year_label,
      trim(p_focus)
    )
    on conflict (user_id, term_label) do update set
      semester = excluded.semester,
      academic_year_start = excluded.academic_year_start,
      academic_year_label = excluded.academic_year_label,
      focus = excluded.focus
    returning id into v_plan_id;
  end if;

  delete from public.term_plan_courses
  where plan_id = v_plan_id;

  for v_item in
    select *
    from jsonb_to_recordset(coalesce(p_course_items, '[]'::jsonb)) as item(
      "courseId" text,
      "displayOrder" integer,
      source text,
      notes text,
      "expectedScore10" numeric,
      "expectedGradeInputMode" text,
      "expectedPassFailStatus" text
    )
  loop
    v_count := v_count + 1;

    if v_count > 24 then
      raise exception 'Một kế hoạch học kỳ chỉ nên có tối đa 24 học phần.';
    end if;

    perform public.hcmus_assert_program_course_for_user(v_user_id, v_item."courseId");

    if coalesce(v_item.source, 'manual') not in ('template', 'manual', 'suggested') then
      raise exception 'Nguồn học phần trong kế hoạch chưa hợp lệ.';
    end if;

    if coalesce(v_item."expectedGradeInputMode", 'numeric') not in ('numeric', 'pass_fail') then
      raise exception 'Cách nhập điểm dự kiến chưa hợp lệ.';
    end if;

    if v_item."expectedPassFailStatus" is not null
      and v_item."expectedPassFailStatus" not in ('passed', 'failed') then
      raise exception 'Trạng thái dự kiến chưa hợp lệ.';
    end if;

    if v_item."expectedScore10" is not null
      and (v_item."expectedScore10" < 0 or v_item."expectedScore10" > 10) then
      raise exception 'Điểm dự kiến phải nằm trong khoảng 0 đến 10.';
    end if;

    if exists (
      select 1
      from public.term_plan_courses
      where plan_id = v_plan_id
        and program_course_id = v_item."courseId"
    ) then
      raise exception 'Kế hoạch đang có học phần bị trùng. Bạn giữ mỗi môn một lần nhé.';
    end if;

    insert into public.term_plan_courses (
      plan_id,
      course_id,
      program_course_id,
      display_order,
      source,
      notes,
      expected_score10,
      expected_grade_input_mode,
      expected_pass_fail_status
    )
    values (
      v_plan_id,
      v_item."courseId",
      v_item."courseId",
      coalesce(v_item."displayOrder", v_count - 1),
      coalesce(v_item.source, 'manual'),
      nullif(trim(coalesce(v_item.notes, '')), ''),
      round(v_item."expectedScore10"::numeric, 3),
      coalesce(v_item."expectedGradeInputMode", 'numeric'),
      v_item."expectedPassFailStatus"
    );
  end loop;

  return v_plan_id;
end;
$$;

create or replace function public.delete_term_plan(
  p_plan_id uuid default null,
  p_term_label text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null then
    raise exception 'Bạn cần đăng nhập để xóa kế hoạch học kỳ.';
  end if;

  if p_plan_id is null and p_term_label is null then
    raise exception 'Bạn cần chọn kế hoạch trước khi xóa.';
  end if;

  delete from public.term_plans
  where user_id = v_user_id
    and (
      (p_plan_id is not null and id = p_plan_id)
      or (p_plan_id is null and term_label = p_term_label)
    );
end;
$$;

revoke insert, update, delete on
  public.programs,
  public.course_groups,
  public.courses,
  public.course_prerequisites,
  public.course_catalog,
  public.program_courses,
  public.program_course_prerequisites,
  public.program_course_replacements,
  public.program_term_templates,
  public.program_term_template_courses
from anon, authenticated;

grant select on
  public.programs,
  public.course_groups,
  public.courses,
  public.course_prerequisites,
  public.course_catalog,
  public.program_courses,
  public.program_course_prerequisites,
  public.program_course_replacements,
  public.program_term_templates,
  public.program_term_template_courses
to authenticated;

revoke insert, update, delete on
  public.student_profiles,
  public.student_course_records,
  public.student_course_attempts,
  public.student_preferences,
  public.term_plans,
  public.term_plan_courses
from authenticated;

grant select on
  public.student_profiles,
  public.student_course_records,
  public.student_course_attempts,
  public.student_preferences,
  public.term_plans,
  public.term_plan_courses
to authenticated;

grant execute on function public.check_rate_limit(text, text, integer, integer, uuid) to anon, authenticated;
grant execute on function public.save_student_profile(text, text, text, integer, text) to authenticated;
grant execute on function public.save_student_preference(integer, integer) to authenticated;
grant execute on function public.create_student_course_attempt(text, integer, integer, text, numeric, text, text) to authenticated;
grant execute on function public.update_student_course_attempt(uuid, integer, integer, text, numeric, text, text) to authenticated;
grant execute on function public.delete_student_course_attempt(uuid, text) to authenticated;
grant execute on function public.save_term_plan(uuid, integer, integer, text, jsonb) to authenticated;
grant execute on function public.delete_term_plan(uuid, text) to authenticated;
