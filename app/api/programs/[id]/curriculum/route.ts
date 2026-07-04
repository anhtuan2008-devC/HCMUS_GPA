import { getProgramCurriculum } from "@/lib/data/programs";
import { getSessionContext } from "@/lib/data/workspace";
import { programDto } from "@/lib/data/dto";
import { errorResponse, jsonCatalogOk, jsonUnauthorized } from "@/lib/security/api-response";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { supabase, user, error } = await getSessionContext();

  if (error || !user) {
    return jsonUnauthorized("Bạn cần đăng nhập để xem chương trình học.");
  }

  try {
    const { id } = await params;
    const program = await getProgramCurriculum(supabase, id);
    return jsonCatalogOk({ program: programDto(program) });
  } catch (routeError) {
    return errorResponse(routeError, "Chưa tải được chương trình học.");
  }
}
