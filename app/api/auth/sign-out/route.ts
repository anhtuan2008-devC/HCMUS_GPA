import { createClient } from "@/lib/supabase/server";
import { errorResponse, jsonError, jsonOk } from "@/lib/security/api-response";
import { assertSameOrigin } from "@/lib/security/request-guards";

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);

    const supabase = await createClient();
    const { error } = await supabase.auth.signOut();

    if (error) {
      return jsonError("Chưa đăng xuất được. Bạn thử lại sau nhé.", 400);
    }

    return jsonOk({ signedOut: true });
  } catch (error) {
    return errorResponse(error, "Chưa đăng xuất được. Bạn thử lại sau nhé.");
  }
}
