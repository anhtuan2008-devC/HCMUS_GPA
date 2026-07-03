import { LineChart, Target } from "lucide-react";
import { IconBadge, MeterBar, PanelCard } from "@/components/workspace/ui";
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

  return (
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
              Nếu giữ nhịp điểm này, GPA sẽ đi đến đâu?
            </h2>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-[var(--muted)]">
              Kéo thanh mục tiêu để hình dung tác động của các môn còn lại lên GPA chung.
              Đây là một góc nhìn định hướng, không phải áp lực.
            </p>
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
              {projectedGpa10.toFixed(3)}
            </p>
          </article>
          <article className="hover-lift rounded-[1.15rem] border border-[var(--line)] bg-white/85 px-3 py-3 sm:rounded-[1.75rem] sm:px-4 sm:py-4">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--muted)]">
              GPA hệ 4 dự báo
            </p>
            <p className="mt-2 text-xl font-semibold text-[var(--foreground)] sm:mt-3 sm:text-3xl">
              {projectedGpa4.toFixed(2)}
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
            <p className="text-sm text-[var(--muted)]">GPA hiện tại</p>
            <p className="mt-2 text-2xl font-semibold text-[var(--foreground)]">
              {summary.gpa10.toFixed(3)} / 10 · {summary.gpa4.toFixed(2)} / 4
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
              {progress.remainingCredits} tín chỉ
            </p>
          </article>
        </div>
      </PanelCard>
    </div>
  );
}
