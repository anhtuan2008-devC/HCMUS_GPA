"use client";

import { useDeferredValue, useMemo, useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  CalendarCheck,
  CheckCircle2,
  Lock,
  Plus,
  Save,
  Search,
  Sparkles,
  Trash2,
} from "lucide-react";
import type {
  Course,
  GradeInputMode,
  ProgramCurriculum,
  ProgramTermTemplate,
  RecordStatus,
  StudentCourseRecord,
  StudentProfile,
  SuggestedPlan,
  TermPlan,
  TermPlanCourseItem,
} from "@/lib/types";
import { calculateGradePoint10To4, calculateGpa, clampScore, deriveRecordStatus } from "@/lib/grade";
import { normalizeSearchText } from "@/lib/text";
import { buildAcademicTermOptions, findTermNumberByLabel } from "@/lib/terms";
import { courseKindLabels } from "@/lib/ui-copy";
import { IconBadge, PanelCard, StatusPill } from "@/components/workspace/ui";

type ExpectedDraft = {
  score10: string;
  gradeInputMode: GradeInputMode;
  passFailStatus: Exclude<RecordStatus, "planned">;
};

function sumCredits(courses: Course[]) {
  return courses.reduce((sum, course) => sum + course.credits, 0);
}

function moveItem(items: string[], from: number, to: number) {
  const next = [...items];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}

