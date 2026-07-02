grant usage on schema public to authenticated;

grant select on public.programs to authenticated;
grant select on public.course_groups to authenticated;
grant select on public.courses to authenticated;
grant select on public.course_prerequisites to authenticated;

grant select, insert, update on public.student_profiles to authenticated;
grant select, insert, update, delete on public.student_course_records to authenticated;
grant select, insert, update, delete on public.term_plans to authenticated;
grant select, insert, delete on public.term_plan_courses to authenticated;

create or replace function public.lock_student_profile_program_id()
returns trigger
language plpgsql
as $$
begin
  if old.program_id is distinct from new.program_id then
    raise exception 'program_id cannot be changed once the student profile is created'
      using errcode = 'check_violation';
  end if;

  return new;
end;
$$;

drop trigger if exists lock_student_profile_program_id on public.student_profiles;
create trigger lock_student_profile_program_id
before update on public.student_profiles
for each row execute function public.lock_student_profile_program_id();
