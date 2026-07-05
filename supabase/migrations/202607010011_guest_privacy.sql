alter table public.student_profiles
  add column if not exists email_hash text,
  add column if not exists student_code_hash text,
  add column if not exists email_encrypted text,
  add column if not exists student_code_encrypted text;

alter table public.student_course_attempts
  add column if not exists score10_encrypted text,
  add column if not exists score4_encrypted text,
  add column if not exists score_hash text;

create index if not exists student_profiles_email_hash_idx
  on public.student_profiles (email_hash)
  where email_hash is not null;

create index if not exists student_profiles_student_code_hash_idx
  on public.student_profiles (student_code_hash)
  where student_code_hash is not null;

create index if not exists student_course_attempts_score_hash_idx
  on public.student_course_attempts (user_id, score_hash)
  where score_hash is not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'student_profiles_privacy_hash_shape_check'
      and conrelid = 'public.student_profiles'::regclass
  ) then
    alter table public.student_profiles
      add constraint student_profiles_privacy_hash_shape_check
      check (
        (email_hash is null or email_hash ~ '^[0-9a-f]{64}$')
        and (student_code_hash is null or student_code_hash ~ '^[0-9a-f]{64}$')
        and (email_encrypted is null or char_length(email_encrypted) <= 1024)
        and (student_code_encrypted is null or char_length(student_code_encrypted) <= 1024)
      ) not valid;
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'student_course_attempts_privacy_payload_shape_check'
      and conrelid = 'public.student_course_attempts'::regclass
  ) then
    alter table public.student_course_attempts
      add constraint student_course_attempts_privacy_payload_shape_check
      check (
        (score_hash is null or score_hash ~ '^[0-9a-f]{64}$')
        and (score10_encrypted is null or char_length(score10_encrypted) <= 1024)
        and (score4_encrypted is null or char_length(score4_encrypted) <= 1024)
      ) not valid;
  end if;
end $$;

