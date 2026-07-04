import { BookOpen, CheckCircle2, Compass, Layers3 } from "lucide-react";
import { IconBadge, PanelCard, MeterBar, StatusPill } from "@/components/workspace/ui";
import { AcademicCanvasScene } from "@/components/visual/academic-canvas-scene";
import { CurriculumMap, Typography } from "@/components/ui";
import { normalizeSearchText } from "@/lib/text";
import { courseCategoryLabels, courseKindLabels, curriculumStatusLabels } from "@/lib/ui-copy";
import type { Course, CurriculumStatus, ProgramCurriculum } from "@/lib/types";

function curriculumTone(status: CurriculumStatus) {
  switch (status) {
    case "passed":
      return "success" as const;
    case "failed":
      return "danger" as const;
    case "planned":
      return "warning" as const;
    default:
      return "neutral" as const;
  }
}

function curriculumLabel(status: CurriculumStatus) {
  return curriculumStatusLabels[status];
}

function gpaPolicyLabel(course: Course) {
  if (!course.countsTowardGpa && !course.countsTowardProgress) {
    return "Điều kiện riêng";
  }

  return course.countsTowardGpa ? "Tính GPA" : "Không tính GPA";
}

function gpaPolicyTone(course: Course) {
  if (!course.countsTowardGpa) {
    return "warning" as const;
  }

  return "success" as const;
}

