import { createClient } from "@/lib/supabase/server";
import { errorResponse, jsonError, jsonOk } from "@/lib/security/api-response";
import { assertSameOrigin } from "@/lib/security/request-guards";
import { callMutationRpc } from "@/lib/data/rpc";

function decodeJwtPayload(token?: string | null) {
  if (!token) {
    return null;
  }

  try {
    const payload = token.split(".")[1];

    if (!payload) {
      return null;
    }

    return JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as {
      is_anonymous?: boolean;
    };
  } catch {
    return null;
  }
}

function isGuestSession(input: {
  user?: { is_anonymous?: boolean } | null;
  accessToken?: string | null;
}) {
  return Boolean(input.user?.is_anonymous || decodeJwtPayload(input.accessToken)?.is_anonymous);
}

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);

    const supabase = await createClient();
    const [
      {
        data: { user },
      },
      {
        data: { session },
      },
    ] = await Promise.all([supabase.auth.getUser(), supabase.auth.getSession()]);
    const isGuest = isGuestSession({
      user: user as { is_anonymous?: boolean } | null,
      accessToken: session?.access_token,
    });

    if (isGuest) {
      await callMutationRpc(supabase, "delete_guest_workspace", {});
    }

    const { error } = await supabase.auth.signOut();

    if (error) {
      return jsonError("Chưa đăng xuất được. Bạn thử lại sau nhé.", 400);
    }

    return jsonOk({ signedOut: true, guestDataDeleted: isGuest });
  } catch (error) {
    return errorResponse(error, "Chưa đăng xuất được. Bạn thử lại sau nhé.");
  }
}
