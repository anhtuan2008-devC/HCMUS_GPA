"use client";

import { startTransition, useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  Bell,
  BookOpen,
  ChevronDown,
  ChevronLeft,
  ClipboardList,
  GraduationCap,
  LayoutDashboard,
  LineChart,
  LogOut,
  Menu,
} from "lucide-react";
import { OnboardingPanel } from "@/components/workspace/onboarding-panel";
import { DashboardPanel } from "@/components/workspace/dashboard-panel";
import { GpaCalculationPanel } from "@/components/workspace/gpa-calculation-panel";
import { CurriculumPanel } from "@/components/workspace/curriculum-panel";
import { GradesPanel } from "@/components/workspace/grades-panel";
import { PlannerPanel } from "@/components/workspace/planner-panel";
import { InsightsPanel } from "@/components/workspace/insights-panel";
import { NotificationDropdown } from "@/components/workspace/notification-dropdown";
import { PanelCard } from "@/components/workspace/ui";
import { Toast } from "@/components/ui";
import {
  parseWorkspacePath,
  routeForWorkspaceState,
  type WorkspaceRouteState,
} from "@/lib/app-routes";
import {
  buildSuggestedPlan,
  buildCumulativeTimeline,
  buildTermTimeline,
  calculateGpa,
  calculateGraduationProgress,
  computeProjectedGpa,
} from "@/lib/grade";
import { buildAcademicTermOptions, findTermNumberByLabel, defaultCurrentTermLabel } from "@/lib/terms";
import { navigationLabels, viewDescriptions } from "@/lib/ui-copy";
import type {
  Course,
  CurriculumStatus,
  DashboardPageKey,
  GradesPageKey,
  GradeInputMode,
  GpaSummary,
  GraduationProgress,
  NotificationItem,
  ProgramCurriculum,
  ProgramTermTemplate,
  StudentCourseAttempt,
  StudentCourseRecord,
  StudentPreference,
  StudentProfile,
  TermPlanCourseItem,
  TermPlan,
  ViewKey,
  WorkspaceSnapshot,
} from "@/lib/types";

type Notice = {
  tone: "success" | "error";
  message: string;
};

type ProfileDraft = {
  fullName: string;
  studentCode: string;
  email: string;
  startYear: number;
  programId: string;
};

type AttemptInput = {
  courseId: string;
  semester: number;
  academicYearStart: number;
  gradeInputMode: GradeInputMode;
  score10?: number;
  passFailStatus?: "passed" | "failed";
  notes: string | null;
};

type AttemptUpdateInput = Omit<AttemptInput, "courseId"> & {
  attemptId: string;
};

const MOBILE_NAV_ANIMATION_MS = 240;

const navItems: Array<{
  key: ViewKey;
  icon: React.ComponentType<{ className?: string }>;
}> = [
  { key: "dashboard", icon: LayoutDashboard },
  { key: "curriculum", icon: BookOpen },
  { key: "grades", icon: ClipboardList },
  { key: "planner", icon: GraduationCap },
  { key: "insights", icon: LineChart },
];

function createProfileDraft(snapshot: WorkspaceSnapshot): ProfileDraft {
  return {
    fullName: snapshot.profile?.fullName ?? "",
    studentCode: snapshot.profile?.studentCode ?? "",
    email: snapshot.profile?.email ?? snapshot.user.email ?? "",
    startYear: snapshot.profile?.startYear ?? 2024,
    programId: snapshot.profile?.programId ?? snapshot.programs[0]?.id ?? "",
  };
}

function rebuildWorkspaceSnapshot(snapshot: WorkspaceSnapshot): WorkspaceSnapshot {
  if (!snapshot.currentProgram) {
    return {
      ...snapshot,
      summary: null,
      progress: null,
    };
  }

  return {
    ...snapshot,
    summary: calculateGpa(snapshot.records, snapshot.currentProgram.courses),
    progress: calculateGraduationProgress(snapshot.currentProgram, snapshot.records),
  };
}

function getInitialCurrentTerm(snapshot: WorkspaceSnapshot) {
  return (
    snapshot.preference?.currentTermLabel ??
    (snapshot.profile ? defaultCurrentTermLabel(snapshot.profile.startYear) : "HK1 2026-2027")
  );
}

function emptySummary(): GpaSummary {
  return {
    gpa10: 0,
    gpa4: 0,
    attemptedCredits: 0,
    earnedCredits: 0,
    passedCourseCount: 0,
    failedCourseCount: 0,
  };
}

function emptyProgress(totalCredits = 0): GraduationProgress {
  return {
    totalCredits,
    earnedCredits: 0,
    remainingCredits: totalCredits,
    completionRate: 0,
    missingRequiredCourses: 0,
    conditionProgress: {
      totalCourses: 0,
      completedCourses: 0,
      pendingCourses: 0,
      totalCredits: 0,
      completedCredits: 0,
    },
    groupProgress: [],
  };
}

function initials(nameOrEmail: string | null | undefined) {
  const source = (nameOrEmail || "HCMUS").trim();
  const parts = source.split(/\s+/).filter(Boolean);

  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
  }

  return source.slice(0, 2).toUpperCase();
}

function buildTemplateCourseItems(
  courseIds: string[],
  template: ProgramTermTemplate | undefined,
): TermPlanCourseItem[] {
  const templateSet = new Set(template?.courses.map((item) => item.courseId) ?? []);

  return courseIds.map((courseId, index) => ({
    courseId,
    displayOrder: index,
    source: templateSet.has(courseId) ? "template" : "manual",
    notes: null,
    expectedScore10: null,
    expectedGradeInputMode: "numeric",
    expectedPassFailStatus: null,
  }));
}

