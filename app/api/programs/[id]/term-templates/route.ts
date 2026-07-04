import { getProgramTermTemplates, getSessionContext } from "@/lib/data/workspace";
import { templatesDto } from "@/lib/data/dto";
import { errorResponse, jsonCatalogOk, jsonUnauthorized } from "@/lib/security/api-response";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { supabase, user, error } = await getSessionContext();

  if (error || !user) {
    return jsonUnauthorized("Bạn cần đăng nhập để xem kế hoạch học tập.");
  }

  const { id } = await context.params;

  try {
    const templates = await getProgramTermTemplates(supabase, id);
    return jsonCatalogOk({ templates: templatesDto(templates) });
  } catch (routeError) {
    return errorResponse(routeError, "Chưa tải được kế hoạch học tập.");
  }
}