create or replace function public.save_student_profile_privacy(
  p_email_hash text,
  p_student_code_hash text,
  p_email_encrypted text default null,
  p_student_code_encrypted text default null
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
    raise exception 'Bạn cần đăng nhập để cập nhật hồ sơ.';
  end if;

  if p_email_hash is null or p_email_hash !~ '^[0-9a-f]{64}$'
    or p_student_code_hash is null or p_student_code_hash !~ '^[0-9a-f]{64}$' then
    raise exception 'Dữ liệu riêng tư của hồ sơ chưa hợp lệ.';
  end if;

  update public.student_profiles
  set email_hash = p_email_hash,
      student_code_hash = p_student_code_hash,
      email_encrypted = p_email_encrypted,
      student_code_encrypted = p_student_code_encrypted
  where user_id = v_user_id;

  if not found then
    raise exception 'Bạn cần tạo hồ sơ sinh viên trước.';
  end if;
end;
$$;

create or replace function public.save_student_course_attempt_privacy(
  p_attempt_id uuid,
  p_score10_encrypted text default null,
  p_score4_encrypted text default null,
  p_score_hash text default null
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
    raise exception 'Bạn cần đăng nhập để cập nhật dữ liệu điểm.';
  end if;

  if p_score_hash is not null and p_score_hash !~ '^[0-9a-f]{64}$' then
    raise exception 'Dữ liệu riêng tư của điểm chưa hợp lệ.';
  end if;

  update public.student_course_attempts
  set score10_encrypted = p_score10_encrypted,
      score4_encrypted = p_score4_encrypted,
      score_hash = p_score_hash
  where id = p_attempt_id
    and user_id = v_user_id;

  if not found then
    raise exception 'Không tìm thấy lần học cần cập nhật dữ liệu riêng tư.';
  end if;
end;
$$;

create or replace function public.delete_guest_workspace()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_is_guest boolean := coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false);
  v_term_plan_courses integer := 0;
  v_term_plans integer := 0;
  v_attempts integer := 0;
  v_records integer := 0;
  v_preferences integer := 0;
  v_profiles integer := 0;
begin
  if v_user_id is null then
    raise exception 'Bạn cần đăng nhập để xóa dữ liệu khách.';
  end if;

  if not v_is_guest then
    raise exception 'Chỉ phiên khách mới được xóa dữ liệu theo lối này.';
  end if;

  delete from public.term_plan_courses plan_courses
  using public.term_plans plans
  where plan_courses.plan_id = plans.id
    and plans.user_id = v_user_id;
  get diagnostics v_term_plan_courses = row_count;

  delete from public.term_plans
  where user_id = v_user_id;
  get diagnostics v_term_plans = row_count;

  delete from public.student_course_attempts
  where user_id = v_user_id;
  get diagnostics v_attempts = row_count;

  delete from public.student_course_records
  where user_id = v_user_id;
  get diagnostics v_records = row_count;

  delete from public.student_preferences
  where user_id = v_user_id;
  get diagnostics v_preferences = row_count;

  delete from public.student_profiles
  where user_id = v_user_id;
  get diagnostics v_profiles = row_count;

  insert into public.security_events (event_type, scope, user_id, metadata)
  values (
    'guest_workspace_deleted',
    'auth:guest',
    v_user_id,
    jsonb_build_object(
      'termPlanCourses', v_term_plan_courses,
      'termPlans', v_term_plans,
      'attempts', v_attempts,
      'records', v_records,
      'preferences', v_preferences,
      'profiles', v_profiles
    )
  );

  return jsonb_build_object(
    'termPlanCourses', v_term_plan_courses,
    'termPlans', v_term_plans,
    'attempts', v_attempts,
    'records', v_records,
    'preferences', v_preferences,
    'profiles', v_profiles
  );
end;
$$;

create or replace function public.cleanup_guest_workspace_data(
  p_older_than interval default interval '1 day'
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_term_plan_courses integer := 0;
  v_term_plans integer := 0;
  v_attempts integer := 0;
  v_records integer := 0;
  v_preferences integer := 0;
  v_profiles integer := 0;
begin
  if p_older_than < interval '1 hour' then
    raise exception 'Khoảng dọn dữ liệu khách tối thiểu là 1 giờ.';
  end if;

  delete from public.term_plan_courses plan_courses
  using public.term_plans plans
  where plan_courses.plan_id = plans.id
    and plans.user_id in (
      select users.id
      from auth.users users
      where users.is_anonymous = true
        and users.created_at < now() - p_older_than
    );
  get diagnostics v_term_plan_courses = row_count;

  delete from public.term_plans
  where user_id in (
    select users.id
    from auth.users users
    where users.is_anonymous = true
      and users.created_at < now() - p_older_than
  );
  get diagnostics v_term_plans = row_count;

  delete from public.student_course_attempts
  where user_id in (
    select users.id
    from auth.users users
    where users.is_anonymous = true
      and users.created_at < now() - p_older_than
  );
  get diagnostics v_attempts = row_count;

  delete from public.student_course_records
  where user_id in (
    select users.id
    from auth.users users
    where users.is_anonymous = true
      and users.created_at < now() - p_older_than
  );
  get diagnostics v_records = row_count;

  delete from public.student_preferences
  where user_id in (
    select users.id
    from auth.users users
    where users.is_anonymous = true
      and users.created_at < now() - p_older_than
  );
  get diagnostics v_preferences = row_count;

  delete from public.student_profiles
  where user_id in (
    select users.id
    from auth.users users
    where users.is_anonymous = true
      and users.created_at < now() - p_older_than
  );
  get diagnostics v_profiles = row_count;

  insert into public.security_events (event_type, scope, metadata)
  values (
    'guest_workspace_ttl_cleanup',
    'auth:guest',
    jsonb_build_object(
      'olderThan', p_older_than::text,
      'termPlanCourses', v_term_plan_courses,
      'termPlans', v_term_plans,
      'attempts', v_attempts,
      'records', v_records,
      'preferences', v_preferences,
      'profiles', v_profiles
    )
  );

  return jsonb_build_object(
    'termPlanCourses', v_term_plan_courses,
    'termPlans', v_term_plans,
    'attempts', v_attempts,
    'records', v_records,
    'preferences', v_preferences,
    'profiles', v_profiles
  );
end;
$$;

revoke all on function public.save_student_profile_privacy(text, text, text, text) from public, anon;
revoke all on function public.save_student_course_attempt_privacy(uuid, text, text, text) from public, anon;
revoke all on function public.delete_guest_workspace() from public, anon;
revoke all on function public.cleanup_guest_workspace_data(interval) from public, anon, authenticated;

grant execute on function public.save_student_profile_privacy(text, text, text, text) to authenticated;
grant execute on function public.save_student_course_attempt_privacy(uuid, text, text, text) to authenticated;
grant execute on function public.delete_guest_workspace() to authenticated;
grant execute on function public.cleanup_guest_workspace_data(interval) to service_role;