function buildNotifications({
  currentProgram,
  records,
  plans,
  currentTermLabel,
}: {
  currentProgram: ProgramCurriculum | null;
  records: StudentCourseRecord[];
  plans: TermPlan[];
  currentTermLabel: string;
}): NotificationItem[] {
  if (!currentProgram) {
    return [];
  }

  const passedSet = new Set(records.filter((record) => record.status === "passed").map((record) => record.courseId));
  const failedRecords = records.filter((record) => record.status === "failed");
  const currentPlan = plans.find((plan) => plan.termLabel === currentTermLabel);
  const notifications: NotificationItem[] = [];

  if (failedRecords.length) {
    notifications.push({
      id: "failed-courses",
      tone: "danger",
      title: `${failedRecords.length} môn cần quay lại`,
      description: "Bạn có thể tạo lần học lại để thay kết quả hiện hành khi đã có điểm mới.",
      actionLabel: "Xem lịch sử điểm",
      targetView: "grades",
      targetGradesPage: "history",
    });
  }

  if (!currentPlan) {
    notifications.push({
      id: "missing-current-plan",
      tone: "warning",
      title: "Học kỳ hiện tại chưa có kế hoạch",
      description: "Tạo kế hoạch từ chương trình chuẩn để biết kỳ này nên ưu tiên môn nào.",
      actionLabel: "Lập kế hoạch",
      targetView: "planner",
    });
  }

  if (currentPlan) {
    const blockedCount = currentPlan.courseIds.filter((courseId) => {
      const course = currentProgram.courses.find((item) => item.id === courseId);
      return course ? course.prerequisites.some((prerequisite) => !passedSet.has(prerequisite)) : false;
    }).length;
    const completedInPlan = currentPlan.courseIds.filter((courseId) => passedSet.has(courseId)).length;

    if (blockedCount) {
      notifications.push({
        id: "blocked-plan",
        tone: "warning",
        title: `${blockedCount} môn trong kế hoạch còn vướng tiên quyết`,
        description: "Rà lại thứ tự học để tránh chọn môn chưa đủ điều kiện.",
        actionLabel: "Rà kế hoạch",
        targetView: "planner",
      });
    }

    if (completedInPlan) {
      notifications.push({
        id: "completed-in-plan",
        tone: "neutral",
        title: `${completedInPlan} môn đã qua vẫn nằm trong kế hoạch`,
        description: "Bạn có thể xóa khỏi kế hoạch hiện tại để lịch học gọn hơn.",
        actionLabel: "Dọn kế hoạch",
        targetView: "planner",
      });
    }
  }

  if (!notifications.length) {
    notifications.push({
      id: "all-good",
      tone: "success",
      title: "Nhịp học đang ổn",
      description: "Chưa có cảnh báo lớn. Tiếp tục cập nhật điểm và kế hoạch để dashboard luôn chính xác.",
      actionLabel: "Xem tổng quan",
      targetView: "dashboard",
    });
  }

  return notifications;
}

