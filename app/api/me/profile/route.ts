import { z } from "zod";
import { getStudentProfile, getSessionContext } from "@/lib/data/workspace";
import { profileDto } from "@/lib/data/dto";
import { callMutationRpc } from "@/lib/data/rpc";
import { errorResponse, jsonOk, jsonUnauthorized } from "@/lib/security/api-response";
import { assertSameOrigin, readJsonStrict } from "@/lib/security/request-guards";
import { checkMutationRateLimit } from "@/lib/security/rate-limit";

const profileSchema = z.object({
  fullName: z.string().trim().min(1).max(120),
  studentCode: z.string().trim().min(1).max(32),
  email: z.string().trim().email().max(254),
  startYear: z.number().int().min(2000).max(2100),
  programId: z.string().trim().min(1).max(80),
}).strict();

export async function GET() {
  const { supabase, user, error } = await getSessionContext();

  if (error || !user) {
    return jsonUnauthorized("Bạn cần đăng nhập để xem hồ sơ.");
  }

  try {
    const profile = await getStudentProfile(supabase, user.id);
    return jsonOk({ profile: profileDto(profile) });
  } catch (routeError) {
    return errorResponse(routeError, "Chưa tải được hồ sơ sinh viên.");
  }
}

export async function PUT(request: Request) {
  const { supabase, user, error } = await getSessionContext();

  if (error || !user) {
    return jsonUnauthorized("Bạn cần đăng nhập để cập nhật hồ sơ.");
  }

  try {
    assertSameOrigin(request);
    await checkMutationRateLimit(supabase, request, user.id, "profile:save", 20);
    const payload = await readJsonStrict(request, profileSchema, "Thông tin hồ sơ chưa hợp lệ.");

    await callMutationRpc(supabase, "save_student_profile", {
      p_full_name: payload.fullName,
      p_student_code: payload.studentCode,
      p_email: payload.email,
      p_start_year: payload.startYear,
      p_program_id: payload.programId,
    });

    return jsonOk({ profile: profileDto(await getStudentProfile(supabase, user.id)) });
  } catch (routeError) {
    return errorResponse(routeError, "Chưa lưu được hồ sơ sinh viên.");
  }
}
