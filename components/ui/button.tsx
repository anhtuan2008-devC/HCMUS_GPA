import clsx from "clsx";
import type { ButtonHTMLAttributes } from "react";

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
type ButtonSize = "sm" | "md" | "lg" | "icon";

const variantClassName: Record<ButtonVariant, string> = {
  primary:
    "bg-[var(--brand-primary)] text-white shadow-[0_14px_34px_rgba(0,63,136,0.24)] hover:bg-[var(--brand-primary-strong)]",
  secondary:
    "border border-[var(--line)] bg-white/85 text-[var(--brand-primary)] hover:bg-[var(--surface-tint)]",
  ghost:
    "border border-transparent bg-transparent text-[var(--foreground)] hover:bg-[var(--surface-tint)]",
  danger:
    "border border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100",
};

const sizeClassName: Record<ButtonSize, string> = {
  sm: "min-h-[max(2.35rem,40px)] min-w-[max(4.75rem,76px)] px-3 py-2 text-xs sm:min-w-[max(6rem,88px)] sm:px-4",
  md: "min-h-[max(2.5rem,42px)] min-w-[max(6.25rem,92px)] px-3.5 py-2 text-sm sm:min-w-[max(8rem,112px)] sm:px-5 sm:py-2.5",
  lg: "min-h-[max(2.75rem,44px)] min-w-[max(7.5rem,104px)] px-4 py-2.5 text-sm sm:min-w-[max(10rem,128px)] sm:px-6 sm:py-3",
  icon: "h-[max(2.5rem,42px)] w-[max(2.5rem,42px)] min-w-[max(2.5rem,42px)] p-0 text-sm sm:h-[max(2.75rem,42px)] sm:w-[max(2.75rem,42px)] sm:min-w-[max(2.75rem,42px)]",
};

export function Button({
  className,
  variant = "primary",
  size = "md",
  type = "button",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
}) {
  return (
    <button
      type={type}
      className={clsx(
        "inline-flex shrink-0 items-center justify-center gap-2 rounded-full font-semibold transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--focus-ring)] disabled:cursor-not-allowed disabled:opacity-60",
        variantClassName[variant],
        sizeClassName[size],
        className,
      )}
      {...props}
    />
  );
}
