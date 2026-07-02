alter table public.term_plan_courses
  add column if not exists expected_score10 numeric(5,3)
    check (expected_score10 is null or (expected_score10 >= 0 and expected_score10 <= 10)),
  add column if not exists expected_grade_input_mode text not null default 'numeric',
  add column if not exists expected_pass_fail_status text;

do $$
begin
  alter table public.term_plan_courses
    add constraint term_plan_courses_expected_grade_input_mode_check
    check (expected_grade_input_mode in ('numeric', 'pass_fail'));
exception
  when duplicate_object then null;
end $$;

do $$
begin
  alter table public.term_plan_courses
    add constraint term_plan_courses_expected_pass_fail_status_check
    check (expected_pass_fail_status is null or expected_pass_fail_status in ('passed', 'failed'));
exception
  when duplicate_object then null;
end $$;
