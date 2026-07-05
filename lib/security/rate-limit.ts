import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database";
import { privacyHash } from "@/lib/security/privacy";
import { PublicRequestError } from "@/lib/security/request-guards";

type RateLimitRpcClient = {
  rpc: (
    fn: string,
    args: Record<string, unknown>,
  ) => Promise<{
    data: boolean | null;
    error: { code?: string; message: string } | null;
  }>;
};

export function requestIp(request: Request) {
  const forwardedFor = request.headers.get("x-forwarded-for");
  const realIp = request.headers.get("x-real-ip");
  return forwardedFor?.split(",")[0]?.trim() || realIp || "local";
}

export function hashIdentifier(value: string) {
  return privacyHash(value, "rate-limit.identifier");
}

function isMissingRateLimitFunction(error: { code?: string; message: string }) {
  return (
    error.code === "42883" ||
    error.code === "42P01" ||
    error.message.toLowerCase().includes("check_rate_limit")
  );
}

export async function checkRateLimit(
  supabase: SupabaseClient<Database>,
  input: {
    scope: string;
    identifier: string;
    limit: number;
    windowSeconds: number;
    userId?: string | null;
  },
) {
  const rpcClient = supabase as unknown as RateLimitRpcClient;
  const { data, error } = await rpcClient.rpc("check_rate_limit", {
    p_scope: input.scope,
    p_identifier: input.identifier,
    p_limit: input.limit,
    p_window_seconds: input.windowSeconds,
    p_user_id: input.userId ?? null,
  });

  if (error) {
    if (isMissingRateLimitFunction(error)) {
      if (process.env.NODE_ENV !== "production") {
        return;
      }

      throw new PublicRequestError(500, "Chưa kiểm tra được giới hạn thao tác. Bạn thử lại sau nhé.");
    }

    throw new PublicRequestError(500, "Chưa kiểm tra được giới hạn thao tác. Bạn thử lại sau nhé.");
  }

  if (data === false) {
    throw new PublicRequestError(429, "Bạn thao tác hơi nhanh. Nghỉ vài giây rồi thử lại nhé.");
  }
}

export async function checkMutationRateLimit(
  supabase: SupabaseClient<Database>,
  request: Request,
  userId: string,
  scope: string,
  limit = 60,
) {
  await checkRateLimit(supabase, {
    scope,
    identifier: hashIdentifier(`${userId}:${requestIp(request)}`),
    limit,
    windowSeconds: 60,
    userId,
  });
}
