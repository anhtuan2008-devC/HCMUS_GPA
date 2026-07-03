import clsx from "clsx";

export function ProgressBar({
  value,
  className,
}: Readonly<{
  value: number;
  className?: string;
}>) {
  const safeValue = Math.max(0, Math.min(100, value));

  return (
    <div className={clsx("h-2.5 overflow-hidden rounded-full bg-slate-200/70 sm:h-3", className)}>
      <div
        className="progress-fill h-full origin-left rounded-full bg-gradient-to-r from-[var(--brand-accent)] to-[var(--brand-primary)] transition-[width] duration-700"
        style={{ width: `${safeValue}%` }}
      />
    </div>
  );
}
