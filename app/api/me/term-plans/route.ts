import { z } from "zod";
import { termPlanDto, termPlansDto } from "@/lib/data/dto";
import { callMutationRpc } from "@/lib/data/rpc";
import { getSessionContext, getTermPlans } from "@/lib/data/workspace";
import { formatTermLabel, parseAcademicTermLabel } from "@/lib/terms";
import { errorResponse, jsonError, jsonOk, jsonUnauthorized } from "@/lib/security/api-response";
import { assertSameOrigin, readJsonStrict } from "@/lib/security/request-guards";
import { checkMutationRateLimit } from "@/lib/security/rate-limit";
import type { GradeInputMode, PlanCourseSource } from "@/lib/types";

const sourceSchema = z.enum(["template", "manual", "suggested"]);
const expectedGradeInputModeSchema = z.enum(["numeric", "pass_fail"]);
const expectedPassFailStatusSchema = z.enum(["passed", "failed"]);

const planCourseItemSchema = z
  .object({
    courseId: z.string().trim().min(1).max(120),
    displayOrder: z.number().int().min(0).max(200).optional(),
    source: sourceSchema.optional(),
    notes: z.string().trim().max(500).nullable().optional(),
    expectedScore10: z.number().min(0).max(10).nullable().optional(),
    expectedGradeInputMode: expectedGradeInputModeSchema.optional(),
    expectedPassFailStatus: expectedPassFailStatusSchema.nullable().optional(),
  })
  .strict();

const termPlanSchema = z
  .object({
    id: z.string().uuid().optional(),
    termLabel: z.string().trim().min(1).max(80).optional(),
    semester: z.number().int().min(1).max(3).optional(),
    academicYearStart: z.number().int().min(2000).max(2100).optional(),
    focus: z.string().trim().min(1).max(240),
    courseIds: z.array(z.string().trim().min(1).max(120)).max(24).optional(),
    courseItems: z.array(planCourseItemSchema).max(24).optional(),
  })
  .strict();

function normalizeCourseItems(payload: z.infer<typeof termPlanSchema>) {
  if (payload.courseItems?.length) {
    return payload.courseItems.map((item, index) => ({
      courseId: item.courseId,
      displayOrder: item.displayOrder ?? index,
      source: (item.source ?? "manual") as PlanCourseSource,
      notes: item.notes ?? null,
      expectedScore10: item.expectedScore10 ?? null,
      expectedGradeInputMode: (item.expectedGradeInputMode ?? "numeric") as GradeInputMode,
      expectedPassFailStatus: item.expectedPassFailStatus ?? null,
    }));
  }

  return (payload.courseIds ?? []).map((courseId, index) => ({
    courseId,
    displayOrder: index,
    source: "manual" as PlanCourseSource,
    notes: null,
    expectedScore10: null,
    expectedGradeInputMode: "numeric" as GradeInputMode,
    expectedPassFailStatus: null,
  }));
}

async function savePlan(request: Request) {
  const { supabase, user, error } = await getSessionContext();

  if (error || !user) {
    return jsonUnauthorized("Bạn cần đăng nhập để lưu kế hoạch học kỳ.");
  }

  try {
    assertSameOrigin(request);
    await checkMutationRateLimit(supabase, request, user.id, "term-plan:save", 50);
    const payload = await readJsonStrict(
      request,
      termPlanSchema,
      "Thông tin kế hoạch học kỳ chưa hợp lệ.",
    );
    const parsedTerm = payload.termLabel ? parseAcademicTermLabel(payload.termLabel) : null;
    const semester = payload.semester ?? parsedTerm?.semester ?? 1;
    const academicYearStart = payload.academicYearStart ?? parsedTerm?.academicYearStart ?? 2026;
    const termLabel = formatTermLabel(semester, academicYearStart);
    const courseItems = normalizeCourseItems(payload);

    await callMutationRpc(supabase, "save_term_plan", {
      p_plan_id: payload.id ?? null,
      p_semester: semester,
      p_academic_year_start: academicYearStart,
      p_focus: payload.focus,
      p_course_items: courseItems,
    });

    const plans = await getTermPlans(supabase, user.id);
    const plan = plans.find((item) => item.termLabel === termLabel);

    if (!plan) {
      throw new Error("Chưa tải lại được kế hoạch học kỳ vừa lưu.");
    }

    return jsonOk({ plan: termPlanDto(plan) });
  } catch (routeError) {
    return errorResponse(routeError, "Chưa lưu được kế hoạch học kỳ.");
  }
}

export async function GET() {
  const { supabase, user, error } = await getSessionContext();

  if (error || !user) {
    return jsonUnauthorized("Bạn cần đăng nhập để xem kế hoạch học kỳ.");
  }

  try {
    const plans = await getTermPlans(supabase, user.id);
    return jsonOk({ plans: termPlansDto(plans) });
  } catch (routeError) {
    return errorResponse(routeError, "Chưa tải được kế hoạch học kỳ.");
  }
}

export async function POST(request: Request) {
  return savePlan(request);
}

export async function PUT(request: Request) {
  return savePlan(request);
}

export async function DELETE(request: Request) {
  const { supabase, user, error } = await getSessionContext();

  if (error || !user) {
    return jsonUnauthorized("Bạn cần đăng nhập để xóa kế hoạch học kỳ.");
  }

  try {
    assertSameOrigin(request);
    await checkMutationRateLimit(supabase, request, user.id, "term-plan:delete", 30);
    const url = new URL(request.url);
    const planId = url.searchParams.get("planId");
    const termLabel = url.searchParams.get("termLabel");

    if (!planId && !termLabel) {
      return jsonError("Bạn cần chọn kế hoạch trước khi xóa.", 400);
    }

    await callMutationRpc(supabase, "delete_term_plan", {
      p_plan_id: planId,
      p_term_label: termLabel,
    });

    return jsonOk({ plans: termPlansDto(await getTermPlans(supabase, user.id)) });
  } catch (routeError) {
    return errorResponse(routeError, "Chưa xóa được kế hoạch học kỳ.");
  }
}
