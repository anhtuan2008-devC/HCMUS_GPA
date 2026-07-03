import clsx from "clsx";
import type { HTMLAttributes, ReactNode } from "react";

type BadgeTone = "brand" | "neutral" | "success" | "warning" | "danger";

const toneClassName: Record<BadgeTone, string> = {
  brand: "bg-blue-50 text-[var(--brand-primary)] ring-blue-100",
  neutral: "bg-slate-100 text-slate-700 ring-slate-200",
  success: "bg-emerald-100 text-emerald-800 ring-emerald-200",
  warning: "bg-amber-100 text-amber-800 ring-amber-200",
  danger: "bg-rose-100 text-rose-700 ring-rose-200",
};

export function Badge({
  children,
  className,
  tone = "neutral",
  title,
  ...props
}: HTMLAttributes<HTMLSpanElement> & {
  tone?: BadgeTone;
}) {
  const textTitle = title ?? (typeof children === "string" ? children : undefined);

  return (
    <span
      title={textTitle}
      className={clsx(
        "inline-flex max-w-[5.2rem] items-center justify-center overflow-hidden rounded-full px-2 py-0.5 text-[0.68rem] font-semibold leading-4 ring-1 sm:max-w-[6.5rem] sm:px-3 sm:py-1 sm:text-xs sm:leading-5",
        toneClassName[tone],
        className,
      )}
      {...props}
    >
      <span className="block min-w-0 truncate">{children as ReactNode}</span>
    </span>
  );
}

export function BadgeGroup({
  children,
  className,
}: Readonly<{
  children: ReactNode;
  className?: string;
}>) {
  return <div className={clsx("flex flex-wrap items-center gap-2", className)}>{children}</div>;
}
