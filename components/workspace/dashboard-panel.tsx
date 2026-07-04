import {
  Area,
  AreaChart,
  CartesianGrid,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useState } from "react";
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  BookOpenCheck,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Compass,
  Target,
} from "lucide-react";
import { AnimatedNumber, useAnimatedNumber } from "@/components/workspace/animated-number";
import { IconBadge, MeterBar, PanelCard, StatusPill } from "@/components/workspace/ui";
import { AcademicCanvasScene } from "@/components/visual/academic-canvas-scene";
import { CreditOrbit, Typography } from "@/components/ui";
import { courseKindLabels, getAcademicRank } from "@/lib/ui-copy";
import type {
  GpaSummary,
  GraduationProgress,
  ProgramCurriculum,
  StudentCourseRecord,
  StudentProfile,
  TermPlan,
  TermPlanCourseItem,
  TimelinePoint,
  ViewKey,
} from "@/lib/types";

function countNotStarted(program: ProgramCurriculum, records: StudentCourseRecord[]) {
  const recordedCourseIds = new Set(records.map((record) => record.courseId));
  return program.courses.filter((course) => !recordedCourseIds.has(course.id)).length;
}

function buildChartData(timeline: TimelinePoint[]) {
  if (timeline.length) {
    return timeline;
  }

  return [
    {
      termLabel: "Bắt đầu",
      gpa10: 0,
      gpa4: 0,
      earnedCredits: 0,
    },
  ];
}

function GpaTooltip({
  active,
  payload,
  label,
  mode,
}: Readonly<{
  active?: boolean;
  payload?: Array<{ payload?: TimelinePoint }>;
  label?: string;
  mode: "cpa" | "term-gpa";
}>) {
  const point = payload?.[0]?.payload;

  if (!active || !point) {
    return null;
  }

  return (
    <div className="rounded-2xl border border-[var(--line)] bg-white/95 px-4 py-3 text-sm shadow-[0_16px_42px_rgba(0,25,54,0.14)]">
      <p className="font-semibold text-[var(--foreground)]">{label}</p>
      <p className="mt-2 text-[var(--muted)]">
        {mode === "cpa" ? "CPA 10" : "GPA kỳ 10"}: {point.gpa10.toFixed(3)}
      </p>
      <p className="text-[var(--muted)]">
        {mode === "cpa" ? "CPA 4" : "GPA kỳ 4"}: {point.gpa4.toFixed(2)}
      </p>
      <p className="text-[var(--muted)]">Tín chỉ tích lũy: {point.earnedCredits}</p>
    </div>
  );
}

