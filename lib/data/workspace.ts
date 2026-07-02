import { redirect } from "next/navigation";
import { calculateGpa, calculateGraduationProgress } from "@/lib/grade";
import {
  deriveEffectiveRecords,
  mapAuthenticatedUser,
  mapProgramTermTemplate,
  mapStudentCourseAttempt,
  mapStudentCourseRecord,
  mapStudentPreference,
  mapStudentProfile,
  mapTermPlan,
} from "@/lib/data/mappers";
import { getProgramCurriculum, listPrograms } from "@/lib/data/programs";
import { createClient } from "@/lib/supabase/server";
import type {
  AuthenticatedUser,
  ProgramTermTemplate,
  StudentCourseAttempt,
  StudentCourseRecord,
  StudentPreference,
  StudentProfile,
  TermPlan,
  WorkspaceSnapshot,
} from "@/lib/types";

const studentProfileColumns =
  "user_id, full_name, student_code, email, start_year, program_id, created_at, updated_at";
const studentCourseRecordColumns =
  "user_id, course_id, program_course_id, score10, score4, status, term_label, notes, created_at, updated_at";
const studentCourseAttemptColumns =
  "id, user_id, course_id, program_course_id, attempt_no, attempt_type, score10, score4, status, term_label, semester, academic_year_start, academic_year_label, grade_input_mode, notes, is_effective, created_at, updated_at";
const studentPreferenceColumns =
  "user_id, current_term_label, semester, academic_year_start, academic_year_label, created_at, updated_at";
const termPlanColumns =
  "id, user_id, term_label, semester, academic_year_start, academic_year_label, focus, created_at, updated_at";
const termPlanCourseColumns =
  "course_id, program_course_id, display_order, source, notes, expected_score10, expected_grade_input_mode, expected_pass_fail_status";
const programTermTemplateColumns =
  "id, program_id, term_number, term_label, recommended_credits, source_note, display_order, created_at, updated_at";
const programTermTemplateCourseColumns =
  "course_id, program_course_id, display_order, is_required_in_template, note";

export async function getSessionContext() {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  return { supabase, user, error };
}

export async function requireAuthenticatedUser(): Promise<AuthenticatedUser> {
  const { user } = await getSessionContext();

  if (!user) {
    redirect("/dang-nhap");
  }

  return mapAuthenticatedUser(user);
}

export async function getStudentProfile(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
): Promise<StudentProfile | null> {
  const { data, error } = await supabase
    .from("student_profiles")
    .select(studentProfileColumns)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data ? mapStudentProfile(data) : null;
}

export async function getStudentCourseRecords(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
): Promise<StudentCourseRecord[]> {
  const attempts = await getStudentCourseAttempts(supabase, userId);

  if (attempts.length) {
    return deriveEffectiveRecords(attempts);
  }

  const { data, error } = await supabase
    .from("student_course_records")
    .select(studentCourseRecordColumns)
    .eq("user_id", userId)
    .order("updated_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map(mapStudentCourseRecord);
}

export async function getStudentCourseAttempts(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
): Promise<StudentCourseAttempt[]> {
  const { data, error } = await supabase
    .from("student_course_attempts")
    .select(studentCourseAttemptColumns)
    .eq("user_id", userId)
    .order("academic_year_start", { ascending: false })
    .order("semester", { ascending: false })
    .order("attempt_no", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map(mapStudentCourseAttempt);
}

export async function getStudentPreference(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
): Promise<StudentPreference | null> {
  const { data, error } = await supabase
    .from("student_preferences")
    .select(studentPreferenceColumns)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data ? mapStudentPreference(data) : null;
}

export async function getTermPlans(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
): Promise<TermPlan[]> {
  const { data, error } = await supabase
    .from("term_plans")
    .select(`${termPlanColumns}, term_plan_courses(${termPlanCourseColumns})`)
    .eq("user_id", userId)
    .order("academic_year_start", { ascending: false })
    .order("semester", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map((row) => mapTermPlan(row));
}

export async function getProgramTermTemplates(
  supabase: Awaited<ReturnType<typeof createClient>>,
  programId: string,
): Promise<ProgramTermTemplate[]> {
  const { data, error } = await supabase
    .from("program_term_templates")
    .select(
      `${programTermTemplateColumns}, program_term_template_courses(${programTermTemplateCourseColumns})`,
    )
    .eq("program_id", programId)
    .order("term_number", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map((row) => mapProgramTermTemplate(row));
}

export async function getWorkspaceSnapshot(): Promise<WorkspaceSnapshot> {
  const { supabase, user, error } = await getSessionContext();

  if (error || !user) {
    redirect("/dang-nhap");
  }

  const userInfo = mapAuthenticatedUser(user);
  const programs = await listPrograms(supabase);
  const profile = await getStudentProfile(supabase, user.id);

  if (!profile) {
    return {
      user: userInfo,
      programs,
      profile: null,
      currentProgram: null,
      preference: null,
      attempts: [],
      records: [],
      plans: [],
      termTemplates: [],
      summary: null,
      progress: null,
    };
  }

  const [currentProgram, attempts, preference, plans, termTemplates] = await Promise.all([
    getProgramCurriculum(supabase, profile.programId),
    getStudentCourseAttempts(supabase, user.id),
    getStudentPreference(supabase, user.id),
    getTermPlans(supabase, user.id),
    getProgramTermTemplates(supabase, profile.programId),
  ]);
  const records = deriveEffectiveRecords(attempts);

  return {
    user: userInfo,
    programs,
    profile,
    currentProgram,
    preference,
    attempts,
    records,
    plans,
    termTemplates,
    summary: calculateGpa(records, currentProgram.courses),
    progress: calculateGraduationProgress(currentProgram, records),
  };
}
