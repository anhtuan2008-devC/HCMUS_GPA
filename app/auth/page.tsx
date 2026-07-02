import { redirect } from "next/navigation";
import { DEFAULT_APP_PATH } from "@/lib/app-routes";
import { getSessionContext } from "@/lib/data/workspace";

export default async function AuthPage({
  searchParams,
}: Readonly<{
  searchParams: Promise<{ mode?: string }>;
}>) {
  const { user } = await getSessionContext();

  if (user) {
    redirect(DEFAULT_APP_PATH);
  }

  const params = await searchParams;
  redirect(params.mode === "sign-up" ? "/dang-ky" : "/dang-nhap");
}
