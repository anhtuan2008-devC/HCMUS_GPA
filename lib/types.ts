export type ProgramId = string;

export type CourseCategory =
  | "general-education"
  | "foundation"
  | "major-core"
  | "major-elective"
  | "graduation";

export type ProgramRequirementCategory =
  | "general-education"
  | "foundation"
  | "major"
  | "graduation";

export type CourseKind = "required" | "elective" | "graduation";

export type RecordStatus = "planned" | "passed" | "failed";

export type CurriculumStatus = "not-started" | "planned" | "passed" | "failed";

export type AttemptType = "first" | "retake" | "improvement";

export type GradingMode = "numeric" | "pass_fail" | "numeric_or_pass_fail";

export type GradeInputMode = "numeric" | "pass_fail";

export type PlanCourseSource = "template" | "manual" | "suggested";

export type ViewKey =
  | "dashboard"
  | "curriculum"
  | "grades"
  | "planner"
  | "insights";

export type GradesPageKey = "entry" | "history";

export type DashboardPageKey = "overview" | "gpa-calculation";

export interface AuthenticatedUser {
  id: string;
  email: string | null;
}

export interface ProgramSummary {
  id: ProgramId;
  code: string;
  name: string;
  englishName: string;
  degree: string;
  durationYears: number;
  totalCredits: number;
  sourceNote: string;
  curriculumCoverageNote: string;
}

export interface CourseGroup {
  id: string;
  programId: ProgramId;
  title: string;
  category: CourseCategory;
  requiredCredits: number;
  description: string;
  order: number;
}

export interface ProgramRequirementSection {
  id: string;
  programId: ProgramId;
  title: string;
  category: ProgramRequirementCategory;
  requiredCredits: number;
  electiveCredits: number;
  freeElectiveCredits: number;
  totalCredits: number;
  countsTowardProgramTotal: boolean;
  sourceNote: string;
  order: number;
}

export interface Course {
  id: string;
  catalogCourseId: string;
  programId: ProgramId;
  groupId: string;
  category: CourseCategory;
  code: string;
  title: string;
  credits: number;
  lectureHours: number;
  practiceHours: number;
  labHours: number;
  kind: CourseKind;
  suggestedTerm: number;
  prerequisites: string[];
  notes: string | null;
  countsTowardGpa: boolean;
  countsTowardProgress: boolean;
  gradingMode: GradingMode;
}

export interface ProgramCurriculum extends ProgramSummary {
  requirementSections: ProgramRequirementSection[];
  courseGroups: CourseGroup[];
  courses: Course[];
}

export interface StudentProfile {
  userId: string;
  fullName: string;
  studentCode: string;
  email: string;
  startYear: number;
  programId: ProgramId;
  createdAt: string;
  updatedAt: string;
}

export interface StudentCourseRecord {
  courseId: string;
  score10: number | null;
  score4: number | null;
  status: RecordStatus;
  termLabel: string;
  semester: number;
  academicYearStart: number;
  academicYearLabel: string;
  gradeInputMode: GradeInputMode;
  notes: string | null;
  updatedAt: string;
}

export interface StudentCourseAttempt extends StudentCourseRecord {
  id: string;
  attemptNo: number;
  attemptType: AttemptType;
  isEffective: boolean;
  createdAt: string;
}

export type EffectiveCourseRecord = StudentCourseRecord;

export interface StudentPreference {
  userId: string;
  currentTermLabel: string;
  semester: number;
  academicYearStart: number;
  academicYearLabel: string;
  createdAt: string;
  updatedAt: string;
}

export interface TermPlanCourseItem {
  courseId: string;
  displayOrder: number;
  source: PlanCourseSource;
  notes: string | null;
  expectedScore10: number | null;
  expectedGradeInputMode: GradeInputMode;
  expectedPassFailStatus: Exclude<RecordStatus, "planned"> | null;
}

