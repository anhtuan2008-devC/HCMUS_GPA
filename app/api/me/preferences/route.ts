import { z } from "zod";
import { getSessionContext, getStudentPreference } from "@/lib/data/workspace";
import { formatTermLabel, parseAcademicTermLabel } from "@/lib/terms";
import { preferenceDto } from "@/lib/data/dto";
import { callMutationRpc } from "@/lib/data/rpc";
import { errorResponse, jsonOk, jsonUnauthorized } from "@/lib/security/api-response";
import { assertSameOrigin, readJsonStrict } from "@/lib/security/request-guards";
import { checkMutationRateLimit } from "@/lib/security/rate-limit";

const preferenceSchema = z.object({
  currentTermLabel: z.string().trim().min(1).max(80).optional(),
  semester: z.number().int().min(1).max(3).optional(),
  academicYearStart: z.number().int().min(2000).max(2100).optional(),
}).strict();

export async function GET() {
  const { supabase, user, error } = await getSessionContext();

  if (error || !user) {
    return jsonUnauthorized("Bạn cần đăng nhập để xem học kỳ hiện tại.");
  }

  try {
    const preference = await getStudentPreference(supabase, user.id);
    return jsonOk({ preference: preferenceDto(preference) });
  } catch (routeError) {
    return errorResponse(routeError, "Chưa tải được học kỳ hiện tại.");
  }
}

export async function PUT(request: Request) {
  const { supabase, user, error } = await getSessionContext();

  if (error || !user) {
    return jsonUnauthorized("Bạn cần đăng nhập để lưu học kỳ hiện tại.");
  }

  try {
    assertSameOrigin(request);
    await checkMutationRateLimit(supabase, request, user.id, "preferences:save", 30);
    const payload = await readJsonStrict(request, preferenceSchema, "Học kỳ hiện tại chưa hợp lệ.");
    const parsedTerm = payload.currentTermLabel ? parseAcademicTermLabel(payload.currentTermLabel) : null;
    const semester = payload.semester ?? parsedTerm?.semester ?? 1;
    const academicYearStart =
      payload.academicYearStart ?? parsedTerm?.academicYearStart ?? 2026;

    await callMutationRpc(supabase, "save_student_preference", {
      p_semester: semester,
      p_academic_year_start: academicYearStart,
    });

    const preference = await getStudentPreference(supabase, user.id);

    if (!preference) {
      throw new Error(`Chưa lưu được ${formatTermLabel(semester, academicYearStart)}.`);
    }

    return jsonOk({ preference: preferenceDto(preference) });
  } catch (routeError) {
    return errorResponse(routeError, "Chưa lưu được học kỳ hiện tại.");
  }
}
