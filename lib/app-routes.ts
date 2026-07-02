import type { DashboardPageKey, GradesPageKey, ViewKey } from "@/lib/types";

export type WorkspaceRouteState = {
  view: ViewKey;
  gradesPage: GradesPageKey;
  dashboardPage?: DashboardPageKey;
};

const DEFAULT_GRADES_PAGE: GradesPageKey = "entry";
const DEFAULT_DASHBOARD_PAGE: DashboardPageKey = "overview";

const viewSlugs: Record<ViewKey, string> = {
  dashboard: "tong-quan",
  curriculum: "chuong-trinh-hoc",
  grades: "ket-qua-hoc-tap",
  planner: "ke-hoach-hoc-ky",
  insights: "du-bao-phan-tich",
};

const gradesPageSlugs: Record<GradesPageKey, string> = {
  entry: "nhap-theo-hoc-ky",
  history: "lich-su-theo-hoc-ky",
};

const dashboardPageSlugs: Record<DashboardPageKey, string> = {
  overview: "tong-quan",
  "gpa-calculation": "cach-tinh-gpa",
};

const viewBySlug = Object.fromEntries(
  Object.entries(viewSlugs).map(([key, slug]) => [slug, key]),
) as Record<string, ViewKey>;

const gradesPageBySlug = Object.fromEntries(
  Object.entries(gradesPageSlugs).map(([key, slug]) => [slug, key]),
) as Record<string, GradesPageKey>;

const dashboardPageBySlug = Object.fromEntries(
  Object.entries(dashboardPageSlugs).map(([key, slug]) => [slug, key]),
) as Record<string, DashboardPageKey>;

export const DEFAULT_APP_PATH = "/app/tong-quan";

export function routeForWorkspaceState({
  view,
  gradesPage = DEFAULT_GRADES_PAGE,
  dashboardPage = DEFAULT_DASHBOARD_PAGE,
}: WorkspaceRouteState) {
  if (view === "dashboard" && dashboardPage === "gpa-calculation") {
    return `/app/${viewSlugs.dashboard}/${dashboardPageSlugs[dashboardPage]}`;
  }

  if (view === "grades") {
    return `/app/${viewSlugs.grades}/${gradesPageSlugs[gradesPage]}`;
  }

  return `/app/${viewSlugs[view]}`;
}

export function parseWorkspaceRouteSegments(
  segments: string[] = [],
): (WorkspaceRouteState & { canonicalPath: string }) | null {
  const [viewSlug, pageSlug, ...rest] = segments;

  if (!viewSlug || rest.length) {
    return null;
  }

  const view = viewBySlug[viewSlug];

  if (!view) {
    return null;
  }

  if (view === "dashboard") {
    const dashboardPage = pageSlug ? dashboardPageBySlug[pageSlug] : DEFAULT_DASHBOARD_PAGE;

    if (!dashboardPage) {
      return null;
    }

    return {
      view,
      gradesPage: DEFAULT_GRADES_PAGE,
      dashboardPage,
      canonicalPath: routeForWorkspaceState({
        view,
        gradesPage: DEFAULT_GRADES_PAGE,
        dashboardPage,
      }),
    };
  }

  if (view === "grades") {
    const gradesPage = pageSlug ? gradesPageBySlug[pageSlug] : DEFAULT_GRADES_PAGE;

    if (!gradesPage) {
      return null;
    }

    return {
      view,
      gradesPage,
      dashboardPage: DEFAULT_DASHBOARD_PAGE,
      canonicalPath: routeForWorkspaceState({ view, gradesPage }),
    };
  }

  if (pageSlug) {
    return null;
  }

  return {
    view,
    gradesPage: DEFAULT_GRADES_PAGE,
    dashboardPage: DEFAULT_DASHBOARD_PAGE,
    canonicalPath: routeForWorkspaceState({
      view,
      gradesPage: DEFAULT_GRADES_PAGE,
      dashboardPage: DEFAULT_DASHBOARD_PAGE,
    }),
  };
}

export function parseWorkspacePath(pathname: string): WorkspaceRouteState | null {
  const segments = pathname
    .replace(/^\/+|\/+$/g, "")
    .split("/")
    .filter(Boolean);

  if (segments[0] !== "app") {
    return null;
  }

  const route = parseWorkspaceRouteSegments(segments.slice(1));

  return route
    ? { view: route.view, gradesPage: route.gradesPage, dashboardPage: route.dashboardPage }
    : null;
}
