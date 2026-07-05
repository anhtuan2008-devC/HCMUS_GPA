import type {
  AttemptType,
  CourseCategory,
  CourseKind,
  GradeInputMode,
  GradingMode,
  PlanCourseSource,
  ProgramRequirementCategory,
  RecordStatus,
} from "@/lib/types";

type TableShape<Row, Insert = Row, Update = Partial<Insert>> = {
  Row: Row;
  Insert: Insert;
  Update: Update;
  Relationships: [];
};

export interface Database {
  public: {
    Tables: {
      programs: TableShape<
        {
          id: string;
          code: string;
          name: string;
          english_name: string;
          degree: string;
          duration_years: number;
          total_credits: number;
          source_note: string;
          curriculum_coverage_note: string;
          created_at: string;
          updated_at: string;
        },
        {
          id: string;
          code: string;
          name: string;
          english_name: string;
          degree: string;
          duration_years: number;
          total_credits: number;
          source_note: string;
          curriculum_coverage_note: string;
        }
      >;
      course_groups: TableShape<
        {
          id: string;
          program_id: string;
          title: string;
          category: CourseCategory;
          required_credits: number;
          description: string;
          display_order: number;
          created_at: string;
          updated_at: string;
        },
        {
          id: string;
          program_id: string;
          title: string;
          category: CourseCategory;
          required_credits: number;
          description: string;
          display_order?: number;
        }
      >;
      program_requirement_sections: TableShape<
        {
          id: string;
          program_id: string;
          title: string;
          category: ProgramRequirementCategory;
          required_credits: number;
          elective_credits: number;
          free_elective_credits: number;
          total_credits: number;
          counts_toward_program_total: boolean;
          source_note: string;
          display_order: number;
          created_at: string;
          updated_at: string;
        },
        {
          id: string;
          program_id: string;
          title: string;
          category: ProgramRequirementCategory;
          required_credits?: number;
          elective_credits?: number;
          free_elective_credits?: number;
          total_credits: number;
          counts_toward_program_total?: boolean;
          source_note: string;
          display_order?: number;
        }
      >;
      course_catalog: TableShape<
        {
          id: string;
          code: string;
          title: string;
          credits: number;
          lecture_hours: number;
          practice_hours: number;
          lab_hours: number;
          default_counts_toward_gpa: boolean;
          default_counts_toward_progress: boolean;
          default_grading_mode: GradingMode;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        },
        {
          id: string;
          code: string;
          title: string;
          credits: number;
          lecture_hours?: number;
          practice_hours?: number;
          lab_hours?: number;
          default_counts_toward_gpa?: boolean;
          default_counts_toward_progress?: boolean;
          default_grading_mode?: GradingMode;
          is_active?: boolean;
        }
      >;
      program_courses: TableShape<
        {
          id: string;
          program_id: string;
          catalog_course_id: string;
          group_id: string;
          category: CourseCategory;
          kind: CourseKind;
          suggested_term: number;
          notes: string | null;
          counts_toward_gpa: boolean;
          counts_toward_progress: boolean;
          grading_mode: GradingMode;
          display_order: number;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        },
        {
          id: string;
          program_id: string;
          catalog_course_id: string;
          group_id: string;
          category: CourseCategory;
          kind: CourseKind;
          suggested_term: number;
          notes?: string | null;
          counts_toward_gpa?: boolean;
          counts_toward_progress?: boolean;
          grading_mode?: GradingMode;
          display_order?: number;
          is_active?: boolean;
        }
      >;
      program_course_prerequisites: TableShape<
        {
          program_course_id: string;
          prerequisite_program_course_id: string;
          created_at: string;
        },
        {
          program_course_id: string;
          prerequisite_program_course_id: string;
        }
      >;
      program_course_replacements: TableShape<
        {
          id: string;
          program_id: string;
          old_program_course_id: string;
          new_program_course_id: string;
          replacement_type: "replacement" | "equivalent";
          effective_academic_year_start: number | null;
          notes: string | null;
          created_at: string;
          updated_at: string;
        },
        {
          id?: string;
          program_id: string;
          old_program_course_id: string;
          new_program_course_id: string;
          replacement_type?: "replacement" | "equivalent";
          effective_academic_year_start?: number | null;
          notes?: string | null;
        }
      >;
      courses: TableShape<
        {
          id: string;
          program_id: string;
          group_id: string;
          category: CourseCategory;
          code: string;
          title: string;
          credits: number;
          lecture_hours: number;
          practice_hours: number;
          lab_hours: number;
          kind: CourseKind;
          suggested_term: number;
          notes: string | null;
          counts_toward_gpa: boolean;
          counts_toward_progress: boolean;
          grading_mode: GradingMode;
          created_at: string;
          updated_at: string;
        },
        {
          id: string;
          program_id: string;
          group_id: string;
          category: CourseCategory;
          code: string;
          title: string;
          credits: number;
          lecture_hours?: number;
          practice_hours?: number;
          lab_hours?: number;
          kind: CourseKind;
          suggested_term: number;
          notes?: string | null;
          counts_toward_gpa?: boolean;
          counts_toward_progress?: boolean;
          grading_mode?: GradingMode;
        }
      >;
      course_prerequisites: TableShape<
        {
          course_id: string;
          prerequisite_course_id: string;
          created_at: string;
        },
        {
          course_id: string;
          prerequisite_course_id: string;
        }
      >;
      student_profiles: TableShape<
        {
          user_id: string;
          full_name: string;
          student_code: string;
          email: string;
          email_hash: string | null;
          student_code_hash: string | null;
          email_encrypted: string | null;
          student_code_encrypted: string | null;
          start_year: number;
          program_id: string;
          created_at: string;
          updated_at: string;
        },
        {
          user_id: string;
          full_name: string;
          student_code: string;
          email: string;
          start_year: number;
          program_id: string;
        }
      >;
      student_course_records: TableShape<
        {
          user_id: string;
          course_id: string;
          program_course_id: string | null;
          score10: number;
          score4: number;
          status: RecordStatus;
          term_label: string;
          notes: string | null;
          created_at: string;
          updated_at: string;
        },
        {
          user_id: string;
          course_id: string;
          program_course_id?: string | null;
          score10: number;
          score4: number;
          status: RecordStatus;
          term_label: string;
          notes?: string | null;
        }
      >;
      student_course_attempts: TableShape<
        {
          id: string;
          user_id: string;
          course_id: string;
          program_course_id: string | null;
          attempt_no: number;
          attempt_type: AttemptType;
          score10: number | null;
          score4: number | null;
          score10_encrypted: string | null;
          score4_encrypted: string | null;
          score_hash: string | null;
          status: Exclude<RecordStatus, "planned">;
          term_label: string;
          semester: number;
          academic_year_start: number;
          academic_year_label: string;
          grade_input_mode: GradeInputMode;
          notes: string | null;
          is_effective: boolean;
          created_at: string;
          updated_at: string;
        },
        {
          id?: string;
          user_id: string;
          course_id: string;
          program_course_id?: string | null;
          attempt_no: number;
          attempt_type: AttemptType;
          score10?: number | null;
          score4?: number | null;
          status: Exclude<RecordStatus, "planned">;
          term_label: string;
          semester: number;
          academic_year_start: number;
          academic_year_label: string;
          grade_input_mode?: GradeInputMode;
          notes?: string | null;
          is_effective?: boolean;
        }
      >;
      student_preferences: TableShape<
        {
          user_id: string;
          current_term_label: string;
          semester: number;
          academic_year_start: number;
          academic_year_label: string;
          created_at: string;
          updated_at: string;
        },
        {
          user_id: string;
          current_term_label: string;
          semester?: number;
          academic_year_start?: number;
          academic_year_label?: string;
        }
      >;
      term_plans: TableShape<
        {
          id: string;
          user_id: string;
          term_label: string;
          semester: number;
          academic_year_start: number;
          academic_year_label: string;
          focus: string;
          created_at: string;
          updated_at: string;
        },
        {
          id?: string;
          user_id: string;
          term_label: string;
          semester?: number;
          academic_year_start?: number;
          academic_year_label?: string;
          focus: string;
        }
      >;
      term_plan_courses: TableShape<
        {
          plan_id: string;
          course_id: string;
          program_course_id: string | null;
          display_order: number;
          source: PlanCourseSource;
          notes: string | null;
          expected_score10: number | null;
          expected_grade_input_mode: GradeInputMode;
          expected_pass_fail_status: Exclude<RecordStatus, "planned"> | null;
          created_at: string;
        },
        {
          plan_id: string;
          course_id: string;
          program_course_id?: string | null;
          display_order?: number;
          source?: PlanCourseSource;
          notes?: string | null;
          expected_score10?: number | null;
          expected_grade_input_mode?: GradeInputMode;
          expected_pass_fail_status?: Exclude<RecordStatus, "planned"> | null;
        }
      >;
      program_term_templates: TableShape<
        {
          id: string;
          program_id: string;
          term_number: number;
          term_label: string;
          recommended_credits: number;
          source_note: string;
          display_order: number;
          created_at: string;
          updated_at: string;
        },
        {
          id: string;
          program_id: string;
          term_number: number;
          term_label: string;
          recommended_credits?: number;
          source_note?: string;
          display_order?: number;
        }
      >;
      program_term_template_courses: TableShape<
        {
          template_id: string;
          course_id: string;
          program_course_id: string | null;
          display_order: number;
          is_required_in_template: boolean;
          note: string | null;
          created_at: string;
        },
        {
          template_id: string;
          course_id: string;
          program_course_id?: string | null;
          display_order?: number;
          is_required_in_template?: boolean;
          note?: string | null;
        }
      >;
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
