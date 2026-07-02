import type {
  GpaSummary,
  GraduationProgress,
  ProgramCurriculum,
  ProgramSummary,
  ProgramTermTemplate,
  StudentCourseAttempt,
  StudentCourseRecord,
  StudentPreference,
  StudentProfile,
  TermPlan,
} from "@/lib/types";

export function profileDto(profile: StudentProfile | null) {
  return profile;
}

export function preferenceDto(preference: StudentPreference | null) {
  return preference;
}

export function attemptPayloadDto(input: {
  attempts: StudentCourseAttempt[];
  records: StudentCourseRecord[];
}) {
  return input;
}

export function termPlanDto(plan: TermPlan) {
  return plan;
}

export function termPlansDto(plans: TermPlan[]) {
  return plans;
}

export function programDto(program: ProgramCurriculum) {
  return program;
}

export function programsDto(programs: ProgramSummary[]) {
  return programs;
}

export function templatesDto(templates: ProgramTermTemplate[]) {
  return templates;
}

export function analyticsDto(input: {
  summary: GpaSummary;
  progress: GraduationProgress;
}) {
  return input;
}
