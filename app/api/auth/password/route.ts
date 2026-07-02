import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { errorResponse, jsonError, jsonOk } from "@/lib/security/api-response";
import { assertSameOrigin, readJsonStrict } from "@/lib/security/request-guards";
import { checkRateLimit, hashIdentifier, requestIp } from "@/lib/security/rate-limit";

const authPasswordSchema = z
  .object({
    mode: z.enum(["sign-in", "sign-up"]),
    email: z.string().trim().email().max(254),
    password: z.string().min(6).max(128),
  })
  .strict();

function friendlyAuthError() {
  return "Thông tin đăng nhập chưa chính xác hoặc tài khoản cần được xác nhận. Bạn kiểm tra lại rồi thử nhé.";
}

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);

    const payload = await readJsonStrict(
      request,
      authPasswordSchema,
      "Thông tin đăng nhập chưa hợp lệ.",
      8_000,
    );
    const supabase = await createClient();
    const ipIdentifier = hashIdentifier(`auth-ip:${requestIp(request)}`);
    const emailIdentifier = hashIdentifier(`auth-email:${payload.email}`);

    await Promise.all([
      checkRateLimit(supabase, {
        scope: `auth:${payload.mode}:ip`,
        identifier: ipIdentifier,
        limit: 30,
        windowSeconds: 300,
      }),
      checkRateLimit(supabase, {
        scope: `auth:${payload.mode}:email`,
        identifier: emailIdentifier,
        limit: 5,
        windowSeconds: 300,
      }),
    ]);

    if (payload.mode === "sign-in") {
      const { error } = await supabase.auth.signInWithPassword({
        email: payload.email,
        password: payload.password,
      });

      if (error) {
        return jsonError(friendlyAuthError(), 400);
      }

      return jsonOk({ hasSession: true });
    }

    const { data, error } = await supabase.auth.signUp({
      email: payload.email,
      password: payload.password,
    });

    if (error) {
      return jsonError(friendlyAuthError(), 400);
    }

    return jsonOk({
      hasSession: Boolean(data.session),
      message: data.session
        ? "Tài khoản đã sẵn sàng."
        : "Nếu cần xác nhận email, bạn mở hộp thư rồi quay lại đăng nhập nhé.",
    });
  } catch (error) {
    return errorResponse(error, "Chưa xử lý được đăng nhập. Bạn thử lại sau nhé.");
  }
}
