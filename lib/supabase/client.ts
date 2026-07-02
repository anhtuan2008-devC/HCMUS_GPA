"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@/lib/supabase/database";
import { assertSupabaseConfig } from "@/lib/supabase/env";

export function createClient() {
  const { url, key } = assertSupabaseConfig();
  return createBrowserClient<Database>(url, key);
}
