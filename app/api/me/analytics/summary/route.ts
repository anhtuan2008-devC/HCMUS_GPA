import { calculateGpa, calculateGraduationProgress } from "@/lib/grade";
import { getProgramCurriculum } from "@/lib/data/programs";
import { analyticsDto } from "@/lib/data/dto";
import { errorResponse, jsonError, jsonOk, jsonUnauthorized } from "@/lib/security/api-response";
import {
  getSessionContext,
  getStudentCourseRecords,
  getStudentProfile,
} from "@/lib/data/workspace";

export async function GET(request: Request) {
  const { supabase, user, error } = await getSessionContext();

  if (error || !user) {
    return jsonUnauthorized("Bạn cần đăng nhập để xem phân tích học tập.");
  }

  try {
    const profile = await getStudentProfile(supabase, user.id);

    if (!profile) {
      return jsonError("Bạn cần tạo hồ sơ sinh viên trước khi xem phân tích.", 404);
    }

    const url = new URL(request.url);
    const programId = url.searchParams.get("programId") ?? profile.programId;
    const [program, records] = await Promise.all([
      getProgramCurriculum(supabase, programId),
      getStudentCourseRecords(supabase, user.id),
    ]);

    return jsonOk(analyticsDto({
      summary: calculateGpa(records, program.courses),
      progress: calculateGraduationProgress(program, records),
    }));
  } catch (routeError) {
    return errorResponse(routeError, "Chưa tải được phân tích học tập.");
  }
}
