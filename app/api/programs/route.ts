import { listPrograms } from "@/lib/data/programs";
import { getSessionContext } from "@/lib/data/workspace";
import { programsDto } from "@/lib/data/dto";
import { errorResponse, jsonCatalogOk, jsonUnauthorized } from "@/lib/security/api-response";

export async function GET() {
  const { supabase, user, error } = await getSessionContext();

  if (error || !user) {
    return jsonUnauthorized("Bạn cần đăng nhập để xem chương trình học.");
  }

  try {
    const programs = await listPrograms(supabase);
    return jsonCatalogOk({ programs: programsDto(programs) });
  } catch (routeError) {
    return errorResponse(routeError, "Chưa tải được danh sách chương trình học.");
  }
}
