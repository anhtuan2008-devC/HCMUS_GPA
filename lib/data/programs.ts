import type { SupabaseClient } from "@supabase/supabase-js";
import { mapProgramCurriculum, mapProgramSummary } from "@/lib/data/mappers";
import type { Database } from "@/lib/supabase/database";
import type { ProgramCurriculum, ProgramSummary } from "@/lib/types";

type TypedSupabaseClient = SupabaseClient<Database>;

const programColumns =
  "id, code, name, english_name, degree, duration_years, total_credits, source_note, curriculum_coverage_note, created_at, updated_at";
const courseGroupColumns =
  "id, program_id, title, category, required_credits, description, display_order, created_at, updated_at";
const requirementSectionColumns =
  "id, program_id, title, category, required_credits, elective_credits, free_elective_credits, total_credits, counts_toward_program_total, source_note, display_order, created_at, updated_at";
const courseCatalogColumns =
  "id, code, title, credits, lecture_hours, practice_hours, lab_hours, default_counts_toward_gpa, default_counts_toward_progress, default_grading_mode, is_active, created_at, updated_at";
const programCourseColumns =
  "id, program_id, catalog_course_id, group_id, category, kind, suggested_term, notes, counts_toward_gpa, counts_toward_progress, grading_mode, display_order, is_active, created_at, updated_at";
const prerequisiteColumns =
  "program_course_id, prerequisite_program_course_id, created_at";

export async function listPrograms(
  supabase: TypedSupabaseClient,
): Promise<ProgramSummary[]> {
  const { data, error } = await supabase
    .from("programs")
    .select(programColumns)
    .order("code", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map(mapProgramSummary);
}

export async function getProgramCurriculum(
  supabase: TypedSupabaseClient,
  programId: string,
): Promise<ProgramCurriculum> {
  const [programResult, courseGroupResult, requirementSectionResult, courseResult] = await Promise.all([
    supabase.from("programs").select(programColumns).eq("id", programId).single(),
    supabase
      .from("course_groups")
      .select(courseGroupColumns)
      .eq("program_id", programId)
      .order("display_order", { ascending: true }),
    supabase
      .from("program_requirement_sections")
      .select(requirementSectionColumns)
      .eq("program_id", programId)
      .order("display_order", { ascending: true }),
    supabase
      .from("program_courses")
      .select(`${programCourseColumns}, course_catalog(${courseCatalogColumns})`)
      .eq("program_id", programId)
      .order("suggested_term", { ascending: true })
      .order("display_order", { ascending: true }),
  ]);

  if (programResult.error) {
    throw new Error(programResult.error.message);
  }

  if (courseGroupResult.error) {
    throw new Error(courseGroupResult.error.message);
  }

  if (requirementSectionResult.error) {
    throw new Error(requirementSectionResult.error.message);
  }

  if (courseResult.error) {
    throw new Error(courseResult.error.message);
  }

  const courseRows = (courseResult.data ?? []) as Parameters<typeof mapProgramCurriculum>[3];
  const courseIds = courseRows.map((row) => row.id);
  const prerequisiteResult = courseIds.length
    ? await supabase
        .from("program_course_prerequisites")
        .select(prerequisiteColumns)
        .in("program_course_id", courseIds)
    : { data: [], error: null };

  if (prerequisiteResult.error) {
    throw new Error(prerequisiteResult.error.message);
  }

  return mapProgramCurriculum(
    programResult.data,
    courseGroupResult.data ?? [],
    requirementSectionResult.data ?? [],
    courseRows,
    prerequisiteResult.data ?? [],
  );
}
