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
  sm: "min-h-[max(2.5rem,40px)] min-w-[max(6rem,88px)] px-4 py-2 text-xs",
  md: "min-h-[max(2.75rem,42px)] min-w-[max(8rem,112px)] px-5 py-2.5 text-sm",
  lg: "min-h-[max(3rem,44px)] min-w-[max(10rem,128px)] px-6 py-3 text-sm",
  icon: "h-[max(2.75rem,42px)] w-[max(2.75rem,42px)] min-w-[max(2.75rem,42px)] p-0 text-sm",
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
