import { notFound, redirect } from "next/navigation";
import { WorkspaceShell } from "@/components/workspace/workspace-shell";
import { parseWorkspaceRouteSegments } from "@/lib/app-routes";
import { getWorkspaceSnapshot } from "@/lib/data/workspace";

export default async function AppRoutePage({
  params,
}: Readonly<{
  params: Promise<{ segments?: string[] }>;
}>) {
  const { segments = [] } = await params;
  const route = parseWorkspaceRouteSegments(segments);

  if (!route) {
    notFound();
  }

  const currentPath = `/app/${segments.join("/")}`;

  if (currentPath !== route.canonicalPath) {
    redirect(route.canonicalPath);
  }

  const snapshot = await getWorkspaceSnapshot();

  return (
    <WorkspaceShell
      initialData={snapshot}
      initialRoute={{
        view: route.view,
        gradesPage: route.gradesPage,
        dashboardPage: route.dashboardPage,
      }}
    />
  );
}
