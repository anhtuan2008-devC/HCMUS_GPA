import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "@/lib/supabase/database";
import { assertSupabaseConfig } from "@/lib/supabase/env";

export async function createClient() {
  const cookieStore = await cookies();
  const { url, key } = assertSupabaseConfig();

  return createServerClient<Database>(url, key, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        for (const cookie of cookiesToSet) {
          try {
            cookieStore.set(cookie.name, cookie.value, cookie.options);
          } catch {
            // Ignore cookie writes during static render paths.
          }
        }
      },
    },
  });
}
