import { redirect } from "next/navigation";
import { AuthForm } from "@/components/auth/auth-form";
import { DEFAULT_APP_PATH } from "@/lib/app-routes";
import { getSessionContext } from "@/lib/data/workspace";

export default async function SignInPage() {
  const { user } = await getSessionContext();

  if (user) {
    redirect(DEFAULT_APP_PATH);
  }

  return <AuthForm initialMode="sign-in" />;
}
