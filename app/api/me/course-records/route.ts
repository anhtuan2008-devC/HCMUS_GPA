import { z } from "zod";
import { deriveEffectiveRecords } from "@/lib/data/mappers";
import { attemptPayloadDto } from "@/lib/data/dto";
import { callMutationRpc } from "@/lib/data/rpc";
import { getSessionContext, getStudentCourseAttempts } from "@/lib/data/workspace";
import { formatAcademicYearLabel, formatTermLabel, parseAcademicTermLabel } from "@/lib/terms";
import { errorResponse, jsonError, jsonOk, jsonUnauthorized } from "@/lib/security/api-response";
import { assertSameOrigin, readJsonStrict } from "@/lib/security/request-guards";
import { checkMutationRateLimit } from "@/lib/security/rate-limit";
import type { GradeInputMode } from "@/lib/types";

const gradeInputModeSchema = z.enum(["numeric", "pass_fail"]);
const passFailStatusSchema = z.enum(["passed", "failed"]);

const createAttemptSchema = z
  .object({
    courseId: z.string().trim().min(1).max(120),
    semester: z.number().int().min(1).max(3).optional(),
    academicYearStart: z.number().int().min(2000).max(2100).optional(),
    termLabel: z.string().trim().min(1).max(80).optional(),
    gradeInputMode: gradeInputModeSchema.optional(),
    score10: z.number().min(0).max(10).optional(),
    passFailStatus: passFailStatusSchema.optional(),
    notes: z.string().trim().max(500).nullable().optional(),
  })
  .strict();

const updateAttemptSchema = createAttemptSchema
  .omit({ courseId: true })
  .extend({
    attemptId: z.string().uuid(),
  })
  .strict();

type SupabaseClient = Awaited<ReturnType<typeof getSessionContext>>["supabase"];

type ExistingAttemptRow = {
  course_id: string;
  program_course_id?: string | null;
  term_label: string;
  semester: number;
  academic_year_start: number;
  grade_input_mode: GradeInputMode;
  notes: string | null;
};

function resolveTerm(input: {
  semester?: number;
  academicYearStart?: number;
  termLabel?: string;
  existing?: ExistingAttemptRow;
}) {
  if (input.semester && input.academicYearStart) {
    return {
      semester: input.semester,
      academicYearStart: input.academicYearStart,
      academicYearLabel: formatAcademicYearLabel(input.academicYearStart),
      termLabel: formatTermLabel(input.semester, input.academicYearStart),
    };
  }

  if (input.termLabel) {
    return parseAcademicTermLabel(input.termLabel, input.existing?.academic_year_start ?? 2026);
  }

  if (input.existing) {
    return {
      semester: input.existing.semester,
      academicYearStart: input.existing.academic_year_start,
      academicYearLabel: formatAcademicYearLabel(input.existing.academic_year_start),
      termLabel: formatTermLabel(input.existing.semester, input.existing.academic_year_start),
    };
  }

  throw new Error("Bạn cần chọn học kỳ và năm học trước khi lưu.");
}

async function loadAttemptPayload(supabase: SupabaseClient, userId: string) {
  const attempts = await getStudentCourseAttempts(supabase, userId);
  return attemptPayloadDto({
    attempts,
    records: deriveEffectiveRecords(attempts),
  });
}

async function loadExistingAttempt(
  supabase: SupabaseClient,
  userId: string,
  attemptId: string,
): Promise<ExistingAttemptRow> {
  const { data, error } = await supabase
    .from("student_course_attempts")
    .select("course_id, program_course_id, term_label, semester, academic_year_start, grade_input_mode, notes")
    .eq("user_id", userId)
    .eq("id", attemptId)
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? "Không tìm thấy lần học cần sửa.");
  }

  return data as ExistingAttemptRow;
}

export async function GET() {
  const { supabase, user, error } = await getSessionContext();

  if (error || !user) {
    return jsonUnauthorized("Bạn cần đăng nhập để xem kết quả học tập.");
  }

  try {
    return jsonOk(await loadAttemptPayload(supabase, user.id));
  } catch (routeError) {
    return errorResponse(routeError, "Chưa tải được kết quả học tập.");
  }
}

export async function POST(request: Request) {
  const { supabase, user, error } = await getSessionContext();

  if (error || !user) {
    return jsonUnauthorized("Bạn cần đăng nhập để lưu kết quả học tập.");
  }

  try {
    assertSameOrigin(request);
    await checkMutationRateLimit(supabase, request, user.id, "course-attempt:create", 60);
    const payload = await readJsonStrict(
      request,
      createAttemptSchema,
      "Thông tin điểm học phần chưa hợp lệ.",
    );
    const term = resolveTerm(payload);

    await callMutationRpc(supabase, "create_student_course_attempt", {
      p_program_course_id: payload.courseId,
      p_semester: term.semester,
      p_academic_year_start: term.academicYearStart,
      p_grade_input_mode: payload.gradeInputMode ?? "numeric",
      p_score10: payload.score10 ?? null,
      p_pass_fail_status: payload.passFailStatus ?? null,
      p_notes: payload.notes ?? null,
    });

    return jsonOk(await loadAttemptPayload(supabase, user.id));
  } catch (routeError) {
    return errorResponse(routeError, "Chưa lưu được kết quả học phần.");
  }
}

export async function PUT(request: Request) {
  const { supabase, user, error } = await getSessionContext();

  if (error || !user) {
    return jsonUnauthorized("Bạn cần đăng nhập để sửa kết quả học tập.");
  }

  try {
    assertSameOrigin(request);
    await checkMutationRateLimit(supabase, request, user.id, "course-attempt:update", 60);
    const payload = await readJsonStrict(
      request,
      updateAttemptSchema,
      "Thông tin cập nhật điểm chưa hợp lệ.",
    );
    const existing = await loadExistingAttempt(supabase, user.id, payload.attemptId);
    const term = resolveTerm({ ...payload, existing });

    await callMutationRpc(supabase, "update_student_course_attempt", {
      p_attempt_id: payload.attemptId,
      p_semester: term.semester,
      p_academic_year_start: term.academicYearStart,
      p_grade_input_mode: payload.gradeInputMode ?? existing.grade_input_mode,
      p_score10: payload.score10 ?? null,
      p_pass_fail_status: payload.passFailStatus ?? null,
      p_notes: payload.notes === undefined ? existing.notes : payload.notes,
    });

    return jsonOk(await loadAttemptPayload(supabase, user.id));
  } catch (routeError) {
    return errorResponse(routeError, "Chưa sửa được kết quả học phần.");
  }
}

export async function DELETE(request: Request) {
  const { supabase, user, error } = await getSessionContext();

  if (error || !user) {
    return jsonUnauthorized("Bạn cần đăng nhập để xóa kết quả học tập.");
  }

  try {
    assertSameOrigin(request);
    await checkMutationRateLimit(supabase, request, user.id, "course-attempt:delete", 30);

    const url = new URL(request.url);
    const attemptId = url.searchParams.get("attemptId");
    const courseId = url.searchParams.get("courseId");

    if (!attemptId && !courseId) {
      return jsonError("Bạn cần chọn lần học trước khi xóa.", 400);
    }

    await callMutationRpc(supabase, "delete_student_course_attempt", {
      p_attempt_id: attemptId,
      p_program_course_id: courseId,
    });

    return jsonOk(await loadAttemptPayload(supabase, user.id));
  } catch (routeError) {
    return errorResponse(routeError, "Chưa xóa được kết quả học phần.");
  }
}