export interface TermPlan {
  id: string;
  termLabel: string;
  semester: number;
  academicYearStart: number;
  academicYearLabel: string;
  focus: string;
  courseIds: string[];
  courseItems: TermPlanCourseItem[];
  updatedAt: string;
}

export interface ProgramTermTemplateCourse {
  courseId: string;
  displayOrder: number;
  isRequiredInTemplate: boolean;
  note: string | null;
}

export interface ProgramTermTemplate {
  id: string;
  programId: ProgramId;
  termNumber: number;
  termLabel: string;
  recommendedCredits: number;
  sourceNote: string;
  displayOrder: number;
  courses: ProgramTermTemplateCourse[];
}

export interface NotificationItem {
  id: string;
  tone: "success" | "warning" | "danger" | "neutral";
  title: string;
  description: string;
  actionLabel: string;
  targetView: ViewKey;
  targetGradesPage?: GradesPageKey;
}

export interface GpaSummary {
  gpa10: number;
  gpa4: number;
  attemptedCredits: number;
  earnedCredits: number;
  passedCourseCount: number;
  failedCourseCount: number;
}

export interface GpaBreakdownRow {
  courseId: string;
  courseCode: string;
  courseTitle: string;
  termLabel: string;
  semester: number;
  academicYearStart: number;
  credits: number;
  score10: number | null;
  score4: number | null;
  status: RecordStatus;
  gradeInputMode: GradeInputMode;
  notes: string | null;
  countsTowardGpa: boolean;
  countsTowardProgress: boolean;
  officiallyIncludedInGpa: boolean;
  includedInGpa: boolean;
  canSimulateInGpa: boolean;
  isSimulationOverride: boolean;
  exclusionReason: string | null;
  weightedScore10: number | null;
  weightedScore4: number | null;
}

export interface GpaBreakdownTerm {
  termLabel: string;
  semester: number;
  academicYearStart: number;
}

export interface GpaBreakdown {
  gpa10: number;
  gpa4: number;
  officialGpa10: number;
  officialGpa4: number;
  simulatedGpa10: number;
  simulatedGpa4: number;
  termGpa10: number;
  termGpa4: number;
  cumulativeThroughTermGpa10: number;
  cumulativeThroughTermGpa4: number;
  studyAverage10: number;
  earnedCredits: number;
  gpaCredits: number;
  simulatedGpaCredits: number;
  studiedCredits: number;
  weightedScore10Total: number;
  weightedScore4Total: number;
  simulatedWeightedScore10Total: number;
  simulatedWeightedScore4Total: number;
  studiedCourseCount: number;
  gpaCourseCount: number;
  simulatedGpaCourseCount: number;
  availableTerms: GpaBreakdownTerm[];
  rows: GpaBreakdownRow[];
}

export interface GroupProgress {
  groupId: string;
  title: string;
  requiredCredits: number;
  earnedCredits: number;
  completionRate: number;
}

export interface ConditionProgress {
  totalCourses: number;
  completedCourses: number;
  pendingCourses: number;
  totalCredits: number;
  completedCredits: number;
}

export interface GraduationProgress {
  totalCredits: number;
  earnedCredits: number;
  remainingCredits: number;
  completionRate: number;
  missingRequiredCourses: number;
  conditionProgress: ConditionProgress;
  groupProgress: GroupProgress[];
}

export interface SuggestedPlan {
  targetTerm: string;
  recommendedCredits: number;
  courses: Course[];
  blockedCourses: Course[];
}

export interface TimelinePoint {
  termLabel: string;
  gpa10: number;
  gpa4: number;
  earnedCredits: number;
}

export interface WorkspaceSnapshot {
  user: AuthenticatedUser;
  programs: ProgramSummary[];
  profile: StudentProfile | null;
  currentProgram: ProgramCurriculum | null;
  preference: StudentPreference | null;
  attempts: StudentCourseAttempt[];
  records: StudentCourseRecord[];
  plans: TermPlan[];
  termTemplates: ProgramTermTemplate[];
  summary: GpaSummary | null;
  progress: GraduationProgress | null;
}
