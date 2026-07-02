import clsx from "clsx";
import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";

const controlClassName =
  "w-full rounded-2xl border border-[var(--line)] bg-white/85 px-4 py-3 text-sm text-[var(--foreground)] outline-none transition placeholder:text-[var(--muted)] focus:border-[var(--brand-primary)] focus:ring-4 focus:ring-[var(--focus-ring)]";

export function Field({
  label,
  hint,
  children,
  className,
}: Readonly<{
  label: string;
  hint?: string;
  children: ReactNode;
  className?: string;
}>) {
  return (
    <label className={clsx("block", className)}>
      <span className="mb-2 block text-sm font-medium text-[var(--foreground)]">{label}</span>
      {children}
      {hint ? <span className="mt-2 block text-xs leading-5 text-[var(--muted)]">{hint}</span> : null}
    </label>
  );
}

export function TextInput({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={clsx(controlClassName, className)} {...props} />;
}

export function TextArea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={clsx(controlClassName, "min-h-28 resize-y", className)} {...props} />;
}

export function SelectInput({ className, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select className={clsx(controlClassName, className)} {...props} />;
}
