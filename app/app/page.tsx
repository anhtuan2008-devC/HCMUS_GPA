import { redirect } from "next/navigation";
import { DEFAULT_APP_PATH } from "@/lib/app-routes";

export default async function AppPage() {
  redirect(DEFAULT_APP_PATH);
}
