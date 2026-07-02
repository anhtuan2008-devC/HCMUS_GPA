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
  AlertTriangle,
  ArrowRight,
  BookOpenCheck,
  CalendarDays,
  CheckCircle2,
  Clock3,
} from "lucide-react";
import { AnimatedNumber, useAnimatedNumber } from "@/components/workspace/animated-number";
import { IconBadge, MeterBar, PanelCard, ProgressRing, StatusPill } from "@/components/workspace/ui";
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

  return (
    <div className="space-y-5">
      <div className="grid gap-5 xl:grid-cols-[1.15fr_0.8fr_0.8fr]">
        <button
          type="button"
          onClick={onOpenGpaCalculation}
          className="metric-card motion-card group relative block w-full overflow-hidden rounded-[2rem] px-6 py-6 text-left text-white outline-none transition focus:ring-4 focus:ring-[var(--focus-ring)]"
          aria-label="Xem cách tính GPA"
        >
          <div className="absolute -right-12 bottom-0 h-44 w-44 rounded-full border border-white/10" />
          <div className="relative grid gap-6 sm:grid-cols-[1fr_10rem] sm:items-center">
            <div>
              <p className="text-sm font-medium text-white/72">Xin chào, {profile.fullName}</p>
              <h2 className="mt-3 font-[family-name:var(--font-display)] text-3xl font-bold">
                Tổng quan kết quả học tập của bạn
              </h2>
              <div className="mt-8">
                <p className="text-sm text-white/72">GPA hệ 4</p>
                <div className="mt-2 flex items-end gap-2">
                  <p className="text-6xl font-bold tracking-tight">
                    <AnimatedNumber value={summary.gpa4} decimals={2} />
                  </p>
                  <p className="pb-2 text-xl text-white/70">/ 4.0</p>
                </div>
              </div>
              <div className="mt-6 inline-flex rounded-2xl border border-white/15 bg-white/10 px-4 py-2 text-sm text-white/86">
                {summary.attemptedCredits ? (
                  <>
                    <AnimatedNumber value={summary.attemptedCredits} /> tín chỉ đã tính GPA
                  </>
                ) : (
                  "Bắt đầu bằng điểm số đầu tiên"
                )}
              </div>
              <span className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-white/82 transition group-hover:text-white">
                Xem cách tính GPA
                <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
              </span>
            </div>
            <div className="rounded-[1.5rem] border border-white/12 bg-white/10 p-5">
              <p className="text-sm text-white/70">GPA hệ 10</p>
              <p className="mt-2 text-3xl font-semibold">
                <AnimatedNumber value={summary.gpa10} decimals={3} /> / 10
              </p>
              <div className="my-5 h-px bg-white/12" />
              <p className="text-sm text-white/70">Xếp loại hiện tại</p>
              <p className="mt-2 text-2xl font-semibold text-blue-100">{rank}</p>
            </div>
          </div>
        </button>

        <PanelCard className="space-y-4" style={{ "--delay": "80ms" } as React.CSSProperties}>
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-[var(--foreground)]">Tiến độ tích lũy tín chỉ</p>
              <p className="mt-1 text-xs text-[var(--muted)]">So với mục tiêu của chương trình</p>
            </div>
            <span className="inline-flex items-center rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-800 ring-1 ring-emerald-200">
              {animatedCompletionRate.toFixed(1)}%
            </span>
          </div>
          <ProgressRing
            value={animatedCompletionRate}
            label={`${animatedCompletionRate.toFixed(1)}%`}
            sublabel={`${Math.round(animatedEarnedCredits)} / ${progress.totalCredits} tín chỉ`}
          />
          <div className="grid gap-2 text-sm">
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

        <PanelCard className="space-y-3" style={{ "--delay": "140ms" } as React.CSSProperties}>
          {watchItems.map((item) => {
            const Icon = item.icon;

            return (
              <button
                key={item.label}
                type="button"
                onClick={() => onNavigate(item.view)}
                className="hover-lift grid min-h-[5.75rem] w-full grid-cols-[2.75rem_4.25rem_minmax(0,1fr)] items-center gap-3 rounded-[1.5rem] border border-[var(--line)] bg-white/80 px-4 py-3 text-left"
              >
                <IconBadge tone={item.tone}>
                  <Icon className="h-5 w-5" />
                </IconBadge>
                <p className="text-center text-2xl font-bold tabular-nums text-[var(--foreground)]">
                  <AnimatedNumber value={item.value} />
                </p>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-[var(--foreground)]" title={item.label}>
                    {item.label}
                  </p>
                  <span
                    className="mt-2 inline-flex h-7 w-[7rem] max-w-full items-center justify-center gap-1 rounded-full bg-[var(--surface-tint)] px-3 text-xs font-semibold text-[var(--brand-primary)] ring-1 ring-[var(--line)]"
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

      {progress.conditionProgress.totalCourses ? (
        <PanelCard className="space-y-4" style={{ "--delay": "165ms" } as React.CSSProperties}>
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-start gap-3">
              <IconBadge tone={progress.conditionProgress.pendingCourses ? "orange" : "success"}>
                <CheckCircle2 className="h-5 w-5" />
              </IconBadge>
              <div>
                <h3 className="text-lg font-semibold text-[var(--foreground)]">Điều kiện cần hoàn thành</h3>
                <p className="mt-1 max-w-3xl text-sm leading-6 text-[var(--muted)]">
                  Ngoại ngữ, GDTC và GDQPAN được theo dõi riêng: không tính GPA và không cộng vào
                  {` ${program.totalCredits} tín chỉ`} tích lũy tốt nghiệp.
                </p>
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

      <PanelCard className="space-y-5" style={{ "--delay": "190ms" } as React.CSSProperties}>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-3">
            <IconBadge tone="brand">
              <CalendarDays className="h-5 w-5" />
            </IconBadge>
            <div>
              <h3 className="text-xl font-semibold text-[var(--foreground)]">
                {savedPlan ? "Kế hoạch đã lưu" : "Chưa có kế hoạch đã lưu"}
              </h3>
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
            className="inline-flex items-center justify-center gap-2 rounded-full border border-[var(--line)] bg-white/80 px-4 py-2.5 text-sm font-semibold text-[var(--brand-primary)] transition hover:bg-white"
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
                className="hover-lift min-w-[13.75rem] rounded-[1.5rem] border border-[var(--line)] bg-white/82 px-4 py-4"
              >
                <p className="text-xs font-semibold text-[var(--muted)]">{course.code}</p>
                <h4 className="mt-3 line-clamp-2 min-h-12 font-semibold leading-6 text-[var(--foreground)]">
                  {course.title}
                </h4>
                <p className="mt-3 text-sm text-[var(--muted)]">{course.credits} tín chỉ</p>
                <div className="mt-3 flex flex-wrap gap-2">
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

      <div className="grid gap-5 xl:grid-cols-[0.9fr_1.1fr]">
        <PanelCard className="space-y-4" style={{ "--delay": "240ms" } as React.CSSProperties}>
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="text-xl font-semibold text-[var(--foreground)]">Tiến độ chương trình đào tạo</h3>
              <p className="mt-1 text-sm text-[var(--muted)]">{program.name} · {program.totalCredits} tín chỉ</p>
            </div>
            <IconBadge tone="brand">
              <BookOpenCheck className="h-5 w-5" />
            </IconBadge>
          </div>

          <div className="overflow-hidden rounded-[1.5rem] border border-[var(--line)] bg-white/72">
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
                  className="grid gap-3 px-4 py-4 md:grid-cols-[1fr_5.5rem_5.5rem_6.875rem] md:items-center"
                >
                  <p className="font-semibold text-[var(--foreground)]">{group.title}</p>
                  <p className="text-sm text-[var(--muted)]">{group.requiredCredits} TC</p>
                  <p className="text-sm text-[var(--muted)]">{group.earnedCredits} TC</p>
                  <div className="space-y-2">
                    <MeterBar value={group.completionRate} />
                    <p className="text-right text-xs font-semibold text-[var(--brand-primary)]">{group.completionRate}%</p>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </PanelCard>

        <PanelCard className="space-y-4" style={{ "--delay": "300ms" } as React.CSSProperties}>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h3 className="text-xl font-semibold text-[var(--foreground)]">Dự báo GPA theo học kỳ</h3>
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
          <div className="h-80">
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