export function PlannerPanel({
  profile,
  program,
  records,
  plans,
  termTemplates,
  suggestedPlan,
  plannerTerm,
  plannerFocus,
  selectedCourseIds,
  isSaving,
  onPlannerTermChange,
  onPlannerFocusChange,
  onSetCourseIds,
  onSave,
  onDeletePlan,
}: Readonly<{
  profile: StudentProfile;
  program: ProgramCurriculum;
  records: StudentCourseRecord[];
  plans: TermPlan[];
  termTemplates: ProgramTermTemplate[];
  suggestedPlan: SuggestedPlan;
  plannerTerm: string;
  plannerFocus: string;
  selectedCourseIds: string[];
  isSaving: boolean;
  onPlannerTermChange: (value: string) => void;
  onPlannerFocusChange: (value: string) => void;
  onSetCourseIds: (courseIds: string[]) => void;
  onSave: (courseItems: TermPlanCourseItem[]) => void;
  onDeletePlan: (planId: string) => void;
}>) {
  const [courseQuery, setCourseQuery] = useState("");
  const [expectedDrafts, setExpectedDrafts] = useState<Record<string, ExpectedDraft>>({});
  const deferredQuery = useDeferredValue(courseQuery);
  const courseMap = useMemo(() => new Map(program.courses.map((course) => [course.id, course])), [program.courses]);
  const termOptions = useMemo(() => buildAcademicTermOptions(profile.startYear), [profile.startYear]);
  const selectedTermNumber = findTermNumberByLabel(plannerTerm, profile.startYear);
  const template = termTemplates.find((item) => item.termNumber === selectedTermNumber);
  const savedPlan = plans.find((plan) => plan.termLabel === plannerTerm);
  const templateCourseIds = template?.courses.map((item) => item.courseId) ?? [];
  const selectedCourses = selectedCourseIds
    .map((courseId) => courseMap.get(courseId))
    .filter((course): course is Course => Boolean(course));
  const passedSet = new Set(records.filter((record) => record.status === "passed").map((record) => record.courseId));
  const normalizedQuery = normalizeSearchText(deferredQuery);
  const searchResults = normalizedQuery
    ? program.courses
        .filter((course) => !selectedCourseIds.includes(course.id))
        .filter((course) =>
          normalizeSearchText(`${course.code} ${course.title} ${course.notes ?? ""}`).includes(normalizedQuery),
        )
        .slice(0, 8)
    : [];

  function addCourse(courseId: string) {
    onSetCourseIds([...selectedCourseIds, courseId]);
    setCourseQuery("");
  }

  function removeCourse(courseId: string) {
    onSetCourseIds(selectedCourseIds.filter((item) => item !== courseId));
  }

  function replaceWithTemplate() {
    if (selectedCourseIds.length && !selectedCourseIds.every((courseId) => templateCourseIds.includes(courseId))) {
      const confirmed = window.confirm(
        "Áp dụng kế hoạch chuẩn sẽ thay danh sách môn hiện tại bằng template của CTĐT cho học kỳ này. Bạn muốn tiếp tục?",
      );

      if (!confirmed) {
        return;
      }
    }

    onSetCourseIds(templateCourseIds.length ? templateCourseIds : suggestedPlan.courses.map((course) => course.id));
  }

  function canUsePassFail(course: Course) {
    return course.gradingMode !== "numeric" && !course.countsTowardGpa;
  }

  function getSavedCourseItem(courseId: string) {
    return savedPlan?.courseItems.find((item) => item.courseId === courseId);
  }

  function getExpectedDraft(course: Course): ExpectedDraft {
    const savedItem = getSavedCourseItem(course.id);
    const defaultMode = canUsePassFail(course) ? "pass_fail" : "numeric";

    return (
      expectedDrafts[course.id] ?? {
        score10:
          savedItem?.expectedScore10 !== null && savedItem?.expectedScore10 !== undefined
            ? savedItem.expectedScore10.toFixed(3)
            : "",
        gradeInputMode: savedItem?.expectedGradeInputMode ?? defaultMode,
        passFailStatus: savedItem?.expectedPassFailStatus ?? "passed",
      }
    );
  }

  function updateExpectedDraft(courseId: string, patch: Partial<ExpectedDraft>) {
    const course = courseMap.get(courseId);

    if (!course) {
      return;
    }

    setExpectedDrafts((current) => ({
      ...current,
      [courseId]: {
        ...getExpectedDraft(course),
        ...patch,
      },
    }));
  }

  function buildCourseItemsForSave(): TermPlanCourseItem[] {
    const templateSet = new Set(templateCourseIds);

    return selectedCourseIds.map((courseId, index) => {
      const course = courseMap.get(courseId);
      const savedItem = getSavedCourseItem(courseId);
      const draft = course
        ? getExpectedDraft(course)
        : {
            score10: "",
            gradeInputMode: "numeric" as GradeInputMode,
            passFailStatus: "passed" as const,
          };
      const gradeInputMode = course && canUsePassFail(course) ? draft.gradeInputMode : "numeric";
      const expectedScore10 =
        gradeInputMode === "numeric" && draft.score10 !== "" && !Number.isNaN(Number(draft.score10))
          ? clampScore(Number(draft.score10))
          : null;

      return {
        courseId,
        displayOrder: index,
        source: savedItem?.source ?? (templateSet.has(courseId) ? "template" : "manual"),
        notes: savedItem?.notes ?? null,
        expectedScore10,
        expectedGradeInputMode: gradeInputMode,
        expectedPassFailStatus: gradeInputMode === "pass_fail" ? draft.passFailStatus : null,
      };
    });
  }

  const expectedRecords: StudentCourseRecord[] = selectedCourses.flatMap<StudentCourseRecord>((course) => {
    const draft = getExpectedDraft(course);
    const gradeInputMode = canUsePassFail(course) ? draft.gradeInputMode : "numeric";

    if (gradeInputMode === "pass_fail") {
      const record: StudentCourseRecord = {
          courseId: course.id,
          score10: null,
          score4: null,
          status: draft.passFailStatus,
          termLabel: plannerTerm,
          semester: 1,
          academicYearStart: profile.startYear,
          academicYearLabel: `${profile.startYear}-${profile.startYear + 1}`,
          gradeInputMode,
          notes: null,
          updatedAt: new Date(0).toISOString(),
      };

      return [record];
    }

    if (draft.score10 === "" || Number.isNaN(Number(draft.score10))) {
      return [];
    }

    const score10 = clampScore(Number(draft.score10));

    const record: StudentCourseRecord = {
        courseId: course.id,
        score10,
        score4: calculateGradePoint10To4(score10),
        status: deriveRecordStatus(score10),
        termLabel: plannerTerm,
        semester: 1,
        academicYearStart: profile.startYear,
        academicYearLabel: `${profile.startYear}-${profile.startYear + 1}`,
        gradeInputMode,
        notes: null,
        updatedAt: new Date(0).toISOString(),
    };

    return [record];
  });
  const expectedCourseIds = new Set(expectedRecords.map((record) => record.courseId));
  const termProjection = calculateGpa(expectedRecords, program.courses);
  const cpaProjection = calculateGpa(
    [
      ...records.filter((record) => !expectedCourseIds.has(record.courseId)),
      ...expectedRecords,
    ],
    program.courses,
  );
  const expectedProgressCredits = selectedCourses
    .filter((course) =>
      expectedRecords.some((record) => record.courseId === course.id && record.status === "passed" && course.countsTowardProgress),
    )
    .reduce((sum, course) => sum + course.credits, 0);

  return (
    <div className="space-y-5">
      <PanelCard className="space-y-6">
        <div className="flex items-start gap-3">
          <IconBadge tone="brand">
            <CalendarCheck className="h-5 w-5" />
          </IconBadge>
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[var(--muted)]">
              Kế hoạch dùng thật
            </p>
            <h2 className="mt-3 font-[family-name:var(--font-display)] text-3xl text-[var(--foreground)]">
              Bắt đầu từ kế hoạch chuẩn, rồi chỉnh theo nhịp của bạn.
            </h2>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-[var(--muted)]">
              Kế hoạch chuẩn lấy từ chương trình đào tạo đã seed. Bạn có thể áp dụng làm điểm xuất phát,
              rồi thêm, xóa, đổi thứ tự môn và nhập điểm giả sử để nhìn trước tác động đến GPA.
            </p>
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-[0.8fr_1fr]">
          <label className="block">
            <span className="mb-2 block text-sm font-medium text-[var(--foreground)]">Học kỳ mục tiêu</span>
            <select
              value={plannerTerm}
              onChange={(event) => {
                onPlannerTermChange(event.target.value);
                const plan = plans.find((item) => item.termLabel === event.target.value);
                const termNumber = findTermNumberByLabel(event.target.value, profile.startYear);
                const termTemplate = termTemplates.find((item) => item.termNumber === termNumber);
                onSetCourseIds(plan?.courseIds ?? termTemplate?.courses.map((item) => item.courseId) ?? []);
              }}
              className="w-full rounded-2xl border border-[var(--line)] bg-white/85 px-4 py-3 outline-none transition focus:border-[var(--brand-primary)] focus:ring-4 focus:ring-[var(--focus-ring)]"
            >
              {[plannerTerm, ...termOptions.map((term) => term.label), ...plans.map((plan) => plan.termLabel)]
                .filter((value, index, values) => value && values.indexOf(value) === index)
                .map((label) => (
                  <option key={label} value={label}>
                    {label}
                  </option>
                ))}
            </select>
          </label>

          <label className="block">
            <span className="mb-2 block text-sm font-medium text-[var(--foreground)]">Trọng tâm học kỳ</span>
            <input
              value={plannerFocus}
              onChange={(event) => onPlannerFocusChange(event.target.value)}
              className="w-full rounded-2xl border border-[var(--line)] bg-white/85 px-4 py-3 outline-none transition focus:border-[var(--brand-primary)] focus:ring-4 focus:ring-[var(--focus-ring)]"
              placeholder="VD: ưu tiên môn cốt lõi và giữ nhịp học đều"
            />
          </label>
        </div>

        <div className="grid gap-3 rounded-[1.5rem] border border-[var(--line)] bg-[var(--surface-tint)] px-4 py-4 sm:grid-cols-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">Template</p>
            <p className="mt-2 text-2xl font-bold text-[var(--foreground)]">{templateCourseIds.length}</p>
            <p className="text-sm text-[var(--muted)]">môn gợi ý</p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">Đã chọn</p>
            <p className="mt-2 text-2xl font-bold text-[var(--foreground)]">{selectedCourseIds.length}</p>
            <p className="text-sm text-[var(--muted)]">học phần</p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">Tín chỉ</p>
            <p className="mt-2 text-2xl font-bold text-[var(--foreground)]">{sumCredits(selectedCourses)}</p>
            <p className="text-sm text-[var(--muted)]">dự kiến</p>
          </div>
          <div className="flex items-end">
            <button
              type="button"
              onClick={replaceWithTemplate}
              className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-[var(--line)] bg-white px-4 py-3 text-sm font-semibold text-[var(--brand-primary)] transition hover:bg-white/80"
            >
              <Sparkles className="h-4 w-4" />
              Áp dụng kế hoạch chuẩn
            </button>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-4">
          <article className="rounded-[1.5rem] border border-[var(--line)] bg-white/82 px-4 py-4">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">GPA kỳ dự kiến</p>
            <p className="mt-2 text-2xl font-bold text-[var(--foreground)]">{termProjection.gpa10.toFixed(3)}</p>
            <p className="text-sm text-[var(--muted)]">{termProjection.gpa4.toFixed(2)} hệ 4</p>
          </article>
          <article className="rounded-[1.5rem] border border-[var(--line)] bg-white/82 px-4 py-4">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">CPA sau kỳ này</p>
            <p className="mt-2 text-2xl font-bold text-[var(--foreground)]">{cpaProjection.gpa10.toFixed(3)}</p>
            <p className="text-sm text-[var(--muted)]">{cpaProjection.gpa4.toFixed(2)} hệ 4</p>
          </article>
          <article className="rounded-[1.5rem] border border-[var(--line)] bg-white/82 px-4 py-4">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">Tín chỉ GPA</p>
            <p className="mt-2 text-2xl font-bold text-[var(--foreground)]">{termProjection.attemptedCredits}</p>
            <p className="text-sm text-[var(--muted)]">từ điểm giả sử</p>
          </article>
          <article className="rounded-[1.5rem] border border-[var(--line)] bg-white/82 px-4 py-4">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">Tín chỉ hoàn thành</p>
            <p className="mt-2 text-2xl font-bold text-[var(--foreground)]">{expectedProgressCredits}</p>
            <p className="text-sm text-[var(--muted)]">nếu đạt như dự kiến</p>
          </article>
        </div>
      </PanelCard>

      <div className="grid gap-5 xl:grid-cols-[1.1fr_minmax(20rem,0.9fr)]">
        <PanelCard className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h3 className="text-xl font-semibold text-[var(--foreground)]">Danh sách môn trong kế hoạch</h3>
            <button
              type="button"
              onClick={() => onSave(buildCourseItemsForSave())}
              disabled={isSaving}
              className="inline-flex min-h-[max(2.75rem,42px)] min-w-[max(10rem,128px)] items-center justify-center gap-2 rounded-full bg-[var(--brand-primary)] px-5 py-3 text-sm font-semibold text-white shadow-[0_14px_34px_rgba(0,63,136,0.24)] transition hover:bg-[var(--brand-primary-strong)] disabled:opacity-70"
            >
              {isSaving ? "Đang lưu kế hoạch..." : "Lưu kế hoạch học kỳ"}
              {!isSaving ? <Save className="h-4 w-4" /> : null}
            </button>
          </div>

          <div className="relative">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted)]" />
            <input
              value={courseQuery}
              onChange={(event) => setCourseQuery(event.target.value)}
              className="w-full rounded-2xl border border-[var(--line)] bg-white/85 py-3 pl-11 pr-4 outline-none transition focus:border-[var(--brand-primary)] focus:ring-4 focus:ring-[var(--focus-ring)]"
              placeholder="Tìm để thêm môn vào kế hoạch"
            />
            {searchResults.length ? (
              <div className="absolute z-20 mt-2 max-h-72 w-full overflow-y-auto rounded-2xl border border-[var(--line)] bg-white p-2 shadow-[0_18px_48px_rgba(0,25,54,0.16)]">
                {searchResults.map((course) => (
                  <button
                    key={course.id}
                    type="button"
                    onClick={() => addCourse(course.id)}
                    className="flex w-full items-start gap-3 rounded-xl px-3 py-3 text-left transition hover:bg-[var(--surface-tint)]"
                  >
                    <Plus className="mt-1 h-4 w-4 text-[var(--brand-primary)]" />
                    <span>
                      <span className="block font-semibold text-[var(--foreground)]">
                        {course.code} - {course.title}
                      </span>
                      <span className="text-sm text-[var(--muted)]">{course.credits} tín chỉ</span>
                    </span>
                  </button>
                ))}
              </div>
            ) : null}
          </div>

          <div className="space-y-3">
            {selectedCourses.length ? (
              selectedCourses.map((course, index) => {
                const isTemplateCourse = templateCourseIds.includes(course.id);
                const blocked = course.prerequisites.some((prerequisite) => !passedSet.has(prerequisite));
                const draft = getExpectedDraft(course);
                const usePassFail = canUsePassFail(course);

                return (
                  <article
                    key={`${course.id}-${index}`}
                    className={`hover-lift rounded-[1.5rem] border px-4 py-4 ${
                      blocked ? "border-amber-200 bg-amber-50" : "border-[var(--line)] bg-white/82"
                    }`}
                  >
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                      <div>
                        <p className="text-xs font-semibold text-[var(--muted)]">{course.code}</p>
                        <p className="mt-2 font-semibold leading-6 text-[var(--foreground)]">{course.title}</p>
                        <div className="mt-3 flex flex-wrap gap-2">
                          <StatusPill label={`${course.credits} tín chỉ`} tone="neutral" />
                          <StatusPill label={courseKindLabels[course.kind]} tone={course.kind === "required" ? "success" : "warning"} />
                          <StatusPill
                            label={course.countsTowardGpa ? "Tính GPA" : "Không tính GPA"}
                            tone={course.countsTowardGpa ? "success" : "warning"}
                          />
                          {isTemplateCourse ? <StatusPill label="Từ kế hoạch chuẩn" tone="success" /> : null}
                          {blocked ? <StatusPill label="Cần rà tiên quyết" tone="warning" /> : null}
                        </div>
                        <div className="mt-4 grid gap-3 sm:grid-cols-[9.375rem_10rem]">
                          {usePassFail ? (
                            <select
                              value={draft.gradeInputMode}
                              onChange={(event) =>
                                updateExpectedDraft(course.id, { gradeInputMode: event.target.value as GradeInputMode })
                              }
                              className="rounded-2xl border border-[var(--line)] bg-white px-4 py-2.5 text-sm outline-none transition focus:border-[var(--brand-primary)] focus:ring-4 focus:ring-[var(--focus-ring)]"
                            >
                              <option value="numeric">Giả sử điểm</option>
                              <option value="pass_fail">Đạt/Không đạt</option>
                            </select>
                          ) : (
                            <div className="rounded-2xl border border-[var(--line)] bg-white px-4 py-2.5 text-sm font-semibold text-[var(--muted)]">
                              Giả sử điểm
                            </div>
                          )}
                          {draft.gradeInputMode === "pass_fail" && usePassFail ? (
                            <select
                              value={draft.passFailStatus}
                              onChange={(event) =>
                                updateExpectedDraft(course.id, {
                                  passFailStatus: event.target.value as Exclude<RecordStatus, "planned">,
                                })
                              }
                              className="rounded-2xl border border-[var(--line)] bg-white px-4 py-2.5 text-sm outline-none transition focus:border-[var(--brand-primary)] focus:ring-4 focus:ring-[var(--focus-ring)]"
                            >
                              <option value="passed">Đạt</option>
                              <option value="failed">Không đạt</option>
                            </select>
                          ) : (
                            <input
                              type="number"
                              min={0}
                              max={10}
                              step={0.001}
                              value={draft.score10}
                              onChange={(event) => updateExpectedDraft(course.id, { score10: event.target.value })}
                              className="rounded-2xl border border-[var(--line)] bg-white px-4 py-2.5 text-sm outline-none transition focus:border-[var(--brand-primary)] focus:ring-4 focus:ring-[var(--focus-ring)]"
                              placeholder="VD: 8.000"
                            />
                          )}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => onSetCourseIds(moveItem(selectedCourseIds, index, index - 1))}
                          disabled={index === 0}
                          className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[var(--line)] bg-white text-[var(--muted)] transition hover:text-[var(--brand-primary)] disabled:opacity-40"
                          aria-label="Đưa môn lên"
                        >
                          <ArrowUp className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => onSetCourseIds(moveItem(selectedCourseIds, index, index + 1))}
                          disabled={index === selectedCourseIds.length - 1}
                          className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[var(--line)] bg-white text-[var(--muted)] transition hover:text-[var(--brand-primary)] disabled:opacity-40"
                          aria-label="Đưa môn xuống"
                        >
                          <ArrowDown className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => removeCourse(course.id)}
                          className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-rose-200 bg-rose-50 text-rose-700 transition hover:bg-rose-100"
                          aria-label="Xóa môn khỏi kế hoạch"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </article>
                );
              })
            ) : (
              <div className="rounded-[1.5rem] border border-dashed border-[var(--line)] bg-white/60 px-4 py-10 text-center text-sm leading-7 text-[var(--muted)]">
                Hãy tạo từ kế hoạch chuẩn hoặc tìm thêm môn để bắt đầu lập kế hoạch học kỳ này.
              </div>
            )}
          </div>
        </PanelCard>

        <div className="space-y-5">
          <PanelCard className="space-y-4">
            <div className="flex items-center gap-3">
              <IconBadge tone="orange">
                <Lock className="h-5 w-5" />
              </IconBadge>
              <div>
                <h3 className="text-xl font-semibold text-[var(--foreground)]">Môn nên để sau</h3>
                <p className="text-sm text-[var(--muted)]">Các môn còn vướng điều kiện tiên quyết.</p>
              </div>
            </div>
            <div className="space-y-3">
              {suggestedPlan.blockedCourses.length ? (
                suggestedPlan.blockedCourses.map((course) => (
                  <article key={course.id} className="rounded-[1.5rem] border border-amber-200 bg-amber-50 px-4 py-4">
                    <p className="font-semibold text-amber-950">{course.code} - {course.title}</p>
                    <p className="mt-1 text-sm text-amber-900">
                      Chưa đủ điều kiện tiên quyết ({course.prerequisites.length} môn).
                    </p>
                  </article>
                ))
              ) : (
                <div className="rounded-[1.5rem] border border-dashed border-[var(--line)] bg-white/60 px-4 py-6 text-sm leading-7 text-[var(--muted)]">
                  Hiện không có môn nào bị chặn bởi điều kiện tiên quyết.
                </div>
              )}
            </div>
          </PanelCard>

          <PanelCard className="space-y-4">
            <h3 className="text-xl font-semibold text-[var(--foreground)]">Kế hoạch đã lưu</h3>
            <div className="space-y-3">
              {plans.length ? (
                plans.map((plan) => (
                  <article key={plan.id} className="hover-lift rounded-[1.5rem] border border-[var(--line)] bg-white/82 px-4 py-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold text-[var(--foreground)]">{plan.termLabel}</p>
                        <p className="mt-2 text-sm leading-6 text-[var(--muted)]">{plan.focus}</p>
                      </div>
                      <StatusPill label={`${plan.courseIds.length} môn`} tone="neutral" />
                    </div>
                    <div className="mt-3 flex gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          onPlannerTermChange(plan.termLabel);
                          onPlannerFocusChange(plan.focus);
                          onSetCourseIds(plan.courseIds);
                        }}
                        className="inline-flex items-center gap-2 rounded-full border border-[var(--line)] bg-white px-3 py-2 text-xs font-semibold text-[var(--brand-primary)] transition hover:bg-[var(--surface-tint)]"
                      >
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        Mở lại
                      </button>
                      <button
                        type="button"
                        onClick={() => onDeletePlan(plan.id)}
                        className="inline-flex items-center gap-2 rounded-full border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700 transition hover:bg-rose-100"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        Xóa
                      </button>
                    </div>
                  </article>
                ))
              ) : (
                <div className="rounded-[1.5rem] border border-dashed border-[var(--line)] bg-white/60 px-4 py-6 text-sm leading-7 text-[var(--muted)]">
                  Chưa có kế hoạch nào được lưu. Khi lưu, bạn có thể mở lại và chỉnh tiếp bất cứ lúc nào.
                </div>
              )}
            </div>
          </PanelCard>
        </div>
      </div>
    </div>
  );
}
