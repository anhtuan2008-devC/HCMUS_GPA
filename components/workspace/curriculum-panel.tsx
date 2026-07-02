import { PanelCard, MeterBar, StatusPill } from "@/components/workspace/ui";
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
  return (
    <div className="space-y-4">
      <PanelCard className="space-y-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[var(--muted)]">
              Chương trình học
            </p>
            <h2 className="mt-3 font-[family-name:var(--font-display)] text-3xl text-[var(--foreground)]">
              Theo dõi từng nhóm học phần.
            </h2>
          </div>
          <label className="block w-full max-w-md">
            <span className="mb-2 block text-sm font-medium text-[var(--foreground)]">Tìm theo mã, tên, ghi chú</span>
            <input
              value={search}
              onChange={(event) => onSearchChange(event.target.value)}
              className="w-full rounded-2xl border border-[var(--line)] bg-white/80 px-4 py-3 outline-none transition focus:border-[var(--brand-primary)]"
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
            <h3 className="mt-2 text-2xl font-semibold text-[var(--foreground)]">
              {program.totalCredits} tín chỉ theo bảng CTĐT
            </h3>
            <p className="mt-2 max-w-3xl text-sm leading-7 text-[var(--muted)]">
              Các môn điều kiện như Ngoại ngữ, GDTC và GDQPAN vẫn được theo dõi, nhưng không cộng vào
              tổng tín chỉ tích lũy tốt nghiệp.
            </p>
          </div>
          <div className="grid gap-3 xl:grid-cols-4">
            {program.requirementSections.map((section) => (
              <article
                key={section.id}
                className="rounded-[1.5rem] border border-[var(--line)] bg-white/76 p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <h4 className="font-semibold leading-6 text-[var(--foreground)]">{section.title}</h4>
                  <span className="rounded-full bg-[var(--surface-tint)] px-3 py-1 text-sm font-bold text-[var(--brand-primary)] ring-1 ring-[var(--line)]">
                    {section.totalCredits} TC
                  </span>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
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
          .filter((course) => course.countsTowardProgress && getCourseStatus(course) === "passed")
          .reduce((sum, course) => sum + course.credits, 0);
        const completionRate = group.requiredCredits
          ? (Math.min(earnedCredits, group.requiredCredits) / group.requiredCredits) * 100
          : 0;

        if (!visibleCourses.length) {
          return null;
        }

        return (
          <PanelCard key={group.id} className="space-y-5">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--muted)]">
                  {courseCategoryLabels[group.category]}
                </p>
                <h3 className="mt-2 text-2xl font-semibold text-[var(--foreground)]">{group.title}</h3>
                <p className="mt-2 max-w-2xl text-sm leading-7 text-[var(--muted)]">{group.description}</p>
              </div>
              <div className="min-w-64 space-y-2">
                <div className="flex items-center justify-between gap-3 text-sm text-[var(--muted)]">
                  <span>Tiến độ nhóm</span>
                  <span>{earnedCredits}/{group.requiredCredits} TC</span>
                </div>
                <MeterBar value={completionRate} />
              </div>
            </div>

            <div className="overflow-hidden rounded-[1.5rem] border border-[var(--line)] bg-white/70">
              <div className="hidden grid-cols-[8.75rem_minmax(13.75rem,1fr)_4.5rem_6rem_7.5rem] gap-3 border-b border-[var(--line)] px-4 py-3 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted)] md:grid">
                <span>Mã môn</span>
                <span>Học phần</span>
                <span>Tín chỉ</span>
                <span>Học kỳ</span>
                <span>Trạng thái</span>
              </div>
              <div className="divide-y divide-[var(--line)]">
                {visibleCourses.map((course) => {
                  const status = getCourseStatus(course);

                  return (
                    <article
                      key={course.id}
                      className="grid gap-3 px-4 py-4 md:grid-cols-[8.75rem_minmax(13.75rem,1fr)_4.5rem_6rem_7.5rem] md:items-center"
                    >
                      <div className="font-semibold text-[var(--foreground)]">{course.code}</div>
                      <div>
                        <p className="font-medium text-[var(--foreground)]">{course.title}</p>
                        <p className="mt-1 text-sm text-[var(--muted)]">
                          {courseKindLabels[course.kind]}
                          {course.prerequisites.length
                            ? ` • Tiên quyết: ${course.prerequisites.length} môn`
                            : ""}
                        </p>
                        <div className="mt-2 flex flex-wrap gap-2">
                          <StatusPill
                            label={gpaPolicyLabel(course)}
                            tone={gpaPolicyTone(course)}
                          />
                          {course.gradingMode !== "numeric" ? (
                            <StatusPill label="Điểm hoặc Đạt/Không đạt" tone="neutral" />
                          ) : null}
                        </div>
                      </div>
                      <div className="text-sm text-[var(--foreground)]">{course.credits}</div>
                      <div className="text-sm text-[var(--foreground)]">HK {course.suggestedTerm}</div>
                      <div>
                        <StatusPill
                          label={curriculumLabel(status)}
                          tone={curriculumTone(status)}
                        />
                      </div>
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
