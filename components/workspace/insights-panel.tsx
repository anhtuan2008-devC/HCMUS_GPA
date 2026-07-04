import { ArrowRight, LineChart, Target } from "lucide-react";
import { AnimatedNumber } from "@/components/workspace/animated-number";
import { IconBadge, MeterBar, PanelCard } from "@/components/workspace/ui";
import { AcademicCanvasScene } from "@/components/visual/academic-canvas-scene";
import { Typography } from "@/components/ui";
import { getAcademicRank } from "@/lib/ui-copy";
import type { GpaSummary, GraduationProgress } from "@/lib/types";

export function InsightsPanel({
  targetScore,
  projectedGpa10,
  projectedGpa4,
  summary,
  progress,
  onTargetScoreChange,
}: Readonly<{
  targetScore: number;
  projectedGpa10: number;
  projectedGpa4: number;
  summary: GpaSummary;
  progress: GraduationProgress;
  onTargetScoreChange: (value: number) => void;
}>) {
  const projectedRank = getAcademicRank(projectedGpa10);
  const projectedDelta10 = projectedGpa10 - summary.gpa10;
  const projectedDelta4 = projectedGpa4 - summary.gpa4;
  return (
    <div className="space-y-3 sm:space-y-5">
      <section className="cockpit-hero learning-cockpit overflow-hidden rounded-[1.35rem] border border-[var(--line)] p-3 sm:rounded-[2rem] sm:p-5">
        <AcademicCanvasScene className="opacity-30" density="low" variant="analytics-grid" />
        <div className="relative grid gap-4 xl:grid-cols-[minmax(0,0.82fr)_minmax(0,1.18fr)] xl:items-center">
          <div>
            <div className="flex items-center gap-3">
              <IconBadge tone="brand">
                <LineChart className="h-5 w-5" />
              </IconBadge>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--brand-primary)] sm:text-sm sm:tracking-[0.22em]">
                  Dự báo học tập
                </p>
                <Typography as="h2" variant="section-title" className="mt-1 text-[var(--foreground)]">
                  Biến mục tiêu thành một đường bay rõ ràng.
                </Typography>
              </div>
            </div>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-[var(--muted)]">
              Kéo mức điểm mục tiêu để xem GPA dự báo thay đổi ra sao, rồi điều chỉnh nhịp học sớm hơn.
            </p>
          </div>

          <div className="rounded-[1.15rem] border border-[var(--line)] bg-white/78 p-3 shadow-[0_14px_36px_rgba(0,25,54,0.06)] sm:rounded-[1.75rem] sm:p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">
              Tóm tắt mô phỏng
            </p>
            <div className="mt-4 grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2 sm:gap-4">
              <div className="min-w-0 rounded-[1rem] bg-[var(--surface-tint)] px-3 py-3">
                <p className="text-xs font-semibold text-[var(--muted)]">Hiện tại</p>
                <p className="mt-1 text-2xl font-bold tabular-nums text-[var(--foreground)] sm:text-3xl">
                  {summary.gpa10.toFixed(3)}
                </p>
              </div>
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-[var(--brand-primary)] ring-1 ring-[var(--line)]">
                <ArrowRight className="h-4 w-4" />
              </span>
              <div className="min-w-0 rounded-[1rem] bg-[var(--brand-primary)] px-3 py-3 text-white">
                <p className="text-xs font-semibold text-white/70">Dự báo</p>
                <p className="mt-1 text-2xl font-bold tabular-nums sm:text-3xl">
                  {projectedGpa10.toFixed(3)}
                </p>
              </div>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <div className="rounded-[1rem] border border-[var(--line)] bg-white/78 px-3 py-2">
                <p className="text-xs text-[var(--muted)]">Thay đổi</p>
                <p className="font-semibold tabular-nums text-[var(--foreground)]">
                  {projectedDelta10 >= 0 ? "+" : ""}{projectedDelta10.toFixed(3)}
                </p>
              </div>
              <div className="rounded-[1rem] border border-[var(--line)] bg-white/78 px-3 py-2">
                <p className="text-xs text-[var(--muted)]">Xếp loại</p>
                <p className="font-semibold text-[var(--foreground)]">{projectedRank}</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="grid gap-3 sm:gap-5 xl:grid-cols-[1.05fr_minmax(20rem,0.95fr)]">
      <PanelCard className="space-y-4 sm:space-y-6">
        <div className="flex items-start gap-3">
          <IconBadge tone="brand">
            <Target className="h-5 w-5" />
          </IconBadge>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted)] sm:text-sm sm:tracking-[0.2em]">
              Mô phỏng mục tiêu
            </p>
            <h2 className="mt-2 font-[family-name:var(--font-display)] text-2xl text-[var(--foreground)] sm:mt-3 sm:text-3xl">
              Điều chỉnh mức điểm kỳ vọng.
            </h2>
          </div>
        </div>

        <label className="block rounded-[1.15rem] border border-[var(--line)] bg-white/82 px-3 py-3 sm:rounded-[1.5rem] sm:px-4 sm:py-4">
          <span className="mb-3 flex items-center justify-between gap-3 text-sm font-medium text-[var(--foreground)]">
            <span>Điểm hệ 10 kỳ vọng cho các môn còn lại</span>
            <span className="rounded-full bg-[var(--orange-soft)] px-3 py-1 font-semibold text-orange-700">
              {targetScore.toFixed(1)}
            </span>
          </span>
          <input
            type="range"
            min={5}
            max={10}
            step={0.1}
            value={targetScore}
            onChange={(event) => onTargetScoreChange(Number(event.target.value))}
            className="w-full accent-[var(--brand-primary)]"
          />
        </label>

        <div className="grid grid-cols-3 gap-2 sm:gap-4">
          <article className="hover-lift rounded-[1.15rem] border border-[var(--line)] bg-white/85 px-3 py-3 sm:rounded-[1.75rem] sm:px-4 sm:py-4">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--muted)]">
              GPA hệ 10 dự báo
            </p>
            <p className="mt-2 text-xl font-semibold text-[var(--foreground)] sm:mt-3 sm:text-3xl">
              <AnimatedNumber value={projectedGpa10} decimals={3} />
            </p>
          </article>
          <article className="hover-lift rounded-[1.15rem] border border-[var(--line)] bg-white/85 px-3 py-3 sm:rounded-[1.75rem] sm:px-4 sm:py-4">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--muted)]">
              GPA hệ 4 dự báo
            </p>
            <p className="mt-2 text-xl font-semibold text-[var(--foreground)] sm:mt-3 sm:text-3xl">
              <AnimatedNumber value={projectedGpa4} decimals={2} />
            </p>
            <p className="mt-1 text-xs text-[var(--muted)]">
              {projectedDelta4 >= 0 ? "+" : ""}{projectedDelta4.toFixed(2)} so với hiện tại
            </p>
          </article>
          <article className="hover-lift rounded-[1.15rem] border border-[var(--line)] bg-[var(--surface-tint)] px-3 py-3 sm:rounded-[1.75rem] sm:px-4 sm:py-4">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--muted)]">
              Xếp loại dự kiến
            </p>
            <p className="mt-2 text-xl font-semibold text-[var(--foreground)] sm:mt-3 sm:text-3xl">
              {projectedRank}
            </p>
          </article>
        </div>
      </PanelCard>

      <PanelCard className="space-y-5">
        <div className="flex items-start gap-3">
          <IconBadge tone="orange">
            <LineChart className="h-5 w-5" />
          </IconBadge>
          <div>
            <h3 className="text-xl font-semibold text-[var(--foreground)]">Tầm nhìn nhanh</h3>
            <p className="mt-1 text-sm text-[var(--muted)]">Một vài mốc quan trọng để giữ nhịp.</p>
          </div>
        </div>

        <div className="space-y-4">
          <article className="rounded-[1.5rem] border border-[var(--line)] bg-white/82 px-4 py-4">
            <p className="text-sm text-[var(--muted)]">Tín chỉ GPA hiện có</p>
            <p className="mt-2 text-2xl font-semibold text-[var(--foreground)]">
              <AnimatedNumber value={summary.attemptedCredits} decimals={0} /> tín chỉ
            </p>
          </article>

          <article className="rounded-[1.5rem] border border-[var(--line)] bg-white/82 px-4 py-4">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm text-[var(--muted)]">Tiến độ hoàn thành</p>
              <p className="text-sm font-semibold text-[var(--brand-primary)]">{progress.completionRate}%</p>
            </div>
            <div className="mt-3">
              <MeterBar value={progress.completionRate} />
            </div>
          </article>

          <article className="rounded-[1.5rem] border border-[var(--line)] bg-white/82 px-4 py-4">
            <p className="text-sm text-[var(--muted)]">Tín chỉ còn lại</p>
            <p className="mt-2 text-2xl font-semibold text-[var(--foreground)]">
              <AnimatedNumber value={progress.remainingCredits} decimals={0} /> tín chỉ
            </p>
          </article>
        </div>
      </PanelCard>
      </div>
    </div>
  );
}
