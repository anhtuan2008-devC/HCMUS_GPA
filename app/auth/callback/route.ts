import { NextResponse } from "next/server";
import { DEFAULT_APP_PATH } from "@/lib/app-routes";
import { createClient } from "@/lib/supabase/server";
import { getSiteUrl } from "@/lib/supabase/env";
import { safeRedirectPath } from "@/lib/security/safe-redirect";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const next = safeRedirectPath(url.searchParams.get("next"), DEFAULT_APP_PATH);

  if (code) {
    const supabase = await createClient();
    await supabase.auth.exchangeCodeForSession(code);
  }

  return NextResponse.redirect(new URL(next, getSiteUrl()));
}