export function DashboardPanel({
  profile,
  program,
  summary,
  progress,
  timeline,
  termTimeline,
  records,
  plans,
  plannerTerm,
  onNavigate,
  onOpenGpaCalculation,
}: Readonly<{
  profile: StudentProfile;
  program: ProgramCurriculum;
  summary: GpaSummary;
  progress: GraduationProgress;
  timeline: TimelinePoint[];
  termTimeline: TimelinePoint[];
  records: StudentCourseRecord[];
  plans: TermPlan[];
  plannerTerm: string;
  onNavigate: (view: ViewKey) => void;
  onOpenGpaCalculation: () => void;
}>) {
  const [chartMode, setChartMode] = useState<"cpa" | "term-gpa">("cpa");
  const notStartedCount = countNotStarted(program, records);
  const chartData = buildChartData(chartMode === "cpa" ? timeline : termTimeline);
  const savedPlan = plans.find((plan) => plan.termLabel === plannerTerm);
  const courseMap = new Map(program.courses.map((course) => [course.id, course]));
  const savedPlanItems =
    savedPlan?.courseItems.length
      ? savedPlan.courseItems
      : savedPlan?.courseIds.map((courseId, index) => ({
          courseId,
          displayOrder: index,
          source: "manual" as const,
          notes: null,
          expectedScore10: null,
          expectedGradeInputMode: "numeric" as const,
          expectedPassFailStatus: null,
        })) ?? [];
  const planCourses = savedPlan
    ? savedPlanItems
        .map((item) => ({ item, course: courseMap.get(item.courseId) }))
        .filter(
          (
            entry,
          ): entry is {
            item: TermPlanCourseItem;
            course: ProgramCurriculum["courses"][number];
          } => Boolean(entry.course),
        )
        .slice(0, 6)
    : [];
  const planCredits = planCourses.reduce((sum, entry) => sum + entry.course.credits, 0);
  const rank = getAcademicRank(summary.gpa10);
  const progressDuration = 1000;
  const animatedCompletionRate = useAnimatedNumber(progress.completionRate, progressDuration);
  const animatedEarnedCredits = useAnimatedNumber(progress.earnedCredits, progressDuration);
  const animatedRemainingCredits = useAnimatedNumber(progress.remainingCredits, progressDuration);
  const conditionCourseIds = new Set(
    program.courses
      .filter((course) => !course.countsTowardGpa && !course.countsTowardProgress)
      .map((course) => course.id),
  );
  const passedConditionCourseIds = new Set(
    records
      .filter((record) => record.status === "passed" && conditionCourseIds.has(record.courseId))
      .map((record) => record.courseId),
  );
  const pendingConditionCourses = program.courses
    .filter((course) => conditionCourseIds.has(course.id) && !passedConditionCourseIds.has(course.id))
    .slice(0, 4);
  const conditionCompletionRate = progress.conditionProgress.totalCourses
    ? (progress.conditionProgress.completedCourses / progress.conditionProgress.totalCourses) * 100
    : 0;

  const watchItems = [
    {
      label: "Môn chưa đạt",
      value: summary.failedCourseCount,
      action: "Xem ngay",
      icon: AlertTriangle,
      tone: "danger" as const,
      view: "grades" as ViewKey,
    },
    {
      label: "Môn chưa học",
      value: notStartedCount,
      action: "Xem danh sách",
      icon: Clock3,
      tone: "orange" as const,
      view: "curriculum" as ViewKey,
    },
    {
      label: "Môn đã hoàn thành",
      value: summary.passedCourseCount,
      action: "Chi tiết",
      icon: CheckCircle2,
      tone: "success" as const,
      view: "curriculum" as ViewKey,
    },
  ];
  const cockpitSignals = [
    {
      label: "Nhịp GPA",
      value: summary.attemptedCredits ? summary.gpa10.toFixed(3) : "Mới bắt đầu",
      title: rank,
      description: summary.failedCourseCount
        ? `${summary.failedCourseCount} môn cần quay lại để nhịp GPA sạch hơn.`
        : "Nhịp điểm đang gọn, tiếp tục cập nhật sau mỗi học kỳ.",
      icon: Activity,
      tone: "brand" as const,
    },
    {
      label: "Mốc tín chỉ",
      value: `${progress.earnedCredits}/${progress.totalCredits}`,
      title: "Tích lũy chính",
      description: progress.remainingCredits
        ? `Còn ${progress.remainingCredits} tín chỉ trong tổng chương trình.`
        : "Bạn đã chạm mốc tín chỉ chính của chương trình.",
      icon: Target,
      tone: progress.remainingCredits ? "orange" as const : "success" as const,
    },
    {
      label: "Kế hoạch kỳ",
      value: savedPlan ? `${planCredits} TC` : "Chưa lưu",
      title: plannerTerm,
      description: savedPlan
        ? `${planCourses.length} môn đang nằm trong kế hoạch đã lưu.`
        : "Tạo kế hoạch thật để dashboard phản ánh học kỳ sắp tới.",
      icon: Compass,
      tone: savedPlan ? "success" as const : "orange" as const,
    },
  ];
  const actionSteps = [
    {
      title: "Cập nhật điểm",
      caption: records.length ? `${records.length} kết quả đã ghi nhận` : "Nhập điểm đầu tiên để mở nhịp theo dõi.",
      done: records.length > 0,
      view: "grades" as ViewKey,
    },
    {
      title: "Rà chương trình",
      caption: notStartedCount ? `${notStartedCount} môn chưa học cần được nhìn trước.` : "Danh sách môn đã được phủ kín.",
      done: notStartedCount === 0,
      view: "curriculum" as ViewKey,
    },
    {
      title: "Chốt kế hoạch",
      caption: savedPlan ? `Đã lưu kế hoạch cho ${plannerTerm}.` : "Chưa có kế hoạch thật cho kỳ đang chọn.",
      done: Boolean(savedPlan),
      view: "planner" as ViewKey,
    },
  ];

  return (
    <div className="space-y-3 sm:space-y-5">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-1 sm:gap-5 xl:grid-cols-[1.15fr_0.8fr_0.8fr]">
        <button
          type="button"
          onClick={onOpenGpaCalculation}
          className="metric-card motion-card group relative block w-full overflow-hidden rounded-[1.1rem] px-3 py-3 text-left text-white outline-none transition focus:ring-4 focus:ring-[var(--focus-ring)] sm:rounded-[2rem] sm:px-6 sm:py-6"
          aria-label="Xem cách tính GPA"
        >
          <div className="absolute -right-12 bottom-0 h-44 w-44 rounded-full border border-white/10" />
          <AcademicCanvasScene className="opacity-38" density="low" variant="dashboard-orbit" />
          <div className="relative grid gap-3 sm:grid-cols-[1fr_10rem] sm:items-center sm:gap-6">
            <div>
              <p className="text-[0.68rem] font-semibold uppercase tracking-[0.14em] text-white/68 sm:hidden">
                GPA hiện tại
              </p>
              <p className="hidden text-sm font-medium text-white/72 sm:block">Xin chào, {profile.fullName}</p>
              <Typography as="h2" variant="section-title" className="hidden text-white sm:mt-3 sm:block">
                Tổng quan kết quả học tập của bạn
              </Typography>
              <div className="mt-2 sm:mt-8">
                <p className="text-xs text-white/72 sm:text-sm">GPA hệ 4</p>
                <div className="mt-2 flex items-end gap-2">
                  <p className="text-3xl font-bold tracking-tight sm:text-6xl">
                    <AnimatedNumber value={summary.gpa4} decimals={2} />
                  </p>
                  <p className="pb-0.5 text-xs text-white/70 sm:pb-2 sm:text-xl">/ 4.0</p>
                </div>
              </div>
              <div className="mt-3 inline-flex max-w-full rounded-lg border border-white/15 bg-white/10 px-2.5 py-1.5 text-[0.68rem] text-white/86 sm:mt-6 sm:rounded-2xl sm:px-4 sm:py-2 sm:text-sm">
                {summary.attemptedCredits ? (
                  <>
                    <AnimatedNumber value={summary.attemptedCredits} /> tín chỉ đã tính GPA
                  </>
                ) : (
                  "Bắt đầu bằng điểm số đầu tiên"
                )}
              </div>
              <span className="mt-2 inline-flex items-center gap-1.5 text-xs font-semibold text-white/82 transition group-hover:text-white sm:mt-4 sm:gap-2 sm:text-sm">
                <span className="sm:hidden">Cách tính</span>
                <span className="hidden sm:inline">Xem cách tính GPA</span>
                <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
              </span>
            </div>
            <div className="rounded-[0.95rem] border border-white/12 bg-white/10 p-2.5 sm:rounded-[1.5rem] sm:p-5">
              <p className="text-xs text-white/70 sm:text-sm">GPA hệ 10</p>
              <p className="mt-1 text-lg font-semibold sm:mt-2 sm:text-3xl">
                <AnimatedNumber value={summary.gpa10} decimals={3} /> / 10
              </p>
              <div className="my-2 h-px bg-white/12 sm:my-5" />
              <p className="text-xs text-white/70 sm:text-sm">Xếp loại</p>
              <p className="mt-1 truncate text-sm font-semibold text-blue-100 sm:mt-2 sm:text-2xl">{rank}</p>
            </div>
          </div>
        </button>

        <PanelCard className="space-y-2 rounded-[1.1rem] px-3 py-3 sm:space-y-4 sm:rounded-[2rem] sm:px-6 sm:py-6" style={{ "--delay": "80ms" } as React.CSSProperties}>
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold text-[var(--foreground)] sm:text-sm">Tín chỉ</p>
              <p className="mt-1 hidden text-xs text-[var(--muted)] sm:block">So với mục tiêu của chương trình</p>
            </div>
            <span className="inline-flex items-center rounded-full bg-emerald-100 px-2 py-0.5 text-[0.65rem] font-semibold text-emerald-800 ring-1 ring-emerald-200 sm:px-3 sm:py-1 sm:text-xs">
              {animatedCompletionRate.toFixed(1)}%
            </span>
          </div>
          <CreditOrbit
            value={Math.round(animatedEarnedCredits)}
            total={progress.totalCredits}
            label={`${animatedCompletionRate.toFixed(1)}%`}
            sublabel={`${Math.round(animatedEarnedCredits)} / ${progress.totalCredits} tín chỉ`}
            className="w-[8.5rem] sm:w-[10.5rem]"
          />
          <div className="grid gap-1 text-[0.68rem] sm:grid-cols-1 sm:gap-2 sm:text-sm">
            <div className="flex items-center justify-between">
              <span className="text-[var(--muted)]">Đã tích lũy</span>
              <span className="font-semibold text-[var(--foreground)]">{Math.round(animatedEarnedCredits)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[var(--muted)]">Còn lại</span>
              <span className="font-semibold text-[var(--foreground)]">{Math.round(animatedRemainingCredits)}</span>
            </div>
          </div>
        </PanelCard>

        <PanelCard className="col-span-2 grid grid-cols-3 gap-2 px-3 py-3 sm:col-auto sm:block sm:space-y-3 sm:px-6 sm:py-6" style={{ "--delay": "140ms" } as React.CSSProperties}>
          {watchItems.map((item) => {
            const Icon = item.icon;

            return (
              <button
                key={item.label}
                type="button"
                onClick={() => onNavigate(item.view)}
                className="hover-lift flex min-h-[5.2rem] w-full flex-col items-center justify-center gap-1.5 rounded-[1.15rem] border border-[var(--line)] bg-white/80 px-2 py-2 text-center sm:grid sm:min-h-[5.75rem] sm:grid-cols-[2.75rem_4.25rem_minmax(0,1fr)] sm:items-center sm:gap-3 sm:rounded-[1.5rem] sm:px-4 sm:py-3 sm:text-left"
              >
                <IconBadge tone={item.tone}>
                  <Icon className="h-5 w-5" />
                </IconBadge>
                <p className="text-center text-xl font-bold tabular-nums text-[var(--foreground)] sm:text-2xl">
                  <AnimatedNumber value={item.value} />
                </p>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-[var(--foreground)]" title={item.label}>
                    {item.label}
                  </p>
                  <span
                    className="mt-2 hidden h-7 w-[7rem] max-w-full items-center justify-center gap-1 rounded-full bg-[var(--surface-tint)] px-3 text-xs font-semibold text-[var(--brand-primary)] ring-1 ring-[var(--line)] sm:inline-flex"
                    title={item.action}
                  >
                    <span className="truncate">{item.action}</span>
                    <ArrowRight className="h-3.5 w-3.5 shrink-0" />
                  </span>
                </div>
              </button>
            );
          })}
        </PanelCard>
      </div>

      <PanelCard className="learning-cockpit content-visibility-auto space-y-4 sm:space-y-5" style={{ "--delay": "155ms" } as React.CSSProperties}>
        <div className="relative flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">
              Learning cockpit
            </p>
            <Typography as="h3" variant="card-title" className="mt-2 text-[var(--foreground)]">
              Nhịp học hôm nay của bạn
            </Typography>
            <Typography variant="body-sm" className="mt-1 max-w-2xl text-[var(--muted)]">
              Ba tín hiệu ngắn để bạn biết nên tiếp tục bằng điểm số, chương trình hay kế hoạch học kỳ.
            </Typography>
          </div>
          <button
            type="button"
            onClick={() => onNavigate(savedPlan ? "planner" : "grades")}
            className="inline-flex min-h-10 items-center justify-center gap-2 rounded-full border border-[var(--line)] bg-white/82 px-4 py-2 text-sm font-semibold text-[var(--brand-primary)] transition hover:bg-white"
          >
            {savedPlan ? "Tinh chỉnh kế hoạch" : "Bắt đầu cập nhật"}
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>

        <div className="relative grid gap-2 sm:grid-cols-3 sm:gap-3">
          {cockpitSignals.map((signal) => {
            const Icon = signal.icon;

            return (
              <article
                key={signal.label}
                className="learning-signal-card hover-lift rounded-[1.15rem] border border-[var(--line)] bg-white/78 p-3 sm:rounded-[1.5rem] sm:p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">
                      {signal.label}
                    </p>
                    <p className="typo-metric-md mt-2 truncate text-[var(--foreground)]">
                      {signal.value}
                    </p>
                  </div>
                  <IconBadge tone={signal.tone}>
                    <Icon className="h-5 w-5" />
                  </IconBadge>
                </div>
                <p className="mt-3 text-sm font-semibold text-[var(--foreground)]">{signal.title}</p>
                <p className="mt-1 text-xs leading-5 text-[var(--muted)] sm:text-sm sm:leading-6">
                  {signal.description}
                </p>
              </article>
            );
          })}
        </div>

        <div className="data-thread relative grid gap-2 sm:grid-cols-3">
          {actionSteps.map((step, index) => (
            <button
              key={step.title}
              type="button"
              onClick={() => onNavigate(step.view)}
              className="group relative flex min-w-0 items-start gap-3 rounded-[1.15rem] border border-[var(--line)] bg-white/58 px-3 py-3 text-left transition hover:border-[var(--line-strong)] hover:bg-white/82 sm:rounded-[1.35rem]"
            >
              <span
                className={`data-thread-dot relative z-10 mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold ring-1 ${
                  step.done
                    ? "bg-[var(--brand-primary)] text-white ring-[var(--brand-primary)]"
                    : "bg-white text-[var(--brand-primary)] ring-blue-100"
                }`}
              >
                {step.done ? "✓" : index + 1}
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-semibold text-[var(--foreground)]">{step.title}</span>
                <span className="mt-1 block text-xs leading-5 text-[var(--muted)]">{step.caption}</span>
              </span>
            </button>
          ))}
        </div>
      </PanelCard>

      {progress.conditionProgress.totalCourses ? (
        <PanelCard className="content-visibility-auto space-y-4" style={{ "--delay": "165ms" } as React.CSSProperties}>
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-start gap-3">
              <IconBadge tone={progress.conditionProgress.pendingCourses ? "orange" : "success"}>
                <CheckCircle2 className="h-5 w-5" />
              </IconBadge>
              <div>
              <Typography as="h3" variant="card-title" className="text-[var(--foreground)]">Điều kiện cần hoàn thành</Typography>
                <Typography variant="body-sm" className="mt-1 max-w-3xl text-[var(--muted)]">
                  Ngoại ngữ, GDTC và GDQPAN được theo dõi riêng: không tính GPA và không cộng vào
                  {` ${program.totalCredits} tín chỉ`} tích lũy tốt nghiệp.
                </Typography>
              </div>
            </div>
            <div className="grid gap-3 sm:min-w-[26rem] sm:grid-cols-[8rem_1fr_auto] sm:items-center">
              <div>
                <p className="text-2xl font-bold tabular-nums text-[var(--foreground)]">
                  {progress.conditionProgress.completedCourses}/{progress.conditionProgress.totalCourses}
                </p>
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--muted)]">
                  môn đã đạt
                </p>
              </div>
              <MeterBar value={conditionCompletionRate} tone={progress.conditionProgress.pendingCourses ? "orange" : "brand"} />
              <button
                type="button"
                onClick={() => onNavigate("curriculum")}
                className="inline-flex h-10 items-center justify-center rounded-full border border-[var(--line)] bg-white/80 px-4 text-sm font-semibold text-[var(--brand-primary)] transition hover:bg-white"
              >
                Xem chi tiết
              </button>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {pendingConditionCourses.length ? (
              pendingConditionCourses.map((course) => (
                <StatusPill key={course.id} label={`Còn ${course.title}`} tone="warning" className="w-[8.5rem] max-w-[8.5rem]" />
              ))
            ) : (
              <StatusPill label="Đã hoàn thành điều kiện" tone="success" className="w-[10rem] max-w-[10rem]" />
            )}
          </div>
        </PanelCard>
      ) : null}

      <PanelCard className="content-visibility-auto space-y-5" style={{ "--delay": "190ms" } as React.CSSProperties}>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-3">
            <IconBadge tone="brand">
              <CalendarDays className="h-5 w-5" />
            </IconBadge>
            <div>
              <Typography as="h3" variant="card-title" className="text-[var(--foreground)]">
                {savedPlan ? "Kế hoạch đã lưu" : "Chưa có kế hoạch đã lưu"}
              </Typography>
              <p className="mt-1 text-sm text-[var(--muted)]">
                {plannerTerm}
                {savedPlan ? ` · ${planCredits} tín chỉ đã lưu` : ""}
              </p>
              {savedPlan ? (
                <StatusPill label="Dữ liệu đã lưu trong kế hoạch của bạn" tone="success" className="mt-2" />
              ) : null}
            </div>
          </div>
          <button
            type="button"
            onClick={() => onNavigate("planner")}
            className="inline-flex min-h-10 items-center justify-center gap-2 rounded-full border border-[var(--line)] bg-white/80 px-4 py-2 text-sm font-semibold text-[var(--brand-primary)] transition hover:bg-white sm:py-2.5"
          >
            {savedPlan ? "Xem kế hoạch chi tiết" : "Tạo kế hoạch học kỳ"}
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>

        <div className="scrollbar-subtle flex gap-3 overflow-x-auto pb-2">
          {planCourses.length ? (
            planCourses.map(({ course, item }) => (
              <article
                key={course.id}
                className="hover-lift min-w-[11.5rem] rounded-[1.15rem] border border-[var(--line)] bg-white/82 px-3 py-3 sm:min-w-[13.75rem] sm:rounded-[1.5rem] sm:px-4 sm:py-4"
              >
                <p className="text-xs font-semibold text-[var(--muted)]">{course.code}</p>
                <h4 className="mt-2 line-clamp-2 min-h-10 font-semibold leading-5 text-[var(--foreground)] sm:mt-3 sm:min-h-12 sm:leading-6">
                  {course.title}
                </h4>
                <p className="mt-2 text-sm text-[var(--muted)] sm:mt-3">{course.credits} tín chỉ</p>
                <div className="mt-2 flex flex-wrap gap-1.5 sm:mt-3 sm:gap-2">
                  <StatusPill
                    label={courseKindLabels[course.kind]}
                    tone={course.kind === "required" ? "success" : "warning"}
                  />
                  {item.expectedScore10 !== null ? (
                    <StatusPill label={`Dự kiến ${item.expectedScore10.toFixed(3)}`} tone="neutral" />
                  ) : null}
                  {item.expectedGradeInputMode === "pass_fail" && item.expectedPassFailStatus ? (
                    <StatusPill
                      label={`Dự kiến ${item.expectedPassFailStatus === "passed" ? "Đạt" : "Không đạt"}`}
                      tone={item.expectedPassFailStatus === "passed" ? "success" : "danger"}
                    />
                  ) : null}
                </div>
              </article>
            ))
          ) : (
            <div className="w-full rounded-[1.5rem] border border-dashed border-[var(--line)] bg-white/60 px-5 py-8 text-center">
              <h4 className="text-base font-semibold text-[var(--foreground)]">
                Chưa có kế hoạch đã lưu cho kỳ này
              </h4>
              <p className="mx-auto mt-2 max-w-2xl text-sm leading-6 text-[var(--muted)]">
                Dashboard chỉ hiển thị kế hoạch bạn đã lưu thật sự. Hãy sang Kế hoạch học kỳ, áp dụng kế hoạch
                chuẩn hoặc tự chọn môn, rồi bấm Lưu kế hoạch để các môn xuất hiện ở đây.
              </p>
            </div>
          )}
        </div>
      </PanelCard>

      <div className="grid gap-3 sm:gap-5 xl:grid-cols-[0.9fr_1.1fr]">
        <PanelCard className="content-visibility-auto space-y-4" style={{ "--delay": "240ms" } as React.CSSProperties}>
          <div className="flex items-start justify-between gap-3">
            <div>
              <Typography as="h3" variant="card-title" className="text-[var(--foreground)]">Tiến độ chương trình đào tạo</Typography>
              <p className="mt-1 text-sm text-[var(--muted)]">{program.name} · {program.totalCredits} tín chỉ</p>
            </div>
            <IconBadge tone="brand">
              <BookOpenCheck className="h-5 w-5" />
            </IconBadge>
          </div>

          <div className="overflow-hidden rounded-[1.15rem] border border-[var(--line)] bg-white/72 sm:rounded-[1.5rem]">
            <div className="hidden grid-cols-[1fr_5.5rem_5.5rem_6.875rem] gap-3 border-b border-[var(--line)] px-4 py-3 text-xs font-semibold uppercase tracking-[0.16em] text-[var(--muted)] md:grid">
              <span>Nhóm kiến thức</span>
              <span>Yêu cầu</span>
              <span>Đã tích lũy</span>
              <span>Tiến độ</span>
            </div>
            <div className="divide-y divide-[var(--line)]">
              {progress.groupProgress.map((group) => (
                <article
                  key={group.groupId}
                  className="grid grid-cols-[minmax(0,1fr)_auto] gap-1.5 px-2.5 py-2.5 text-[0.72rem] sm:gap-2 sm:px-4 sm:py-4 sm:text-sm md:grid-cols-[1fr_5.5rem_5.5rem_6.875rem] md:items-center md:gap-3"
                >
                  <p className="col-span-2 font-semibold leading-4 text-[var(--foreground)] sm:leading-5 md:col-span-1">{group.title}</p>
                  <p className="text-[0.72rem] text-[var(--muted)] sm:text-sm">{group.requiredCredits} TC</p>
                  <p className="text-[0.72rem] text-[var(--muted)] sm:text-sm">{group.earnedCredits} TC</p>
                  <div className="col-span-2 space-y-2 md:col-span-1">
                    <MeterBar value={group.completionRate} />
                    <p className="text-right text-[0.68rem] font-semibold text-[var(--brand-primary)] sm:text-xs">{group.completionRate}%</p>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </PanelCard>

        <PanelCard className="content-visibility-auto space-y-4" style={{ "--delay": "300ms" } as React.CSSProperties}>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <Typography as="h3" variant="card-title" className="text-[var(--foreground)]">Dự báo GPA theo học kỳ</Typography>
              <p className="mt-1 text-sm text-[var(--muted)]">Theo dõi xu hướng để điều chỉnh nhịp học sớm hơn.</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <div className="inline-flex rounded-full border border-[var(--line)] bg-white/80 p-1">
                {[
                  ["cpa", "CPA tích lũy"],
                  ["term-gpa", "GPA học kỳ"],
                ].map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setChartMode(value as "cpa" | "term-gpa")}
                    className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                      chartMode === value
                        ? "bg-[var(--brand-primary)] text-white shadow-sm"
                        : "text-[var(--muted)] hover:bg-[var(--surface-tint)]"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <button
                type="button"
                onClick={() => onNavigate("insights")}
                className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--brand-primary)]"
              >
                Xem phân tích
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
          <div className="h-64 sm:h-80">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ left: -18, right: 12, top: 14, bottom: 8 }}>
                <defs>
                  <linearGradient id="gpa-area" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0%" stopColor="var(--brand-accent)" stopOpacity={0.26} />
                    <stop offset="100%" stopColor="var(--brand-accent)" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="var(--chart-grid)" strokeDasharray="4 4" />
                <XAxis dataKey="termLabel" stroke="var(--muted)" tickLine={false} axisLine={false} />
                <YAxis stroke="var(--muted)" tickLine={false} axisLine={false} domain={[0, 10]} />
                <Tooltip content={<GpaTooltip mode={chartMode} />} />
                <Area
                  type="monotone"
                  dataKey="gpa10"
                  fill="url(#gpa-area)"
                  stroke="var(--brand-primary)"
                  strokeWidth={3}
                />
                <Line
                  type="monotone"
                  dataKey="gpa10"
                  stroke="var(--brand-navy)"
                  strokeWidth={3}
                  dot={{ r: 4, fill: "var(--brand-navy)", strokeWidth: 0 }}
                  activeDot={{ r: 6 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </PanelCard>
      </div>
    </div>
  );
}