export function WorkspaceShell({
  initialData,
  initialRoute = { view: "dashboard", gradesPage: "entry", dashboardPage: "overview" },
}: Readonly<{
  initialData: WorkspaceSnapshot;
  initialRoute?: WorkspaceRouteState;
}>) {
  const router = useRouter();
  const [snapshot, setSnapshot] = useState(initialData);
  const [activeView, setActiveView] = useState<ViewKey>(initialRoute.view);
  const [activeGradesPage, setActiveGradesPage] = useState<GradesPageKey>(
    initialRoute.gradesPage,
  );
  const [activeDashboardPage, setActiveDashboardPage] = useState<DashboardPageKey>(
    initialRoute.dashboardPage ?? "overview",
  );
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const [isMobileNavRendered, setIsMobileNavRendered] = useState(false);
  const [mobileNavPhase, setMobileNavPhase] = useState<"enter" | "exit">("enter");
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [isTermMenuOpen, setIsTermMenuOpen] = useState(false);
  const [profileDraft, setProfileDraft] = useState(createProfileDraft(initialData));
  const [courseSearch, setCourseSearch] = useState("");
  const [currentTermLabel, setCurrentTermLabel] = useState(getInitialCurrentTerm(initialData));
  const [plannerTerm, setPlannerTerm] = useState(getInitialCurrentTerm(initialData));
  const [plannerFocus, setPlannerFocus] = useState(
    "Ưu tiên học phần cốt lõi và mở đường cho các môn tiên quyết.",
  );
  const [plannerSelection, setPlannerSelection] = useState<string[] | null>(null);
  const [insightTarget, setInsightTarget] = useState(8);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [isProfileSaving, setIsProfileSaving] = useState(false);
  const [isRecordSaving, setIsRecordSaving] = useState(false);
  const [isPlanSaving, setIsPlanSaving] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const notificationDropdownRef = useRef<HTMLDivElement>(null);
  const mobileNavBubbleRef = useRef<HTMLDivElement>(null);
  const mobileNavTimeoutRef = useRef<number | null>(null);

  const currentProgram = snapshot.currentProgram;
  const summary = snapshot.summary ?? emptySummary();
  const progress = snapshot.progress ?? emptyProgress(currentProgram?.totalCredits ?? 0);
  const suggestedPlan = currentProgram
    ? buildSuggestedPlan(currentProgram, snapshot.records, snapshot.plans, plannerTerm)
    : null;
  const plannerTermNumber = snapshot.profile
    ? findTermNumberByLabel(plannerTerm, snapshot.profile.startYear)
    : null;
  const activePlannerTemplate =
    snapshot.termTemplates.find((template) => template.termNumber === plannerTermNumber) ??
    undefined;
  const savedPlannerPlan = snapshot.plans.find((plan) => plan.termLabel === plannerTerm);
  const defaultPlannerSelection =
    savedPlannerPlan?.courseIds ??
    activePlannerTemplate?.courses.map((item) => item.courseId) ??
    (suggestedPlan ? suggestedPlan.courses.slice(0, 5).map((course) => course.id) : []);
  const selectedPlannerCourseIds = plannerSelection ?? defaultPlannerSelection;
  const projected = currentProgram
    ? computeProjectedGpa(currentProgram, snapshot.records, insightTarget)
    : { projectedGpa10: 0, projectedGpa4: 0 };
  const timeline = currentProgram ? buildCumulativeTimeline(snapshot.records, currentProgram.courses) : [];
  const termTimeline = currentProgram ? buildTermTimeline(snapshot.records, currentProgram.courses) : [];
  const notifications = buildNotifications({
    currentProgram,
    records: snapshot.records,
    plans: snapshot.plans,
    currentTermLabel,
  });
  const preferenceTermLabel = snapshot.preference?.currentTermLabel;
  const profileStartYear = snapshot.profile?.startYear;
  const currentTermOptions = snapshot.profile
    ? [
        currentTermLabel,
        ...buildAcademicTermOptions(snapshot.profile.startYear).map((term) => term.label),
        ...snapshot.plans.map((plan) => plan.termLabel),
        ...snapshot.attempts.map((attempt) => attempt.termLabel),
      ].filter((value, index, values) => value && values.indexOf(value) === index)
    : [currentTermLabel];
  const shellFocusSignals = [
    {
      label: "GPA",
      value: summary.gpa10.toFixed(3),
      helper: "hệ 10",
    },
    {
      label: "Tín chỉ",
      value: `${progress.earnedCredits}/${progress.totalCredits}`,
      helper: "đã tích lũy",
    },
    {
      label: "Cảnh báo",
      value: notifications.length.toString(),
      helper: "việc nên xem",
    },
  ];

  const clearMobileNavTimeout = useCallback(() => {
    if (mobileNavTimeoutRef.current !== null) {
      window.clearTimeout(mobileNavTimeoutRef.current);
      mobileNavTimeoutRef.current = null;
    }
  }, []);

  const openMobileNav = useCallback(() => {
    clearMobileNavTimeout();
    setIsMobileNavRendered(true);
    setMobileNavPhase("enter");
    setIsMobileNavOpen(true);
  }, [clearMobileNavTimeout]);

  const closeMobileNav = useCallback(() => {
    if (!isMobileNavOpen && !isMobileNavRendered) {
      return;
    }

    clearMobileNavTimeout();
    setIsMobileNavOpen(false);
    setMobileNavPhase("exit");
    mobileNavTimeoutRef.current = window.setTimeout(() => {
      setIsMobileNavRendered(false);
      setMobileNavPhase("enter");
      mobileNavTimeoutRef.current = null;
    }, MOBILE_NAV_ANIMATION_MS);
  }, [clearMobileNavTimeout, isMobileNavOpen, isMobileNavRendered]);

  const toggleMobileNav = useCallback(() => {
    if (isMobileNavOpen) {
      closeMobileNav();
      return;
    }

    openMobileNav();
  }, [closeMobileNav, isMobileNavOpen, openMobileNav]);

  function updateWorkspaceRoute(
    view: ViewKey,
    gradesPage: GradesPageKey = activeGradesPage,
    dashboardPage: DashboardPageKey = view === "dashboard" ? activeDashboardPage : "overview",
  ) {
    startTransition(() => {
      setActiveView(view);
      setActiveGradesPage(gradesPage);
      setActiveDashboardPage(view === "dashboard" ? dashboardPage : "overview");
      closeMobileNav();
    });

    if (typeof window === "undefined") {
      return;
    }

    const nextPath = routeForWorkspaceState({ view, gradesPage, dashboardPage });

    if (window.location.pathname !== nextPath) {
      window.history.pushState({ view, gradesPage, dashboardPage }, "", nextPath);
    }
  }

  useEffect(() => {
    function handlePopState() {
      const route = parseWorkspacePath(window.location.pathname);

      if (!route) {
        return;
      }

      startTransition(() => {
        setActiveView(route.view);
        setActiveGradesPage(route.gradesPage);
        setActiveDashboardPage(route.dashboardPage ?? "overview");
        closeMobileNav();
        setIsNotificationOpen(false);
      });
    }

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [closeMobileNav]);

  useEffect(() => {
    const nextTerm =
      preferenceTermLabel ??
      (profileStartYear ? defaultCurrentTermLabel(profileStartYear) : "HK1 2026-2027");
    startTransition(() => {
      setCurrentTermLabel(nextTerm);
      setPlannerTerm((current) => current || nextTerm);
    });
  }, [preferenceTermLabel, profileStartYear]);

  useEffect(() => {
    if (!isNotificationOpen) {
      return;
    }

    function handlePointerDown(event: PointerEvent) {
      const target = event.target as HTMLElement | null;

      if (
        notificationDropdownRef.current?.contains(event.target as Node) ||
        target?.closest("[data-notification-trigger='true']")
      ) {
        return;
      }

      setIsNotificationOpen(false);
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsNotificationOpen(false);
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isNotificationOpen]);

  useEffect(() => {
    if (!isMobileNavOpen) {
      return;
    }

    function handlePointerDown(event: PointerEvent) {
      const target = event.target as HTMLElement | null;

      if (
        mobileNavBubbleRef.current?.contains(event.target as Node) ||
        target?.closest("[data-mobile-nav-trigger='true']")
      ) {
        return;
      }

      closeMobileNav();
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        closeMobileNav();
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [closeMobileNav, isMobileNavOpen]);

  useEffect(() => {
    return () => clearMobileNavTimeout();
  }, [clearMobileNavTimeout]);

  useEffect(() => {
    if (!notice) {
      return;
    }

    const timeoutId = window.setTimeout(() => setNotice(null), 3600);
    return () => window.clearTimeout(timeoutId);
  }, [notice]);

  function updateSnapshot(updater: (previous: WorkspaceSnapshot) => WorkspaceSnapshot) {
    setSnapshot((previous) => rebuildWorkspaceSnapshot(updater(previous)));
  }

  function setSuccess(message: string) {
    setNotice({ tone: "success", message });
  }

  function setFailure(message: string) {
    setNotice({ tone: "error", message });
  }

  function getCourseStatus(course: Course): CurriculumStatus {
    const record = snapshot.records.find((item) => item.courseId === course.id);

    if (record?.status === "passed") {
      return "passed";
    }

    if (record?.status === "failed") {
      return "failed";
    }

    if (snapshot.plans.some((plan) => plan.courseIds.includes(course.id))) {
      return "planned";
    }

    return "not-started";
  }

  function updateProfileDraft(field: keyof ProfileDraft, value: string | number) {
    setProfileDraft((previous) => ({
      ...previous,
      [field]: value,
    }));
  }

  async function fetchProgramCurriculum(programId: string): Promise<ProgramCurriculum> {
    const response = await fetch(`/api/programs/${programId}/curriculum`, {
      credentials: "include",
    });
    const payload = await response.json();

    if (!response.ok) {
      throw new Error(payload.message ?? "Không tải được chương trình học.");
    }

    return payload.program as ProgramCurriculum;
  }

  async function fetchProgramTermTemplates(programId: string): Promise<ProgramTermTemplate[]> {
    const response = await fetch(`/api/programs/${programId}/term-templates`, {
      credentials: "include",
    });
    const payload = await response.json();

    if (!response.ok) {
      throw new Error(payload.message ?? "Không tải được kế hoạch học tập.");
    }

    return payload.templates as ProgramTermTemplate[];
  }

  async function handleSaveProfile() {
    if (!profileDraft.fullName.trim() || !profileDraft.studentCode.trim() || !profileDraft.programId) {
      setFailure("Bạn điền đầy đủ họ tên, MSSV và chương trình học trước khi tiếp tục nhé.");
      return;
    }

    setIsProfileSaving(true);

    try {
      const response = await fetch("/api/me/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(profileDraft),
      });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.message ?? "Chưa lưu được hồ sơ sinh viên.");
      }

      const [program, termTemplates] = await Promise.all([
        fetchProgramCurriculum(profileDraft.programId),
        fetchProgramTermTemplates(profileDraft.programId),
      ]);
      const profile = payload.profile as StudentProfile;
      const nextTermLabel = defaultCurrentTermLabel(profile.startYear);

      updateSnapshot((previous) => ({
        ...previous,
        profile,
        currentProgram: program,
        preference: previous.preference,
        attempts: previous.attempts,
        records: previous.records,
        plans: previous.plans,
        termTemplates,
        summary: previous.records.length ? previous.summary : emptySummary(),
        progress: emptyProgress(program.totalCredits),
      }));
      setCurrentTermLabel(nextTermLabel);
      setPlannerTerm(nextTermLabel);

      setSuccess("Hồ sơ đã sẵn sàng. Chương trình học của bạn đã được cố định.");
    } catch (error) {
      setFailure(error instanceof Error ? error.message : "Chưa lưu được hồ sơ sinh viên.");
    } finally {
      setIsProfileSaving(false);
    }
  }

  function applyAttemptPayload(payload: {
    attempts?: StudentCourseAttempt[];
    records?: StudentCourseRecord[];
  }) {
    updateSnapshot((current) => ({
      ...current,
      attempts: payload.attempts ?? current.attempts,
      records: payload.records ?? current.records,
    }));
  }

  async function handleCreateAttempt(input: AttemptInput) {
    const previous = snapshot;
    setIsRecordSaving(true);

    try {
      const response = await fetch("/api/me/course-records", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(input),
      });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.message ?? "Chưa lưu được kết quả học tập.");
      }

      applyAttemptPayload(payload);
      setSuccess("Đã lưu lần học mới và cập nhật GPA.");
    } catch (error) {
      setSnapshot(previous);
      setFailure(error instanceof Error ? error.message : "Chưa lưu được kết quả học tập.");
    } finally {
      setIsRecordSaving(false);
    }
  }

  async function handleUpdateAttempt(input: AttemptUpdateInput) {
    const previous = snapshot;
    setIsRecordSaving(true);

    try {
      const response = await fetch("/api/me/course-records", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(input),
      });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.message ?? "Chưa sửa được kết quả học tập.");
      }

      applyAttemptPayload(payload);
      setSuccess("Đã cập nhật kết quả học phần.");
    } catch (error) {
      setSnapshot(previous);
      setFailure(error instanceof Error ? error.message : "Chưa sửa được kết quả học tập.");
    } finally {
      setIsRecordSaving(false);
    }
  }

  async function handleDeleteAttempt(attemptId: string) {
    const previous = snapshot;
    setIsRecordSaving(true);

    try {
      const response = await fetch(`/api/me/course-records?attemptId=${encodeURIComponent(attemptId)}`, {
        method: "DELETE",
        credentials: "include",
      });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.message ?? "Chưa xóa được lần học.");
      }

      applyAttemptPayload(payload);
      setSuccess("Đã xóa lần học và tính lại kết quả hiện hành.");
    } catch (error) {
      setSnapshot(previous);
      setFailure(error instanceof Error ? error.message : "Chưa xóa được lần học.");
    } finally {
      setIsRecordSaving(false);
    }
  }

  async function handleSavePlan(courseItemsOverride?: TermPlanCourseItem[]) {
    if (!plannerTerm.trim()) {
      setFailure("Bạn nhập học kỳ mục tiêu trước khi lưu kế hoạch nhé.");
      return;
    }

    setIsPlanSaving(true);

    try {
      const response = await fetch("/api/me/term-plans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          termLabel: plannerTerm.trim(),
          focus: plannerFocus.trim() || "Tập trung học đều và giữ nhịp ổn định.",
          courseItems:
            courseItemsOverride ??
            buildTemplateCourseItems(selectedPlannerCourseIds, activePlannerTemplate),
        }),
      });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.message ?? "Chưa lưu được kế hoạch học kỳ.");
      }

      const plan = payload.plan as TermPlan;
      updateSnapshot((current) => ({
        ...current,
        plans: [
          plan,
          ...current.plans.filter((item) => item.id !== plan.id && item.termLabel !== plan.termLabel),
        ],
      }));

      setSuccess("Kế hoạch học kỳ đã được lưu. Lần sau mở lại vẫn giữ nguyên.");
    } catch (error) {
      setFailure(error instanceof Error ? error.message : "Chưa lưu được kế hoạch học kỳ.");
    } finally {
      setIsPlanSaving(false);
    }
  }

  async function handleDeletePlan(planId: string) {
    const previous = snapshot;

    updateSnapshot((current) => ({
      ...current,
      plans: current.plans.filter((plan) => plan.id !== planId),
    }));

    try {
      const response = await fetch(`/api/me/term-plans?planId=${encodeURIComponent(planId)}`, {
        method: "DELETE",
        credentials: "include",
      });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.message ?? "Chưa xóa được kế hoạch học kỳ.");
      }

      updateSnapshot((current) => ({
        ...current,
        plans: payload.plans as TermPlan[],
      }));
      setSuccess("Đã xóa kế hoạch học kỳ.");
    } catch (error) {
      setSnapshot(previous);
      setFailure(error instanceof Error ? error.message : "Chưa xóa được kế hoạch học kỳ.");
    }
  }

  async function handleSaveCurrentTerm(termLabel: string) {
    const previous = snapshot;
    setCurrentTermLabel(termLabel);
    setPlannerTerm(termLabel);
    setIsTermMenuOpen(false);

    try {
      const response = await fetch("/api/me/preferences", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ currentTermLabel: termLabel }),
      });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.message ?? "Chưa lưu được học kỳ hiện tại.");
      }

      updateSnapshot((current) => ({
        ...current,
        preference: payload.preference as StudentPreference,
      }));
      setSuccess("Đã cập nhật học kỳ hiện tại.");
    } catch (error) {
      setSnapshot(previous);
      setCurrentTermLabel(getInitialCurrentTerm(previous));
      setFailure(error instanceof Error ? error.message : "Chưa lưu được học kỳ hiện tại.");
    }
  }

  async function handleSignOut() {
    setIsSigningOut(true);

    try {
      const response = await fetch("/api/auth/sign-out", {
        method: "POST",
        credentials: "include",
      });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.message ?? "Chưa đăng xuất được.");
      }

      router.replace("/");
      router.refresh();
    } catch (error) {
      setFailure(error instanceof Error ? error.message : "Chưa đăng xuất được.");
      setIsSigningOut(false);
    }
  }

  function handleNavigate(view: ViewKey) {
    updateWorkspaceRoute(view, view === "grades" ? activeGradesPage : "entry", "overview");
  }

  function handleGradesPageChange(page: GradesPageKey) {
    updateWorkspaceRoute("grades", page);
  }

  function renderSidebarContent({ showNavigation = true }: { showNavigation?: boolean } = {}) {
    const displayName = snapshot.profile?.fullName || snapshot.user.email || "Bạn";

    return (
      <>
        <div className="space-y-8">
          <div>
            <div className="inline-flex rounded-[1.35rem] border border-white/15 bg-white/10 px-3 py-3">
              <Image
                src="/brand/hcmus-logo-white.png"
                alt="Logo Trường Đại học Khoa học tự nhiên, ĐHQG-HCM"
                width={168}
                height={50}
                className="h-11 w-auto object-contain"
                priority
              />
            </div>
            <div className="mt-4 flex items-baseline gap-2">
              <h1 className="text-2xl font-bold tracking-tight text-white">HCMUS</h1>
              <span className="text-2xl font-bold tracking-tight text-blue-200">GPA</span>
            </div>
            <p className="mt-1 text-sm text-white/68">Tự quản lý kết quả học tập</p>
          </div>

          {showNavigation ? (
            <nav className="space-y-2">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeView === item.key;

                return (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => handleNavigate(item.key)}
                    className={`flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left text-sm font-semibold transition ${
                      isActive
                        ? "bg-white/14 text-white shadow-[0_16px_34px_rgba(0,0,0,0.18)] ring-1 ring-white/12"
                        : "text-white/70 hover:bg-white/9 hover:text-white"
                    }`}
                  >
                    <Icon className="h-5 w-5" />
                    {navigationLabels[item.key]}
                  </button>
                );
              })}
            </nav>
          ) : null}
        </div>

        <div className="space-y-4">
          <div className="drawer-line h-px w-full" />
          <div className="rounded-[1.5rem] border border-white/12 bg-white/10 p-4 text-white shadow-[0_18px_46px_rgba(0,0,0,0.16)]">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/16 text-sm font-bold text-white ring-1 ring-white/18">
                {initials(displayName)}
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">{displayName}</p>
                <p className="truncate text-xs text-white/62">
                  {snapshot.profile?.studentCode || snapshot.user.email || "Chưa tạo hồ sơ"}
                </p>
              </div>
            </div>
            {currentProgram ? (
              <div className="mt-4 rounded-2xl border border-white/10 bg-black/10 px-3 py-3 text-xs leading-5 text-white/72">
                <p>CTĐT: {currentProgram.name}</p>
                <p>Mã ngành: {currentProgram.code}</p>
                <p>Khóa tuyển: {snapshot.profile?.startYear ?? 2024}</p>
              </div>
            ) : (
              <p className="mt-4 rounded-2xl border border-white/10 bg-black/10 px-3 py-3 text-xs leading-5 text-white/72">
                Thiết lập hồ sơ để cá nhân hóa hành trình học tập.
              </p>
            )}
          </div>

          <button
            type="button"
            onClick={handleSignOut}
            disabled={isSigningOut}
            className="inline-flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-sm font-semibold text-white/74 transition hover:bg-white/9 hover:text-white disabled:opacity-70"
          >
            <LogOut className="h-5 w-5" />
            {isSigningOut ? "Đang đăng xuất..." : "Đăng xuất"}
          </button>
        </div>
      </>
    );
  }

  return (
    <main className="min-h-screen px-2 py-2 pb-20 sm:px-5 sm:py-5 sm:pb-5">
      <div className="mx-auto grid w-full max-w-[var(--app-max-width)] gap-3 sm:gap-5 lg:grid-cols-[var(--app-sidebar-width)_minmax(0,1fr)]">
        <aside className="sidebar-shell sticky top-5 hidden h-[calc(100vh-2.5rem)] flex-col justify-between overflow-hidden rounded-[2rem] px-5 py-6 lg:flex">
          <div className="pointer-events-none absolute bottom-24 left-0 h-40 w-full opacity-20">
            <div className="absolute bottom-0 left-6 h-16 w-20 rounded-t-2xl border border-white/35" />
            <div className="absolute bottom-0 left-24 h-28 w-20 rounded-t-2xl border border-white/35" />
            <div className="absolute bottom-0 left-44 h-20 w-24 rounded-t-2xl border border-white/35" />
          </div>
          <div className="relative z-10 flex h-full flex-col justify-between">{renderSidebarContent()}</div>
        </aside>

        <div className="min-w-0 space-y-3 sm:space-y-5">
          <div className="soft-card sticky top-2 z-30 rounded-[1.25rem] px-2.5 py-2 lg:hidden">
            <div className="grid grid-cols-[2.5rem_minmax(0,1fr)_2.5rem] items-center gap-2">
              <button
                type="button"
                data-mobile-nav-trigger="true"
                onClick={toggleMobileNav}
                className="relative inline-flex h-10 w-10 items-center justify-center overflow-hidden rounded-xl bg-[var(--brand-primary)] text-white shadow-[0_10px_24px_rgba(0,63,136,0.22)] transition-[background-color,box-shadow,transform] duration-200 active:scale-95"
                aria-label={isMobileNavOpen ? "Đóng điều hướng" : "Mở điều hướng"}
                aria-expanded={isMobileNavOpen}
              >
                <Menu
                  className={`absolute h-5 w-5 transition-[filter,opacity,transform] duration-200 ${
                    isMobileNavOpen
                      ? "-rotate-90 scale-75 opacity-0 blur-[1px]"
                      : "rotate-0 scale-100 opacity-100 blur-0"
                  }`}
                />
                <ChevronLeft
                  className={`absolute h-5 w-5 transition-[filter,opacity,transform] duration-200 ${
                    isMobileNavOpen
                      ? "rotate-0 scale-100 opacity-100 blur-0"
                      : "rotate-90 scale-75 opacity-0 blur-[1px]"
                  }`}
                />
              </button>
              {snapshot.profile && currentProgram ? (
                <div className="relative min-w-0">
                  <button
                    type="button"
                    onClick={() => setIsTermMenuOpen((current) => !current)}
                    className="flex h-10 w-full min-w-0 items-center justify-between gap-2 rounded-xl border border-[var(--line)] bg-white/82 px-3 text-left"
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-[0.72rem] font-semibold uppercase tracking-[0.12em] text-[var(--muted)]">
                        {navigationLabels[activeView]}
                      </span>
                      <span className="block truncate text-sm font-bold text-[var(--brand-primary)]">
                        {currentTermLabel}
                      </span>
                    </span>
                    <ChevronDown className="h-4 w-4 shrink-0 text-[var(--muted)]" />
                  </button>
                  {isTermMenuOpen ? (
                    <div className="absolute left-0 right-0 z-40 mt-2 max-h-72 overflow-y-auto rounded-2xl border border-[var(--line)] bg-white p-2 shadow-[0_18px_48px_rgba(0,25,54,0.16)]">
                      {currentTermOptions.map((label) => (
                        <button
                          key={label}
                          type="button"
                          onClick={() => handleSaveCurrentTerm(label)}
                          className={`w-full rounded-xl px-3 py-2 text-left text-sm font-semibold transition ${
                            label === currentTermLabel
                              ? "bg-[var(--surface-tint)] text-[var(--brand-primary)]"
                              : "text-[var(--foreground)] hover:bg-[var(--surface-soft)]"
                          }`}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  ) : null}
                </div>
              ) : (
                <div className="flex min-w-0 items-center justify-center gap-2">
                  <Image
                    src="/brand/hcmus-logo.png"
                    alt="Logo Trường Đại học Khoa học tự nhiên, ĐHQG-HCM"
                    width={92}
                    height={28}
                    className="h-7 w-auto object-contain"
                    priority
                  />
                  <span className="text-sm font-bold text-[var(--foreground)]">GPA</span>
                </div>
              )}
              <button
                type="button"
                data-notification-trigger="true"
                onClick={() => setIsNotificationOpen((current) => !current)}
                className="relative inline-flex h-10 w-10 items-center justify-center rounded-xl bg-orange-50 text-orange-600"
                aria-label="Mở trung tâm cảnh báo"
              >
                <Bell className="h-5 w-5" />
                <span className="absolute -right-1 -top-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-[var(--orange)] px-1 text-[10px] font-bold text-white">
                  {notifications.length}
                </span>
              </button>
            </div>
            {snapshot.profile && currentProgram ? (
              <div className="mt-2 grid grid-cols-3 gap-1.5">
                {shellFocusSignals.map((signal) => (
                  <div
                    key={signal.label}
                    className="rounded-xl border border-[var(--line)] bg-white/72 px-2 py-1.5 text-center"
                  >
                    <p className="truncate text-[0.58rem] font-semibold uppercase tracking-[0.08em] text-[var(--muted)]">
                      {signal.label}
                    </p>
                    <p className="truncate text-[0.72rem] font-bold tabular-nums text-[var(--foreground)]">
                      {signal.value}
                    </p>
                  </div>
                ))}
              </div>
            ) : null}
          </div>

          {isMobileNavRendered ? (
            <div
              ref={mobileNavBubbleRef}
              className={`mobile-nav-bubble mobile-nav-bubble-${mobileNavPhase} fixed left-2 top-[4.25rem] z-40 w-[min(20rem,62vw)] lg:hidden`}
            >
              <aside className="sidebar-shell flex max-h-[calc(100vh-6rem)] flex-col justify-between overflow-y-auto rounded-[2.35rem] rounded-tl-[1.05rem] px-3 py-4 shadow-[0_24px_70px_rgba(0,25,54,0.28)]">
                {renderSidebarContent({ showNavigation: false })}
              </aside>
            </div>
          ) : null}

          {snapshot.profile && currentProgram ? (
            <header className="soft-card motion-page sticky top-3 z-30 hidden flex-col gap-4 rounded-[2rem] px-5 py-4 lg:flex sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="font-[family-name:var(--font-display)] text-3xl font-semibold tracking-tight text-[var(--foreground)] sm:text-4xl">
                  {navigationLabels[activeView]}
                </h2>
                <p className="mt-2 text-sm leading-6 text-[var(--muted)]">{viewDescriptions[activeView]}</p>
                <div className="mt-3 grid w-[32rem] max-w-full grid-cols-3 gap-2 xl:w-[34rem]">
                  {shellFocusSignals.map((signal) => (
                    <div
                      key={signal.label}
                      className="flex h-[5.35rem] min-w-0 flex-col justify-between rounded-2xl border border-[var(--line)] bg-white/68 px-3 py-2 shadow-sm"
                    >
                      <p className="truncate text-[0.62rem] font-semibold uppercase tracking-[0.14em] text-[var(--muted)]">
                        {signal.label}
                      </p>
                      <p className="truncate text-base font-bold tabular-nums text-[var(--foreground)]">
                        {signal.value}
                      </p>
                      <p className="truncate text-xs text-[var(--muted)]" title={signal.helper}>
                        {signal.helper}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setIsTermMenuOpen((current) => !current)}
                    className="inline-flex items-center gap-3 rounded-2xl border border-[var(--line)] bg-white/80 px-4 py-3 text-sm font-semibold text-[var(--foreground)] shadow-sm"
                  >
                    Học kỳ hiện tại
                    <span className="text-[var(--brand-primary)]">{currentTermLabel}</span>
                    <ChevronDown className="h-4 w-4 text-[var(--muted)]" />
                  </button>
                  {isTermMenuOpen ? (
                    <div className="absolute right-0 z-30 mt-2 max-h-72 w-64 overflow-y-auto rounded-2xl border border-[var(--line)] bg-white p-2 shadow-[0_18px_48px_rgba(0,25,54,0.16)]">
                      {currentTermOptions.map((label) => (
                        <button
                          key={label}
                          type="button"
                          onClick={() => handleSaveCurrentTerm(label)}
                          className={`w-full rounded-xl px-3 py-2 text-left text-sm font-semibold transition ${
                            label === currentTermLabel
                              ? "bg-[var(--surface-tint)] text-[var(--brand-primary)]"
                              : "text-[var(--foreground)] hover:bg-[var(--surface-soft)]"
                          }`}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  ) : null}
                </div>
                <button
                  type="button"
                  data-notification-trigger="true"
                  onClick={() => setIsNotificationOpen((current) => !current)}
                  className="relative hidden h-12 w-12 items-center justify-center rounded-2xl border border-[var(--line)] bg-white/80 text-[var(--foreground)] shadow-sm sm:inline-flex"
                  aria-label="Mở trung tâm cảnh báo"
                >
                  <Bell className="h-5 w-5" />
                  <span className="absolute -right-1 -top-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-[var(--orange)] px-1 text-[10px] font-bold text-white">
                    {notifications.length}
                  </span>
                </button>
              </div>
            </header>
          ) : null}

          {!snapshot.programs.length ? (
            <PanelCard className="space-y-4">
              <h2 className="text-2xl font-semibold text-[var(--foreground)]">
                Chưa có chương trình học sẵn sàng
              </h2>
              <p className="text-sm leading-7 text-[var(--muted)]">
                Hiện app chưa tải được danh sách chương trình đào tạo. Khi dữ liệu được nạp,
                bạn sẽ có thể tạo hồ sơ và bắt đầu theo dõi hành trình học tập.
              </p>
            </PanelCard>
          ) : null}

          {!snapshot.profile || !currentProgram ? (
            <OnboardingPanel
              draft={profileDraft}
              programs={snapshot.programs}
              isSaving={isProfileSaving}
              onChange={updateProfileDraft}
              onSubmit={handleSaveProfile}
            />
          ) : null}

          {snapshot.profile && currentProgram ? (
            <div className="motion-page">
              {activeView === "dashboard" && activeDashboardPage === "overview" ? (
                <DashboardPanel
                  profile={snapshot.profile}
                  program={currentProgram}
                  summary={summary}
                  progress={progress}
                  timeline={timeline}
                  termTimeline={termTimeline}
                  records={snapshot.records}
                  plans={snapshot.plans}
                  plannerTerm={plannerTerm}
                  onNavigate={handleNavigate}
                  onOpenGpaCalculation={() =>
                    updateWorkspaceRoute("dashboard", "entry", "gpa-calculation")
                  }
                />
              ) : null}

              {activeView === "dashboard" && activeDashboardPage === "gpa-calculation" ? (
                <GpaCalculationPanel
                  program={currentProgram}
                  records={snapshot.records}
                  onBack={() => updateWorkspaceRoute("dashboard", "entry", "overview")}
                />
              ) : null}

              {activeView === "curriculum" ? (
                <CurriculumPanel
                  program={currentProgram}
                  search={courseSearch}
                  onSearchChange={setCourseSearch}
                  getCourseStatus={getCourseStatus}
                />
              ) : null}

              {activeView === "grades" ? (
                <GradesPanel
                  profile={snapshot.profile}
                  program={currentProgram}
                  records={snapshot.records}
                  attempts={snapshot.attempts}
                  plans={snapshot.plans}
                  termTemplates={snapshot.termTemplates}
                  currentTermLabel={currentTermLabel}
                  isSaving={isRecordSaving}
                  activePage={activeGradesPage}
                  onPageChange={handleGradesPageChange}
                  onCreateAttempt={handleCreateAttempt}
                  onUpdateAttempt={handleUpdateAttempt}
                  onDeleteAttempt={handleDeleteAttempt}
                />
              ) : null}

              {activeView === "planner" && suggestedPlan ? (
                <PlannerPanel
                  profile={snapshot.profile}
                  program={currentProgram}
                  records={snapshot.records}
                  plans={snapshot.plans}
                  termTemplates={snapshot.termTemplates}
                  suggestedPlan={suggestedPlan}
                  plannerTerm={plannerTerm}
                  plannerFocus={plannerFocus}
                  selectedCourseIds={selectedPlannerCourseIds}
                  isSaving={isPlanSaving}
                  onPlannerTermChange={setPlannerTerm}
                  onPlannerFocusChange={setPlannerFocus}
                  onSetCourseIds={setPlannerSelection}
                  onSave={handleSavePlan}
                  onDeletePlan={handleDeletePlan}
                />
              ) : null}

              {activeView === "insights" ? (
                <InsightsPanel
                  targetScore={insightTarget}
                  projectedGpa10={projected.projectedGpa10}
                  projectedGpa4={projected.projectedGpa4}
                  summary={summary}
                  progress={progress}
                  onTargetScoreChange={setInsightTarget}
                />
              ) : null}
            </div>
          ) : null}
        </div>

      </div>
      {snapshot.profile && currentProgram ? (
        <nav
          className="fixed inset-x-2 bottom-2 z-30 grid grid-cols-5 gap-1 rounded-[1.15rem] border border-white/75 bg-white/94 p-1 shadow-[0_18px_54px_rgba(0,25,54,0.18)] backdrop-blur lg:hidden"
          aria-label="Điều hướng chính"
        >
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeView === item.key;

            return (
              <button
                key={item.key}
                type="button"
                onClick={() => handleNavigate(item.key)}
                className={`mobile-bottom-nav-item relative flex min-h-[2.75rem] min-w-0 items-center justify-center overflow-hidden rounded-[0.9rem] px-1 transition-[color,transform] duration-200 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--focus-ring)] ${
                  isActive
                    ? "is-active text-white"
                    : "text-[var(--muted)] hover:bg-[var(--surface-tint)] hover:text-[var(--brand-primary)]"
                }`}
                aria-label={navigationLabels[item.key]}
                aria-current={isActive ? "page" : undefined}
              >
                <span className="mobile-bottom-nav-pill" aria-hidden="true" />
                <span className="mobile-bottom-nav-orbit" aria-hidden="true" />
                <Icon className="relative z-10 h-5 w-5 transition-[transform,opacity] duration-200" />
              </button>
            );
          })}
        </nav>
      ) : null}
      <NotificationDropdown
        isOpen={isNotificationOpen}
        notifications={notifications}
        activeGradesPage={activeGradesPage}
        dropdownRef={notificationDropdownRef}
        onClose={() => setIsNotificationOpen(false)}
        onSelect={(item, fallbackGradesPage) => {
          updateWorkspaceRoute(
            item.targetView,
            item.targetGradesPage ?? (item.targetView === "grades" ? fallbackGradesPage : "entry"),
            "overview",
          );
          setIsNotificationOpen(false);
        }}
      />
      {notice ? (
        <Toast tone={notice.tone === "success" ? "success" : "error"}>{notice.message}</Toast>
      ) : null}
    </main>
  );
}
