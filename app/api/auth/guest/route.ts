import { createClient } from "@/lib/supabase/server";
import { errorResponse, jsonError, jsonOk } from "@/lib/security/api-response";
import { assertSameOrigin } from "@/lib/security/request-guards";
import { checkRateLimit, hashIdentifier, requestIp } from "@/lib/security/rate-limit";

function friendlyGuestError(message?: string) {
  if (message?.toLowerCase().includes("anonymous")) {
    return "Chế độ khách chưa được bật trong Supabase Auth. Bạn bật Anonymous Sign-ins rồi thử lại nhé.";
  }

  return "Chưa mở được phiên khách. Bạn thử lại sau vài giây nhé.";
}

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);

    const supabase = await createClient();
    await checkRateLimit(supabase, {
      scope: "auth:guest:ip",
      identifier: hashIdentifier(`auth-guest-ip:${requestIp(request)}`),
      limit: 20,
      windowSeconds: 300,
    });

    const { data, error } = await supabase.auth.signInAnonymously();

    if (error) {
      return jsonError(friendlyGuestError(error.message), 400);
    }

    return jsonOk({
      hasSession: Boolean(data.session),
      isGuest: true,
      message: "Phiên khách đã sẵn sàng.",
    });
  } catch (error) {
    return errorResponse(error, "Chưa mở được phiên khách. Bạn thử lại sau nhé.");
  }
}
