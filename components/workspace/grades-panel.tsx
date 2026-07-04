"use client";

import { useDeferredValue, useMemo, useRef, useState } from "react";
import type { KeyboardEvent as ReactKeyboardEvent, PointerEvent as ReactPointerEvent } from "react";
import { Check, History, Pencil, Plus, RotateCcw, Save, Search, Trash2 } from "lucide-react";
import type {
  AttemptType,
  Course,
  GradesPageKey,
  GradeInputMode,
  ProgramCurriculum,
  ProgramTermTemplate,
  RecordStatus,
  StudentCourseAttempt,
  StudentCourseRecord,
  StudentProfile,
  TermPlan,
} from "@/lib/types";
import { calculateGradePoint10To4, clampScore, deriveRecordStatus } from "@/lib/grade";
import { normalizeSearchText } from "@/lib/text";
import {
  buildAcademicTermOptions,
  findTermNumberByLabel,
  formatTermLabel,
  parseAcademicTermLabel,
} from "@/lib/terms";
import { recordStatusLabels } from "@/lib/ui-copy";
import { IconBadge, PanelCard, StatusPill } from "@/components/workspace/ui";

type AttemptDraft = {
  score10: string;
  notes: string;
  gradeInputMode: GradeInputMode;
  passFailStatus: "passed" | "failed";
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

type SwipeStart = {
  pointerId: number;
  x: number;
  y: number;
};

const GRADES_SWIPE_MIN_DISTANCE = 70;
const GRADES_SWIPE_MAX_VERTICAL_DISTANCE = 45;

const attemptTypeLabels: Record<AttemptType, string> = {
  first: "Lần đầu",
  retake: "Học lại",
  improvement: "Cải thiện",
};

function statusTone(status: RecordStatus) {
  switch (status) {
    case "passed":
      return "success" as const;
    case "failed":
      return "danger" as const;
    default:
      return "warning" as const;
  }
}
function groupAttemptsByTerm(attempts: StudentCourseAttempt[]) {
  const grouped = new Map<string, StudentCourseAttempt[]>();

  for (const attempt of attempts) {
    const termAttempts = grouped.get(attempt.termLabel) ?? [];
    termAttempts.push(attempt);
    grouped.set(attempt.termLabel, termAttempts);
  }

  return [...grouped.entries()].sort(([, leftAttempts], [, rightAttempts]) => {
    const left = leftAttempts[0];
    const right = rightAttempts[0];

    if (left.academicYearStart !== right.academicYearStart) {
      return right.academicYearStart - left.academicYearStart;
    }

    return right.semester - left.semester;
  });
}

function canUsePassFail(course: Course) {
  return course.gradingMode !== "numeric" && !course.countsTowardGpa;
}

function formatAttemptScore(attempt: StudentCourseAttempt) {
  if (attempt.gradeInputMode === "pass_fail" || attempt.score10 === null || attempt.score4 === null) {
    return `Hình thức: ${recordStatusLabels[attempt.status]}`;
  }

  return `Điểm 10: ${attempt.score10.toFixed(3)} · Điểm 4: ${attempt.score4.toFixed(2)}`;
}

function isInteractiveSwipeTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) {
    return false;
  }

  return Boolean(
    target.closest(
      "a, button, input, select, textarea, [contenteditable='true'], [role='button'], [role='link'], [role='textbox']",
    ),
  );
}
export function GradesPanel({
  profile,
  program,
  attempts,
  plans,
  termTemplates,
  currentTermLabel,
  isSaving,
  activePage,
  onPageChange,
  onCreateAttempt,
  onUpdateAttempt,
  onDeleteAttempt,
}: Readonly<{
  profile: StudentProfile;
  program: ProgramCurriculum;
  records: StudentCourseRecord[];
  attempts: StudentCourseAttempt[];
  plans: TermPlan[];
  termTemplates: ProgramTermTemplate[];
  currentTermLabel: string;
  isSaving: boolean;
  activePage: GradesPageKey;
  onPageChange: (page: GradesPageKey) => void;
  onCreateAttempt: (input: AttemptInput) => void;
  onUpdateAttempt: (input: AttemptUpdateInput) => void;
  onDeleteAttempt: (attemptId: string) => void;
}>) {
  const parsedCurrentTerm = parseAcademicTermLabel(currentTermLabel, profile.startYear);
  const termOptions = useMemo(() => buildAcademicTermOptions(profile.startYear), [profile.startYear]);
  const [selectedSemester, setSelectedSemester] = useState(parsedCurrentTerm.semester);
  const [selectedAcademicYearStart, setSelectedAcademicYearStart] = useState(
    parsedCurrentTerm.academicYearStart,
  );
  const [hiddenCourseIds, setHiddenCourseIds] = useState<string[]>([]);
  const [manualCourseIds, setManualCourseIds] = useState<string[]>([]);
  const [drafts, setDrafts] = useState<Record<string, AttemptDraft>>({});
  const [courseQuery, setCourseQuery] = useState("");
  const swipeStartRef = useRef<SwipeStart | null>(null);
  const deferredQuery = useDeferredValue(courseQuery);
  const selectedTermLabel = formatTermLabel(selectedSemester, selectedAcademicYearStart);
  const courseMap = useMemo(() => new Map(program.courses.map((course) => [course.id, course])), [program.courses]);
  const selectedTermNumber = findTermNumberByLabel(selectedTermLabel, profile.startYear);
  const selectedTemplate = termTemplates.find((template) => template.termNumber === selectedTermNumber);
  const selectedPlan = plans.find(
    (plan) =>
      (plan.semester === selectedSemester && plan.academicYearStart === selectedAcademicYearStart) ||
      plan.termLabel === selectedTermLabel,
  );
  const attemptsInTerm = attempts.filter(
    (attempt) =>
      attempt.semester === selectedSemester &&
      attempt.academicYearStart === selectedAcademicYearStart,
  );
  const academicYearOptions = [
    ...new Set([
      ...termOptions.map((term) => term.academicYearStart),
      ...plans.map((plan) => plan.academicYearStart),
      ...attempts.map((attempt) => attempt.academicYearStart),
      selectedAcademicYearStart,
    ]),
  ].sort((left, right) => left - right);

  const visibleCourseIds = useMemo(() => {
    const ids = new Set<string>();

    for (const item of selectedTemplate?.courses ?? []) {
      ids.add(item.courseId);
    }

    for (const courseId of selectedPlan?.courseIds ?? []) {
      ids.add(courseId);
    }

    for (const attempt of attemptsInTerm) {
      ids.add(attempt.courseId);
    }

    for (const courseId of manualCourseIds) {
      ids.add(courseId);
    }

    for (const courseId of hiddenCourseIds) {
      ids.delete(courseId);
    }

    return [...ids];
  }, [attemptsInTerm, hiddenCourseIds, manualCourseIds, selectedPlan, selectedTemplate]);

  const visibleCourses = visibleCourseIds
    .map((courseId) => courseMap.get(courseId))
    .filter((course): course is Course => Boolean(course));
  const normalizedQuery = normalizeSearchText(deferredQuery);
  const searchResults = normalizedQuery
    ? program.courses
        .filter((course) => !visibleCourseIds.includes(course.id))
        .filter((course) =>
          normalizeSearchText(`${course.code} ${course.title} ${course.notes ?? ""}`).includes(normalizedQuery),
        )
        .slice(0, 8)
    : [];

  function resetTermDrafts() {
    setHiddenCourseIds([]);
    setManualCourseIds([]);
    setDrafts({});
  }

  function getLatestAttemptInTerm(courseId: string) {
    return attemptsInTerm
      .filter((attempt) => attempt.courseId === courseId)
      .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))[0];
  }

  function getDraft(course: Course): AttemptDraft {
    const attempt = getLatestAttemptInTerm(course.id);
    const defaultMode = canUsePassFail(course) ? "pass_fail" : "numeric";

    return (
      drafts[course.id] ?? {
        score10: attempt?.score10 !== null && attempt?.score10 !== undefined ? attempt.score10.toFixed(3) : "",
        notes: attempt?.notes ?? "",
        gradeInputMode: attempt?.gradeInputMode ?? defaultMode,
        passFailStatus: attempt?.status === "failed" ? "failed" : "passed",
      }
    );
  }

  function updateDraft(courseId: string, patch: Partial<AttemptDraft>) {
    const course = courseMap.get(courseId);

    if (!course) {
      return;
    }

    setDrafts((current) => ({
      ...current,
      [courseId]: {
        ...getDraft(course),
        ...patch,
      },
    }));
  }

  function buildAttemptInput(course: Course): AttemptInput | null {
    const draft = getDraft(course);
    const gradeInputMode = canUsePassFail(course) ? draft.gradeInputMode : "numeric";
    const base = {
      courseId: course.id,
      semester: selectedSemester,
      academicYearStart: selectedAcademicYearStart,
      gradeInputMode,
      notes: draft.notes.trim() || null,
    };

    if (gradeInputMode === "pass_fail") {
      return {
        ...base,
        passFailStatus: draft.passFailStatus,
      };
    }

    const score10 = clampScore(Number(draft.score10));

    if (Number.isNaN(score10)) {
      return null;
    }

    return {
      ...base,
      score10,
    };
  }

  function handleSaveCourse(course: Course) {
    const input = buildAttemptInput(course);

    if (!input) {
      return;
    }

    const savedAttempt = getLatestAttemptInTerm(course.id);

    if (savedAttempt) {
      onUpdateAttempt({
        attemptId: savedAttempt.id,
        semester: input.semester,
        academicYearStart: input.academicYearStart,
        gradeInputMode: input.gradeInputMode,
        score10: input.score10,
        passFailStatus: input.passFailStatus,
        notes: input.notes,
      });
    } else {
      onCreateAttempt(input);
    }

    setDrafts((current) => {
      const next = { ...current };
      delete next[course.id];
      return next;
    });
  }

  function addCourse(courseId: string) {
    setManualCourseIds((current) => (current.includes(courseId) ? current : [...current, courseId]));
    setHiddenCourseIds((current) => current.filter((item) => item !== courseId));
    setCourseQuery("");
  }

  function removeCourse(course: Course) {
    const savedAttempt = getLatestAttemptInTerm(course.id);

    if (savedAttempt) {
      onDeleteAttempt(savedAttempt.id);
      return;
    }

    setHiddenCourseIds((current) => (current.includes(course.id) ? current : [...current, course.id]));
    setManualCourseIds((current) => current.filter((item) => item !== course.id));
  }

  function changeGradesPage(nextPage: GradesPageKey) {
    if (activePage === nextPage) {
      return;
    }

    onPageChange(nextPage);
  }

  function handlePagerPointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    if (event.button !== 0 || isInteractiveSwipeTarget(event.target)) {
      swipeStartRef.current = null;
      return;
    }

    swipeStartRef.current = {
      pointerId: event.pointerId,
      x: event.clientX,
      y: event.clientY,
    };
  }

  function handlePagerPointerUp(event: ReactPointerEvent<HTMLDivElement>) {
    const start = swipeStartRef.current;
    swipeStartRef.current = null;

    if (!start || start.pointerId !== event.pointerId || isInteractiveSwipeTarget(event.target)) {
      return;
    }

    const distanceX = event.clientX - start.x;
    const distanceY = event.clientY - start.y;

    if (
      Math.abs(distanceX) < GRADES_SWIPE_MIN_DISTANCE ||
      Math.abs(distanceY) > GRADES_SWIPE_MAX_VERTICAL_DISTANCE
    ) {
      return;
    }

    changeGradesPage(distanceX < 0 ? "history" : "entry");
  }

  function handlePagerPointerCancel() {
    swipeStartRef.current = null;
  }

  function handlePagerKeyDown(event: ReactKeyboardEvent<HTMLDivElement>) {
    if (isInteractiveSwipeTarget(event.target)) {
      return;
    }

    if (event.key === "ArrowLeft") {
      event.preventDefault();
      changeGradesPage("history");
    }

    if (event.key === "ArrowRight") {
      event.preventDefault();
      changeGradesPage("entry");
    }
  }

  const entryPage = (
    <PanelCard className="space-y-4 sm:space-y-6">
        <div className="flex items-start gap-3">
          <IconBadge tone="brand">
            <Save className="h-5 w-5" />
          </IconBadge>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted)] sm:text-sm sm:tracking-[0.2em]">
              Nhập theo học kỳ
            </p>
            <h2 className="mt-2 font-[family-name:var(--font-display)] text-2xl text-[var(--foreground)] sm:mt-3 sm:text-3xl">
              Chọn kỳ, điền điểm, giữ lại cả hành trình.
            </h2>
            <p className="mt-3 text-sm leading-7 text-[var(--muted)]">
              Học lại và cải thiện sẽ được hệ thống tự nhận diện theo thứ tự năm học. Bạn chỉ cần nhập kết quả thật.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-[0.45fr_0.55fr_1.2fr]">
          <label className="block">
            <span className="mb-2 block text-sm font-medium text-[var(--foreground)]">Học kỳ</span>
            <select
              value={selectedSemester}
              onChange={(event) => {
                setSelectedSemester(Number(event.target.value));
                resetTermDrafts();
              }}
              className="w-full rounded-xl border border-[var(--line)] bg-white/85 px-3 py-2.5 outline-none transition focus:border-[var(--brand-primary)] focus:ring-4 focus:ring-[var(--focus-ring)] sm:rounded-2xl sm:px-4 sm:py-3"
            >
              {[1, 2, 3].map((semester) => (
                <option key={semester} value={semester}>
                  HK{semester}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="mb-2 block text-sm font-medium text-[var(--foreground)]">Năm học</span>
            <select
              value={selectedAcademicYearStart}
              onChange={(event) => {
                setSelectedAcademicYearStart(Number(event.target.value));
                resetTermDrafts();
              }}
              className="w-full rounded-xl border border-[var(--line)] bg-white/85 px-3 py-2.5 outline-none transition focus:border-[var(--brand-primary)] focus:ring-4 focus:ring-[var(--focus-ring)] sm:rounded-2xl sm:px-4 sm:py-3"
            >
              {academicYearOptions.map((year) => (
                <option key={year} value={year}>
                  {year}-{year + 1}
                </option>
              ))}
            </select>
          </label>

          <div className="relative col-span-2 xl:col-span-1">
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-[var(--foreground)]">
                Thêm học phần vào kỳ này
              </span>
              <span className="relative block">
                <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted)]" />
                <input
                  value={courseQuery}
                  onChange={(event) => setCourseQuery(event.target.value)}
                  className="w-full rounded-xl border border-[var(--line)] bg-white/85 py-2.5 pl-10 pr-3 outline-none transition focus:border-[var(--brand-primary)] focus:ring-4 focus:ring-[var(--focus-ring)] sm:rounded-2xl sm:py-3 sm:pl-11 sm:pr-4"
                  placeholder="Gõ mã môn hoặc tên môn, ví dụ: cơ sở dữ liệu"
                />
              </span>
            </label>
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
        </div>

        <p className="rounded-xl bg-[var(--surface-tint)] px-3 py-2.5 text-sm font-semibold text-[var(--brand-primary)] sm:rounded-2xl sm:px-4 sm:py-3">
          Đang nhập cho {selectedTermLabel}
        </p>

        <div className="space-y-3">
          {visibleCourses.length ? (
            <>
              <div className="hidden rounded-2xl bg-[var(--surface-tint)] px-4 py-3 text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-[var(--muted)] xl:grid xl:grid-cols-[minmax(15rem,1.25fr)_9.5rem_9rem_minmax(11rem,0.9fr)_18.5rem] xl:gap-3">
                <span>Học phần</span>
                <span>Hình thức</span>
                <span>Kết quả</span>
                <span>Ghi chú</span>
                <span>Thao tác</span>
              </div>
              {visibleCourses.map((course) => {
                const draft = getDraft(course);
                const usePassFail = canUsePassFail(course);
                const gradeInputMode = usePassFail ? draft.gradeInputMode : "numeric";
                const score10 = draft.score10 === "" ? null : clampScore(Number(draft.score10));
                const hasNumericScore = score10 !== null && !Number.isNaN(score10);
                const score4 = hasNumericScore ? calculateGradePoint10To4(score10) : null;
                const status = gradeInputMode === "pass_fail"
                  ? draft.passFailStatus
                  : hasNumericScore
                    ? deriveRecordStatus(score10)
                    : "planned";
                const savedAttempt = getLatestAttemptInTerm(course.id);
                const canSave = gradeInputMode === "pass_fail" || draft.score10 !== "";
                const courseLabel = `${course.code} - ${course.title}`;

                return (
                  <article
                    key={course.id}
                    className="motion-card rounded-[1rem] border border-[var(--line)] bg-white/82 px-2.5 py-2.5 text-[0.78rem] sm:rounded-[1.5rem] sm:px-4 sm:py-4 sm:text-sm"
                  >
                    <div className="grid grid-cols-2 gap-3 xl:grid-cols-[minmax(15rem,1.25fr)_9.5rem_9rem_minmax(11rem,0.9fr)_18.5rem] xl:items-start xl:gap-3">
                      <div className="col-span-2 min-w-0 xl:col-span-1">
                        <p className="text-xs font-semibold text-[var(--muted)]">{course.code}</p>
                        <h3
                          title={courseLabel}
                          className="mt-1 truncate font-semibold leading-5 text-[var(--foreground)] sm:leading-6"
                        >
                          {course.title}
                        </h3>
                        <div className="mt-2 flex min-w-0 flex-wrap gap-1.5 sm:mt-3 sm:gap-2">
                          <StatusPill label={`${course.credits} tín chỉ`} tone="neutral" />
                          <StatusPill
                            label={course.countsTowardGpa ? "Tính GPA" : "Không tính GPA"}
                            tone={course.countsTowardGpa ? "success" : "warning"}
                          />
                          {usePassFail ? <StatusPill label="Điểm hoặc Đạt/Không đạt" tone="neutral" /> : null}
                          {savedAttempt ? (
                            <StatusPill label={attemptTypeLabels[savedAttempt.attemptType]} tone="warning" />
                          ) : null}
                          {savedAttempt?.isEffective ? <StatusPill label="Hiện hành" tone="success" /> : null}
                        </div>
                      </div>

                      <label className="min-w-0 space-y-1">
                          <span className="block text-[0.62rem] font-semibold uppercase tracking-[0.12em] text-[var(--muted)] sm:text-xs xl:hidden">
                          Hình thức
                        </span>
                        {usePassFail ? (
                          <select
                            value={gradeInputMode}
                            onChange={(event) =>
                              updateDraft(course.id, { gradeInputMode: event.target.value as GradeInputMode })
                            }
                            className="w-full min-h-10 rounded-xl border border-[var(--line)] bg-white px-2.5 py-2 text-sm outline-none transition focus:border-[var(--brand-primary)] focus:ring-4 focus:ring-[var(--focus-ring)] sm:rounded-2xl sm:px-4 sm:py-3"
                          >
                            <option value="numeric">Nhập điểm</option>
                            <option value="pass_fail">Đạt/Không đạt</option>
                          </select>
                        ) : (
                          <span className="block min-h-10 rounded-xl border border-[var(--line)] bg-white px-2.5 py-2 text-sm font-semibold text-[var(--muted)] sm:rounded-2xl sm:px-4 sm:py-3">
                            Nhập điểm
                          </span>
                        )}
                      </label>

                      <label className="min-w-0 space-y-1">
                          <span className="block text-[0.62rem] font-semibold uppercase tracking-[0.12em] text-[var(--muted)] sm:text-xs xl:hidden">
                          Kết quả
                        </span>
                        {gradeInputMode === "pass_fail" ? (
                          <select
                            value={draft.passFailStatus}
                            onChange={(event) =>
                              updateDraft(course.id, { passFailStatus: event.target.value as "passed" | "failed" })
                            }
                            className="w-full min-h-10 rounded-xl border border-[var(--line)] bg-white px-2.5 py-2 text-sm outline-none transition focus:border-[var(--brand-primary)] focus:ring-4 focus:ring-[var(--focus-ring)] sm:rounded-2xl sm:px-4 sm:py-3"
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
                            onChange={(event) => updateDraft(course.id, { score10: event.target.value })}
                            className="w-full min-h-10 rounded-xl border border-[var(--line)] bg-white px-2.5 py-2 text-sm outline-none transition focus:border-[var(--brand-primary)] focus:ring-4 focus:ring-[var(--focus-ring)] sm:rounded-2xl sm:px-4 sm:py-3"
                            placeholder="8.500"
                          />
                        )}
                      </label>

                      <label className="col-span-2 min-w-0 space-y-1 xl:col-span-1">
                          <span className="block text-[0.62rem] font-semibold uppercase tracking-[0.12em] text-[var(--muted)] sm:text-xs xl:hidden">
                          Ghi chú
                        </span>
                        <input
                          value={draft.notes}
                          onChange={(event) => updateDraft(course.id, { notes: event.target.value })}
                          title={draft.notes}
                          className="w-full min-h-10 rounded-xl border border-[var(--line)] bg-white px-2.5 py-2 text-sm outline-none transition focus:border-[var(--brand-primary)] focus:ring-4 focus:ring-[var(--focus-ring)] sm:rounded-2xl sm:px-4 sm:py-3"
                          placeholder="Ghi chú nếu cần"
                        />
                      </label>

                      <div className="col-span-2 grid min-w-0 grid-cols-2 gap-2 xl:col-span-1 xl:w-[18.5rem]">
                        <button
                          type="button"
                          onClick={() => handleSaveCourse(course)}
                          disabled={isSaving || !canSave}
                          className="inline-flex min-h-9 w-full min-w-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-full bg-[var(--brand-primary)] px-2.5 py-1.5 text-xs font-semibold text-white shadow-[0_14px_34px_rgba(0,63,136,0.2)] transition hover:bg-[var(--brand-primary-strong)] disabled:opacity-60 sm:min-h-[max(3rem,44px)] sm:gap-2 sm:px-4 sm:py-3 sm:text-sm"
                        >
                          <span className="truncate">{savedAttempt ? "Cập nhật" : "Lưu"}</span>
                          <Check className="h-3.5 w-3.5 shrink-0 sm:h-4 sm:w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => removeCourse(course)}
                          className="inline-flex min-h-9 w-full min-w-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-full border border-rose-200 bg-rose-50 px-2.5 py-1.5 text-xs font-semibold text-rose-700 transition hover:bg-rose-100 sm:min-h-[max(3rem,44px)] sm:gap-2 sm:px-4 sm:py-3 sm:text-sm"
                          aria-label="Xóa khỏi học kỳ"
                        >
                          <Trash2 className="h-3.5 w-3.5 shrink-0 sm:h-4 sm:w-4" />
                          <span className="truncate">Xóa</span>
                        </button>
                      </div>
                    </div>

                    <div className="mt-2 flex min-w-0 flex-wrap gap-1.5 text-xs text-[var(--muted)] sm:mt-3 sm:gap-2 sm:text-sm">
                      {gradeInputMode === "pass_fail" ? (
                        <span>Hình thức: {recordStatusLabels[draft.passFailStatus]}</span>
                      ) : (
                        <>
                          <span>Hệ 10: {hasNumericScore ? score10.toFixed(3) : "Chưa nhập"}</span>
                          <span>·</span>
                          <span>Hệ 4: {score4 !== null ? score4.toFixed(2) : "Chưa có"}</span>
                        </>
                      )}
                      <span>·</span>
                      <span>{recordStatusLabels[status]}</span>
                      {!course.countsTowardGpa ? (
                        <>
                          <span>·</span>
                          <span>Không làm thay đổi GPA</span>
                        </>
                      ) : null}
                    </div>
                  </article>
                );
              })}
            </>
          ) : (
            <div className="rounded-[1.5rem] border border-dashed border-[var(--line)] bg-white/60 px-5 py-10 text-center text-sm leading-7 text-[var(--muted)]">
              Kỳ này chưa có môn nào trong kế hoạch. Hãy thêm học phần bằng ô tìm kiếm phía trên.
            </div>
          )}
        </div>
    </PanelCard>
  );

  const historyPage = (
    <PanelCard className="space-y-4">
        <div className="flex items-start gap-3">
          <IconBadge tone="orange">
            <History className="h-5 w-5" />
          </IconBadge>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted)] sm:text-sm sm:tracking-[0.2em]">
              Lịch sử theo học kỳ
            </p>
            <h3 className="mt-2 text-xl font-semibold text-[var(--foreground)] sm:mt-3 sm:text-2xl">
              {attempts.length ? `${attempts.length} lần học đã ghi nhận` : "Chưa có điểm nào"}
            </h3>
          </div>
        </div>

        <div className="max-h-[48.75rem] space-y-3 overflow-y-auto pr-1 scrollbar-subtle">
          {attempts.length ? (
            groupAttemptsByTerm(attempts).map(([termLabel, termAttempts]) => (
              <section key={termLabel} className="rounded-[1rem] border border-[var(--line)] bg-white/76 p-2.5 sm:rounded-[1.5rem] sm:p-4">
                <div className="flex items-center justify-between gap-3">
                  <h4 className="font-semibold text-[var(--foreground)]">{termLabel}</h4>
                  <StatusPill label={`${termAttempts.length} lần học`} tone="neutral" />
                </div>
                <div className="mt-3 space-y-3">
                  <div className="hidden rounded-2xl bg-[var(--surface-tint)] px-3 py-2 text-[0.65rem] font-semibold uppercase tracking-[0.16em] text-[var(--muted)] xl:grid xl:grid-cols-[minmax(13rem,1.4fr)_10rem_minmax(8rem,0.8fr)_18rem_11rem] xl:gap-3">
                    <span>Học phần</span>
                    <span>Điểm</span>
                    <span>Ghi chú</span>
                    <span>Trạng thái</span>
                    <span>Thao tác</span>
                  </div>
                  {termAttempts
                    .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))
                    .map((attempt) => {
                      const course = courseMap.get(attempt.courseId);
                      const courseLabel = `${course?.code ?? attempt.courseId} - ${course?.title ?? "Học phần"}`;
                      const scoreLabel = formatAttemptScore(attempt);
                      const notesLabel = attempt.notes?.trim() || "Không có ghi chú";

                      return (
                        <article
                          key={attempt.id}
                          className="grid grid-cols-2 gap-2 rounded-xl border border-[var(--line)] bg-white px-2.5 py-2.5 text-[0.78rem] sm:px-3 sm:py-3 sm:text-sm xl:grid-cols-[minmax(13rem,1.4fr)_10rem_minmax(8rem,0.8fr)_18rem_11rem] xl:items-center xl:gap-3 xl:rounded-2xl"
                        >
                          <div className="col-span-2 min-w-0 xl:col-span-1">
                            <p title={courseLabel} className="truncate font-semibold text-[var(--foreground)]">
                              {courseLabel}
                            </p>
                            <p className="mt-1 text-[0.62rem] font-semibold uppercase tracking-[0.14em] text-[var(--muted)] sm:text-xs xl:hidden">
                              Học phần
                            </p>
                          </div>
                          <p title={scoreLabel} className="min-w-0 truncate text-xs text-[var(--muted)] sm:text-sm">
                            {scoreLabel}
                          </p>
                          <p
                            title={notesLabel}
                            className="min-w-0 truncate text-xs text-[var(--muted)] sm:text-sm"
                          >
                            {notesLabel}
                          </p>
                          <div className="col-span-2 flex min-w-0 flex-wrap gap-1.5 sm:gap-2 xl:col-span-1">
                            {course ? (
                              <StatusPill
                                label={course.countsTowardGpa ? "Tính GPA" : "Không tính GPA"}
                                tone={course.countsTowardGpa ? "success" : "warning"}
                              />
                            ) : null}
                            {attempt.gradeInputMode === "pass_fail" ? (
                              <StatusPill label="Đạt/Không đạt" tone="neutral" />
                            ) : null}
                            <StatusPill label={attemptTypeLabels[attempt.attemptType]} tone="warning" />
                            <StatusPill label={recordStatusLabels[attempt.status]} tone={statusTone(attempt.status)} />
                            {attempt.isEffective ? <StatusPill label="Hiện hành" tone="success" /> : null}
                          </div>
                          <div className="col-span-2 grid grid-cols-2 gap-2 xl:col-span-1 xl:w-44">
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedSemester(attempt.semester);
                                setSelectedAcademicYearStart(attempt.academicYearStart);
                                addCourse(attempt.courseId);
                                setDrafts((current) => ({
                                  ...current,
                                  [attempt.courseId]: {
                                    score10: attempt.score10 !== null ? attempt.score10.toFixed(3) : "",
                                    notes: attempt.notes ?? "",
                                    gradeInputMode: attempt.gradeInputMode,
                                    passFailStatus: attempt.status === "failed" ? "failed" : "passed",
                                  },
                                }));
                                changeGradesPage("entry");
                              }}
                              className="inline-flex min-h-9 w-full items-center justify-center gap-1.5 whitespace-nowrap rounded-full border border-[var(--line)] bg-white px-2 py-1.5 text-[0.68rem] font-semibold text-[var(--brand-primary)] transition hover:bg-[var(--surface-tint)] sm:min-h-10 sm:gap-2 sm:px-3 sm:py-2 sm:text-xs"
                            >
                              <Pencil className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                              Sửa
                            </button>
                            <button
                              type="button"
                              onClick={() => onDeleteAttempt(attempt.id)}
                              className="inline-flex min-h-9 w-full items-center justify-center gap-1.5 whitespace-nowrap rounded-full border border-rose-200 bg-rose-50 px-2 py-1.5 text-[0.68rem] font-semibold text-rose-700 transition hover:bg-rose-100 sm:min-h-10 sm:gap-2 sm:px-3 sm:py-2 sm:text-xs"
                            >
                              <Trash2 className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                              Xóa
                            </button>
                          </div>
                        </article>
                      );
                    })}
                </div>
              </section>
            ))
          ) : (
            <div className="rounded-[1.5rem] border border-dashed border-[var(--line)] bg-white/60 px-4 py-10 text-center text-sm leading-7 text-[var(--muted)]">
              Khi bạn lưu điểm đầu tiên, lịch sử sẽ tự gom theo học kỳ để dễ nhìn lại.
            </div>
          )}
        </div>

        <div className="rounded-[1.5rem] border border-blue-100 bg-blue-50 px-4 py-4 text-sm leading-7 text-blue-950">
          <div className="flex gap-2">
            <RotateCcw className="mt-1 h-4 w-4 shrink-0" />
            <p>Học lại và cải thiện được xác định tự động theo thứ tự học kỳ, không cần chọn tay nữa.</p>
          </div>
        </div>
    </PanelCard>
  );

  const entrySummary = `${selectedTermLabel} - ${visibleCourses.length} môn đang hiển thị`;
  const historySummary = attempts.length ? `${attempts.length} lần học đã ghi nhận` : "Chưa có điểm nào";

  function renderPagePreview(page: GradesPageKey) {
    const isActive = activePage === page;
    const isEntry = page === "entry";
    const title = isEntry ? "Nhập theo học kỳ" : "Lịch sử theo học kỳ";
    const summary = isEntry ? entrySummary : historySummary;
    const description = isEntry
      ? "Chọn học kỳ, thêm môn và nhập điểm thật."
      : "Xem lại các lần học, học lại và cải thiện.";
    const Icon = isEntry ? Save : History;

    return (
      <button
        key={page}
        type="button"
        onClick={() => changeGradesPage(page)}
        aria-pressed={isActive}
        className={`grades-page-preview group min-h-[5.25rem] rounded-[1.25rem] border px-3 py-3 text-left shadow-[0_12px_32px_rgba(0,25,54,0.06)] outline-none transition-[transform,background-color,border-color,box-shadow,opacity] duration-200 focus-visible:ring-4 focus-visible:ring-[var(--focus-ring)] sm:min-h-24 sm:rounded-[1.75rem] sm:px-4 sm:py-4 ${
          isActive
            ? "border-[var(--brand-primary)] bg-[var(--surface)] opacity-100"
            : "border-[var(--line)] bg-white/62 opacity-[0.78] hover:-translate-y-0.5 hover:border-[var(--line-strong)] hover:bg-white"
        }`}
      >
        <span className="flex items-start gap-3">
          <span
            className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ring-1 transition sm:h-11 sm:w-11 sm:rounded-2xl ${
              isActive
                ? "bg-[var(--brand-primary)] text-white ring-[var(--brand-primary)]"
                : "bg-[var(--surface-tint)] text-[var(--brand-primary)] ring-blue-100"
            }`}
          >
            <Icon className="h-5 w-5" />
          </span>
          <span className="min-w-0">
            <span className="hidden text-sm font-semibold uppercase tracking-[0.18em] text-[var(--muted)] sm:block">
              {isActive ? "Đang mở" : "Trang kế bên"}
            </span>
            <span className="block truncate text-base font-semibold text-[var(--foreground)] sm:mt-1 sm:text-lg">
              {title}
            </span>
            <span className="mt-1 block truncate text-sm text-[var(--muted)]">{summary}</span>
            <span
              className={`mt-3 hidden text-sm leading-6 text-[var(--muted)] transition sm:block ${
                isActive ? "opacity-100" : "truncate opacity-[0.72]"
              }`}
            >
              {isActive ? description : "Chạm để mở nhanh, hoặc vuốt để chuyển trang."}
            </span>
          </span>
        </span>
      </button>
    );
  }

  return (
    <div
      className="grades-pager space-y-4 outline-none"
      role="region"
      aria-label="Kết quả học tập theo hai trang"
      tabIndex={0}
      onKeyDown={handlePagerKeyDown}
      onPointerDown={handlePagerPointerDown}
      onPointerUp={handlePagerPointerUp}
      onPointerCancel={handlePagerPointerCancel}
    >
      <div className="grid grid-cols-2 gap-2 sm:gap-3 lg:grid-cols-2">
        {renderPagePreview("entry")}
        {renderPagePreview("history")}
      </div>

      <div
        className="grades-pager-stage"
        data-active-page={activePage}
        aria-live="polite"
      >
        <div className="grades-pager-track">
          <div className="grades-pager-slide" aria-hidden={activePage !== "entry"} inert={activePage !== "entry"}>
            {entryPage}
          </div>
          <div className="grades-pager-slide" aria-hidden={activePage !== "history"} inert={activePage !== "history"}>
            {historyPage}
          </div>
        </div>
      </div>

      <p className="rounded-2xl border border-[var(--line)] bg-white/62 px-4 py-3 text-sm leading-6 text-[var(--muted)]">
        Vuốt trái để xem lịch sử, vuốt phải để quay lại nhập điểm. Khi đang gõ điểm hoặc chọn menu, thao tác vuốt sẽ không làm chuyển trang.
      </p>
    </div>
  );
}
