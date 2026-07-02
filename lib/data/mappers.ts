import type { Database } from "@/lib/supabase/database";
import { parseAcademicTermLabel } from "@/lib/terms";
import type {
  AuthenticatedUser,
  Course,
  CourseGroup,
  ProgramCurriculum,
  ProgramRequirementSection,
  ProgramSummary,
  ProgramTermTemplate,
  StudentCourseRecord,
  StudentCourseAttempt,
  StudentPreference,
  StudentProfile,
  TermPlan,
} from "@/lib/types";

type ProgramRow = Database["public"]["Tables"]["programs"]["Row"];
type CourseGroupRow = Database["public"]["Tables"]["course_groups"]["Row"];
type ProgramRequirementSectionRow =
  Database["public"]["Tables"]["program_requirement_sections"]["Row"];
type CourseCatalogRow = Database["public"]["Tables"]["course_catalog"]["Row"];
type ProgramCourseRow = Database["public"]["Tables"]["program_courses"]["Row"] & {
  course_catalog?: CourseCatalogRow | null;
};
type ProgramCoursePrerequisiteRow =
  Database["public"]["Tables"]["program_course_prerequisites"]["Row"];
type StudentProfileRow = Database["public"]["Tables"]["student_profiles"]["Row"];
type StudentCourseRecordRow = Database["public"]["Tables"]["student_course_records"]["Row"];
type StudentCourseAttemptRow = Database["public"]["Tables"]["student_course_attempts"]["Row"];
type StudentPreferenceRow = Database["public"]["Tables"]["student_preferences"]["Row"];
type TermPlanRow = Database["public"]["Tables"]["term_plans"]["Row"];
type ProgramTermTemplateRow = Database["public"]["Tables"]["program_term_templates"]["Row"];

export function mapAuthenticatedUser(user: {
  id: string;
  email?: string | null;
}): AuthenticatedUser {
  return {
    id: user.id,
    email: user.email ?? null,
  };
}

export function mapProgramSummary(row: ProgramRow): ProgramSummary {
  return {
    id: row.id,
    code: row.code,
    name: row.name,
    englishName: row.english_name,
    degree: row.degree,
    durationYears: row.duration_years,
    totalCredits: row.total_credits,
    sourceNote: row.source_note,
    curriculumCoverageNote: row.curriculum_coverage_note,
  };
}

export function mapCourseGroup(row: CourseGroupRow): CourseGroup {
  return {
    id: row.id,
    programId: row.program_id,
    title: row.title,
    category: row.category,
    requiredCredits: row.required_credits,
    description: row.description,
    order: row.display_order,
  };
}

export function mapProgramRequirementSection(
  row: ProgramRequirementSectionRow,
): ProgramRequirementSection {
  return {
    id: row.id,
    programId: row.program_id,
    title: row.title,
    category: row.category,
    requiredCredits: row.required_credits,
    electiveCredits: row.elective_credits,
    freeElectiveCredits: row.free_elective_credits,
    totalCredits: row.total_credits,
    countsTowardProgramTotal: row.counts_toward_program_total,
    sourceNote: row.source_note,
    order: row.display_order,
  };
}

export function mapCourse(
  row: ProgramCourseRow,
  prerequisitesByCourseId: Map<string, string[]>,
): Course {
  const catalog = row.course_catalog;

  return {
    id: row.id,
    catalogCourseId: row.catalog_course_id,
    programId: row.program_id,
    groupId: row.group_id,
    category: row.category,
    code: catalog?.code ?? row.catalog_course_id,
    title: catalog?.title ?? row.catalog_course_id,
    credits: catalog?.credits ?? 0,
    lectureHours: catalog?.lecture_hours ?? 0,
    practiceHours: catalog?.practice_hours ?? 0,
    labHours: catalog?.lab_hours ?? 0,
    kind: row.kind,
    suggestedTerm: row.suggested_term,
    prerequisites: prerequisitesByCourseId.get(row.id) ?? [],
    notes: row.notes,
    countsTowardGpa: row.counts_toward_gpa ?? catalog?.default_counts_toward_gpa ?? true,
    countsTowardProgress:
      row.counts_toward_progress ?? catalog?.default_counts_toward_progress ?? true,
    gradingMode: row.grading_mode ?? catalog?.default_grading_mode ?? "numeric",
  };
}

export function mapProgramCurriculum(
  programRow: ProgramRow,
  courseGroupRows: CourseGroupRow[],
  requirementSectionRows: ProgramRequirementSectionRow[],
  courseRows: ProgramCourseRow[],
  prerequisiteRows: ProgramCoursePrerequisiteRow[],
): ProgramCurriculum {
  const prerequisitesByCourseId = new Map<string, string[]>();

  for (const row of prerequisiteRows) {
    const existing = prerequisitesByCourseId.get(row.program_course_id) ?? [];
    existing.push(row.prerequisite_program_course_id);
    prerequisitesByCourseId.set(row.program_course_id, existing);
  }

  return {
    ...mapProgramSummary(programRow),
    requirementSections: requirementSectionRows
      .map(mapProgramRequirementSection)
      .sort((left, right) => left.order - right.order),
    courseGroups: courseGroupRows
      .map(mapCourseGroup)
      .sort((left, right) => left.order - right.order),
    courses: courseRows
      .map((row) => mapCourse(row, prerequisitesByCourseId))
      .sort((left, right) => {
        if (left.suggestedTerm === right.suggestedTerm) {
          return left.code.localeCompare(right.code);
        }

        return left.suggestedTerm - right.suggestedTerm;
      }),
  };
}

