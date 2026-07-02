import type { SupabaseClient } from "@supabase/supabase-js";
import { PublicRequestError } from "@/lib/security/request-guards";
import type { Database } from "@/lib/supabase/database";

type RpcClient = {
  rpc: (
    fn: string,
    args: Record<string, unknown>,
  ) => Promise<{
    data: unknown;
    error: { code?: string; message: string } | null;
  }>;
};

function isMissingFunction(error: { code?: string; message: string }) {
  return error.code === "42883" || error.message.toLowerCase().includes("function");
}

function isProbablyInternalDatabaseError(message: string) {
  const lower = message.toLowerCase();
  return [
    "violates",
    "constraint",
    "relation",
    "column",
    "syntax",
    "permission",
    "policy",
    "schema",
    "sql",
    "duplicate key",
    "null value",
  ].some((needle) => lower.includes(needle));
}

export async function callMutationRpc(
  supabase: SupabaseClient<Database>,
  fn: string,
  args: Record<string, unknown>,
) {
  const rpcClient = supabase as unknown as RpcClient;
  const { data, error } = await rpcClient.rpc(fn, args);

  if (error) {
    if (isMissingFunction(error)) {
      throw new PublicRequestError(503, "Cần chạy migration bảo mật mới nhất trước khi lưu dữ liệu.");
    }

    if (!isProbablyInternalDatabaseError(error.message)) {
      throw new PublicRequestError(400, error.message);
    }

    throw new Error("Không thể lưu thay đổi lúc này.");
  }

  return data;
}
