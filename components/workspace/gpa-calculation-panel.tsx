"use client";

import { useDeferredValue, useState } from "react";
import {
  ArrowLeft,
  Activity,
  Calculator,
  CheckCircle2,
  Gauge,
  RotateCcw,
  Search,
  SlidersHorizontal,
  Sparkles,
  XCircle,
} from "lucide-react";
import { AnimatedNumber } from "@/components/workspace/animated-number";
import { IconBadge, PanelCard, StatusPill } from "@/components/workspace/ui";
import { AcademicCanvasScene } from "@/components/visual/academic-canvas-scene";
import { Typography } from "@/components/ui";
import { calculateGpaBreakdown } from "@/lib/grade";
import { normalizeSearchText } from "@/lib/text";
import { recordStatusLabels } from "@/lib/ui-copy";
import type { ProgramCurriculum, RecordStatus, StudentCourseRecord } from "@/lib/types";

const ALL_TERMS = "all";

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

function formatNumber(value: number, decimals = 3) {
  return value.toLocaleString("vi-VN", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

function formatOptionalScore(value: number | null, decimals: number) {
  return value === null ? "Không có" : value.toFixed(decimals);
}

function buildDefaultIncludedIds(rows: ReturnType<typeof calculateGpaBreakdown>["rows"]) {
  return new Set(rows.filter((row) => row.officiallyIncludedInGpa).map((row) => row.courseId));
}

export function GpaCalculationPanel({
  program,
  records,
  onBack,
}: Readonly<{
  program: ProgramCurriculum;
  records: StudentCourseRecord[];
  onBack: () => void;
}>) {
  const [query, setQuery] = useState("");
  const [selectedTermLabel, setSelectedTermLabel] = useState(ALL_TERMS);
  const [simulatedIncludedCourseIds, setSimulatedIncludedCourseIds] = useState<Set<string> | null>(
    null,
  );
  const [showOnlyChangedRows, setShowOnlyChangedRows] = useState(false);
  const deferredQuery = useDeferredValue(query);
  const normalizedQuery = normalizeSearchText(deferredQuery);
  const selectedTerm = selectedTermLabel === ALL_TERMS ? null : selectedTermLabel;
  const officialBreakdown = calculateGpaBreakdown(records, program.courses, {
    termLabel: selectedTerm,
  });
  const defaultIncludedIds = buildDefaultIncludedIds(officialBreakdown.rows);
  const activeIncludedIds = simulatedIncludedCourseIds ?? defaultIncludedIds;
  const simulatedBreakdown = calculateGpaBreakdown(records, program.courses, {
    termLabel: selectedTerm,
    mode: "simulation",
    includedCourseIdsOverride: activeIncludedIds,
  });
  const changedRows = simulatedBreakdown.rows.filter((row) => row.isSimulationOverride);
  const isTermScoped = selectedTermLabel !== ALL_TERMS;
  const visibleRows = simulatedBreakdown.rows.filter((row) => {
    if (showOnlyChangedRows && !row.isSimulationOverride) {
      return false;
    }

    if (!normalizedQuery) {
      return true;
    }

    return normalizeSearchText(
      `${row.courseCode} ${row.courseTitle} ${row.termLabel} ${row.notes ?? ""} ${row.exclusionReason ?? ""}`,
    ).includes(normalizedQuery);
  });

  const summaryRows = [
    [isTermScoped ? "GPA kỳ chính thức" : "GPA tích lũy chính thức", formatNumber(officialBreakdown.officialGpa10)],
    ["GPA mô phỏng", formatNumber(simulatedBreakdown.simulatedGpa10)],
    ["GPA mô phỏng hệ 4", simulatedBreakdown.simulatedGpa4.toFixed(2)],
    [
      isTermScoped ? "CPA đến hết kỳ đã chọn" : "CPA hiện tại",
      `${formatNumber(simulatedBreakdown.cumulativeThroughTermGpa10)} · ${simulatedBreakdown.cumulativeThroughTermGpa4.toFixed(2)} hệ 4`,
    ],
    ["Tổng tín chỉ đã tích lũy", `${simulatedBreakdown.earnedCredits} tín chỉ`],
    ["Tín chỉ tính GPA mô phỏng", `${simulatedBreakdown.simulatedGpaCredits} tín chỉ`],
    ["Tổng điểm mô phỏng", formatNumber(simulatedBreakdown.simulatedWeightedScore10Total)],
    ["Số học phần tính GPA mô phỏng", `${simulatedBreakdown.simulatedGpaCourseCount} học phần`],
  ];
  const simulationDelta10 = simulatedBreakdown.simulatedGpa10 - officialBreakdown.officialGpa10;
  const simulationSignals = [
    {
      label: "Độ lệch mô phỏng",
      value: `${simulationDelta10 >= 0 ? "+" : ""}${simulationDelta10.toFixed(3)}`,
      helper: "so với quy tắc thật",
      icon: Activity,
      tone: "brand" as const,
    },
    {
      label: "Đang tính",
      value: simulatedBreakdown.simulatedGpaCourseCount.toString(),
      helper: `${simulatedBreakdown.simulatedGpaCredits} tín chỉ GPA`,
      icon: CheckCircle2,
      tone: "success" as const,
    },
    {
      label: "Đã can thiệp",
      value: changedRows.length.toString(),
      helper: "học phần override",
      icon: Sparkles,
      tone: "orange" as const,
    },
    {
      label: "Phạm vi kỳ",
      value: isTermScoped ? "1" : officialBreakdown.availableTerms.length.toString(),
      helper: isTermScoped ? "học kỳ đang xem" : "học kỳ có dữ liệu",
      icon: Gauge,
      tone: "brand" as const,
    },
  ];

  function handleTermChange(nextTermLabel: string) {
    setSelectedTermLabel(nextTermLabel);
    setSimulatedIncludedCourseIds(null);
    setShowOnlyChangedRows(false);
  }

  function resetSimulation() {
    setSimulatedIncludedCourseIds(null);
    setShowOnlyChangedRows(false);
  }

  function toggleCourse(courseId: string) {
    setSimulatedIncludedCourseIds((current) => {
      const next = new Set(current ?? defaultIncludedIds);

      if (next.has(courseId)) {
        next.delete(courseId);
      } else {
        next.add(courseId);
      }

      return next;
    });
  }

  return (
    <div className="motion-page space-y-3 sm:space-y-5">
      <PanelCard className="overflow-hidden p-0">
        <div className="metric-card relative overflow-hidden px-4 py-4 text-white sm:px-6 sm:py-6">
          <div className="absolute -right-12 -top-16 h-48 w-48 rounded-full bg-white/10 blur-2xl" />
          <div className="absolute bottom-4 right-8 hidden h-28 w-28 rotate-12 rounded-[2rem] border border-white/10 bg-white/10 lg:block" />
          <AcademicCanvasScene className="opacity-34" density="low" variant="analytics-grid" />
          <button
            type="button"
            onClick={onBack}
            className="relative inline-flex min-h-11 items-center gap-2 rounded-full border border-white/20 bg-white/12 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/18 focus:outline-none focus:ring-4 focus:ring-white/20"
          >
            <ArrowLeft className="h-4 w-4" />
            Quay lại Tổng quan
          </button>

          <div className="relative mt-5 grid gap-4 sm:mt-6 sm:gap-6 xl:grid-cols-[1fr_28rem] xl:items-end">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/72 sm:text-sm sm:tracking-[0.22em]">
                GPA Lab
              </p>
              <Typography as="h2" variant="page-title" className="mt-2 text-white sm:mt-3">
                Thử cách tính, hiểu từng tín chỉ.
              </Typography>
              <Typography variant="body-sm" className="mt-3 max-w-3xl text-white/78">
                Chọn học kỳ, bật tắt học phần để mô phỏng GPA. Những thay đổi ở đây chỉ để
                thử kịch bản và không ghi vào dữ liệu thật.
              </Typography>
            </div>

            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2 sm:gap-3">
                <div className="rounded-[1.15rem] border border-white/14 bg-white/12 p-3 sm:rounded-[1.5rem] sm:p-5">
                  <p className="text-sm text-white/70">GPA mô phỏng hệ 10</p>
                  <p className="mt-2 text-2xl font-bold sm:text-4xl">
                    <AnimatedNumber value={simulatedBreakdown.simulatedGpa10} decimals={3} />
                  </p>
                  <p className="mt-1 text-sm text-white/75">
                    Chính thức: {formatNumber(officialBreakdown.officialGpa10)}
                  </p>
                </div>
                <div className="rounded-[1.15rem] border border-white/14 bg-white/12 p-3 sm:rounded-[1.5rem] sm:p-5">
                  <p className="text-sm text-white/70">GPA mô phỏng hệ 4</p>
                  <p className="mt-2 text-2xl font-bold sm:text-4xl">
                    <AnimatedNumber value={simulatedBreakdown.simulatedGpa4} decimals={2} />
                  </p>
                  <p className="mt-1 text-sm text-white/75">
                    {simulatedBreakdown.simulatedGpaCredits} tín chỉ đang tính
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {simulationSignals.map((signal) => {
                  const SignalIcon = signal.icon;

                  return (
                    <article key={signal.label} className="rounded-[1rem] border border-white/12 bg-white/10 p-3 backdrop-blur-sm">
                      <div className="flex items-center justify-between gap-2">
                        <SignalIcon className="h-4 w-4 text-white/78" />
                        <span className="data-thread-dot h-2 w-2 rounded-full bg-white/70" />
                      </div>
                      <p className="mt-2 text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-white/58">
                        {signal.label}
                      </p>
                      <p className="mt-1 truncate text-base font-bold text-white" title={signal.value}>
                        {signal.value}
                      </p>
                      <p className="mt-0.5 truncate text-[0.7rem] text-white/68" title={signal.helper}>
                        {signal.helper}
                      </p>
                    </article>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </PanelCard>

      <div className="grid gap-3 sm:gap-5 xl:grid-cols-[0.85fr_1.15fr]">
        <PanelCard className="motion-card space-y-4" style={{ "--delay": "70ms" } as React.CSSProperties}>
          <div className="flex items-start gap-3">
            <IconBadge tone="brand">
              <SlidersHorizontal className="h-5 w-5" />
            </IconBadge>
            <div>
              <h3 className="text-xl font-semibold text-[var(--foreground)]">Bộ lọc học kỳ</h3>
              <p className="mt-1 text-sm leading-6 text-[var(--muted)]">
                Xem GPA toàn bộ hoặc tập trung vào một học kỳ cụ thể.
              </p>
            </div>
          </div>

          <label className="block">
            <span className="mb-2 block text-sm font-medium text-[var(--foreground)]">Học kỳ</span>
            <select
              value={selectedTermLabel}
              onChange={(event) => handleTermChange(event.target.value)}
              className="w-full rounded-2xl border border-[var(--line)] bg-white/85 px-4 py-3 outline-none transition focus:border-[var(--brand-primary)] focus:ring-4 focus:ring-[var(--focus-ring)]"
            >
              <option value={ALL_TERMS}>Tất cả học kỳ</option>
              {officialBreakdown.availableTerms.map((term) => (
                <option key={term.termLabel} value={term.termLabel}>
                  {term.termLabel}
                </option>
              ))}
            </select>
          </label>

          <div className="grid grid-cols-2 gap-2 sm:gap-3">
            <div className="rounded-[1.15rem] bg-[var(--surface-tint)] px-3 py-3 sm:rounded-[1.5rem] sm:px-4 sm:py-4">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">
                {isTermScoped ? "GPA kỳ" : "CPA hiện tại"}
              </p>
              <p className="mt-2 text-2xl font-bold text-[var(--foreground)]">
                <AnimatedNumber
                  value={isTermScoped ? simulatedBreakdown.simulatedGpa10 : simulatedBreakdown.cumulativeThroughTermGpa10}
                  decimals={3}
                />
              </p>
            </div>
            <div className="rounded-[1.15rem] bg-[var(--surface-tint)] px-3 py-3 sm:rounded-[1.5rem] sm:px-4 sm:py-4">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">
                CPA đến kỳ
              </p>
              <p className="mt-2 text-2xl font-bold text-[var(--foreground)]">
                <AnimatedNumber value={simulatedBreakdown.cumulativeThroughTermGpa10} decimals={3} />
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={resetSimulation}
              className="inline-flex min-h-11 items-center gap-2 rounded-full border border-[var(--line)] bg-white/85 px-4 py-2 text-sm font-semibold text-[var(--brand-primary)] transition hover:bg-[var(--surface-tint)]"
            >
              <RotateCcw className="h-4 w-4" />
              Khôi phục quy tắc chuẩn
            </button>
            <button
              type="button"
              onClick={() => setShowOnlyChangedRows((current) => !current)}
              className={`inline-flex min-h-11 items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition ${
                showOnlyChangedRows
                  ? "bg-[var(--brand-primary)] text-white"
                  : "border border-[var(--line)] bg-white/85 text-[var(--brand-primary)] hover:bg-[var(--surface-tint)]"
              }`}
            >
              <Sparkles className="h-4 w-4" />
              Chỉ xem thay đổi ({changedRows.length})
            </button>
          </div>
        </PanelCard>

        <PanelCard className="motion-card space-y-4" style={{ "--delay": "120ms" } as React.CSSProperties}>
          <div className="flex items-start gap-3">
            <IconBadge tone="brand">
              <Calculator className="h-5 w-5" />
            </IconBadge>
            <div>
              <h3 className="text-xl font-semibold text-[var(--foreground)]">Bảng tổng hợp</h3>
              <p className="mt-1 text-sm leading-6 text-[var(--muted)]">
                Số liệu chính thức và mô phỏng được đặt cạnh nhau để bạn nhìn thấy tác động ngay.
              </p>
            </div>
          </div>

          <div className="overflow-hidden rounded-[1.15rem] border border-[var(--line)] bg-white/78 sm:rounded-[1.5rem]">
            <div className="grid grid-cols-[minmax(0,1fr)_minmax(7.5rem,0.75fr)] bg-[var(--surface-tint)] px-3 py-2.5 text-sm font-semibold text-[var(--foreground)] sm:grid-cols-[1fr_13rem] sm:px-4 sm:py-3">
              <span>Tên mục</span>
              <span className="text-right">Giá trị</span>
            </div>
            <div className="divide-y divide-[var(--line)]">
              {summaryRows.map(([label, value]) => (
                <div
                  key={label}
                  className="grid grid-cols-[minmax(0,1fr)_minmax(7.5rem,0.75fr)] gap-2 px-3 py-2.5 text-sm sm:grid-cols-[1fr_13rem] sm:gap-3 sm:px-4 sm:py-3"
                >
                  <span className="text-[var(--foreground)]">{label}</span>
                  <span className="text-right font-semibold tabular-nums text-[var(--foreground)]">
                    {value}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </PanelCard>
      </div>

      <PanelCard className="motion-card space-y-4" style={{ "--delay": "180ms" } as React.CSSProperties}>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h3 className="text-xl font-semibold text-[var(--foreground)]">Danh sách kết quả học tập</h3>
            <p className="mt-1 text-sm text-[var(--muted)]">
              Đang hiển thị {visibleRows.length}/{simulatedBreakdown.rows.length} học phần
              {isTermScoped ? ` trong ${selectedTermLabel}` : " hiện hành"}.
            </p>
          </div>
          <label className="w-full max-w-md">
            <span className="mb-2 block text-sm font-medium text-[var(--foreground)]">Tìm học phần</span>
            <span className="relative block">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted)]" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                className="w-full rounded-2xl border border-[var(--line)] bg-white/85 py-3 pl-11 pr-4 outline-none transition focus:border-[var(--brand-primary)] focus:ring-4 focus:ring-[var(--focus-ring)]"
                placeholder="Tìm theo mã môn, tên môn hoặc học kỳ"
              />
            </span>
          </label>
        </div>

        <div className="overflow-x-auto rounded-[1.15rem] border border-[var(--line)] bg-white/76 sm:rounded-[1.5rem]">
          <div className="min-w-[62rem] sm:min-w-[70rem]">
            <div className="grid grid-cols-[7rem_7.5rem_minmax(16rem,1fr)_4.25rem_5.75rem_5.75rem_7rem_minmax(11rem,0.8fr)] gap-2 border-b border-[var(--line)] bg-[var(--surface-tint)] px-3 py-2.5 text-[0.65rem] font-semibold uppercase tracking-[0.12em] text-[var(--muted)] sm:grid-cols-[8rem_8.5rem_minmax(18rem,1fr)_5rem_6.5rem_6.5rem_8rem_minmax(13rem,0.8fr)] sm:gap-3 sm:px-4 sm:py-3 sm:text-xs sm:tracking-[0.14em]">
              <span>Mô phỏng</span>
              <span>NH/HK</span>
              <span>Học phần</span>
              <span>Số TC</span>
              <span>Điểm 10</span>
              <span>Điểm 4</span>
              <span>Trạng thái</span>
              <span>Ghi chú</span>
            </div>
            <div className="divide-y divide-[var(--line)]">
              {visibleRows.length ? (
                visibleRows.map((row) => {
                  const checked = activeIncludedIds.has(row.courseId) && row.canSimulateInGpa;
                  const disabled = !row.canSimulateInGpa;
                  const toggleLabel = checked ? "Đang tính trong mô phỏng" : "Không tính trong mô phỏng";

                  return (
                    <article
                      key={`${row.courseId}-${row.termLabel}`}
                      className={`grid grid-cols-[7rem_7.5rem_minmax(16rem,1fr)_4.25rem_5.75rem_5.75rem_7rem_minmax(11rem,0.8fr)] items-center gap-2 px-3 py-2.5 text-[0.75rem] transition duration-300 sm:grid-cols-[8rem_8.5rem_minmax(18rem,1fr)_5rem_6.5rem_6.5rem_8rem_minmax(13rem,0.8fr)] sm:gap-3 sm:px-4 sm:py-3 sm:text-sm ${
                        checked ? "text-[var(--foreground)]" : "bg-slate-50/60 text-[var(--muted)]"
                      } ${row.isSimulationOverride ? "ring-1 ring-inset ring-blue-100" : ""}`}
                    >
                      <span className="flex items-center gap-2">
                        <button
                          type="button"
                          role="switch"
                          aria-checked={checked}
                          disabled={disabled}
                          onClick={() => toggleCourse(row.courseId)}
                          title={disabled ? "Học phần này chưa có điểm số để mô phỏng GPA." : toggleLabel}
                          className={`relative h-7 w-12 rounded-full transition ${
                            checked ? "bg-[var(--brand-primary)]" : "bg-slate-300"
                          } disabled:cursor-not-allowed disabled:opacity-50`}
                        >
                          <span
                            className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${
                              checked ? "translate-x-6" : "translate-x-1"
                            }`}
                          />
                        </button>
                        {checked ? (
                          <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                        ) : (
                          <XCircle className="h-4 w-4 text-slate-400" />
                        )}
                      </span>
                      <span className="truncate" title={row.termLabel}>
                        {row.termLabel}
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate font-semibold" title={`${row.courseCode} - ${row.courseTitle}`}>
                          {row.courseCode} - {row.courseTitle}
                        </span>
                        <span className="mt-1 flex flex-wrap gap-2">
                          <StatusPill
                            label={
                              row.isSimulationOverride
                                ? "Mô phỏng"
                                : row.officiallyIncludedInGpa
                                  ? "Tính GPA"
                                  : row.exclusionReason ?? "Không tính GPA"
                            }
                            tone={row.isSimulationOverride || row.officiallyIncludedInGpa ? "success" : "warning"}
                          />
                          {disabled ? <StatusPill label="Thiếu điểm" tone="warning" /> : null}
                        </span>
                      </span>
                      <span className="text-center tabular-nums">{row.credits}</span>
                      <span className="tabular-nums">{formatOptionalScore(row.score10, 3)}</span>
                      <span className="tabular-nums">{formatOptionalScore(row.score4, 2)}</span>
                      <StatusPill label={recordStatusLabels[row.status]} tone={statusTone(row.status)} />
                      <span className="truncate" title={row.notes ?? row.exclusionReason ?? "Không có ghi chú"}>
                        {row.notes ?? row.exclusionReason ?? "Không có ghi chú"}
                      </span>
                    </article>
                  );
                })
              ) : (
                <div className="px-4 py-10 text-center text-sm text-[var(--muted)]">
                  Chưa có học phần phù hợp với bộ lọc hiện tại.
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="rounded-[1.15rem] bg-[var(--surface-tint)] px-3 py-2.5 text-xs leading-5 text-[var(--brand-primary)] sm:rounded-[1.5rem] sm:px-4 sm:py-3 sm:text-sm sm:leading-6">
          Mô phỏng chỉ thay đổi số liệu trong trang này. Dữ liệu thật, GPA trên Tổng quan và
          lịch sử điểm của bạn không bị ghi đè.
        </div>
      </PanelCard>
    </div>
  );
}