export function CurriculumPanel({
  program,
  search,
  onSearchChange,
  getCourseStatus,
}: Readonly<{
  program: ProgramCurriculum;
  search: string;
  onSearchChange: (value: string) => void;
  getCourseStatus: (course: Course) => CurriculumStatus;
}>) {
  const coursesWithStatus = program.courses.map((course) => ({
    course,
    status: getCourseStatus(course),
  }));
  const courseStatusMap = new Map(coursesWithStatus.map((item) => [item.course.id, item.status]));
  const trackedCreditsTotal =
    program.requirementSections
      .filter((section) => section.countsTowardProgramTotal)
      .reduce((sum, section) => sum + section.totalCredits, 0) || program.totalCredits;
  const earnedProgramCredits = coursesWithStatus
    .filter((item) => item.course.countsTowardProgress && item.status === "passed")
    .reduce((sum, item) => sum + item.course.credits, 0);
  const plannedCourseCount = coursesWithStatus.filter((item) => item.status === "planned").length;
  const passedCourseCount = coursesWithStatus.filter((item) => item.status === "passed").length;
  const conditionCourseCount = program.courses.filter(
    (course) => !course.countsTowardGpa && !course.countsTowardProgress,
  ).length;
  const curriculumCompletionRate = trackedCreditsTotal
    ? Math.min(100, (earnedProgramCredits / trackedCreditsTotal) * 100)
    : 0;
  const curriculumSignals = [
    {
      label: "Tiến độ chính",
      value: `${earnedProgramCredits}/${trackedCreditsTotal}`,
      helper: "tín chỉ tốt nghiệp",
      icon: CheckCircle2,
      tone: "success" as const,
    },
    {
      label: "Đã hoàn thành",
      value: passedCourseCount.toString(),
      helper: "học phần",
      icon: BookOpen,
      tone: "brand" as const,
    },
    {
      label: "Đang lên kế hoạch",
      value: plannedCourseCount.toString(),
      helper: "học phần",
      icon: Compass,
      tone: "orange" as const,
    },
    {
      label: "Điều kiện riêng",
      value: conditionCourseCount.toString(),
      helper: "không cộng 138 TC",
      icon: Layers3,
      tone: "brand" as const,
    },
  ];

  return (
    <div className="space-y-4">
      <section className="cockpit-hero learning-cockpit overflow-hidden rounded-[1.35rem] border border-[var(--line)] p-3 sm:rounded-[2rem] sm:p-5">
        <AcademicCanvasScene className="opacity-26" density="low" variant="curriculum-map" />
        <div className="relative grid gap-4 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:items-center">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--brand-primary)] sm:text-sm sm:tracking-[0.22em]">
              Bản đồ CTĐT
            </p>
            <Typography as="h2" variant="section-title" className="mt-2 text-[var(--foreground)]">
              Nhìn toàn bộ hành trình, biết đoạn nào đã sáng đèn.
            </Typography>
            <Typography variant="body-sm" className="mt-3 max-w-2xl text-[var(--muted)]">
              Mỗi nhóm học phần được giữ đúng cấu trúc chương trình, còn các điều kiện riêng như Anh văn,
              GDTC và GDQPAN được tách khỏi 138 tín chỉ chính để bạn theo dõi rõ ràng hơn.
            </Typography>
            <div className="mt-4 max-w-lg">
              <div className="mb-2 flex items-center justify-between text-xs font-semibold uppercase tracking-[0.14em] text-[var(--muted)]">
                <span>Nhịp hoàn thành</span>
                <span>{Math.round(curriculumCompletionRate)}%</span>
              </div>
              <MeterBar value={curriculumCompletionRate} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 sm:gap-3">
            {curriculumSignals.map((signal) => {
              const SignalIcon = signal.icon;

              return (
                <article key={signal.label} className="learning-signal-card group rounded-[1.1rem] p-3 sm:rounded-[1.5rem] sm:p-4">
                  <div className="flex items-center justify-between gap-2">
                    <IconBadge tone={signal.tone}>
                      <SignalIcon className="h-4 w-4 sm:h-5 sm:w-5" />
                    </IconBadge>
                    <span className="data-thread-dot h-2.5 w-2.5 rounded-full bg-[var(--brand-accent)]" />
                  </div>
                  <p className="mt-3 text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-[var(--muted)] sm:text-xs">
                    {signal.label}
                  </p>
                  <p className="mt-1 text-xl font-bold text-[var(--foreground)] sm:text-2xl">{signal.value}</p>
                  <p className="mt-1 text-xs leading-5 text-[var(--muted)] sm:text-sm">{signal.helper}</p>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <PanelCard className="space-y-3 sm:space-y-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted)] sm:text-sm sm:tracking-[0.2em]">
              Chương trình học
            </p>
            <Typography as="h2" variant="section-title" className="mt-2 text-[var(--foreground)] sm:mt-3">
              Theo dõi từng nhóm học phần.
            </Typography>
          </div>
          <label className="block w-full max-w-md">
            <span className="mb-2 block text-sm font-medium text-[var(--foreground)]">Tìm theo mã, tên, ghi chú</span>
            <input
              value={search}
              onChange={(event) => onSearchChange(event.target.value)}
              className="w-full rounded-xl border border-[var(--line)] bg-white/80 px-3 py-2.5 outline-none transition focus:border-[var(--brand-primary)] sm:rounded-2xl sm:px-4 sm:py-3"
              placeholder="VD: CSC10004, cơ sở dữ liệu..."
            />
          </label>
        </div>
      </PanelCard>

      {program.requirementSections.length ? (
        <PanelCard className="space-y-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[var(--muted)]">
              Cơ cấu tín chỉ tốt nghiệp
            </p>
            <h3 className="mt-2 text-xl font-semibold text-[var(--foreground)] sm:text-2xl">
              {program.totalCredits} tín chỉ theo bảng CTĐT
            </h3>
            <p className="mt-2 max-w-3xl text-sm leading-7 text-[var(--muted)]">
              Các môn điều kiện như Ngoại ngữ, GDTC và GDQPAN vẫn được theo dõi, nhưng không cộng vào
              tổng tín chỉ tích lũy tốt nghiệp.
            </p>
          </div>
          <CurriculumMap sections={program.requirementSections} />
          <div className="grid grid-cols-2 gap-2 sm:gap-3 xl:grid-cols-4">
            {program.requirementSections.map((section) => (
              <article
                key={section.id}
                className="rounded-[1.15rem] border border-[var(--line)] bg-white/76 p-3 sm:rounded-[1.5rem] sm:p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <h4 className="text-sm font-semibold leading-5 text-[var(--foreground)] sm:text-base sm:leading-6">{section.title}</h4>
                  <span className="rounded-full bg-[var(--surface-tint)] px-2.5 py-1 text-xs font-bold text-[var(--brand-primary)] ring-1 ring-[var(--line)] sm:px-3 sm:text-sm">
                    {section.totalCredits} TC
                  </span>
                </div>
                <div className="mt-3 flex flex-wrap gap-1.5 sm:mt-4 sm:gap-2">
                  <StatusPill
                    label={`${section.requiredCredits} BB`}
                    tone={section.requiredCredits ? "success" : "neutral"}
                  />
                  {section.electiveCredits ? (
                    <StatusPill label={`${section.electiveCredits} tự chọn`} tone="warning" />
                  ) : null}
                  {section.freeElectiveCredits ? (
                    <StatusPill label={`${section.freeElectiveCredits} TCTD`} tone="neutral" />
                  ) : null}
                </div>
                {section.category === "major" ? (
                  <p className="mt-3 text-xs leading-5 text-[var(--muted)]">
                    Theo dõi tổng CTĐT, chưa khóa hướng chuyên ngành.
                  </p>
                ) : null}
              </article>
            ))}
          </div>
        </PanelCard>
      ) : null}

      {program.courseGroups.map((group) => {
        const courses = program.courses.filter((course) => course.groupId === group.id);
        const visibleCourses = courses.filter((course) => {
          const query = normalizeSearchText(search);

          if (!query) {
            return true;
          }

          return (
            normalizeSearchText(course.code).includes(query) ||
            normalizeSearchText(course.title).includes(query) ||
            normalizeSearchText(course.notes ?? "").includes(query)
          );
        });

        const earnedCredits = courses
          .filter((course) => course.countsTowardProgress && (courseStatusMap.get(course.id) ?? getCourseStatus(course)) === "passed")
          .reduce((sum, course) => sum + course.credits, 0);
        const completionRate = group.requiredCredits
          ? (Math.min(earnedCredits, group.requiredCredits) / group.requiredCredits) * 100
          : 0;

        if (!visibleCourses.length) {
          return null;
        }

        return (
          <PanelCard key={group.id} className="space-y-4 sm:space-y-5">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--muted)]">
                  {courseCategoryLabels[group.category]}
                </p>
                <h3 className="mt-2 text-xl font-semibold text-[var(--foreground)] sm:text-2xl">{group.title}</h3>
                <p className="mt-2 max-w-2xl text-sm leading-7 text-[var(--muted)]">{group.description}</p>
              </div>
              <div className="min-w-0 space-y-2 lg:min-w-64">
                <div className="flex items-center justify-between gap-3 text-sm text-[var(--muted)]">
                  <span>Tiến độ nhóm</span>
                  <span>{earnedCredits}/{group.requiredCredits} TC</span>
                </div>
                <MeterBar value={completionRate} />
              </div>
            </div>

            <div className="overflow-hidden rounded-[1.15rem] border border-[var(--line)] bg-white/70 sm:rounded-[1.5rem]">
              <div className="hidden grid-cols-[8.75rem_minmax(13.75rem,1fr)_4.5rem_6rem_7.5rem] gap-3 border-b border-[var(--line)] px-4 py-3 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted)] md:grid">
                <span>Mã môn</span>
                <span>Học phần</span>
                <span>Tín chỉ</span>
                <span>Học kỳ</span>
                <span>Trạng thái</span>
              </div>
              <div className="divide-y divide-[var(--line)]">
                {visibleCourses.map((course) => {
                  const status = courseStatusMap.get(course.id) ?? getCourseStatus(course);

                  return (
                    <article
                      key={course.id}
                      className="grid grid-cols-[minmax(0,1fr)_auto] gap-2 px-2.5 py-2.5 text-[0.78rem] sm:gap-3 sm:px-4 sm:py-4 sm:text-sm md:grid-cols-[8.75rem_minmax(13.75rem,1fr)_4.5rem_6rem_7.5rem] md:items-center"
                    >
                      <div className="font-semibold text-[var(--foreground)]">{course.code}</div>
                      <div className="md:order-5 md:col-auto">
                        <StatusPill
                          label={curriculumLabel(status)}
                          tone={curriculumTone(status)}
                        />
                      </div>
                      <div className="col-span-2 min-w-0 md:col-span-1">
                        <p className="font-medium leading-5 text-[var(--foreground)] sm:leading-6">{course.title}</p>
                        <p className="mt-1 text-xs text-[var(--muted)] sm:text-sm">
                          {courseKindLabels[course.kind]}
                          {course.prerequisites.length
                            ? ` • Tiên quyết: ${course.prerequisites.length} môn`
                            : ""}
                        </p>
                        <div className="mt-2 flex flex-wrap gap-1.5 sm:gap-2">
                          <StatusPill
                            label={gpaPolicyLabel(course)}
                            tone={gpaPolicyTone(course)}
                          />
                          {course.gradingMode !== "numeric" ? (
                            <StatusPill label="Điểm hoặc Đạt/Không đạt" tone="neutral" />
                          ) : null}
                        </div>
                      </div>
                      <div className="text-xs text-[var(--foreground)] sm:text-sm">{course.credits} TC</div>
                      <div className="text-xs text-[var(--foreground)] sm:text-sm">HK {course.suggestedTerm}</div>
                    </article>
                  );
                })}
              </div>
            </div>
          </PanelCard>
        );
      })}
    </div>
  );
}
