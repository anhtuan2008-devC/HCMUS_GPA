create index if not exists student_course_attempts_user_program_term_idx
  on public.student_course_attempts (
    user_id,
    program_course_id,
    academic_year_start desc,
    semester desc,
    attempt_no desc
  );

create index if not exists student_course_attempts_user_effective_term_idx
  on public.student_course_attempts (
    user_id,
    is_effective,
    academic_year_start desc,
    semester desc
  )
  where is_effective = true;

create index if not exists term_plans_user_exact_term_idx
  on public.term_plans (user_id, academic_year_start, semester);

create index if not exists rate_limit_events_created_idx
  on public.rate_limit_events (created_at desc);

create index if not exists rate_limit_events_user_created_idx
  on public.rate_limit_events (user_id, created_at desc)
  where user_id is not null;

create or replace function public.cleanup_security_event_logs(
  p_rate_limit_retention interval default interval '1 day',
  p_security_event_retention interval default interval '30 days'
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_rate_limit_deleted integer := 0;
  v_security_deleted integer := 0;
begin
  delete from public.rate_limit_events
  where created_at < now() - p_rate_limit_retention;
  get diagnostics v_rate_limit_deleted = row_count;

  delete from public.security_events
  where created_at < now() - p_security_event_retention;
  get diagnostics v_security_deleted = row_count;

  return v_rate_limit_deleted + v_security_deleted;
end;
$$;

revoke all on function public.cleanup_security_event_logs(interval, interval) from public;
grant execute on function public.cleanup_security_event_logs(interval, interval) to service_role;