export function mapStudentProfile(row: StudentProfileRow): StudentProfile {
  return {
    userId: row.user_id,
    fullName: row.full_name,
    studentCode: row.student_code,
    email: row.email,
    startYear: row.start_year,
    programId: row.program_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapStudentCourseRecord(
  row: StudentCourseRecordRow,
): StudentCourseRecord {
  const parsedTerm = parseAcademicTermLabel(row.term_label);

  return {
    courseId: row.program_course_id ?? row.course_id,
    score10: Number(row.score10),
    score4: Number(row.score4),
    status: row.status,
    termLabel: row.term_label,
    semester: parsedTerm.semester,
    academicYearStart: parsedTerm.academicYearStart,
    academicYearLabel: parsedTerm.academicYearLabel,
    gradeInputMode: "numeric",
    notes: row.notes,
    updatedAt: row.updated_at,
  };
}

export function mapStudentCourseAttempt(row: StudentCourseAttemptRow): StudentCourseAttempt {
  const parsedTerm = parseAcademicTermLabel(row.term_label);
  const semester = row.semester ?? parsedTerm.semester;
  const academicYearStart = row.academic_year_start ?? parsedTerm.academicYearStart;
  const academicYearLabel =
    row.academic_year_label ?? `${academicYearStart}-${academicYearStart + 1}`;

  return {
    id: row.id,
    courseId: row.program_course_id ?? row.course_id,
    attemptNo: row.attempt_no,
    attemptType: row.attempt_type,
    score10: row.score10 === null ? null : Number(row.score10),
    score4: row.score4 === null ? null : Number(row.score4),
    status: row.status,
    termLabel: row.term_label ?? parsedTerm.termLabel,
    semester,
    academicYearStart,
    academicYearLabel,
    gradeInputMode: row.grade_input_mode ?? (row.score10 === null ? "pass_fail" : "numeric"),
    notes: row.notes,
    isEffective: row.is_effective,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapAttemptToRecord(attempt: StudentCourseAttempt): StudentCourseRecord {
  return {
    courseId: attempt.courseId,
    score10: attempt.score10,
    score4: attempt.score4,
    status: attempt.status,
    termLabel: attempt.termLabel,
    semester: attempt.semester,
    academicYearStart: attempt.academicYearStart,
    academicYearLabel: attempt.academicYearLabel,
    gradeInputMode: attempt.gradeInputMode,
    notes: attempt.notes,
    updatedAt: attempt.updatedAt,
  };
}

export function deriveEffectiveRecords(attempts: StudentCourseAttempt[]): StudentCourseRecord[] {
  return attempts
    .filter((attempt) => attempt.isEffective)
    .map(mapAttemptToRecord)
    .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
}

export function mapStudentPreference(row: StudentPreferenceRow): StudentPreference {
  const parsedTerm = parseAcademicTermLabel(row.current_term_label);
  const semester = row.semester ?? parsedTerm.semester;
  const academicYearStart = row.academic_year_start ?? parsedTerm.academicYearStart;

  return {
    userId: row.user_id,
    currentTermLabel: row.current_term_label ?? parsedTerm.termLabel,
    semester,
    academicYearStart,
    academicYearLabel: row.academic_year_label ?? `${academicYearStart}-${academicYearStart + 1}`,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapTermPlan(
  row: TermPlanRow & {
    term_plan_courses?: Array<{
      course_id: string;
      program_course_id?: string | null;
      display_order?: number | null;
      source?: "template" | "manual" | "suggested" | null;
      notes?: string | null;
      expected_score10?: number | null;
      expected_grade_input_mode?: "numeric" | "pass_fail" | null;
      expected_pass_fail_status?: "passed" | "failed" | null;
    }>;
  },
): TermPlan {
  const parsedTerm = parseAcademicTermLabel(row.term_label);
  const semester = row.semester ?? parsedTerm.semester;
  const academicYearStart = row.academic_year_start ?? parsedTerm.academicYearStart;
  const courseItems = (row.term_plan_courses ?? [])
    .map((item, index) => ({
      courseId: item.program_course_id ?? item.course_id,
      displayOrder: item.display_order ?? index,
      source: item.source ?? "manual",
      notes: item.notes ?? null,
      expectedScore10:
        item.expected_score10 === null || item.expected_score10 === undefined
          ? null
          : Number(item.expected_score10),
      expectedGradeInputMode: item.expected_grade_input_mode ?? "numeric",
      expectedPassFailStatus: item.expected_pass_fail_status ?? null,
    }))
    .sort((left, right) => left.displayOrder - right.displayOrder);

  return {
    id: row.id,
    termLabel: row.term_label ?? parsedTerm.termLabel,
    semester,
    academicYearStart,
    academicYearLabel: row.academic_year_label ?? `${academicYearStart}-${academicYearStart + 1}`,
    focus: row.focus,
    courseIds: courseItems.map((item) => item.courseId),
    courseItems,
    updatedAt: row.updated_at,
  };
}

export function mapProgramTermTemplate(
  row: ProgramTermTemplateRow & {
    program_term_template_courses?: Array<{
      course_id: string;
      program_course_id?: string | null;
      display_order: number;
      is_required_in_template: boolean;
      note: string | null;
    }>;
  },
): ProgramTermTemplate {
  return {
    id: row.id,
    programId: row.program_id,
    termNumber: row.term_number,
    termLabel: row.term_label,
    recommendedCredits: row.recommended_credits,
    sourceNote: row.source_note,
    displayOrder: row.display_order,
    courses: (row.program_term_template_courses ?? [])
      .map((item) => ({
        courseId: item.program_course_id ?? item.course_id,
        displayOrder: item.display_order,
        isRequiredInTemplate: item.is_required_in_template,
        note: item.note,
      }))
      .sort((left, right) => left.displayOrder - right.displayOrder),
  };
}
